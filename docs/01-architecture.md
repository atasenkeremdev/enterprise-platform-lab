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
| Guest NIC MAC | `BC:24:11:9F:91:F5` |

No public exposure, VPN, network segmentation, or router firewall policy was verified. The documented addresses do not represent public endpoints. DHCP reservation and internal DNS are future improvements.

## Storage layout

| Storage ID | Backend | Intended / observed use |
| --- | --- | --- |
| `local` | Directory `/var/lib/vz` on system disk | ISO, backup, import, container templates |
| `local-lvm` | LVM-thin, VG `pve`, pool `data` | Supports VM and container disks; no VM 200 volumes |
| `nvme-vm` | LVM-thin, VG and pool `nvme-vm` | VM 200 root disk and cloud-init media |

The system root volume is approximately 68.1 GiB, swap 7.6 GiB, and `pve/data` 137.4 GiB. The NVMe thin pool is approximately 467.3 GiB. VM 200 has a 40 GiB virtual root disk and 4 MiB cloud-init disk. The verified source image remains on `local` with two hard-linked filenames.

## Decisions and implications

- **Separate VM datastore:** place guest volumes on NVMe while retaining the existing host installation and image directory on SATA.
- **Official Ubuntu cloud image:** use cloud-init for repeatable identity, SSH keys, and DHCP configuration.
- **One small VM:** allocate 2 vCPU and 3072 MiB RAM as a starting point; measure available capacity before adding platform services.
- **DHCP:** reuse the existing LAN service; address stability is not guaranteed.
- **CLI bootstrap, Terraform adoption:** the VM was created through SSH because API credentials were not loaded. Adoption remains pending, so Terraform is not yet the authoritative state record for the VM.
- **Deletion safeguards:** Proxmox protection and Terraform `prevent_destroy` are configured. Neither replaces review, backups, or explicit authorization.

## Management plane

The operator uses the local `proxmox-lab` SSH alias and an existing Ed25519 key. Terraform targets the private Proxmox API on port 8006. Guest login uses `ubuntu` with public-key authentication. See [security](05-security.md) for the current root SSH access and TLS risks.
