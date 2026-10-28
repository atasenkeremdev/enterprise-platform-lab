# From technical output to a reviewable change record

## Worked example

The bundled data is fictional, partial and deliberately not a successful-upgrade story.

| Field | Before | After | Interpretation |
| --- | --- | --- | --- |
| Desired release | 4.18.0 | 4.18.0 | No desired release change observed; check the intended scope |
| Network Operator Degraded | False | True | Investigate platform degradation |
| Worker pool updated count | 3/3 | 2/3 | Pool is not fully converged |
| Selected node Ready | True | False | A selected node is not ready |
| Node pressure conditions | Absent | Absent | Unknown, not assumed false |
| Application regression | Not collected | Not collected | Development/service-owner result is still needed |

`OBSERVED`: a specific expected field value was present. This is not a whole-cluster health claim.

`REVIEW`: a mismatch, changed membership or condition needs human investigation. The tool does not diagnose a root cause.

`UNKNOWN`: data/fields/inventory are insufficient. Lack of evidence is not a clean result.

## What to attach to a change record

1. Capture manifest and selected snapshot, with local storage reference and classification.
2. Comparison report and analyst interpretation.
3. Supported target/update-path assessment and relevant release/Operator compatibility review, obtained separately.
4. Development/service-owner test results, including the environment and tested version.
5. Independent decision, scope, rationale and the exact package revision reviewed.
6. Recovery readiness and responsibility, supported by separately verified procedures.

Infra owns the platform evidence in this example. Development owns application behaviour evidence. A designated independent approval function remains separate from requesting/implementing the change. Team titles are illustrative organisational assignments, not built-in authority.

## Questions the tool cannot answer

- Is a direct 4.18→4.22 upgrade supported for this particular cluster?
- Is a conditional recommendation acceptable to this organisation?
- Will an untested application or third-party Operator work after maintenance?
- Is a backup restorable, or is a downgrade safe/supported?
- Is the reviewer authorised and independent?
- Does this organisation meet DORA or another regulatory framework?

Do not infer those answers from selected green conditions. The report has no compliance percentage.

## Source documents

- Red Hat OpenShift 4.18, performing a cluster update: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/updating_clusters/performing-a-cluster-update
- Red Hat OpenShift update overview: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/updating_clusters/index

These links provide operational context, not a promise that this preview implements every requirement. Cluster recommendations and supported paths require current, environment-specific review. No vendor documentation is bundled as our own material.
