# Local CPU-only LLM: lab-ai-01

[Project overview](../README.md) · [Architecture](01-architecture.md)

Deployment began on 2026-10-27; validation completed on 2026-10-28 in Europe/Malta. The benchmark timestamps use UTC (2026-10-27 23:04).

## Deployment design

A dedicated unprivileged Proxmox LXC, CT 201 named lab-ai-01, uses 2 vCPU, a 2-core CPU quota, 2048 MiB RAM, zero swap, and a 20 GiB root disk on nvme-vm. CPU units are 50 to favor the existing K3s VM under contention. It has DHCP networking on vmbr0 and no GPU/device passthrough or host-directory bind mounts. Proxmox protection and Terraform prevent_destroy are enabled. Startup at host boot is configured.

The supported Debian 13 Trixie amd64 template is `debian-13-standard_13.6-1_amd64.tar.zst`, obtained from the official Proxmox appliance catalog. Its 129954319-byte archive was checked by pveam against the catalog checksum. Recorded SHA-512:

```text
4c0c27ca6ceab5ef0b84db57825a00f26157ef1854bafe97297813e1cbe8ecb8cc9c453cab6b3b0efe1ba193a50c47ece1e41d950e411b8730b835b71e9e754b
```

The catalog downloader uses HTTP; the origin did not present a certificate valid for download.proxmox.com when HTTPS was checked. TLS verification was not disabled. The expected checksum was read over the existing trusted SSH connection from the host's appliance catalog. The template remains outside Terraform ownership, like the existing Ubuntu source image. Debian 13 receives full support through August 2028 and LTS through June 2030; see [Debian release information](https://www.debian.org/releases/trixie/).

Ollama is pinned to 0.40.12, the stable release observed from the official release API on 2026-10-27. Installation follows the [official Linux instructions](https://docs.ollama.com/linux), using its version-pinning environment variable. The official install script's recorded SHA-256 is `25f64b810b947145095956533e1bdf56eacea2673c55a7e586be4515fc882c9f`; the repository installer verifies that digest before execution. The script URL is mutable: review and deliberately update the digest if it changes. This is an integrity pin, not independent release-signature verification. The distribution includes optional GPU libraries, but no GPU is passed through or used.

The requested model is [qwen2.5-coder:1.5b](https://ollama.com/library/qwen2.5-coder:1.5b), a Q4_K_M model with approximately 1.54B parameters and a roughly 986 MB download. The tag is mutable; retain the observed digest with benchmark results before a future update.

## Memory admission and infrastructure workflow

Before any provisioning, the host reported 7819 MiB RAM and 3455 MiB available across three samples. Swap use was zero and both memory PSI averages were 0.00. Only VM 200 was running: 3072 MiB configured and about 2728 MiB resident according to the Proxmox cluster resource API. No existing LXCs were present. The nvme-vm thin pool had approximately 463 GiB available. K3s was Ready with its existing system pods healthy.

Adding this container brings configured guest memory to 5120 MiB, below physical RAM, leaving 2699 MiB outside guest memory limits. That remaining capacity also covers Proxmox and filesystem cache; it is not all available for further guests. A second check immediately before creation still showed 3451 MiB available and no PSI pressure. This assessment permits this one small model; it does not authorize additional workloads or larger models.

[Terraform ai.tf](../terraform/environments/lab/ai.tf) declares CT 201. The first reviewed plan proposed one addition, no changes, and no deletions, with VM 200 unchanged. The API creation attempt returned HTTP 403 for SDN.Use on `/sdn/zones/localnetwork/vmbr0` before creating the container. Existing roles were not broadened. The template download API also requires broader Sys.Modify privileges, so the existing authorized SSH path was used for template staging and initial container creation.

The reviewed configuration was bootstrapped using pct through the existing proxmox-lab SSH alias, then adopted through the declarative import in imports.tf. The original-template and bootstrap-user fields cannot be read back by Proxmox and are creation-only; those two paths are narrowly excluded from drift checks to prevent replacement after import. All hardware, storage, network, power, and feature settings remain managed. An initial replacement proposal was rejected by prevent_destroy and was never applied. Final adoption reported one import and one state-only update (vm_id and timeout_start metadata); pinned provider source review confirmed these do not send a configuration update or reboot request. Follow-up planning showed no changes.

Debian 13 systemd 257 initially failed its tmpfs/mqueue mounts without nesting. Enabling nesting and rebooting only the new CT resolved those failures. The container remains unprivileged; keyctl, FUSE, arbitrary mount allowances, device passthrough, and host bind mounts remain disabled. LXC shares the host kernel and is a weaker isolation boundary than a separate VM. VM 200 was neither modified nor restarted.

## Repeatable bootstrap and service configuration

Review the host memory gate, unused ID, catalog checksum, and Terraform plan before using these commands on a fresh lab. Do not rerun creation against the existing CT. The existing operator public key is copied to a protected host-local temporary file; no private key is copied into the container.

```sh
ssh proxmox-lab 'free -m; cat /proc/pressure/memory; qm list; pct list; pvesm status'
ssh proxmox-lab 'pveam download local debian-13-standard_13.6-1_amd64.tar.zst'
```

For normal API-authorized provisioning, use Terraform after reviewing the create-only plan. On this host, the scoped SDN denial required this initial bootstrap equivalent:

```sh
pct create 201 local:vztmpl/debian-13-standard_13.6-1_amd64.tar.zst \
  --hostname lab-ai-01 --unprivileged 1 --cores 2 --cpulimit 2 --cpuunits 50 \
  --memory 2048 --swap 0 --rootfs nvme-vm:20 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --ssh-public-keys /tmp/epl-ai-operator.pub --onboot 1 --protection 1 \
  --features nesting=1 --tags 'ai;cpu-only;lab' \
  --description 'CPU-only Ollama lab; localhost API; no agent or execution credentials'
pct start 201
```

Transfer [services/ollama](../services/ollama/) to /root inside the new container using trusted administrative access and run `sh install.sh` there. The installer refuses an existing Ollama installation. It installs curl, CA certificates, zstd, Python for validation, and openssh-server. It preinstalls the systemd drop-in before the official installer starts Ollama, enforces key-only administrative SSH, pins the distribution, enables the service, and downloads the requested model. Debian socket-activated sshd failed on SIGHUP reload; restarting only ssh.service restored it. The repeatable installer uses that tested restart procedure, and effective password/keyboard-interactive authentication are disabled. Routine upgrades require a separate reviewed procedure and repeat validation.

The effective systemd override is [lab.conf](../services/ollama/lab.conf):

- API bound explicitly to 127.0.0.1:11434; cloud features disabled.
- One parallel request, one loaded model, one queued request, 1024-token default context, two-minute idle retention.
- CUDA/ROCm visibility disabled; benchmark requests also explicitly set num_gpu=0 and two CPU threads.
- MemoryHigh 1700 MiB, MemoryMax 1900 MiB, no service swap; the outer CT has a 2048 MiB hard limit.
- Two-core CPU quota; service runs as non-login ollama user with no capabilities, no privilege escalation, private devices/tmp, protected homes, and read-only system paths except its model directory. SSH/SCP/SFTP, Git, and Terraform executables are explicitly hidden in its service namespace; a namespace-level check confirmed the ollama user cannot execute the SSH client.

Model storage is `/usr/share/ollama/.ollama/models`. No agent, tool integration, repository checkout, Terraform credentials, SSH private key, or host socket is provided to the model. Generated output is text only and is never executed by the validation scripts. Administrative SSH access and the tunnel remain operator actions outside the model.

## Mac Mini access

The API is deliberately unavailable on the container's LAN address. On the Mac, the container public SSH host key is pinned under lab-ai-01 in `~/.config/enterprise-platform-lab/ai/known_hosts`, obtained via `pct exec 201` over the already trusted host SSH connection. That directory is mode 0700 and the known-hosts file mode 0600. Private SSH keys remain on the Mac.

```sh
cd ~/projects/enterprise-platform-lab
/usr/bin/python3 services/ollama/trust-container.py
/usr/bin/python3 services/ollama/access.py ip
/usr/bin/python3 services/ollama/access.py start
curl -fsS http://127.0.0.1:11434/api/version
curl -fsS http://127.0.0.1:11434/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5-coder:1.5b","prompt":"Explain a Python list comprehension in one sentence.","stream":false,"options":{"num_ctx":1024,"num_predict":64,"num_thread":2,"num_gpu":0}}'
# Close only this lab's SSH tunnel when finished.
/usr/bin/python3 services/ollama/access.py stop
```

The helper discovers CT 201's current IPv4 address through trusted host SSH, checks the private lab subnet, then uses strict container host-key verification with the existing operator key. It binds only 127.0.0.1:11434 on the Mac and forwards to 127.0.0.1:11434 inside the container. It refuses to replace another listener. Ollama has no API authentication on this loopback endpoint; trusted local Mac users/processes can access the active tunnel. Do not bind it to 0.0.0.0 or add public forwarding, wildcard browser origins, a reverse proxy, or an internet tunnel.

If local Ollama already uses port 11434, stop and resolve that collision or deliberately choose a different loopback port in the helper and client. If DHCP changes or the connection becomes stale, verify CT identity, close this tunnel and reopen it. Never bypass host-key checking. On a new Mac, obtain the container public host key through trusted Proxmox SSH and initialize the protected known-hosts file before using the helper.

## Benchmark method and safety guard

The fixed harmless prompt asks for a Python function summing even integers. No generated code is executed. [benchmark.py](../services/ollama/benchmark.py) runs once after unloading the model, then twice warm, with temperature 0, seed 42, context 1024, maximum 128 generated tokens, two CPU threads, and num_gpu=0. Model-cold means unloaded from Ollama, not a flushed host page cache. Responses may finish before 128 tokens.

Wall latency is measured around the full streamed request. Time to first token is the first nonempty response fragment. Generation throughput is eval_count divided by eval_duration in seconds, using the [official API counters](https://docs.ollama.com/api/generate). Warm repeated prompts may benefit from prompt caching; these results are a small operational sample, not a general model-quality or capacity benchmark.

Run the benchmark only with host monitoring. Copy benchmark.py to /root/benchmark.py inside CT 201 and run [monitor.py](../services/ollama/monitor.py) on pve. It samples host MemAvailable, swap use/activity, and memory PSI every 0.5 seconds. It stops only the new Ollama service if available memory falls below 1024 MiB, swap grows by more than 64 MiB, PSI some avg10 exceeds 2%, or PSI full avg10 exceeds 0.5%. It also samples the host-side parent CT cgroup and aborts on new OOM events. The delegated cgroup visible inside a nested container can show max even while the parent enforces the 2 GiB limit; host-side counters are authoritative. It records aggregate measurements and writes /tmp/epl-ai-results.json. Do not infer safety from container memory alone.

## Limitations and troubleshooting

This 2 GiB deployment is for small, sequential prompts. The default 1024-token context is deliberately smaller than the model's advertised maximum; API callers can override it, so the service/container memory caps remain the final guard. Larger contexts, concurrent users, bigger models, and long prompts require a new memory assessment. CPU inference contends with K3s on this four-core host, despite CPU weighting. Do not treat this tiny model as a reliable autonomous coding agent.

The template is not a full patch certification: the dependency installation updated required packages, but remaining Debian updates need a separate maintenance review. There is no HA, model-storage backup, or tested restore workflow. Re-pulling a mutable tag may change its digest and benchmark behavior. Preserve the recorded version/digest and repeat measurements after upgrades.

For a failure, inspect `systemctl status ollama`, `journalctl -u ollama`, `ss -lntp`, the CT memory cgroup and host PSI. If the guard stops Ollama, leave it stopped and report resource pressure before retrying. If a request is too large or returns a memory error, shorten it; do not raise caps or add swap to hide the issue. Do not disable AppArmor, make the CT privileged, remove prevent_destroy, or change VM 200 to make this deployment work.

## Verified deployment and results — 2026-10-28 Europe/Malta

| Check | Actual result |
| --- | --- |
| Container | CT 201 running; unprivileged; DHCP 192.168.10.162; MAC BC:24:11:88:8A:EF |
| Startup | CT rebooted successfully after installation; Ollama active and enabled automatically |
| Service / OS health | systemd running; zero failed units; password and keyboard-interactive SSH disabled |
| API boundary | only 127.0.0.1:11434 in CT and on Mac; direct LAN TCP test failed as intended |
| Ollama | 0.40.12; requested model downloaded and generated a nonempty code response |
| CPU-only evidence | ollama ps: 100% CPU, context 1024; API size_vram=0; no GPU devices passed through |
| Model artifact | 986062089 bytes; Q4_K_M; digest below |
| Service constraints | non-login ollama account; MemoryMax=1992294400 bytes; private devices and protected homes/system active |
| Execution separation | no agent or repo/tool credentials installed; service namespace denies SSH-client execution |
| Disk | 20 GiB rootfs; about 4.0 GiB used, 15 GiB available after distribution and model installation |
| Existing infrastructure | VM 200 running, no pending changes; K3s Ready, unchanged system-pod restart counts, no new warning events |
| Terraform | CT 201 adopted; final fmt/validate pass and detailed-exitcode plan returns 0 with no changes |
| Mac end-to-end | tunnel inference returned local inference ready.; 0.749 s wall time for five output tokens |

Full observed model digest:

```text
sha256:d7372fd828518a4d38b1eb196c673c31a85f2ed302b3d1e406c4c2d1b64a0668
```

Fixed-prompt benchmark, run inside CT through its loopback API:

| Run | Condition | Wall latency | First token | Load time | Output tokens | Generation speed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Model-cold | 9.381 s | 4.511 s | 3.328 s | 62 | 12.74 tokens/s |
| 2 | Warm | 4.956 s | 0.086 s | 0.001 s | 62 | 12.74 tokens/s |
| 3 | Warm | 4.994 s | 0.086 s | 0.001 s | 62 | 12.64 tokens/s |

The model returned a sum-even-numbers function and an example on all three runs. This validated response generation, not general correctness or execution safety; its generated Python was never executed. Warm mean wall latency was 4.975 s. The short Mac smoke prompt differs from the benchmark prompt and is not a directly comparable performance sample.

The host guard collected 41 samples at 0.5-second intervals. Host available RAM started at 3355.9 MiB and reached a minimum of 2265.8 MiB during the benchmark. Maximum swap use and swap-in/out deltas were zero; maximum PSI some/full avg10 were both 0.00. Peak CT memory usage was 1801.8 MiB, including accounted cache. New CT OOM and OOM-kill events were zero, and the guard did not abort. Proxmox cgroup memory-high events during downloads/inference reflect reclaim/throttling within the cap; they are not OOM kills. The later loaded-model health snapshot still had 2160 MiB host available RAM and zero swap/PSI averages. This margin is suitable for the validated small sequential workload; the CT is close enough to its cap that larger requests need a new assessment.

The complete measured counters, fixed prompt, options, and responses are retained in [benchmark-2026-10-28.json](../services/ollama/benchmark-2026-10-28.json). There are no prompts containing project secrets or production data in that artifact. No destructive plan was applied, no existing VM was recreated, and no host networking, storage layout, or authorization roles were changed.
