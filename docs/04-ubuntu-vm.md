# Ubuntu VM configuration and verification

[Project overview](../README.md) · [Next: Security](05-security.md)

## Verified specification

| Setting | Value |
| --- | --- |
| Name / ID / node | `lab-k3s-01` / 200 / `pve` |
| Power | Running; host-boot startup enabled |
| OS | Ubuntu 24.04.5 LTS, official Noble cloud image |
| CPU | 2 cores, 1 socket, CPU type `host` |
| Memory | 3072 MiB configured; ballooning disabled |
| Guest usable RAM | Approximately 2972 MiB |
| Root disk | 40 GiB / 42949672960 bytes, `nvme-vm:vm-200-disk-0` |
| Disk controller | `virtio-scsi-single`, `scsi0`, discard, SSD flag, IO thread |
| Cloud-init media | `nvme-vm:vm-200-cloudinit`, `ide2` |
| NIC | VirtIO, `vmbr0`, MAC `BC:24:11:9F:91:F5` |
| IPv4 | DHCP lease `192.168.10.226/24`; gateway `192.168.10.1` |
| Console | Serial socket, serial VGA |
| Protection | Proxmox protection enabled |

## Bootstrap and Ubuntu configuration

VM 200 was created using Proxmox CLI over SSH after confirming the ID was unused. The verified image was imported into `nvme-vm`, enlarged to 40 GiB, and attached as the boot disk. Cloud-init media supplied the `ubuntu` user, existing SSH public key, hostname, and DHCP configuration. This is historical execution, not a Terraform apply or a command sequence to rerun.

The corresponding desired cloud-init configuration is:

```hcl
initialization {
  datastore_id = "nvme-vm"
  interface    = "ide2"
  upgrade      = false
  ip_config {
    ipv4 {
      address = "dhcp"
    }
  }
  user_account {
    username = "ubuntu"
    keys     = [trimspace(file(var.ssh_public_key_path))]
  }
}
```

Cloud-init reports `status: done`; the root partition expanded to approximately 39 GiB within the 40 GiB disk. First-boot package upgrades were disabled for predictable bootstrap. Patch status has not been certified. No swap was reported in the guest.

## SSH authentication and trust

Public-key login as `ubuntu` succeeds using the existing operator key. Effective SSH configuration enables public keys and disables password and keyboard-interactive authentication. The Ubuntu password is locked and passwordless sudo was verified during initial deployment. The guest host key was collected through the already trusted Proxmox connection and pinned in an operator-local temporary known-hosts file during validation.

Before routine access, independently verify and retain the host-key fingerprint in your protected local `known_hosts`. An unauthenticated `ssh-keyscan` alone does not prove server identity. Do not copy the private key into this repository or bypass host-key checking.

```sh
ssh -o StrictHostKeyChecking=yes -o IdentitiesOnly=yes \
  -i ~/.ssh/id_ed25519_proxmox ubuntu@192.168.10.226
```

This is a private LAN address, not a published endpoint. Reconfirm the lease if SSH stops responding; do not assume a DHCP address still belongs to the same guest.

## Reproducible verification

On the workstation:

```sh
ssh proxmox-lab 'qm status 200; qm config 200'
ssh proxmox-lab 'ip neigh show 192.168.10.226'
```

Inside the guest:

```sh
hostname
cat /etc/os-release
cloud-init status
ip -4 -brief address
ip -4 route
getent ahostsv4 archive.ubuntu.com
nproc
free -m
lsblk -b -o NAME,SIZE,TYPE,MOUNTPOINTS
systemctl is-active ssh
systemctl --failed --no-pager
sudo sshd -T | grep -E '^(pubkeyauthentication|passwordauthentication|kbdinteractiveauthentication) '
```

Expected results: hostname `lab-k3s-01`, Ubuntu 24.04.5, cloud-init done, an active DHCP interface and default route, working DNS, 2 CPUs, the recorded disk size, active SSH, and zero failed units. These results were observed during the documentation inspection. K3s is planned and was not installed or tested in this task.

## Adoption completed — 2026-10-25

Terraform subsequently imported VM 200 with zero resource changes. Post-import checks confirmed running power state, no pending Proxmox configuration changes, working guest SSH, completed cloud-init, active SSH, and zero failed systemd units. No stop or reboot was performed.
