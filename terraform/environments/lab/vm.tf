# Already provisioned through SSH. Import before any plan/apply; see README.
resource "proxmox_virtual_environment_vm" "lab_k3s_01" {
  node_name     = "pve"
  vm_id         = 200
  name          = "lab-k3s-01"
  started       = true
  on_boot       = true
  protection    = true
  scsi_hardware = "virtio-scsi-single"
  boot_order    = ["scsi0"]

  cpu {
    cores   = 2
    sockets = 1
    type    = "host"
  }

  memory {
    dedicated = 3072
    floating  = 0
  }

  disk {
    datastore_id = "nvme-vm"
    interface    = "scsi0"
    import_from  = local.ubuntu_2404_image_id
    size         = 40
    discard      = "on"
    iothread     = true
    ssd          = true
  }

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

  network_device {
    bridge      = "vmbr0"
    model       = "virtio"
    mac_address = "BC:24:11:9F:91:F5"
  }

  operating_system {
    type = "l26"
  }
  serial_device {
    device = "socket"
  }
  vga {
    type = "serial0"
  }

  lifecycle {
    prevent_destroy = true
  }
}
