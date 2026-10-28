# Free OpenShift maintenance toolkit

[Project overview](../README.md) · [Website operations](10-bankops-web.md)

The operator authorised publishing the product as a free website download. The public edition is **0.1.0-free-preview**, separate from the unpublished commercial draft. No checkout, registration, email collection or backend was introduced.

## Website and artifacts

- Product route: https://bankops.dev/resources/openshift-maintenance-pack
- ZIP: /downloads/openshift-maintenance-evidence-pack-0.1.0-free-preview.zip
- PDF: /downloads/openshift-maintenance-quickstart.pdf
- Checksum: ZIP URL plus .sha256
- Metadata: /downloads/openshift-maintenance-release.json

The header, footer and a new landing-page resource card link to the product. No visitor-facing GitHub links were added. Assets are static files in the existing Next.js image and follow the same Actions → GHCR → Git digest commit → Flux deployment path.

The public source lives in [product/openshift-maintenance-pack](../product/openshift-maintenance-pack/). The private offer/pricing hypothesis, unpublished licence notice and old private preview archive are not included. The private draft/build folders remain Git-ignored. The free edition includes a narrow evaluation-use notice; free download is not represented as a broad open-source, resale or redistribution licence. No live-compatibility, production-readiness or compliance guarantee is claimed.

## Included and validated

The ZIP contains the local Python collector/comparator, twelve offline tests, a three-page quickstart PDF, editable guides, pre/post checklists, report/CSV templates and a clearly synthetic example. Snapshot projection, file permissions, integrity checks, cross-cluster rejection and incomplete-data behaviour are tested offline. No real oc command or cluster access was used in release testing. Captured operational data must never be placed in these public files.

Local production build/TypeScript passed. Twenty desktop/mobile website checks passed, including the new product route, navigation, no forms, real ZIP/PDF/checksum downloads, archive SHA-256/inventory/manifest verification and execution of the twelve offline tests after extraction. Screenshots were reviewed; 320-pixel layout had no horizontal document overflow. No Proxmox, RAM or cluster configuration changes were required.

## Rebuild and check

From the repository root:

```sh
python3 product/openshift-maintenance-pack/tools/build_release.py --out-dir apps/bankops-web/public/downloads
python3 apps/bankops-web/scripts/verify-toolkit.py
```

The PDF is included alongside its editable HTML source. Update/re-export it when content changes. The builder uses fixed ZIP entry timestamps and a per-file manifest; equivalent source bytes produce equivalent archive bytes. No upload or network call is performed by the builder/verifier. The verifier unpacks into a temporary directory and runs only the package's offline mocked tests.

For a future release, bump the version and use a new immutable ZIP filename rather than silently changing a published versioned download. Update the metadata/page/tests together, re-run scans and validation, and let the existing pipeline deploy it. The plain checksum detects differing bytes relative to the published value; it is not a digital signature or authentic-source attestation.

## Remaining product work

An authorised live non-production OpenShift pilot, independent engineering review and customer usability feedback remain outstanding. The public page makes these limits explicit. There is no payment flow, subscription, telemetry collector, evidence upload or AI service in this release.
