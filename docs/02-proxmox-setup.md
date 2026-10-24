# Proxmox setup and management access

[Project overview](../README.md) · [Next: Terraform](03-terraform.md)

## Installation baseline

Proxmox VE 9.2.21 is already installed and operational on node `pve`. The original installer choices, installation media checksum, firmware settings, and installation transcript were not retained. This document records the verified baseline; it does not claim a reproducible historical installation.

A future rebuild runbook should record verified installation media, firmware virtualization settings, disk selection, management addressing, repository configuration, and restore validation. Do not reinstall or alter the current host as part of documentation work.

Read-only baseline inspection:

```sh
ssh proxmox-lab 'hostname; pveversion; free -m; lsblk -o NAME,SIZE,TYPE,MOUNTPOINTS'
ssh proxmox-lab 'cat /etc/pve/storage.cfg; pvesm status'
ssh proxmox-lab 'ip -brief address; ip route; cat /etc/network/interfaces'
```

The [architecture document](01-architecture.md) records the existing `local`, `local-lvm`, and `nvme-vm` configuration. No storage creation, disk formatting, or host network changes are needed for the current VM.

## API identity and RBAC

An enabled automation user `terraform@pve` and token identifier `terraform-automation` exist. The token has privilege separation enabled and no expiry configured. Token values were neither read nor copied into this repository. Existence of an identity does not establish that the operator has its secret available.

The following ACL assignments were observed for both the user and its token, with propagation enabled:

| Path | Role |
| --- | --- |
| `/vms` | `TerraformProvisioner` |
| `/storage/local` | `TerraformProvisioner` |
| `/storage/nvme-vm` | `TerraformProvisioner` |
| `/nodes/pve` | `TerraformNetworkAccess` |

`TerraformProvisioner` contains:

```text
Datastore.AllocateSpace, Datastore.AllocateTemplate, Datastore.Audit,
SDN.Use, VM.Allocate, VM.Audit, VM.Clone, VM.Config.CDROM,
VM.Config.CPU, VM.Config.Cloudinit, VM.Config.Disk, VM.Config.HWType,
VM.Config.Memory, VM.Config.Network, VM.Config.Options, VM.PowerMgmt
```

`TerraformNetworkAccess` contains `Sys.AccessNetwork`. These are observed custom roles, not a claim that this is the minimal sufficient permission set for all future workflows. The `/vms` assignment is broader than VM 200 alone. Privilege-separated token access depends on both user and token permissions; consult the [official Proxmox permission documentation](https://github.com/proxmox/pve-docs/blob/master/pveum.adoc).

Inspect identifiers and ACL metadata without retrieving secrets:

```sh
ssh proxmox-lab 'pveum acl list; pveum role list'
ssh proxmox-lab 'pveum user token list terraform@pve'
```

Do not add or rotate tokens, change roles, or broaden ACLs during a documentation task. Credentialed API planning and permission sufficiency remain unverified.

## SSH access

The existing alias resolves to `root` on the private Proxmox address, using the operator's existing key. Equivalent local configuration:

```sshconfig
Host proxmox-lab
    HostName 192.168.10.10
    User root
    IdentityFile ~/.ssh/id_ed25519_proxmox
    IdentitiesOnly yes
    StrictHostKeyChecking yes
```

This example belongs in the operator's local SSH configuration, not in the repository as credentials. Confirm the host-key fingerprint through an independent trusted channel before populating `known_hosts`. Never use `StrictHostKeyChecking=no` as a workaround.

```sh
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes proxmox-lab 'qm status 200'
```

Root SSH is the current operational access path; a restricted administrative account is a planned security improvement requiring separate authorization.
