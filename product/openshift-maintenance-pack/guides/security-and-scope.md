# Data handling and operational scope

The collector uses an existing trusted `oc` context and only four fixed read requests. It cannot run upgrades, drain/cordon nodes, patch resources, execute in pods, retrieve Secrets or collect arbitrary logs. Normal authentication can refresh credentials or invoke trusted kubeconfig plugins; no claim is made that authentication itself has no side effects.

Persisted resource data is projected: selected versions, limited condition types/statuses, pool counts/paused state, standard Operator/pool names, node kubelet versions and hashed node identities. Cluster UID is stored as a hash for comparison. Raw responses, labels, annotations, condition messages, node addresses, context names and endpoints are not persisted. Hashing identifiers permits correlation and is **not guaranteed anonymisation**. Operational version and topology information can still be sensitive.

This is data minimisation, not a comprehensive secret-detection or anonymisation product. The local snapshots and reports need classification, restricted storage, access review and an organisation-approved retention/deletion policy. Never commit them or upload them to a public demo, chat or unapproved service. There is no telemetry, remote upload, external AI call or hosted storage in this tool.

SHA-256 manifests detect changes relative to the manifest you retained. Anyone who can alter both can recompute hashes. They are not signatures, trusted timestamps, chain-of-custody infrastructure or proof of genuine API collection. Store protected originals separately if your review process requires it.

Captures are sequential, not transactional. A cluster can change between requests. The capture interval is recorded, but no maximum freshness threshold is imposed. Review timing against your maintenance window and your own policy.

This preview does not collect complete Kubernetes security posture, backups, etcd snapshots, full node inventories beyond the requested resource projection, workload data, PDBs, storage health or all dependency conditions. A complete transport capture is not a comprehensive readiness assessment.

No use of this package authorises production access or operational changes. Complete a reviewed non-production pilot before considering real customer deployment.
