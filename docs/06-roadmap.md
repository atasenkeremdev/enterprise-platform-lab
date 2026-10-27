# Platform roadmap

[Project overview](../README.md)

The roadmap separates verified outcomes from future work. The documentation milestone was followed by a successful Terraform import-only adoption. K3s installation and reboot recovery are now verified.

| Milestone | Status | Acceptance criteria |
| --- | --- | --- |
| Proxmox and storage baseline | Completed | Host, bridge, and datastores inspected and documented |
| Ubuntu bootstrap | Completed | VM 200 running; cloud-init, DHCP, DNS, and public-key SSH verified |
| Image reuse workaround | Completed | Existing image integrity and checksum verified; no duplicate download |
| Project documentation | Completed | Architecture, operations, security, and state limitations documented |
| Private GitHub publication | Completed | Private repository created; `main` pushed and visibility verified |
| Terraform adoption | Completed | VM 200 imported without mutation; zero-change follow-up plan verified |
| Single-node K3s | Completed | Pinned v1.36.5+k3s1; node Ready; DNS/ingress and workload reboot recovery verified |
| Desktop cluster access | Completed | Headlamp 0.46.0; read-only identity; TLS-verified SSH tunnel; backend discovery validated |
| Local CPU inference | Completed | CT 201; pinned Ollama/model; SSH-only API; benchmarks and host/K3s health validated |
| Model-driven execution agent | Not authorized | No SSH/Git/Terraform tools or agent installed |
| GitOps delivery | Initial delivery completed | Minimal Flux and BankOps image/digest reconciliation verified; rollback drill remains planned |
| BankOps.dev landing page | Completed on private LAN | Next.js container, GHCR publishing, browser checks, Service/Ingress, and Flux Ready |
| Observability | Planned | Metrics, dashboards, actionable alerts, and log retention within capacity |
| Security baseline | Planned | Trusted API TLS, scoped access, patching, secret management, exposure review |
| Recovery | Planned | Protected state backups and a demonstrated guest/platform restore |
| Platform capabilities | Planned | Reusable templates, application onboarding, policy checks, delivery documentation |

## Completed milestone: Terraform adoption

The [adoption results](03-terraform.md) confirm VM 200 in local state, an import-only apply, a zero-change follow-up plan, and continued guest connectivity. State remains local; remote state and recovery work remain planned.

## Single-node K3s

Installed the observed stable-channel release v1.36.5+k3s1 with SQLite, containerd, CoreDNS, Flannel, Traefik, ServiceLB, and local-path storage. [Installation and validation evidence](07-k3s.md) includes resource headroom and guest reboot recovery. Guest patch certification, trusted ingress TLS, and backup/restore validation remain follow-up work. A single-node cluster is a learning platform with a single failure domain, not a highly available service. Do not provision additional VMs without approval.

## GitOps and observability

Flux source/kustomize controllers now reconcile the BankOps landing page from Git. GitHub Actions tests and publishes its container, then commits the immutable deployment digest. Reconciliation is verified; a rollback drill, environment promotion, and secret delivery for future stateful capabilities remain planned. Add resource-conscious metrics and logs, with explicit retention and alert ownership. Observability tool choices and deployments remain unverified until implemented.

## GitHub publication

Initially published to [atasenkeremdev/enterprise-platform-lab](https://github.com/atasenkeremdev/enterprise-platform-lab) with private visibility. On 2026-10-28 GitHub reported **PUBLIC** visibility; this deployment preserved that state. GitHub CLI authentication was confirmed, the repository was created, and `main` was pushed with upstream tracking to `origin/main`. Current source is publicly readable.

For subsequent documentation updates, review staged content for secrets before committing and pushing. Verify publication with:

```sh
gh repo view atasenkeremdev/enterprise-platform-lab --json url,visibility,defaultBranchRef
git status --short
git ls-remote origin refs/heads/main
```

Do not change the currently observed repository visibility without explicit approval.

## Adoption completed — 2026-10-25

Adoption completed using credentials loaded from the ignored local `.env`, without printing their values. VM 200 remained running; no resource changes were applied. Single-node K3s was subsequently installed and validated; GitOps remains planned.

## Local inference — 2026-10-28

The [local LLM milestone](09-local-llm.md) is validated with one small Qwen model, a 1024-token context, and serial CPU inference. Larger models, additional users, or execution tools require a new capacity and security design. This milestone grants no model-driven SSH, Git, Terraform, or repository execution authority.

## BankOps.dev next steps

The [first website](10-bankops-web.md) is a private-LAN product introduction, not a compliance automation backend. Public DNS/HTTPS, the real demo/contact workflow, tenant identity, evidence storage/provenance, and production delivery safeguards remain separate work. Do not expose the lab management plane as part of a public launch.
