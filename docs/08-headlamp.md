# Headlamp Desktop on the Mac Mini

[Project overview](../README.md) · [K3s operations](07-k3s.md)

## Installed and verified — 2026-10-25

| Item | Result |
| --- | --- |
| Headlamp Desktop | 0.46.0, /Applications/Headlamp.app, launched |
| Installation | Homebrew cask headlamp |
| Mac kubectl | v1.37.1; server v1.36.5+k3s1 |
| VM | lab-k3s-01, VMID 200; current verified DHCP IP 192.168.10.226 |
| Dedicated kubeconfig | ~/.kube/enterprise-platform-lab/k3s-headlamp.yaml, mode 0600 |
| Default kubeconfig | ~/.kube/config, mode 0600; created because none existed |
| Context | enterprise-platform-lab-headlamp |
| API endpoint | https://127.0.0.1:16443 through an SSH local forward |
| TLS | cluster CA trusted; serving certificate includes 127.0.0.1 SAN; verified with hostname checking |
| Identity | system:serviceaccount:platform-access:headlamp-viewer |
| Credentials | requested one-hour TokenRequest credentials; refreshed by exec plugin, held in process memory |
| Cluster results | one Ready node, five namespaces, seven kube-system pods; running system components healthy, Helm install jobs completed |
| Metrics | kubectl top nodes succeeded |
| RBAC denial checks | Secret listing, deployment creation, and pods/exec denied |
| Headlamp verification | desktop process running; protected local backend discovered context and returned HTTP 200 for nodes, namespaces, and system pods |

The kubectl client is one minor version newer than the server, within the [official version-skew policy](https://kubernetes.io/releases/version-skew-policy/). The [official Headlamp desktop documentation](https://headlamp.dev/docs/latest/installation/desktop/) describes default and custom kubeconfig discovery. No dashboard workload was deployed into K3s. No Proxmox infrastructure, guest power state, API firewall, or K3s service configuration was changed for this milestone.

## Installation and local files

```sh
brew install --cask headlamp
brew install kubernetes-cli
kubectl version
```

Check versions before future upgrades; the supported client skew is one minor version either way. Do not assume a future Homebrew kubectl is compatible indefinitely. The current Headlamp version was verified from the installed app's Info.plist as well as Homebrew.

The ignored local files are:

- `~/.kube/enterprise-platform-lab/k3s-headlamp.yaml`: dedicated client configuration.
- `~/.kube/config`: default configuration so Finder-launched Headlamp can discover the context.
- `~/.kube/enterprise-platform-lab/access.py`: installed copy of the [non-secret access helper](../kubernetes/headlamp/access.py), mode 0700.
- `~/.kube/enterprise-platform-lab/known_hosts`: guest public host key pinned under alias epl-k3s-01, mode 0600.
- `~/.kube/enterprise-platform-lab/api-tunnel.sock`: private SSH control socket.

The dedicated directory is mode 0700. The default kubeconfig and KUBECONFIG environment override were absent before setup, so no existing contexts needed merging or replacement. Other local files were preserved. On a workstation with an existing kubeconfig, back it up with mode 0600, preserve all entries and its current-context, and use the dedicated file explicitly in Headlamp or carefully merge a uniquely named context. Do not overwrite an existing configuration with this lab's file.

The guest kubeconfig was retrieved through strict-host-key SSH directly into memory. Only certificate-authority-data was retained. Administrator client certificate/key material was discarded without saving or displaying it. The local kubeconfigs contain the CA, loopback endpoint, context, and exec-plugin configuration; they contain neither the guest's administrator identity nor a permanent service-account token. JSON serialization is used for these kubeconfig files; Kubernetes accepts JSON as YAML.

## Secure access and daily use

```sh
/usr/bin/python3 ~/.kube/enterprise-platform-lab/access.py --launch
kubectl --context enterprise-platform-lab-headlamp get nodes
kubectl --context enterprise-platform-lab-headlamp get namespaces
kubectl --context enterprise-platform-lab-headlamp get pods -n kube-system
```

Headlamp can also be opened normally from Applications. Its default kubeconfig contains the lab context. Select `enterprise-platform-lab-headlamp`. The exec plugin starts the tunnel on demand if needed. A dedicated-file invocation is also supported:

```sh
KUBECONFIG="$HOME/.kube/enterprise-platform-lab/k3s-headlamp.yaml" \
  /Applications/Headlamp.app/Contents/MacOS/Headlamp
```

For an already running instance, relaunch after selecting a different kubeconfig, or use Headlamp's kubeconfig selection. Do not paste tokens into chat, terminal commands, or screenshots.

The helper queries `lab-k3s-01.lan` via the existing trusted `proxmox-lab` SSH alias and requires an address in 192.168.10.0/24. It then verifies the guest against its pinned host key and uses the existing operator key at ~/.ssh/id_ed25519_proxmox. During initial setup, the host's DNS and neighbor entry matched VM 200's MAC BC:24:11:9F:91:F5 before guest access. Changing a DHCP address does not bypass host-key checks.

SSH forwards only `127.0.0.1:16443` on the Mac to `127.0.0.1:6443` on the guest. Keepalives detect a broken connection. The API remains blocked from LAN ingress by the existing guest guard. No public listener or forwarding was added. Headlamp's own backend was observed listening on 127.0.0.1:4466 and protects its endpoints with an application session token. That desktop session token was used only in memory for backend validation, never displayed or persisted by the setup procedure.

The endpoint's IP SAN 127.0.0.1 was checked on the public API certificate and through an actual CA- and hostname-verified TLS handshake across the tunnel. The port change does not change certificate identity. No insecure-skip-tls-verify setting, trust bypass, API certificate replacement, or firewall exception was used.

```sh
# Start or close only this lab's SSH forward.
/usr/bin/python3 ~/.kube/enterprise-platform-lab/access.py --start-tunnel
/usr/bin/python3 ~/.kube/enterprise-platform-lab/access.py --stop-tunnel
```

Closing the tunnel does not revoke credentials. A later client request can reopen it through the exec plugin. No login-time LaunchAgent was installed.

## Least-privilege identity and renewal

The [RBAC manifest](../kubernetes/headlamp/rbac.yaml) creates a platform-access namespace and headlamp-viewer ServiceAccount with automatic pod token mounting disabled. It binds the built-in view role for ordinary workload observation and a small explicit read-only role for nodes, namespaces, persistent volumes, storage metadata, ingress classes, and metrics. It grants no Secrets, writes, exec, RBAC administration, or cluster-admin binding. Read access includes workload configuration and logs; those can still contain application-sensitive information.

Apply or review the manifest from the guest with its existing administrative access:

```sh
kubectl apply -f rbac.yaml
kubectl apply --dry-run=server -f rbac.yaml
```

For a first install, applying the namespace before a full server dry run avoids the missing-namespace dependency. This is a small set of API objects and adds no running pods.

On each credential refresh, the local exec plugin uses the existing authenticated SSH connection to request a one-hour token for headlamp-viewer. It converts the TokenRequest response into an ExecCredential with the server-returned expiration timestamp. kubectl and Headlamp refresh through the same helper; no manual token copying is needed. The server's returned expiration is authoritative. There is no permanent token Secret and no newly issued permanent administrator credential.

Never invoke the helper's `--credential` mode interactively: its stdout is the credential protocol intended only for client-go. The helper suppresses credential-bearing subprocess output on failure. Keep the helper trusted and private; kubeconfig exec commands are executable code. SSH access still uses an existing administrative operator identity to mint the restricted token; this setup does not reduce that operator's pre-existing SSH authority.

To revoke dashboard access, remove the two headlamp ClusterRoleBindings or delete the dedicated ServiceAccount through existing guest administrative access. Deleting the ServiceAccount invalidates its tokens. Do not delete the namespace if future components have started using it. No cluster-admin kubeconfig is needed on the Mac for this revocation procedure.

## Validation and troubleshooting

```sh
kubectl --context enterprise-platform-lab-headlamp get nodes
kubectl --context enterprise-platform-lab-headlamp get pods -n kube-system
kubectl --context enterprise-platform-lab-headlamp top nodes
kubectl --context enterprise-platform-lab-headlamp auth can-i list secrets -A
kubectl --context enterprise-platform-lab-headlamp auth can-i create deployments -n default
kubectl --context enterprise-platform-lab-headlamp auth can-i create pods/exec -n kube-system
```

The last three commands should print no and return exit status 1. Some Headlamp pages/actions will be unavailable by design, including Secrets, editing, terminals, and RBAC management. Do not grant cluster-admin to remove these expected restrictions.

- Connection refused: run the start-tunnel helper; check the LAN and whether another process owns port 16443. The helper refuses to replace another listener.
- SSH or credential-helper failure: verify `ssh proxmox-lab`, guest DHCP DNS, the existing SSH key, and pinned guest trust. Inspect permissions and account/RBAC availability without printing tokens. Headlamp uses an absolute Python/helper path, so Finder's PATH need not include Homebrew or shell aliases.
- DHCP changed or tunnel stale: close this helper's tunnel, reconfirm VM identity, and start it again. Keepalives eventually close a dead connection. Never disable StrictHostKeyChecking or trust an unverified replacement key.
- TLS mismatch or unknown authority: verify that the endpoint is exactly https://127.0.0.1:16443, that the forward reaches this guest's API, and that the kubeconfig CA matches the cluster. Do not disable TLS verification.
- Headlamp does not show the cluster: confirm the default kubeconfig includes the named context and restart the app after changes. Test the dedicated kubeconfig with kubectl first. The desktop backend's /config cannot be probed with a plain unauthenticated curl; HTTP 403 there is application session protection, not evidence of failed Kubernetes access.
- Unauthorized after expiry: a new request should invoke the exec plugin; confirm guest SSH and service-account TokenRequest access. Do not replace the temporary token with a permanent Secret.

Do not commit kubeconfigs, SSH keys, tokens, app session data, or Headlamp's local application-support storage. The repository contains only RBAC, the non-secret access helper, and documentation. Full Desktop UI interaction was not automated; the app was launched and its actual backend discovery and Kubernetes proxy requests were verified.
