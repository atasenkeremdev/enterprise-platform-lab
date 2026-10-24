# Platform roadmap

[Project overview](../README.md)

The roadmap separates verified outcomes from future work. No K3s installation, infrastructure change, Terraform apply, or import is part of the documentation milestone.

| Milestone | Status | Acceptance criteria |
| --- | --- | --- |
| Proxmox and storage baseline | Completed | Host, bridge, and datastores inspected and documented |
| Ubuntu bootstrap | Completed | VM 200 running; cloud-init, DHCP, DNS, and public-key SSH verified |
| Image reuse workaround | Completed | Existing image integrity and checksum verified; no duplicate download |
| Project documentation | Prepared | Architecture, operations, security, and state limitations documented |
| Private GitHub publication | Pending | Authenticated publication, private visibility, branch push verified |
| Terraform adoption | Pending | Import VM 200 without mutation; successful zero-change follow-up plan |
| Single-node K3s | Planned | Version and resource budget selected; node Ready; workloads survive reboot |
| GitOps delivery | Planned | Choose Flux or Argo CD; repository reconciliation and rollback demonstrated |
| Observability | Planned | Metrics, dashboards, actionable alerts, and log retention within capacity |
| Security baseline | Planned | Trusted API TLS, scoped access, patching, secret management, exposure review |
| Recovery | Planned | Protected state backups and a demonstrated guest/platform restore |
| Platform capabilities | Planned | Reusable templates, application onboarding, policy checks, delivery documentation |

## Next milestone: Terraform adoption

Follow the [adoption procedure](03-terraform.md) with the existing API credential. Resolve permission or configuration differences before applying an import plan. Completion requires VM 200 in state, no proposed resource changes, and unchanged guest connectivity. Do not claim infrastructure is fully managed by Terraform until this is verified.

## Single-node K3s

After adoption, select a supported pinned K3s release, confirm guest patch status, and review CPU/RAM headroom and network requirements. Choose ingress, storage, and backup behavior explicitly. A single-node cluster is a learning platform with a single failure domain, not a highly available service. Do not provision additional VMs without approval.

## GitOps and observability

Select one GitOps controller and define repository layout, environment promotion, and encrypted secret delivery. Start with one application and demonstrate reconciliation and rollback. Add resource-conscious metrics and logs, with explicit retention and alert ownership. Tool choices and successful deployments remain unverified until implemented.

## Publication prerequisite

At documentation inspection, no Git remote existed and GitHub CLI (`gh`) was not installed. On the operator's macOS workstation with Homebrew:

```sh
brew install gh
gh auth login --hostname github.com --web --git-protocol https
gh auth status
```

Resume publication after authentication. Before creating a repository, recheck remotes and whether the selected account already owns `enterprise-platform-lab`. Do not overwrite or repurpose an existing repository without reviewing it. For a new repository, the intended command is:

```sh
gh repo create enterprise-platform-lab --private --source=. --remote=origin --push
```

After publication, verify repository visibility and the pushed branch. No repository URL or successful push is claimed until those checks pass.
