# Terraform workflow and state adoption

[Project overview](../README.md) · [Next: Ubuntu VM](04-ubuntu-vm.md)

## Configuration and repository structure

Terraform 1.17.0 and bpg/proxmox 0.118.0 were used for successful local validation. `versions.tf` permits Terraform `>= 1.13.0, < 2.0.0` and pins the provider to `= 0.118.0`.

```text
terraform/environments/lab/
├── .terraform.lock.hcl  # Provider version and checksums
├── data.tf             # Node discovery data source
├── images.tf           # Existing image volume ID; no download resource
├── imports.tf          # Declarative adoption of pve/200
├── outputs.tf          # Node-name output
├── providers.tf        # Private API endpoint; current TLS exception
├── variables.tf        # Operator public-key path
├── versions.tf         # Terraform and provider constraints
└── vm.tf               # Desired VM 200 configuration
```

The provider endpoint is `https://192.168.10.10:8006/`, accessible only through the private lab network. `insecure = true` is an existing TLS verification exception, not a recommended production setting. API credentials should be injected through `PROXMOX_VE_API_TOKEN` by an approved secret manager or a protected shell session. Do not echo the value, paste it into commands, or commit it. See the [provider documentation](https://bpg.sh/docs/) for authentication details.

## Current state versus desired configuration

**Completed:** VM 200 exists and is validated operationally. It was provisioned through `qm` over SSH, not Terraform apply. Terraform formatting and validation pass.

**Pending:** current local state contains only `data.proxmox_virtual_environment_nodes.available`. No VM import, Terraform provisioning apply, successful live API plan, or zero-drift result has been demonstrated.

`imports.tf` declares:

```hcl
import {
  to = proxmox_virtual_environment_vm.lab_k3s_01
  id = "pve/200"
}
```

The identifier follows the [provider's VM import format](https://bpg.sh/docs/resources/virtual_environment_vm/). This declaration is not evidence of a completed import. Do not remove it and attempt to create another VM with the same ID.

## Image download timeout and reuse

The original download of `noble-server-cloudimg-amd64.img` began at 01:03:39 and ended at 01:13:39 on the host's recorded clock, about 70% through a 593 MiB download. The task reported `download failed: received interrupt`. The ten-minute duration is consistent with a timeout; the component initiating the interruption was not established.

A complete existing image at `/var/lib/vz/import/noble-server-cloudimg-amd64.img` was reused. Prior validation found no `qemu-img check` errors. Its 621284352-byte content matched the [Ubuntu checksum manifest](https://cloud-images.ubuntu.com/noble/current/SHA256SUMS):

```text
04e8f2461a16a44e78a370284471f29616cdd9baf1893df25807b71f985b6c94
```

The SHA-256 was rechecked during documentation. A hard link named `noble-server-cloudimg-amd64.qcow2` shares the same inode and content; Proxmox recognizes it as `local:import/noble-server-cloudimg-amd64.qcow2`. No second download or duplicate image allocation was required. Terraform references this existing volume through a local value; it does not own or delete the shared source file.

Read-only verification:

```sh
ssh proxmox-lab 'ls -li /var/lib/vz/import/noble-server-cloudimg-amd64.*'
ssh proxmox-lab 'sha256sum /var/lib/vz/import/noble-server-cloudimg-amd64.img'
ssh proxmox-lab 'pvesm list local --content import'
```

The Ubuntu `current` URL is mutable. Retain the recorded digest with the retained image; a future manifest may describe a newer build. Signature verification of the manifest was not recorded.

## Safe workflow

From the repository root:

```sh
terraform -chdir=terraform/environments/lab init -lockfile=readonly
terraform -chdir=terraform/environments/lab fmt -check
terraform -chdir=terraform/environments/lab validate
terraform -chdir=terraform/environments/lab state list
```

The lock file selects 0.118.0 but retains historical constraint metadata `~> 0.93`; `versions.tf` pins 0.118.0. This has not prevented validation. Synchronize the metadata in a future controlled dependency maintenance change; do not upgrade blindly.

The default `ssh_public_key_path` points to the existing operator public key. On another workstation, use a local ignored variable file containing only an appropriate public-key path. Preserve the currently authorized key while adopting the VM to avoid accidental access changes.

## Pending adoption procedure

This is a future operational procedure, **not performed during documentation**:

1. Make a protected backup of local state outside Git and establish the intended state owner.
2. Load the existing API credential securely; confirm LAN access and review current RBAC.
3. Run `terraform -chdir=terraform/environments/lab plan`. A plan can contact the API and update local working files; keep its output private.
4. Require an import of `pve/200` with **zero additions, changes, or deletions**. Investigate any replacement, disk operation, cloud-init change, permission failure, or root-only operation before proceeding. Do not broaden privileges automatically.
5. In a separately authorized operational session, apply only the reviewed import plan. No apply or import was executed for this documentation task.
6. Verify the VM resource is in state and a new plan reports no changes; recheck guest SSH and power status.

Do not use the CLI import workflow in parallel with the declarative workflow. Do not run `terraform destroy` or use targeted operations to bypass protection.

## State management

No remote backend is configured. Local state and backups are ignored, are not portable through Git, and can contain sensitive data. `.terraform/`, saved plans, variable files, and crash logs are excluded. Protect state with restrictive local permissions, encrypted backups, and a single writer until a remote backend with encryption, locking, and scoped access is designed and tested. Commit the provider lock file; never commit state or credentials.
