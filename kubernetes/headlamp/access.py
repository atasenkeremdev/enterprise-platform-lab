#!/usr/bin/python3
"""SSH-only access and in-memory, short-lived read-only Kubernetes credentials."""
import ipaddress
import json
import os
from pathlib import Path
import subprocess
import sys

BASE = Path.home() / '.kube/enterprise-platform-lab'
SOCKET = BASE / 'api-tunnel.sock'
SSH = ['/usr/bin/ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
       '-o', 'StrictHostKeyChecking=yes', '-o', 'UpdateHostKeys=no']

def capture(args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            text=True, timeout=45)
    if result.returncode:
        raise RuntimeError('SSH access failed; check LAN access, SSH key, and pinned host trust')
    return result.stdout

def discover():
    output = capture(SSH + ['proxmox-lab', 'getent ahostsv4 lab-k3s-01.lan'])
    address = output.split()[0]
    if ipaddress.ip_address(address) not in ipaddress.ip_network('192.168.10.0/24'):
        raise RuntimeError('Guest address outside expected lab subnet')
    return address

def guest(address):
    return SSH + ['-o', 'UserKnownHostsFile=' + str(BASE / 'known_hosts'),
                  '-o', 'HostKeyAlias=epl-k3s-01', '-o', 'IdentitiesOnly=yes',
                  '-i', str(Path.home() / '.ssh/id_ed25519_proxmox'),
                  'ubuntu@' + address]

def tunnel(address):
    check = subprocess.run(SSH + ['-S', str(SOCKET), '-O', 'check', 'localhost'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if check.returncode == 0:
        return
    # Restrict the local listener to loopback. Do not touch another listener.
    args = guest(address)
    capture(args[:-1] + ['-M', '-S', str(SOCKET), '-fN',
                        '-o', 'ExitOnForwardFailure=yes',
                        '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3',
                        '-L', '127.0.0.1:16443:127.0.0.1:6443', args[-1]])


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--launch'
    if mode == '--stop-tunnel':
        capture(SSH + ['-S', str(SOCKET), '-O', 'exit', 'localhost'])
        return
    address = discover()
    tunnel(address)
    if mode == '--credential':
        response = json.loads(capture(guest(address) + [
            'kubectl -n platform-access create token headlamp-viewer --duration=1h -o json']))
        status = response['status']
        # stdout is consumed only by kubectl/Headlamp. Never run this mode in a terminal.
        json.dump({'apiVersion': 'client.authentication.k8s.io/v1', 'kind': 'ExecCredential',
                   'status': {'expirationTimestamp': status['expirationTimestamp'],
                              'token': status['token']}}, sys.stdout)
    elif mode == '--start-tunnel':
        print('API tunnel ready on 127.0.0.1:16443')
    elif mode == '--launch':
        subprocess.run(['/usr/bin/open', '-a', 'Headlamp'], check=True)
        print('Headlamp launched; API tunnel ready')
    else:
        raise RuntimeError('Unknown access command')

if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Never include subprocess output or credential-bearing exceptions in logs.
        print('Headlamp access failed; verify SSH, RBAC, and local tunnel configuration.', file=sys.stderr)
        sys.exit(1)
