output "proxmox_nodes" {
  description = "Nodes accessible through the Proxmox API"
  value       = data.proxmox_virtual_environment_nodes.available.names
}
