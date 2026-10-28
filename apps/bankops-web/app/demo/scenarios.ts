import application from "../../public/demo/change-evidence.synthetic.json";
import aks from "../../public/demo/aks-platform.synthetic.json";
import openshift from "../../public/demo/openshift-platform.synthetic.json";
import rhel from "../../public/demo/rhel-platform.synthetic.json";

type Check = { id: string; title: string; state: string; missing: boolean; detail: string; team: string };
type Scenario = {
  id: string; label: string; title: string; environment: string;
  ownerTeam: string; supportingTeam: string; boundary: string; excluded: string;
  download: string; record: typeof application; checks: Check[];
};
const missing = (id: string, title: string, detail: string, team: string): Check => ({ id, title, detail, team, missing: true, state: "Missing" });
const description = (team: string): Check => ({ id: "change_record", title: "Change description", state: "Example attached", missing: false, team, detail: "One synthetic source reference illustrates purpose and scope. It is not a verified observation from a real system." });
const approval = (): Check => ({ ...missing("approval", "Independent review", "No decision or independent reviewer is recorded. The requester or implementer cannot stand in for independent approval. A different team name alone does not establish approval-function independence.", "Independent change reviewer"), state: "Not recorded" });

export const scenarios: Scenario[] = [
  {
    id: "application", label: "Application image · Development", title: "Application image update", environment: "Application workload",
    ownerTeam: "Development", supportingTeam: "Infra: platform availability and deployment constraints",
    boundary: "Development owns application code, image contents, application tests and release evidence in this example. Infra owns the underlying platform, not the application image.",
    excluded: "Cluster upgrades, node lifecycle and operating system changes are outside this application's change scope.",
    download: "change-evidence.synthetic.json", record: application,
    checks: [description("Development"), missing("test_result", "Test results", "No application test run, image scan or release validation is attached.", "Development"), { ...missing("security_check", "Security assessment", application.change.securityImpact, "Development + Security"), state: "Not assessed" }, approval(), { ...missing("verification", "Deployment verification", "No implementation or post-change application observation exists. This package remains a draft.", "Development; Infra supports platform checks"), state: "Not implemented" }],
  },
  {
    id: "aks", label: "Azure AKS platform · Infra", title: "AKS platform and node pool upgrade", environment: "Azure AKS · platform change",
    ownerTeam: "Infra", supportingTeam: "Development: workload compatibility and regression tests",
    boundary: "Infra owns the customer-side upgrade plan, node pool configuration, access/network controls and platform verification. Microsoft operates the managed control plane; this demo does not claim Infra administers its internals.",
    excluded: "Application code and application image contents remain Development responsibilities; no Azure integration is connected.",
    download: "aks-platform.synthetic.json", record: aks,
    checks: [description("Infra"), missing("baseline", "Platform baseline & upgrade plan", "No current/target version assessment, node pool inventory, capacity/disruption plan or supported upgrade-path evidence is attached.", "Infra"), missing("test_result", "Workload compatibility tests", "Development would supply application compatibility and regression results; Infra coordinates platform readiness and the maintenance window.", "Development; coordinated by Infra"), missing("security_check", "Access & network impact", aks.change.securityImpact, "Infra + Security"), approval(), missing("verification", "Platform & workload health", "No post-change node readiness, platform diagnostic observation or application regression result exists.", "Infra: platform; Development: application")],
  },
  {
    id: "openshift", label: "On-prem OpenShift platform · Infra", title: "OpenShift platform upgrade", environment: "On-prem OpenShift · platform change",
    ownerTeam: "Infra", supportingTeam: "Development: workload validation; dependent infrastructure owners",
    boundary: "Infra coordinates the self-managed cluster, node lifecycle and underlying compute/network/storage readiness with the relevant infrastructure owners. OpenShift nodes follow platform-managed OS lifecycle; this is not generic RHEL host patching.",
    excluded: "Application images remain Development-owned. No OpenShift cluster is connected or claimed to run in this lab.",
    download: "openshift-platform.synthetic.json", record: openshift,
    checks: [description("Infra"), missing("baseline", "Cluster & infrastructure readiness", "No ClusterVersion, Cluster Operator or machine config pool observations, supported update-path assessment, capacity review or storage readiness evidence is attached.", "Infra + infrastructure owners"), missing("test_result", "Application compatibility tests", "Development would attach workload compatibility and regression evidence before and after the platform maintenance window.", "Development; coordinated by Infra"), missing("security_check", "Platform security impact", openshift.change.securityImpact, "Infra + Security"), approval(), missing("verification", "Operators, nodes & workload health", "No post-change Operator availability, machine config pool/node health or application validation is recorded.", "Infra: platform; Development: application")],
  },
  {
    id: "rhel", label: "RHEL VM operating system · Infra", title: "RHEL operating system patching", environment: "RHEL VM · operating system change",
    ownerTeam: "Infra", supportingTeam: "Development / service owner: application regression checks",
    boundary: "Infra owns the VM's operating system, package/kernel assessment, host access controls and reboot/recovery plan. Development or the designated service owner validates hosted application behaviour.",
    excluded: "Application code and releases are outside this OS patch scope. This is a standalone RHEL VM example, not an OpenShift node-patching procedure.",
    download: "rhel-platform.synthetic.json", record: rhel,
    checks: [description("Infra"), missing("baseline", "OS baseline & patch assessment", "No package/kernel before-and-after inventory, patch applicability review or host configuration baseline is attached.", "Infra"), missing("test_result", "Service compatibility tests", "No service-owner regression result or package dependency compatibility evidence is attached.", "Development / service owner"), missing("security_check", "Host security & recovery readiness", rhel.change.securityImpact + " No tested recovery evidence is attached.", "Infra + Security"), approval(), missing("verification", "Host, reboot & service verification", "No reboot outcome, host health observation or hosted application validation is recorded.", "Infra: host; service owner: application")],
  },
];
