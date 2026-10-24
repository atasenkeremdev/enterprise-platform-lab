provider "proxmox" {
  endpoint = "https://192.168.10.10:8006/"

  # Temporary for the lab's self-signed certificate.
  # We will configure trusted TLS certificates later.
  insecure = true
}
