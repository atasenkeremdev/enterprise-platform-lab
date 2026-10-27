# Template downloaded with pveam and verified against the official catalog SHA-512.
# Kept outside Terraform: download-url API requires broader Sys.Modify privileges.
# Debian 13.6-1 amd64 SHA-512:
# 4c0c27ca6ceab5ef0b84db57825a00f26157ef1854bafe97297813e1cbe8ecb8cc9c453cab6b3b0efe1ba193a50c47ece1e41d950e411b8730b835b71e9e754b
locals {
  ai_debian_template_id = "local:vztmpl/debian-13-standard_13.6-1_amd64.tar.zst"
}

resource "proxmox_virtual_environment_container" "lab_ai_01" {
  node_name     = "pve"
  vm_id         = 201
  description   = "CPU-only Ollama lab; localhost API; no agent or execution credentials"
  unprivileged  = true
  started       = true
  start_on_boot = true
  protection    = true
  tags          = ["ai", "cpu-only", "lab"]

  console {
    enabled   = true
    type      = "tty"
    tty_count = 2
  }

  # Required by Debian 13 systemd 257 for its standard tmpfs/mqueue mounts.
  features {
    nesting = true
  }

  cpu {
    cores = 2
    limit = 2
    units = 50
  }

  memory {
    dedicated = 2048
    swap      = 0
  }

  disk {
    datastore_id = "nvme-vm"
    size         = 20
  }

  operating_system {
    template_file_id = local.ai_debian_template_id
    type             = "debian"
  }

  initialization {
    hostname = "lab-ai-01"
    ip_config {
      ipv4 {
        address = "dhcp"
      }
    }
    user_account {
      keys = [trimspace(file(var.ssh_public_key_path))]
    }
  }

  network_interface {
    name   = "eth0"
    bridge = "vmbr0"
  }

  lifecycle {
    prevent_destroy = true
    # Proxmox cannot read back the original template or bootstrap SSH keys.
    # Retain creation provenance without reapplying immutable import-only fields.
    ignore_changes = [
      operating_system[0].template_file_id,
      initialization[0].user_account,
    ]
  }
}
