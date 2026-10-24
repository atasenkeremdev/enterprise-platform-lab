locals {
  # Existing, checksum-verified image. Managed outside Terraform to avoid
  # downloading it again or deleting the shared source image.
  ubuntu_2404_image_id = "local:import/noble-server-cloudimg-amd64.qcow2"
}
