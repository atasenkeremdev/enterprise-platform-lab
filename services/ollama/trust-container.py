#!/usr/bin/python3
"""Pin CT 201's public SSH host key over the already trusted Proxmox connection."""
import os
from pathlib import Path
import subprocess

os.umask(0o077)
base=Path.home()/'.config/enterprise-platform-lab/ai'
base.mkdir(parents=True,exist_ok=True,mode=0o700)
base.chmod(0o700)
result=subprocess.check_output(['/usr/bin/ssh','-o','BatchMode=yes',
    '-o','ConnectTimeout=10','-o','StrictHostKeyChecking=yes','-o','UpdateHostKeys=no',
    'proxmox-lab',
    'pct exec 201 -- sh -c \'test "$(hostname)" = lab-ai-01 && cat /etc/ssh/ssh_host_ed25519_key.pub\''],
    text=True,timeout=30).split()
if len(result)<2 or result[0]!='ssh-ed25519':
    raise SystemExit('Unexpected container host key')
expected='lab-ai-01 '+result[0]+' '+result[1]+'\n'
target=base/'known_hosts'
if target.is_symlink():
    raise SystemExit('Refusing a symlinked trust file')
if target.exists():
    if target.read_text()!=expected:
        raise SystemExit('Pinned key differs; independently verify rotation before changing trust')
else:
    with target.open('x') as stream:
        stream.write(expected)
target.chmod(0o600)
print('CT 201 host identity pinned through trusted Proxmox SSH; strict checking retained')
