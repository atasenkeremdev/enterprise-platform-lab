#!/usr/bin/env python3
"""BankOps OpenShift evidence preview. Python 3.9+, standard library only."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone

VERSION = "0.1.0-free-preview"
# Fixed allowlist: no shell, apply, upgrade, logs, exec, Secrets or arbitrary queries.
QUERIES = {
    "clusterVersion": ["get", "clusterversion", "version", "-o", "json"],
    "operators": ["get", "clusteroperators", "-o", "json"],
    "machinePools": ["get", "machineconfigpools", "-o", "json"],
    "nodes": ["get", "nodes", "-o", "json"],
}
VERSION_RE = re.compile(r"^v?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$")


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def digest(value):
    return hashlib.sha256(value).hexdigest()


def timestamp(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("UTC timestamp required")
    return datetime.fromisoformat(value[:-1] + "+00:00")


def conditions(value):
    allowed = {"Available", "Progressing", "Degraded", "Failing", "Upgradeable", "Ready", "MemoryPressure", "DiskPressure", "PIDPressure", "Updated", "Updating"}
    return {c["type"]: c["status"] for c in value if isinstance(c, dict) and c.get("type") in allowed and c.get("status") in {"True", "False", "Unknown"}}


def version(value):
    return value if isinstance(value, str) and VERSION_RE.fullmatch(value) else None


def project(key, raw):
    """Persist only selected fields; never raw responses, annotations or messages."""
    if key == "clusterVersion":
        status = raw.get("status", {})
        uid = raw.get("metadata", {}).get("uid")
        return {
            "clusterIdentitySha256": digest(uid.encode()) if isinstance(uid, str) and uid else None,
            "desiredVersion": version(status.get("desired", {}).get("version")),
            "conditions": conditions(status.get("conditions", [])),
            "availableUpdateVersions": [v for item in status.get("availableUpdates", []) if (v := version(item.get("version")))],
            "recommendationsPresentInResponse": "availableUpdates" in status,
            "completedVersions": [v for item in status.get("history", []) if item.get("state") == "Completed" and (v := version(item.get("version")))][:8],
        }
    items = raw.get("items")
    if not isinstance(items, list):
        raise ValueError("Resource list missing")
    result = []
    for item in items:
        name = item.get("metadata", {}).get("name")
        if not isinstance(name, str) or not name or len(name) > 253 or not re.fullmatch(r"[a-zA-Z0-9._-]+", name):
            raise ValueError("Invalid resource name")
        status = item.get("status", {})
        entry = {"id": "node-" + digest(name.encode())[:16] if key == "nodes" else name,
                 "conditions": conditions(status.get("conditions", []))}
        if key == "machinePools":
            for field in ["machineCount", "readyMachineCount", "updatedMachineCount", "degradedMachineCount"]:
                value = status.get(field)
                entry[field] = value if type(value) is int and value >= 0 else None
            entry["paused"] = item.get("spec", {}).get("paused") if type(item.get("spec", {}).get("paused")) is bool else None
        if key == "nodes":
            entry["kubeletVersion"] = version(status.get("nodeInfo", {}).get("kubeletVersion"))
        result.append(entry)
    return sorted(result, key=lambda item: item["id"])


def save_snapshot(out, snapshot):
    out.mkdir(mode=0o700)  # Never overwrite or merge an existing evidence directory.
    data = (json.dumps(snapshot, indent=2, sort_keys=True) + "\n").encode()
    with (out / "snapshot.json").open("xb") as f:
        f.write(data)
    manifest = {"toolVersion": VERSION, "snapshotSha256": digest(data), "origin": snapshot["origin"]}
    with (out / "manifest.json").open("x") as f:
        json.dump(manifest, f, indent=2)
    return out


def collect(context, phase, out):
    if not context or context.startswith("-") or len(context) > 253:
        raise ValueError("Explicit context required")
    if out.exists():
        raise ValueError("Output must be a new directory")
    oc = shutil.which("oc")
    if not oc:
        raise ValueError("oc client unavailable; no collection performed")
    snapshot = {"schemaVersion": "1", "toolVersion": VERSION, "origin": "live_collection", "phase": phase,
                "captureStartedAt": now(), "resources": {}, "errors": {}}
    for key, query in QUERIES.items():
        try:
            result = subprocess.run([oc, "--context=" + context, "--request-timeout=15s"] + query,
                                    capture_output=True, timeout=25, check=False)
            if result.returncode:
                raise ValueError("Request failed")
            snapshot["resources"][key] = project(key, json.loads(result.stdout))
        except (ValueError, TypeError, KeyError, AttributeError, OSError, subprocess.TimeoutExpired):
            snapshot["errors"][key] = "request_failed_or_unusable_response"
    snapshot["captureCompletedAt"] = now()
    snapshot["collectionStatus"] = "partial" if snapshot["errors"] else "complete"
    save_snapshot(out, snapshot)
    print("Collection saved locally; status: " + snapshot["collectionStatus"] + ". No raw responses persisted.")
    return 2 if snapshot["errors"] else 0


def load_snapshot(folder):
    for filename in ["snapshot.json", "manifest.json"]:
        if (folder / filename).is_symlink():
            raise ValueError("Symlinked evidence files are not accepted")
    data = (folder / "snapshot.json").read_bytes()
    manifest = json.loads((folder / "manifest.json").read_text())
    if manifest.get("snapshotSha256") != digest(data):
        raise ValueError("Snapshot hash mismatch")
    snapshot = json.loads(data)
    if snapshot.get("schemaVersion") != "1" or snapshot.get("origin") not in {"synthetic", "live_collection"}:
        raise ValueError("Unsupported snapshot")
    if manifest.get("origin") != snapshot["origin"]:
        raise ValueError("Origin mismatch")
    if timestamp(snapshot["captureCompletedAt"]) < timestamp(snapshot["captureStartedAt"]):
        raise ValueError("Invalid capture interval")
    return snapshot


def findings(snapshot):
    results = []
    resources = snapshot.get("resources", {})
    for key in QUERIES:
        value = resources.get(key)
        if key in snapshot.get("errors", {}) or value is None:
            results.append(("UNKNOWN", key + ": data unavailable"))
            continue
        if key != "clusterVersion" and not value:
            results.append(("UNKNOWN", key + ": empty inventory; completeness needs review"))
        if key == "clusterVersion":
            c = value.get("conditions", {})
            for flag, expected in [("Available", "True"), ("Progressing", "False"), ("Failing", "False")]:
                actual = c.get(flag)
                results.append(("UNKNOWN" if actual is None or actual == "Unknown" else "OBSERVED" if actual == expected else "REVIEW", "ClusterVersion " + flag + "=" + str(actual)))
            if not value.get("desiredVersion"):
                results.append(("UNKNOWN", "Desired version unavailable"))
        else:
            for item in value:
                if key == "operators":
                    for flag, expected in [("Available", "True"), ("Progressing", "False"), ("Degraded", "False")]:
                        actual = item["conditions"].get(flag)
                        results.append(("UNKNOWN" if actual is None or actual == "Unknown" else "OBSERVED" if actual == expected else "REVIEW", item["id"] + " " + flag + "=" + str(actual)))
                if key == "nodes":
                    actual = item["conditions"].get("Ready")
                    results.append(("OBSERVED" if actual == "True" else "UNKNOWN" if actual in {None, "Unknown"} else "REVIEW", item["id"] + " Ready=" + str(actual)))
                if key == "nodes":
                    for flag in ["MemoryPressure", "DiskPressure", "PIDPressure"]:
                        actual = item["conditions"].get(flag)
                        results.append(("OBSERVED" if actual == "False" else "UNKNOWN" if actual in {None, "Unknown"} else "REVIEW", item["id"] + " " + flag + "=" + str(actual)))
                if key == "machinePools":
                    count = item.get("machineCount")
                    counts = [item.get(k) for k in ["readyMachineCount", "updatedMachineCount", "degradedMachineCount"]]
                    if count is None or count == 0 or None in counts or item.get("paused") is None:
                        result = "UNKNOWN"
                    else:
                        result = "OBSERVED" if counts == [count, count, 0] and item["paused"] is False else "REVIEW"
                    results.append((result, item["id"] + " pool counts/paused: " + str([count] + counts + [item.get("paused")])))
    return results


def compare(before_path, after_path, out):
    before, after = load_snapshot(before_path), load_snapshot(after_path)
    if before.get("phase") != "before" or after.get("phase") != "after":
        raise ValueError("Expected before and after phases")
    bcv = before.get("resources", {}).get("clusterVersion", {})
    acv = after.get("resources", {}).get("clusterVersion", {})
    identity = bcv.get("clusterIdentitySha256")
    if not identity or identity != acv.get("clusterIdentitySha256") or before["origin"] != after["origin"]:
        raise ValueError("Evidence must have matching cluster identity and origin")
    if timestamp(after["captureStartedAt"]) < timestamp(before["captureCompletedAt"]):
        raise ValueError("After capture precedes or overlaps before capture")
    rows = findings(after)
    if bcv.get("desiredVersion") == acv.get("desiredVersion"):
        rows.append(("REVIEW", "Desired release unchanged; check intended maintenance scope and actual completion evidence"))
    result = {"schemaVersion": "1", "origin": after["origin"], "beforeDesiredVersion": bcv.get("desiredVersion"),
              "afterDesiredVersion": acv.get("desiredVersion"), "findings": [{"status": s, "detail": d} for s, d in rows],
              "upgradePathAssessment": "not_performed", "approvalAssessment": "not_performed",
              "complianceAssessment": "not_performed", "applicationValidation": "not_collected"}
    # Compare membership too: a smaller post-change inventory is not silently healthy.
    for key in ["operators", "machinePools", "nodes"]:
        old = {i["id"] for i in before.get("resources", {}).get(key, [])}
        new = {i["id"] for i in after.get("resources", {}).get(key, [])}
        if old != new:
            result["findings"].append({"status": "REVIEW", "detail": key + ": inventory membership changed; investigate additions/removals"})
    out.mkdir(mode=0o700)
    with (out / "comparison.json").open("x") as f:
        json.dump(result, f, indent=2)
    lines = ["# OpenShift change evidence comparison", "", "Origin: **" + after["origin"] + "**", "", "Desired release: " + str(bcv.get("desiredVersion")) + " → " + str(acv.get("desiredVersion")), "", "Desired version alone is not proof of a completed upgrade. No supported path, approval, application validation or compliance decision is established.", "", "## Post-change observations", ""]
    lines += ["- **" + row["status"] + "** — " + row["detail"] for row in result["findings"]]
    lines += ["", "OBSERVED means a narrow expected field value was observed. REVIEW means investigate. UNKNOWN means insufficient data. None means upgrade-ready, safe, approved or compliant.", "", "Hashes detect changes against a local manifest; they are not signatures, trusted timestamps or proof of authentic collection."]
    with (out / "comparison.md").open("x") as f:
        f.write("\n".join(lines) + "\n")
    print("Comparison saved locally. Review and unknown findings must be interpreted by an authorised human.")
    return 0


def demo(out):
    out.mkdir(mode=0o700)
    raw = {"schemaVersion": "1", "toolVersion": VERSION, "origin": "synthetic", "phase": "before",
           "captureStartedAt": "2026-10-28T08:00:00Z", "captureCompletedAt": "2026-10-28T08:01:00Z", "collectionStatus": "complete", "errors": {},
           "resources": {"clusterVersion": {"clusterIdentitySha256": digest(b"fictional-example-cluster"), "desiredVersion": "4.18.0", "conditions": {"Available": "True", "Progressing": "False", "Failing": "False"}, "completedVersions": ["4.18.0"], "availableUpdateVersions": [], "recommendationsPresentInResponse": False},
                         "operators": [{"id": "network", "conditions": {"Available": "True", "Progressing": "False", "Degraded": "False"}}],
                         "machinePools": [{"id": "worker", "conditions": {}, "machineCount": 3, "readyMachineCount": 3, "updatedMachineCount": 3, "degradedMachineCount": 0, "paused": False}],
                         "nodes": [{"id": "node-fictional-01", "conditions": {"Ready": "True"}, "kubeletVersion": None}]}}
    save_snapshot(out / "before", raw)
    after = copy.deepcopy(raw)
    after.update(phase="after", captureStartedAt="2026-10-28T10:00:00Z", captureCompletedAt="2026-10-28T10:01:00Z")
    # Same version: this example deliberately demonstrates an incomplete change.
    after["resources"]["operators"][0]["conditions"]["Degraded"] = "True"
    after["resources"]["machinePools"][0]["updatedMachineCount"] = 2
    after["resources"]["nodes"][0]["conditions"]["Ready"] = "False"
    save_snapshot(out / "after", after)
    compare(out / "before", out / "after", out / "comparison")
    return 0


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", action="version", version=VERSION)
    commands = parser.add_subparsers(dest="command", required=True)
    c = commands.add_parser("collect", help="Read four allowlisted resources using existing oc authentication")
    c.add_argument("--context", required=True)
    c.add_argument("--phase", choices=["before", "after"], required=True)
    c.add_argument("--out", type=Path, required=True)
    c = commands.add_parser("compare", help="Compare local snapshots, no network access")
    c.add_argument("--before", type=Path, required=True)
    c.add_argument("--after", type=Path, required=True)
    c.add_argument("--out", type=Path, required=True)
    c = commands.add_parser("demo", help="Generate fictional examples without oc or cluster access")
    c.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    try:
        if args.command == "collect":
            return collect(args.context, args.phase, args.out)
        if args.command == "compare":
            return compare(args.before, args.after, args.out)
        return demo(args.out)
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        print("Operation failed: check arguments, input integrity and output path. Existing files were not intentionally overwritten. Credentials and raw subprocess errors are suppressed.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
