variable "ssh_public_key_path" {
  description = "Path to the existing operator SSH public key; never supply a private key."
  type        = string
  default     = "~/.ssh/id_ed25519_proxmox.pub"
}
