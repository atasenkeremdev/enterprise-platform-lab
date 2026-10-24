# Platform roadmap

[Project overview](../README.md)

The roadmap separates verified outcomes from future work. The documentation milestone was followed by a successful Terraform import-only adoption. K3s remains uninstalled.

| Milestone | Status | Acceptance criteria |
| --- | --- | --- |
| Proxmox and storage baseline | Completed | Host, bridge, and datastores inspected and documented |
| Ubuntu bootstrap | Completed | VM 200 running; cloud-init, DHCP, DNS, and public-key SSH verified |
| Image reuse workaround | Completed | Existing image integrity and checksum verified; no duplicate download |
| Project documentation | Completed | Architecture, operations, security, and state limitations documented |
| Private GitHub publication | Completed | Private repository created; `main` pushed and visibility verified |
| Terraform adoption | Completed | VM 200 imported without mutation; zero-change follow-up plan verified |
| Single-node K3s | Planned | Version and resource budget selected; node Ready; workloads survive reboot |
| GitOps delivery | Planned | Choose Flux or Argo CD; repository reconciliation and rollback demonstrated |
| Observability | Planned | Metrics, dashboards, actionable alerts, and log retention within capacity |
| Security baseline | Planned | Trusted API TLS, scoped access, patching, secret management, exposure review |
| Recovery | Planned | Protected state backups and a demonstrated guest/platform restore |
| Platform capabilities | Planned | Reusable templates, application onboarding, policy checks, delivery documentation |

## Completed milestone: Terraform adoption

The [adoption results](03-terraform.md) confirm VM 200 in local state, an import-only apply, a zero-change follow-up plan, and continued guest connectivity. State remains local; remote state and recovery work remain planned.

## Single-node K3s

After adoption, select a supported pinned K3s release, confirm guest patch status, and review CPU/RAM headroom and network requirements. Choose ingress, storage, and backup behavior explicitly. A single-node cluster is a learning platform with a single failure domain, not a highly available service. Do not provision additional VMs without approval.

## GitOps and observability

Select one GitOps controller and define repository layout, environment promotion, and encrypted secret delivery. Start with one application and demonstrate reconciliation and rollback. Add resource-conscious metrics and logs, with explicit retention and alert ownership. Tool choices and successful deployments remain unverified until implemented.

## GitHub publication

Published to [atasenkeremdev/enterprise-platform-lab](https://github.com/atasenkeremdev/enterprise-platform-lab) with **private** visibility. GitHub CLI authentication was confirmed, the repository was created, and `main` was pushed with upstream tracking to `origin/main`. Access requires repository permission.

For subsequent documentation updates, review staged content for secrets before committing and pushing. Verify publication with:

```sh
gh repo view atasenkeremdev/enterprise-platform-lab --json url,visibility,defaultBranchRef
git status --short
git ls-remote origin refs/heads/main
```

Do not change repository visibility to public without explicit approval.

## Adoption completed — 2026-10-25

Adoption completed using credentials loaded from the ignored local `.env`, without printing their values. VM 200 remained running; no resource changes were applied. Single-node K3s is the next planned milestone and has not been installed.
