# DORA-focused change evidence MVP

[Project overview](../README.md) · [Product roadmap](06-roadmap.md)

Status: product design, data contract and synthetic UI prototype, 2026-10-28. No collection service, authentication, evidence storage, or DORA compliance determination is implemented. The public BankOps site introduces the product and links to a synthetic, read-only /demo walkthrough.

## First workflow

A platform engineer prepares a change evidence package; a reviewer sees what changed, why, how it was tested, who authorised it, and what happened after deployment. Start with one normal application change. Emergency changes, incident reporting, resilience testing programmes, and third-party registers are outside this first slice.

The pilot uses synthetic data and, later, explicitly selected non-sensitive lab delivery metadata. It must not ingest customer data, credentials, kubeconfigs, Terraform state/plans, full CI logs, or bank infrastructure inventories. A CI success proves a particular check ran; it is not independent business approval or evidence of overall compliance.

## Regulatory anchor and limits

DORA Article 9(4)(e) addresses risk-based, controlled ICT change management spanning recording, testing, assessment, approval, implementation, and verification. [Official Regulation (EU) 2022/2554](https://eur-lex.europa.eu/eli/reg/2022/2554/oj).

Article 17 of Delegated Regulation (EU) 2024/1774 adds detail on security requirements, independent approval functions, responsibilities, change documentation, fallback, emergency changes and security impact. This MVP explores the normal-change subset; it does not implement the whole article. [Official Delegated Regulation](https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj).

| Reference | Proposed package support | Gap that remains |
| --- | --- | --- |
| DORA 9(4)(e) | Change record; assessed risk; test, approval and deployment references | Organisational policies and controlled operation are not established by a record |
| RTS 17(1)(a), (h) | Security checks, impact and additional measures | A human must evaluate adequacy and applicable requirements |
| RTS 17(1)(b), (c) | Requester, implementer, accountable owner and independent reviewer | Identity and organisational function separation need enforcement |
| RTS 17(1)(d) | Purpose, scope, planned window, expected outcome | Communication beyond the product remains an organisational process |
| RTS 17(1)(e) | Fallback plan and responsible owner | Actual recovery feasibility and exercises are not demonstrated |

This is a product mapping proposal, not legal advice, certification, or a finding that DORA applies to the lab or that any customer meets its obligations. Applicability, proportionality, entity-specific requirements and the full/simplified framework need separate assessment. References were checked against official published texts on the date above; the cited obligations do not prescribe this JSON format or a universal retention period.

## User flow and decision rules

1. Draft: record purpose, target system/environment, ownership, planned window, expected outcome and fallback.
2. Assess: document risk/security impact and attach explicit test/security-check references.
3. Request review: flag absent fields, unavailable sources and incomplete checks. Label these as package gaps, never as a DORA compliance score.
4. Independent review: approval applies to one exact package revision. The reviewer cannot be the requester or implementer. Distinct user IDs are only a minimum check; organisational approval-function independence must be established outside this fixture.
5. Implement and verify: attach immutable source commit, CI run, image digest, deployment revision and observed health result. An approval timestamp must precede normal-change implementation; post-deployment health must follow it.
6. Export: produce a human-readable summary and versioned JSON for review. Later revisions invalidate prior approval and require review again; rejected records retain the decision history.

Before approval the package is prepared, not complete. After approval it is approved, not yet implemented. After recorded deployment and verification it may be described as a verified package; that label is not “DORA compliant”. Missing human review in our lab must remain visible. The existing automated deployment pipeline is not modified to pretend it already enforces this proposed approval flow.

## Data contract

[JSON Schema](../product/dora/change-evidence.schema.json) defines a draft package. [Synthetic example](../product/dora/examples/change-evidence.synthetic.json) demonstrates its shape. Neither is a live BankOps record.

| Object | Purpose |
| --- | --- |
| Package | Stable ID, schema version, revision, classification, status and timestamps |
| Change | Target environment, scope, purpose, window, expected outcome, risk/security impact and fallback |
| People | Accountable owner, requester, implementer; no tokens, passwords or real contact details in examples |
| Evidence references | Explicit artifact type, source URI, source time, collection time and optional SHA-256 |
| Review | Decision bound to revision, reviewer identity, rationale and timestamp |
| Implementation | Source/image/deployment identifiers and implementation/verification observations |

Drafts allow missing review/implementation fields. The schema checks structure; identity separation, chronological order, revision binding, source accessibility and workflow transitions require application-level validation. Unknown properties are rejected to reduce accidental data capture. URI references are pointers, not uploaded content or proof of authenticity. A digest detects byte changes against a known value; it does not establish source identity or tamper-proof storage. Do not fetch arbitrary supplied URIs on the server: any future collector needs an explicit source allowlist and protection against private-network requests.

## Implementation sequence

1. **Now:** agree the narrow workflow and validate the synthetic contract. No runtime resource increase.
2. **Prototype:** a read-only package screen uses only the synthetic fixture, with source provenance and visible gaps. The operator requested a website demo, so /demo is public and explicitly synthetic. Real evidence screens and data remain outside this public exposure decision.
3. **Then:** implement package validation/export and a read-only collector for allowlisted, non-sensitive delivery metadata. Use real source identifiers and collection timestamps; never manufacture historical approvals or test results.
4. **Before real data:** establish authentication, per-record authorisation, organisation isolation, trusted audit events, retention/deletion policy, encrypted persistence, backup and restore verification. Select database and measured resource budget at that point; current K3s RAM does not need to change for this design work.
5. **Before external pilot:** demonstrate the actual workflow and its limitations with a designated reviewer. Do not promise integration availability before it is implemented and tested.

## Acceptance for the next implementation slice

- A reviewer can distinguish synthetic examples, collected observations and human assertions.
- Missing tests, missing fallback, failed checks and missing review are visible without an invented compliance percentage.
- Self-approval, stale-revision approval, approval after normal implementation and verification before implementation are rejected by domain validation.
- A fixture cannot cause external requests or disclose secrets. No real evidence is exposed on the public website.
- Draft export round-trips against the versioned contract; no arbitrary fields or unsupported schema version are accepted.
- Original source and collection timestamps remain distinct. An unreachable source is flagged as unavailable rather than silently treated as verified.
- Resource use is measured before adding any persistent service to the 3 GiB single-node lab.

## Design artifact validation

The JSON Schema was checked with a Draft 2020-12 validator in a temporary environment, with date-time and URI format checks enabled. The synthetic draft passed. Seven invalid variants were rejected: unsupported version, non-positive revision, invalid timestamp, unexpected field, invalid digest, out-of-scope emergency change type and invalid source URI. No validation dependency was added to the web application. These checks validate the contract, not the proposed workflow or regulatory compliance.

## Synthetic website walkthrough

The /demo route demonstrates the draft package with overview, ownership, risk/fallback disclosure, evidence provenance and four illustrative gaps. Visitors can filter checks and download the original synthetic JSON. There are no approvals, inputs, uploads, collector requests, user identity, persistence or new API endpoints. The UI checklist is a fixed walkthrough, not a runtime evaluation of arbitrary packages or a legal compliance score. The draft JSON download intentionally does not contain those UI checks.

The canonical fixture remains product/dora/examples/change-evidence.synthetic.json. A byte-equivalent JSON copy is shipped in apps/bankops-web/public/demo for the app-only Docker build context. Browser tests compare the served JSON with the canonical object; update both together. Future operational code must never replace this public fixture with real evidence.

The synthetic walkthrough is deployed at https://bankops.dev/demo. Production build, CI container checks and eight public desktop/mobile browser checks passed. [Publication evidence](10-bankops-web.md#verified-demo-publication) records the exact image and source revisions.
