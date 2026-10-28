// Product mapping suggestions, not a complete regulatory checklist or compliance decision.
const rts = "https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj";
const dora = "https://eur-lex.europa.eu/eli/reg/2022/2554/oj";
export const references = {
  description: { label: "RTS 17(1)(d) · Change details", url: rts },
  planning: { label: "RTS 17(1)(c) · Planning & responsibilities", url: rts },
  tests: { label: "RTS 17(1)(c) · Controlled testing", url: rts },
  security: { label: "RTS 17(1)(a), (h) · Security requirements & impact", url: rts },
  approval: { label: "RTS 17(1)(b) · Independent approval", url: rts },
  verification: { label: "DORA 9(4)(e) · Controlled change verification", url: dora },
  fallback: { label: "RTS 17(1)(e) · Fallback responsibilities", url: rts },
};
const expectedByPlatform: Record<string, { baseline: string; tests: string; verification: string }> = {
  application: {
    baseline: "A scoped application release plan.",
    tests: "Application test results and image scan findings tied to the proposed release, with timestamp and outcome.",
    verification: "The implemented image identifier, release time, application health observations and the service owner's validation.",
  },
  aks: {
    baseline: "A current/target version assessment, node pool inventory, supported upgrade-path review and capacity/disruption plan.",
    tests: "Development's compatibility/regression results for applications affected by the proposed AKS upgrade.",
    verification: "Infra's node/platform health observations and Development's application checks after the recorded upgrade.",
  },
  openshift: {
    baseline: "ClusterVersion, Cluster Operator and machine config pool observations; a supported update-path review and infrastructure readiness assessment.",
    tests: "Development's application compatibility/regression results, with the tested platform context and outcome.",
    verification: "Post-change Operator, machine config pool and node observations from Infra, plus application validation from Development.",
  },
  rhel: {
    baseline: "A package/kernel inventory, patch applicability review, maintenance plan and host configuration baseline.",
    tests: "Service-owner regression results and package dependency compatibility checks for the proposed OS patch.",
    verification: "Infra's installed package/kernel and reboot/host checks, plus the service owner's application validation.",
  },
};
export function explainCheck(scenarioId: string, checkId: string) {
  const expected = expectedByPlatform[scenarioId];
  const guidance = {
    change_record: { why: "Make the purpose, scope, timing and intended result understandable before review.", expected: "A dated change request naming the affected system, scope, reason, planned window and expected outcome.", reference: references.description },
    baseline: { why: "Establish the starting point and a controlled plan for the proposed change.", expected: expected.baseline, reference: references.planning },
    test_result: { why: "Show what was tested and what the result was, rather than assuming compatibility.", expected: expected.tests, reference: references.tests },
    security_check: { why: "Assess effects on security requirements and existing controls.", expected: "A documented security impact assessment with findings, mitigations and the responsible assessor; a risk statement alone is not a completed assessment.", reference: references.security },
    approval: { why: "Separate the approval function from requesting and implementing the change.", expected: "An authorised independent review decision, its rationale, timestamp and the exact package revision reviewed.", reference: references.approval },
    verification: { why: "Record the implemented result and check what happened after the change.", expected: expected.verification, reference: references.verification },
  };
  return guidance[checkId as keyof typeof guidance];
}
