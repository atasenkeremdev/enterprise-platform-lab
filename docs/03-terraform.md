# Terraform workflow and state adoption

[Project overview](../README.md) · [Next: Ubuntu VM](04-ubuntu-vm.md)

## Configuration and repository structure

Terraform 1.17.0 and bpg/proxmox 0.118.0 were used for successful local validation. `versions.tf` permits Terraform `>= 1.13.0, < 2.0.0` and pins the provider to `= 0.118.0`.

```text
terraform/environments/lab/
├── .terraform.lock.hcl  # Provider version and checksums
├── data.tf             # Node discovery data source
├── images.tf           # Source image provenance; no managed image
├── imports.tf          # Declarative adoption of pve/200
├── outputs.tf          # Node-name output
├── providers.tf        # Private API endpoint; current TLS exception
├── variables.tf        # Operator public-key path
├── versions.tf         # Terraform and provider constraints
└── vm.tf               # Desired VM 200 configuration
```

The provider endpoint is `https://192.168.10.10:8006/`, accessible only through the private lab network. `insecure = true` is an existing TLS verification exception, not a recommended production setting. API credentials should be injected through `PROXMOX_VE_API_TOKEN` by an approved secret manager or a protected shell session. Do not echo the value, paste it into commands, or commit it. See the [provider documentation](https://bpg.sh/docs/) for authentication details.

## Current state versus desired configuration

**Completed on 2026-10-25:** VM 200 was adopted into local Terraform state without changing the running VM. Formatting and validation pass. The reviewed plan reported `1 to import, 0 to add, 0 to change, 0 to destroy`; applying that saved plan reported `1 imported, 0 added, 0 changed, 0 destroyed`. A fresh plan with `-detailed-exitcode` returned exit code 0 and `No changes`.

State now contains `data.proxmox_virtual_environment_nodes.available` and `proxmox_virtual_environment_vm.lab_k3s_01` (ID 200).

`imports.tf` declares:

```hcl
import {
  to = proxmox_virtual_environment_vm.lab_k3s_01
  id = "pve/200"
}
```

The identifier follows the [provider's VM import format](https://bpg.sh/docs/resources/virtual_environment_vm/). The declaration is retained as adoption history; the successful import and follow-up plan were verified separately. Do not attempt to create another VM with the same ID.

## Image download timeout and reuse

The original download of `noble-server-cloudimg-amd64.img` began at 01:03:39 and ended at 01:13:39 on the host's recorded clock, about 70% through a 593 MiB download. The task reported `download failed: received interrupt`. The ten-minute duration is consistent with a timeout; the component initiating the interruption was not established.

A complete existing image at `/var/lib/vz/import/noble-server-cloudimg-amd64.img` was reused. Prior validation found no `qemu-img check` errors. Its 621284352-byte content matched the [Ubuntu checksum manifest](https://cloud-images.ubuntu.com/noble/current/SHA256SUMS):

```text
04e8f2461a16a44e78a370284471f29616cdd9baf1893df25807b71f985b6c94
```

The SHA-256 was rechecked during documentation. A hard link named `noble-server-cloudimg-amd64.qcow2` shares the same inode and content; Proxmox recognizes it as `local:import/noble-server-cloudimg-amd64.qcow2`. No second download or duplicate image allocation was required. The source volume is documented in `images.tf`; Terraform does not own or delete it. The existing disk is adopted without `import_from`.

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

The lock file and `versions.tf` both select provider 0.118.0. Historical lock constraint metadata was synchronized with the existing version pin without changing the provider version or any checksum. `terraform init -lockfile=readonly -input=false` succeeded after this correction.

The default `ssh_public_key_path` points to the existing operator public key. On another workstation, use a local ignored variable file containing only an appropriate public-key path. Preserve the currently authorized key while adopting the VM to avoid accidental access changes.

## Completed adoption procedure

1. Backed up local state with restrictive permissions and verified Git exclusions.
2. Disabled shell tracing and loaded the trusted local `.env` using `set -a; source ./.env; set +a` before Terraform commands. Checked credential presence without printing values.
3. Inspected the initial live plan: it proposed an in-place disk change solely to add `import_from`. This plan was never applied.
4. Removed the creation-time `disk.import_from` setting and unused image local, matching the existing disk instead of altering it. No cloud-init, hardware, authentication, or power changes were needed.
5. Saved and reviewed a new import-only plan, then applied that exact plan with `terraform apply -input=false -no-color adoption.tfplan`.
6. Verified a fresh zero-change plan, state membership, running power status, no pending Proxmox configuration changes, guest SSH access, completed cloud-init, active SSH service, and zero failed systemd units. Guest uptime remained continuous; no reboot or stop was performed.

The provider could not start under the local sandbox; the live Terraform commands succeeded with approved execution outside that sandbox. No provider upgrade or privilege change was required.

For future plans, load the trusted local environment without tracing or echoing credentials. Stop if a plan proposes deleting, replacing, stopping, or recreating VM 200. Do not use targeted operations to bypass protection. K3s was subsequently installed inside the guest; see [K3s operations](07-k3s.md).

## State management

No remote backend is configured. Local state and backups are ignored, are not portable through Git, and can contain sensitive data. `.terraform/`, saved plans, variable files, and crash logs are excluded. Protect state with restrictive local permissions, encrypted backups, and a single writer until a remote backend with encryption, locking, and scoped access is designed and tested. Commit the provider lock file; never commit state or credentials.

## Historical preflight result — 2026-10-25

This earlier credential failure was resolved by the completed adoption above.

The existing state was backed up locally before adoption work, using a timestamped `terraform.tfstate.pre-adoption.*.backup` filename and mode `0600`. Git ignore checks confirmed that the backup and state remain excluded. Do not publish these files.

VM 200 remained running with unchanged hardware references. Guest public-key SSH, cloud-init completion, disk size, CPU count, DHCP address, and SSH service health were rechecked; no failed systemd units were reported. Image size, checksum, and the shared inode of the two filenames were verified again.

A real `terraform plan -input=false -no-color` failed before an adoption plan could be generated:

```text
Unable to create Proxmox VE API credentials
must provide either username and password, an API token, or a ticket
```

At that preflight, no API credential was loaded, no import or apply was executed, and zero drift was not verified. State then contained only the node data source. The subsequent successful adoption supersedes this result.

The prerequisite at that time was to make the existing credential available through an approved secret manager or place `PROXMOX_VE_API_TOKEN` in the ignored `terraform/environments/lab/.env` using a secure local editor. Restrict that file to mode `0600` and notify the operator performing adoption. Terraform does not load `.env` automatically: its value must be injected into the Terraform child process without printing it or enabling shell tracing. Do not paste credentials into chat or commit the file. No new token or host authentication changes are required by this prerequisite.

## Post-K3s verification — 2026-10-25

After guest-only K3s installation and a controlled guest reboot, formatting and validation passed, and a fresh credentialed `terraform plan -input=false -no-color -detailed-exitcode` returned exit code 0 with no changes. No VM resource or Proxmox host configuration changes were needed.
