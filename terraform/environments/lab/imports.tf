# Adopt the VM already provisioned through SSH. Never create a second VM.
import {
  to = proxmox_virtual_environment_vm.lab_k3s_01
  id = "pve/200"
}

# Bootstrapped through existing SSH access after scoped API bridge denial.
import {
  to = proxmox_virtual_environment_container.lab_ai_01
  id = "pve/201"
}
