# Enterprise Platform Lab

## Validated deployment — 2026-10-25 (Europe/Malta)

One VM exists on Proxmox node `pve`: `lab-k3s-01`, VMID **200**.

| Setting | Value |
| --- | --- |
| OS | Ubuntu 24.04.5 LTS (Noble), official cloud image |
| CPU | 1 socket, 2 cores, host CPU |
| RAM | 3072 MiB, ballooning disabled |
| Root disk | 40 GiB, `nvme-vm:vm-200-disk-0`, SCSI, discard, SSD, IO thread |
| Cloud-init disk | `nvme-vm:vm-200-cloudinit`, IDE2 |
| Network | VirtIO on existing `vmbr0`, DHCP |
| MAC | `BC:24:11:9F:91:F5` |
| Observed IPv4 | `192.168.10.226/24`, gateway `192.168.10.1` |
| Login | `ubuntu`, existing operator Ed25519 public key |
| Startup | Enabled on host boot |
| Protection | Proxmox deletion protection and Terraform `prevent_destroy` |

The DHCP address may change. The VM is prepared for k3s; k3s installation was outside this task.

## Image download resolution

The Proxmox download task started at 01:03:39 and was interrupted at
01:13:39, after transferring about 70% of 593 MiB. The log reports
`download failed: received interrupt`. The task duration was exactly ten
minutes; a timeout is consistent with the evidence, but its initiating
component was not established.

An existing complete `/var/lib/vz/import/noble-server-cloudimg-amd64.img`
was reused. It is qcow2 despite its `.img` extension, 621284352 bytes,
and passed `qemu-img check` without errors. Its SHA-256 matched the
[Ubuntu HTTPS checksum manifest](https://cloud-images.ubuntu.com/noble/current/SHA256SUMS):

```text
04e8f2461a16a44e78a370284471f29616cdd9baf1893df25807b71f985b6c94
```

A hard link named `noble-server-cloudimg-amd64.qcow2` was added alongside
the original so Proxmox recognizes `local:import/noble-server-cloudimg-amd64.qcow2`.
This uses the same underlying file without another download or duplicate disk space.
Neither name is managed as a Terraform download resource, preventing accidental
source-image deletion. The original file was not changed or deleted.
The moving `current` URL may change: retain this checksum with this image.

## Provisioning performed

The Proxmox API credentials were not present in the execution environment.
Provisioning therefore used the authorized SSH alias `proxmox-lab` and `qm`.
VMID 200 was confirmed absent before creation. The commands below record the
creation sequence; **do not rerun against the existing VM**.
`/tmp/lab-k3s-01-authorized.pub` contained only the operator public key from
`~/.ssh/id_ed25519_proxmox.pub`.

```sh
qm create 200 --name lab-k3s-01 --cores 2 --sockets 1 --cpu host \
  --memory 3072 --balloon 0 --scsihw virtio-scsi-single \
  --net0 virtio,bridge=vmbr0 --ostype l26 --serial0 socket --vga serial0 \
  --onboot 1 --protection 1 --ciuser ubuntu \
  --sshkeys /tmp/lab-k3s-01-authorized.pub --ipconfig0 ip=dhcp --ciupgrade 0
qm set 200 --scsi0 nvme-vm:0,import-from=/var/lib/vz/import/noble-server-cloudimg-amd64.img,discard=on,iothread=1,ssd=1
qm disk resize 200 scsi0 40G
qm set 200 --ide2 nvme-vm:cloudinit --boot order=scsi0
qm cloudinit update 200
qm start 200
```

First-boot package upgrades were disabled for a predictable boot; package
maintenance remains separate work. No Proxmox host network, storage configuration,
authentication, or existing infrastructure was modified.

## Validation evidence

- `qm status 200`: running; final `qm config 200` matched the settings above.
- Image checksum matched Ubuntu; `qemu-img check` reported no errors.
- DHCP traffic identified the guest address; Proxmox's neighbor entry mapped it
  to the VM MAC. Ping from the host succeeded with zero loss.
- Direct SSH from the workstation succeeded with the existing private key and
  strict host-key checking. The new guest public host key was collected through
  the already trusted Proxmox SSH connection and pinned in a temporary known-hosts file.
- `cloud-init status --wait`: `status: done`.
- Guest reported Ubuntu 24.04.5, hostname `lab-k3s-01`, 2 CPUs, 2972 MiB usable
  RAM (3072 MiB configured), a 42949672960-byte disk and expanded root partition.
- IPv4 address and default route came from DHCP; DNS resolved `archive.ubuntu.com`.
- `sshd -T`: public-key authentication enabled, password and keyboard-interactive
  authentication disabled. The `ubuntu` password is locked; passwordless sudo works.
- SSH service active; `systemctl --failed` reported zero failed units.
- Terraform configuration validated with Terraform 1.17.0 and bpg/proxmox 0.118.0.

## Terraform adoption and future operations

Configuration lives in `terraform/environments/lab`. The provider is pinned to
the installed, validated 0.118.0 release and its lock file is committed.
The existing local state contains only the node data source; VM 200 has **not**
yet been imported. `imports.tf` declares adoption of `pve/200` so a future
credentialed plan imports this VM rather than attempting another creation.
Import itself has not been validated against the API.

Supply the existing API credentials through the provider's environment variables
using your secret manager or shell session. Never put credentials in Git or
command arguments. No token was created and no authentication was changed.
Then run:

```sh
terraform -chdir=terraform/environments/lab init -lockfile=readonly
terraform -chdir=terraform/environments/lab fmt -check
terraform -chdir=terraform/environments/lab validate
terraform -chdir=terraform/environments/lab plan
```

Review the plan before applying adoption: it must import only VM 200 and must
not replace, delete, or create infrastructure. Reconcile any unexpected changes
before applying. A live API plan, import, and zero-drift verification remain
pending because API credentials were unavailable. The operational VM validation
is complete independently of Terraform adoption.

The default public-key path is local to the operator; override
`ssh_public_key_path` when needed. Private keys and Terraform state/plan files
must stay outside Git. The current lab endpoint uses a self-signed TLS certificate
with the pre-existing `insecure = true` setting.

Never run `terraform destroy`, delete infrastructure, change Proxmox host network,
storage configuration or authentication, or create more VMs without explicit
authorization. Destructive operations require explicit approval.
