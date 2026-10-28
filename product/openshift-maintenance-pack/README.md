# OpenShift Maintenance & Evidence Pack

**0.1.0-free-preview · Free download · No sign-up · Independent engineering toolkit**

A small, local toolkit for platform and Infra engineers to capture selected platform observations before and after authorised maintenance, compare them and prepare a review handoff. It supplements your existing ITSM, vendor documentation and approval process.

## Try the offline example first

Requirements: Python 3.9+ on Linux/macOS. The offline demo needs no oc client or cluster.

```sh
python3 tools/evidence.py demo --out ./practice-run
```

Open practice-run/comparison/comparison.md, then inspect its before/after snapshots. The clearly synthetic example deliberately includes degradation, incomplete pool convergence and a non-ready node; it does not invent a successful upgrade. A generated example is also bundled under examples/synthetic-run/.

## Included

- tools/evidence.py: fixed-query collector, offline comparison and synthetic demo.
- Quickstart-Guide.pdf and editable Markdown guides.
- Pre/post-maintenance checklists, report template and CSV evidence register.
- Synthetic worked example with SHA-256 manifests.
- Twelve offline regression tests in tests/test_evidence.py.

## Live use requires separate review

No real OpenShift cluster was used to validate this preview. It was designed against selected OpenShift 4.x API shapes informed by 4.18 documentation; broader compatibility is unverified. Read guides/quickstart.md and guides/security-and-scope.md before considering a designated non-production pilot.

The collector uses an explicitly named, existing trusted oc context and four fixed read-only resource queries. It stores selected fields, not raw API responses, kubeconfigs or logs. Hashed identifiers are not guaranteed anonymisation. Captures remain operationally sensitive and must stay out of public repositories, this website and unapproved services.

No upgrade is executed. The tool does not establish a supported upgrade path, approve changes, validate applications, assess legal compliance or guarantee recovery. Never treat exit code 0 as an upgrade gate.

## Tests

```sh
python3 -m unittest discover -s tests -v
```

These tests are offline and mock oc; passing them is not live cluster validation. See VALIDATION.md for exact evidence and limitations.

## Free preview use

Download and evaluate this preview for personal or internal team testing; local modification for that evaluation is permitted. See FREE-PREVIEW-TERMS.md. No support SLA, vendor endorsement, certification or production-readiness promise is included. This is an independent toolkit, not a Red Hat product.
