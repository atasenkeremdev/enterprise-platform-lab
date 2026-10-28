#!/usr/bin/python3
"""Stream an existing connector token to Kubernetes over SSH; never log credentials."""
import base64
import json
import os
from pathlib import Path
import stat
import subprocess
import sys

TUNNEL_ID='e7373f52-8229-4a27-a9ee-ee64b3794a8c'
TOKEN=Path.home()/'.config/enterprise-platform-lab/cloudflare/bankops-production.token'
SSH=['/usr/bin/ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes',
     '-o','UpdateHostKeys=no','-o','ConnectTimeout=10']

def main():
    if TOKEN.is_symlink(): raise ValueError('Token file cannot be a symlink')
    with TOKEN.open('rb') as handle:
        info=os.fstat(handle.fileno())
        if stat.S_IMODE(info.st_mode)!=0o600 or not stat.S_ISREG(info.st_mode):
            raise ValueError('Token file requires permissions 0600')
        token=handle.read().strip()
    if not token or len(token.split())!=1: raise ValueError('Expected only the connector token')
    decoded=json.loads(base64.b64decode(token+b'='*((-len(token))%4)))
    if decoded.get('t')!=TUNNEL_ID: raise ValueError('Token does not match the supplied tunnel ID')
    # Discover the current VM address through trusted host access.
    lookup=subprocess.run(SSH+['proxmox-lab','getent ahostsv4 lab-k3s-01.lan'],capture_output=True,text=True,timeout=30,check=True)
    address=lookup.stdout.split()[0]
    import ipaddress
    if ipaddress.ip_address(address) not in ipaddress.ip_network('192.168.10.0/24'):
        raise ValueError('Unexpected guest address')
    guest=SSH+['-o','UserKnownHostsFile='+str(Path.home()/'.kube/enterprise-platform-lab/known_hosts'),
        '-o','HostKeyAlias=epl-k3s-01','-o','IdentitiesOnly=yes','-i',str(Path.home()/'.ssh/id_ed25519_proxmox'),'ubuntu@'+address]
    bootstrap='kubectl create namespace cloudflare-tunnel --dry-run=client -o yaml | kubectl apply -f -'
    subprocess.run(guest+[bootstrap],capture_output=True,text=True,timeout=30,check=True)
    secret={'apiVersion':'v1','kind':'Secret','metadata':{'name':'cloudflared-token','namespace':'cloudflare-tunnel','annotations':{'kustomize.toolkit.fluxcd.io/prune':'disabled'}},'type':'Opaque','data':{'token':base64.b64encode(token).decode()}}
    # No token in argv, output, temporary files, Git, or a downloaded kubeconfig.
    subprocess.run(guest+['kubectl apply --server-side --field-manager=bankops-tunnel-secret -f -'],
        input=json.dumps(secret).encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30,check=True)
    print('Token permissions and tunnel ID verified; cloudflare-tunnel/cloudflared-token applied securely')

if __name__=='__main__':
    try: main()
    except Exception:
        print('Secret installation failed; verify token permissions/ID and trusted SSH access. Credential-bearing details suppressed.',file=sys.stderr)
        sys.exit(1)
