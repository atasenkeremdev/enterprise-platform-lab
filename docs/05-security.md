# Security posture

[Project overview](../README.md) · [Next: Roadmap](06-roadmap.md)

## Verified controls

- Guest access uses SSH public-key authentication; effective password and keyboard-interactive authentication are disabled.
- The `ubuntu` password was locked at initial validation. Operator access uses an existing private key stored outside this repository.
- SSH verification used strict host-key checking. The guest key was obtained through trusted Proxmox access and pinned locally for the checks.
- A dedicated API automation identity and privilege-separated token exist. Their role assignments are documented in [Proxmox setup](02-proxmox-setup.md).
- VM deletion protection and Terraform `prevent_destroy` are configured.
- Terraform state, plans, local variables, environment files, local credential directories, and private-key patterns are excluded from Git.

Private RFC1918 addresses are documented as LAN topology, not public services. This inspection did not audit router exposure, firewall rules, VPN controls, backups, or all host SSH settings. A private address alone does not prove isolation.

## Credential handling

Never commit API token values, private keys, passwords, Terraform state, saved plans, cloud credentials, or raw diagnostic dumps that may contain them. API token identifiers and RBAC names are configuration metadata; secrets are not required to reproduce the documentation.

Use an approved secret manager or a protected local session to populate provider authentication. Avoid command-line secret arguments, shell tracing, screenshots, and logs containing credentials. Commit `.terraform.lock.hcl` for provider integrity, but keep `.terraform/` local. `.gitignore` does not protect files already tracked: inspect staged content and repository history before publication.

Example review commands:

```sh
git status --short
git diff --check
git diff --cached --stat
git diff --cached
```

For a new operator workstation, generate and protect its own key through the authorized access process; do not distribute another operator's private key. SSH trust should be established through independently verified fingerprints.

## Risks and recommended improvements

| Current limitation | Recommended improvement | Status |
| --- | --- | --- |
| API TLS verification disabled | Establish trusted certificates and enable verification | Planned |
| Root SSH access to Proxmox | Design restricted administrative access and audited escalation | Planned; requires authorization |
| Token has no expiry | Define rotation, expiry, and revocation procedures | Planned; do not change credentials in documentation work |
| ACL covers `/vms` | Review resource scoping and minimal required permissions | Pending adoption review |
| Guest user has passwordless sudo | Review operational access and audit requirements | Planned |
| One operator key used for host and guest | Consider separate scoped keys and recovery access | Planned |
| State is local | Design encrypted, access-controlled state storage with locking | Planned |
| DHCP address may change | Add an authorized reservation and internal DNS | Planned |
| First-boot upgrades disabled | Establish patching cadence and reboot validation | Pending |
| No verified backup/restore evidence | Define backups and demonstrate restoration | Planned |
| Shared flat LAN; firewall posture unaudited | Audit exposure before Kubernetes ingress | Planned |
| Manifest signature verification not recorded | Add signature and immutable image provenance checks | Planned |

Safeguards do not replace backups or approval. Do not run destroy, remove volumes, change host network/storage/authentication, or add VMs without authorization. Keep GitHub publication private by default; private repository access is an additional control, not permission to store secrets.

## Adoption completed — 2026-10-25

Adoption completed with credentials loaded from the ignored local `.env` without displaying values. State, state backups, and the saved plan remain ignored; current state, plan, and `.env` were restricted to mode `0600`. No token, RBAC, or authentication changes were made. Local state and backup limitations remain.
