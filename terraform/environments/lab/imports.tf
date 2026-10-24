# Adopt the VM already provisioned through SSH. Never create a second VM.
import {
  to = proxmox_virtual_environment_vm.lab_k3s_01
  id = "pve/200"
}
