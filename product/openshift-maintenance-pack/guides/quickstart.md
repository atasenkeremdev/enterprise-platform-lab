# Capture and review workflow

## 1. Practise offline

Run `python3 tools/evidence.py demo --out ./practice-run`. It generates private local files, clearly marked synthetic. Do not attach this output to a real change as collected evidence.

## 2. Prepare live capture separately

Use Python 3.9+ and an OpenShift-supported `oc` client appropriate to your cluster. Establish connectivity and normal TLS verification through your own approved process. This tool has no login, credential-provisioning or permission-granting function. Existing kubeconfig exec authentication plugins may run as part of normal `oc` authentication; only use a context you trust.

Read access needed by the four requests: get ClusterVersion/version; list ClusterOperators; list MachineConfigPools; list Nodes. Broader cluster-admin access is not a prerequisite of this collector and should not be granted just to remove permission errors.

Select the context explicitly. Confirm it identifies the authorised environment using your existing operational procedure; the tool deliberately does not print the cluster endpoint or username. Its four fixed queries are equivalent to:

```text
oc --context=YOUR_CONTEXT --request-timeout=15s get clusterversion version -o json
oc --context=YOUR_CONTEXT --request-timeout=15s get clusteroperators -o json
oc --context=YOUR_CONTEXT --request-timeout=15s get machineconfigpools -o json
oc --context=YOUR_CONTEXT --request-timeout=15s get nodes -o json
```

It never uses a shell or accepts arbitrary command arguments. Each client process is bounded by 25 seconds. Slow/unavailable/forbidden/malformed requests become partial capture errors, not successful checks. Raw stderr is suppressed to avoid persisting credential-bearing error messages.

## 3. Capture before and after

Use the collect commands in the main README with new private output paths. Each run creates:

- `snapshot.json`: capture interval, phase, origin, selected resource fields and generic errors.
- `manifest.json`: snapshot SHA-256, origin and tool version.

Directories are 0700 and files 0600 on POSIX through a restrictive process umask. Complete transport capture means the four requests were usable, not that the platform is ready or the inventory sufficient. Empty inventories and absent conditions remain unknown in interpretation.

## 4. Compare locally

`compare` makes no network requests. It rejects mismatched cluster identity hashes, mixed synthetic/live origin, reversed phases, overlapping/reversed capture times and a changed snapshot hash. It highlights membership changes; a missing post-change node is not silently ignored.

Review `comparison.json` and `comparison.md`. Desired release values and selected health conditions are observations, not proof of an approved/completed update. Check full release history, supported recommendations, Operator compatibility, dependent systems and application validation separately.

## Exit codes

- `0`: requested artifact/report generated. **Not an approval/readiness/compliance gate**, even if findings require review.
- `2`: partial collection or an invalid/unavailable operation. Inspect the generic errors and your authorised environment; no raw errors or credentials are printed.

Do not wire code 0 to an upgrade or approval automation.

## Troubleshooting

- `oc` missing: install an appropriate supported client yourself; this pack does not install software.
- Partial collection: check authorised read permissions, API reachability, trusted TLS configuration and client/server compatibility. The pack never retries by escalating privileges or bypassing TLS.
- Output exists: use a new run directory. Preserve the existing evidence.
- Hash mismatch: stop and investigate changes to the local evidence; do not edit the manifest to conceal them.
- Identity mismatch: compare captures from the same cluster. A rebuilt cluster with the same display name can legitimately have a new identity.
- Capture interval error: inspect clock synchronisation and phase selection. Never alter timestamps to make unrelated captures look sequential.
