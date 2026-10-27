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
| Shared flat LAN; guest control-plane guard verified | Audit router exposure and workload ingress policy | Partially addressed; see K3s operations |
| Manifest signature verification not recorded | Add signature and immutable image provenance checks | Planned |

Safeguards do not replace backups or approval. Do not run destroy, remove volumes, change host network/storage/authentication, or add VMs without authorization. Keep GitHub publication private by default; private repository access is an additional control, not permission to store secrets.

## Adoption completed — 2026-10-25

Adoption completed with credentials loaded from the ignored local `.env` without displaying values. State, state backups, and the saved plan remain ignored; current state, plan, and `.env` were restricted to mode `0600`. No token, RBAC, or authentication changes were made. Local state and backup limitations remain.

## K3s controls — 2026-10-25

K3s secrets encryption is enabled. The canonical admin kubeconfig is root:ubuntu mode 0640, accessed through a symlink inside ubuntu's mode-0700 `.kube` directory; its contents remain outside Git. The guest-only persistent nftables guard blocks eth0 ingress to TCP 6443/6444/10250 and UDP 8472 before K3s starts. A direct workstation-to-API connection was blocked and the drop counter increased. Firewall persistence and K3s startup were verified after a guest reboot. UFW remains inactive; router exposure and general workload policy remain unaudited. Traefik/ServiceLB retain private-IP HTTP/HTTPS ingress. See [network boundaries and recovery limits](07-k3s.md).

## Desktop dashboard access — 2026-10-25

Headlamp Desktop on the Mac uses a dedicated read-only service account and one-hour TokenRequest credentials refreshed over existing SSH. Local kubeconfigs are mode 0600 and retain no administrator client key or permanent bearer token. The API is reached through a loopback-only SSH forward with CA and SAN verification. Node/namespace/system-pod access succeeds, while Secrets, deployment writes, and pod exec are denied. See [Headlamp operations](08-headlamp.md) for renewal, revocation, local app storage, and troubleshooting.

## Local inference boundary — 2026-10-28

The AI service is isolated in unprivileged CT 201 with hard memory/CPU limits, no swap, no host bind mounts, and no GPU passthrough. Debian systemd requires nesting for standard mounts; this shares the host kernel and does not provide VM-level isolation. Ollama runs as a non-login unprivileged account with no capabilities, private devices, protected homes, a read-only system, and SSH/Git/Terraform executables hidden in its service namespace. No execution agent or operator private credentials were installed in the model environment.

The API listens only on 127.0.0.1:11434. Mac access uses a loopback SSH forward with a guest host key pinned through existing trusted Proxmox access. The API has no independent authentication, so trusted local Mac processes can use an active tunnel. Cloud features are disabled; generated text was never executed. Direct LAN access failed validation. See [access, resource guard, and limitations](09-local-llm.md).
