# Architecture

[Project overview](../README.md) · [Next: Proxmox setup](02-proxmox-setup.md)

## Verified physical architecture

The lab consists of one Proxmox node, `pve`. Installation history and chassis model are not recorded; the following inventory was read from the running system on 2026-10-25.

| Component | Observed configuration |
| --- | --- |
| Hypervisor | Proxmox VE 9.2.21; kernel 7.0.14-25-pve |
| Processor | Intel Core i5-6500T, 4 cores / 4 logical CPUs, VT-x |
| Host memory | 7819 MiB reported usable, approximately 8 GiB installed |
| System disk | Samsung SSD 750 EVO 250GB, 232.9 GiB reported |
| VM disk | Intel SSDPEKNW512G8H NVMe, 476.9 GiB reported |

This is a single failure domain with no verified high-availability configuration. Thin provisioning does not reserve physical capacity equal to each virtual disk's maximum size.

## Logical architecture and networking

The physical interface `nic0` is attached to Linux bridge `vmbr0`. The host has static private address `192.168.10.10/24`; its default gateway is `192.168.10.1`. VM 200 attaches a VirtIO NIC to the same bridge, with no VLAN tag in its VM configuration.

| Endpoint | Address / role |
| --- | --- |
| Proxmox management | `192.168.10.10`, private LAN only |
| Router / observed DHCP server | `192.168.10.1` |
| Ubuntu VM | DHCP lease `192.168.10.226/24` |
| VM NIC MAC | `BC:24:11:9F:91:F5` |
| AI LXC CT 201 | DHCP lease `192.168.10.162/24`; MAC `BC:24:11:88:8A:EF` |

No public exposure, VPN, network segmentation, or router firewall policy was verified. The documented addresses do not represent public endpoints. DHCP reservation and internal DNS are future improvements.

## Storage layout

| Storage ID | Backend | Intended / observed use |
| --- | --- | --- |
| `local` | Directory `/var/lib/vz` on system disk | ISO, backup, import, container templates |
| `local-lvm` | LVM-thin, VG `pve`, pool `data` | Supports VM and container disks; no VM 200 volumes |
| `nvme-vm` | LVM-thin, VG and pool `nvme-vm` | VM 200 root disk/cloud-init media and CT 201 20 GiB rootfs |

The system root volume is approximately 68.1 GiB, swap 7.6 GiB, and `pve/data` 137.4 GiB. The NVMe thin pool is approximately 467.3 GiB. VM 200 has a 40 GiB virtual root disk and 4 MiB cloud-init disk. The verified source image remains on `local` with two hard-linked filenames.

## Decisions and implications

- **Separate VM datastore:** place guest volumes on NVMe while retaining the existing host installation and image directory on SATA.
- **Official Ubuntu cloud image:** use cloud-init for repeatable identity, SSH keys, and DHCP configuration.
- **One small VM:** allocate 2 vCPU and 3072 MiB RAM as a starting point; measure available capacity before adding platform services.
- **DHCP:** reuse the existing LAN service; address stability is not guaranteed.
- **CLI bootstrap, Terraform adoption:** the VM was created through SSH because API credentials were not loaded. VM 200 has since been adopted into local Terraform state with a verified zero-change plan.
- **Deletion safeguards:** Proxmox protection and Terraform `prevent_destroy` are configured. Neither replaces review, backups, or explicit authorization.

## Management plane

The operator uses the local `proxmox-lab` SSH alias and an existing Ed25519 key. Terraform targets the private Proxmox API on port 8006. Guest login uses `ubuntu` with public-key authentication. See [security](05-security.md) for the current root SSH access and TLS risks.

## Adoption completed — 2026-10-25

VM 200 is now in local Terraform state after an import-only apply. A fresh plan reports no changes; the VM remained running and reachable. The source image remains outside Terraform ownership.

## Kubernetes layer — 2026-10-25

VM 200 now hosts a single K3s v1.36.5+k3s1 server with embedded SQLite. Containerd, Flannel VXLAN, CoreDNS, Traefik, ServiceLB, and local-path storage remain lightweight defaults. Pod/service ranges are 10.42.0.0/16 and 10.43.0.0/16. Guest-only firewall rules restrict control-plane access to internal traffic and SSH-based administration. See [K3s operations](07-k3s.md) for the verified configuration and single-node limitations.

## Local inference layer — 2026-10-28

A separate unprivileged Debian 13 LXC, lab-ai-01 (CT 201), hosts CPU-only Ollama and qwen2.5-coder:1.5b. It uses 2 vCPU, a two-core quota with lower CPU weight, 2048 MiB RAM, no swap, and a 20 GiB nvme-vm rootfs. Guest memory limits total 5120 MiB on a 7819 MiB host; monitored inference retained over 2.2 GiB host available memory. The API binds only loopback and is reached through a strict-host-key Mac SSH tunnel. No operator private credentials, host mounts, execution agent, or GPU passthrough were provided. Terraform manages CT 201 after SSH bootstrap and import; VM 200 remained unchanged. See [deployment and benchmark evidence](09-local-llm.md).

## BankOps.dev application layer — 2026-10-28

A single lightweight Next.js pod in the bankops namespace serves the private-LAN landing page through the existing Traefik ingress and ClusterIP Service. GitHub Actions builds/tests the amd64 standalone image, publishes an immutable GHCR digest, and commits the deployment reference. Two Flux controllers reconcile the public repository over verified HTTPS; the application reconciler is restricted to its namespace. No database or business backend is present. The deployment added only Kubernetes resources, with no Proxmox guest reconfiguration. See [BankOps operations](10-bankops-web.md).
