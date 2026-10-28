# OpenShift change evidence comparison

Origin: **synthetic**

Desired release: 4.18.0 → 4.18.0

Desired version alone is not proof of a completed upgrade. No supported path, approval, application validation or compliance decision is established.

## Post-change observations

- **OBSERVED** — ClusterVersion Available=True
- **OBSERVED** — ClusterVersion Progressing=False
- **OBSERVED** — ClusterVersion Failing=False
- **OBSERVED** — network Available=True
- **OBSERVED** — network Progressing=False
- **REVIEW** — network Degraded=True
- **REVIEW** — worker pool counts/paused: [3, 3, 2, 0, False]
- **REVIEW** — node-fictional-01 Ready=False
- **UNKNOWN** — node-fictional-01 MemoryPressure=None
- **UNKNOWN** — node-fictional-01 DiskPressure=None
- **UNKNOWN** — node-fictional-01 PIDPressure=None
- **REVIEW** — Desired release unchanged; check intended maintenance scope and actual completion evidence

OBSERVED means a narrow expected field value was observed. REVIEW means investigate. UNKNOWN means insufficient data. None means upgrade-ready, safe, approved or compliant.

Hashes detect changes against a local manifest; they are not signatures, trusted timestamps or proof of authentic collection.
