#!/bin/sh
# Run as root INSIDE lab-k3s-01 from this directory after documented preflight.
set -eu
K3S_VERSION='v1.36.5+k3s1'
INSTALLER_SHA256='e5cc3b3d9dfc1662c2d9be6da5abc9a4cd317d6abc3a5ffc02e3dd3248207fee'
cd "$(dirname "$0")"
[ "$(hostname)" = lab-k3s-01 ]
[ "$(id -u)" -eq 0 ]
if command -v k3s >/dev/null 2>&1; then
  echo 'K3s already exists; use a reviewed upgrade procedure.' >&2
  exit 1
fi
[ ! -e /var/lib/rancher/k3s/server/db/state.db ]
[ ! -e /home/ubuntu/.kube/config ]
install -d -m 0755 /etc/rancher/k3s /etc/systemd/system/k3s.service.d
install -m 0644 config.yaml /etc/rancher/k3s/config.yaml
install -m 0644 api-guard.nft /etc/rancher/k3s/api-guard.nft
install -m 0644 k3s-api-guard.service /etc/systemd/system/k3s-api-guard.service
install -m 0644 api-guard.conf /etc/systemd/system/k3s.service.d/api-guard.conf
systemctl daemon-reload
systemctl enable --now k3s-api-guard.service
installer=$(mktemp)
trap 'rm -f "$installer"' EXIT
curl -fsSL --retry 3 https://get.k3s.io -o "$installer"
printf '%s  %s\n' "$INSTALLER_SHA256" "$installer" | sha256sum -c -
INSTALL_K3S_VERSION="$K3S_VERSION" INSTALL_K3S_EXEC=server sh "$installer"
install -d -o ubuntu -g ubuntu -m 0700 /home/ubuntu/.kube
ln -s /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
systemctl is-enabled k3s
systemctl is-active k3s
