#!/bin/sh
# Run as root inside lab-ai-01. No agent or execution integration is installed.
set -eu
[ "$(hostname)" = lab-ai-01 ]
[ "$(id -u)" -eq 0 ]
if command -v ollama >/dev/null 2>&1; then
  echo 'Existing Ollama installation: use a reviewed upgrade procedure.' >&2
  exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl zstd python3 openssh-server
install -d -m 0755 /etc/systemd/system/ollama.service.d
cd "$(dirname "$0")"
install -m 0644 lab.conf /etc/systemd/system/ollama.service.d/lab.conf
install -m 0644 sshd.conf /etc/ssh/sshd_config.d/10-lab-ai.conf
sshd -t
systemctl restart ssh
curl -fsSL --retry 3 https://ollama.com/install.sh -o /root/ollama-official-install.sh
printf '%s  %s\n' '25f64b810b947145095956533e1bdf56eacea2673c55a7e586be4515fc882c9f' /root/ollama-official-install.sh | sha256sum -c -
OLLAMA_VERSION=0.40.12 sh /root/ollama-official-install.sh
systemctl daemon-reload
systemctl enable --now ollama
systemctl is-active ollama
curl --retry 10 --retry-connrefused --retry-delay 2 -fsS http://127.0.0.1:11434/api/version
# Non-streaming pull avoids terminal progress escapes in operational logs.
curl -fsS --max-time 1800 http://127.0.0.1:11434/api/pull \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5-coder:1.5b","stream":false}'
