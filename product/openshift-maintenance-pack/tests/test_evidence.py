"""Offline tests. Never invokes oc or connects to a cluster."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

TOOL = Path(__file__).resolve().parents[1] / "tools/evidence.py"
spec = importlib.util.spec_from_file_location("evidence", TOOL)
evidence = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evidence)


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.mask = os.umask(0o077)
        with contextlib.redirect_stdout(io.StringIO()):
            evidence.demo(self.root / "example")

    def tearDown(self):
        os.umask(self.mask)
        self.tmp.cleanup()

    def load(self, phase):
        return evidence.load_snapshot(self.root / "example" / phase)

    def resave(self, snapshot, name):
        out = self.root / name
        evidence.save_snapshot(out, snapshot)
        return out

    def test_demo_is_explicitly_synthetic_and_flags_real_conditions(self):
        result = json.loads((self.root / "example/comparison/comparison.json").read_text())
        self.assertEqual(result["origin"], "synthetic")
        self.assertEqual(result["upgradePathAssessment"], "not_performed")
        self.assertEqual(result["complianceAssessment"], "not_performed")
        review = [f["detail"] for f in result["findings"] if f["status"] == "REVIEW"]
        self.assertTrue(any("Degraded=True" in x for x in review))
        self.assertTrue(any("Ready=False" in x for x in review))
        self.assertTrue(any("release unchanged" in x for x in review))
        self.assertTrue(any(f["status"] == "UNKNOWN" for f in result["findings"]))

    def test_hash_tampering_rejected(self):
        p = self.root / "example/before/snapshot.json"
        p.write_bytes(p.read_bytes() + b" ")
        with self.assertRaises(ValueError):
            self.load("before")

    def test_cross_cluster_comparison_rejected_without_output(self):
        after = self.load("after")
        after["resources"]["clusterVersion"]["clusterIdentitySha256"] = "another-cluster"
        source = self.resave(after, "other")
        with self.assertRaises(ValueError):
            evidence.compare(self.root / "example/before", source, self.root / "bad")
        self.assertFalse((self.root / "bad").exists())

    def test_mixed_origin_rejected(self):
        after = self.load("after")
        after["origin"] = "live_collection"
        source = self.resave(after, "mixed")
        with self.assertRaises(ValueError):
            evidence.compare(self.root / "example/before", source, self.root / "bad")

    def test_reversed_capture_time_rejected(self):
        after = self.load("after")
        after.update(captureStartedAt="2026-10-27T10:00:00Z", captureCompletedAt="2026-10-27T10:01:00Z")
        source = self.resave(after, "old")
        with self.assertRaises(ValueError):
            evidence.compare(self.root / "example/before", source, self.root / "bad")

    def test_existing_output_preserved(self):
        marker = self.root / "example/keep.txt"
        marker.write_text("retain")
        with self.assertRaises(FileExistsError):
            evidence.demo(self.root / "example")
        self.assertEqual(marker.read_text(), "retain")

    def test_missing_resources_are_unknown_not_observed(self):
        rows = evidence.findings({"resources": {}, "errors": {}})
        self.assertEqual(len(rows), 4)
        self.assertTrue(all(status == "UNKNOWN" for status, _ in rows))

    def test_projection_drops_annotations_ips_messages_and_names(self):
        raw = {"items": [{"metadata": {"name": "internal-node.example", "annotations": {"token": "DO_NOT_SAVE"}}, "status": {"addresses": [{"address": "192.168.99.99"}], "conditions": [{"type": "Ready", "status": "True", "message": "DO_NOT_SAVE"}], "nodeInfo": {"kubeletVersion": "v1.31.1"}}}]}
        output = json.dumps(evidence.project("nodes", raw))
        for forbidden in ["DO_NOT_SAVE", "192.168.99.99", "internal-node.example"]:
            self.assertNotIn(forbidden, output)
        self.assertIn("v1.31.1", output)

    def test_all_collect_queries_fixed_context_and_failures_suppressed(self):
        calls = []
        def fake_run(argv, **kwargs):
            calls.append(argv)
            return subprocess.CompletedProcess(argv, 1, b"", b"SECRET_ERROR_DO_NOT_SAVE")
        out = self.root / "partial"
        with patch.object(evidence.shutil, "which", return_value="/fake/oc"), patch.object(evidence.subprocess, "run", side_effect=fake_run), contextlib.redirect_stdout(io.StringIO()):
            result = evidence.collect("review-context", "before", out)
        self.assertEqual(result, 2)
        self.assertEqual(len(calls), 4)
        self.assertTrue(all(c[:3] == ["/fake/oc", "--context=review-context", "--request-timeout=15s"] for c in calls))
        self.assertEqual([c[3:] for c in calls], list(evidence.QUERIES.values()))
        text = (out / "snapshot.json").read_text()
        self.assertNotIn("SECRET_ERROR", text)
        self.assertEqual(len(json.loads(text)["errors"]), 4)

    def test_successful_collection_projects_all_resources(self):
        responses = {
            "clusterversion": {"metadata": {"uid": "fictional-uid"}, "status": {"desired": {"version": "4.18.0"}}},
            "clusteroperators": {"items": []}, "machineconfigpools": {"items": []}, "nodes": {"items": []},
        }
        def fake_run(argv, **kwargs):
            return subprocess.CompletedProcess(argv, 0, json.dumps(responses[argv[4]]).encode(), b"")
        with patch.object(evidence.shutil, "which", return_value="/fake/oc"), patch.object(evidence.subprocess, "run", side_effect=fake_run), contextlib.redirect_stdout(io.StringIO()):
            code = evidence.collect("example", "before", self.root / "captured")
        self.assertEqual(code, 0)  # Transport complete does not mean inventory sufficient.
        snapshot = evidence.load_snapshot(self.root / "captured")
        self.assertTrue(any(status == "UNKNOWN" for status, _ in evidence.findings(snapshot)))
        self.assertNotIn("fictional-uid", json.dumps(snapshot))

    def test_removed_nodes_are_flagged(self):
        after = self.load("after")
        after["resources"]["nodes"] = []
        source = self.resave(after, "removed")
        with contextlib.redirect_stdout(io.StringIO()):
            evidence.compare(self.root / "example/before", source, self.root / "report")
        report = json.loads((self.root / "report/comparison.json").read_text())
        self.assertTrue(any("membership changed" in row["detail"] for row in report["findings"]))

    def test_cli_permissions_and_no_cluster_demo_dependency(self):
        out = self.root / "cli-demo"
        run = subprocess.run([sys.executable, str(TOOL), "demo", "--out", str(out)], capture_output=True)
        self.assertEqual(run.returncode, 0)
        if os.name == "posix":
            self.assertEqual(out.stat().st_mode & 0o777, 0o700)
            self.assertEqual((out / "before/snapshot.json").stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
