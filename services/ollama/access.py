#!/usr/bin/python3
"""Discover CT 201 via trusted Proxmox SSH and forward its loopback Ollama API."""
import ipaddress
import json
from pathlib import Path
import subprocess
import sys

BASE=Path.home()/'.config/enterprise-platform-lab/ai'
SSH=['/usr/bin/ssh','-o','BatchMode=yes','-o','ConnectTimeout=10',
     '-o','StrictHostKeyChecking=yes','-o','UpdateHostKeys=no']

def capture(args):
    return subprocess.check_output(args,text=True,timeout=30).strip()

mode=sys.argv[1] if len(sys.argv)>1 else 'start'
if mode not in {'start','stop','ip'}:
    raise SystemExit('Usage: access.py [start|stop|ip]')
if mode=='stop':
    subprocess.run(SSH+['-S',str(BASE/'tunnel.sock'),'-O','exit','localhost'],check=True)
    sys.exit(0)
interfaces=json.loads(capture(SSH+['proxmox-lab','pct exec 201 -- ip -4 -j addr show dev eth0']))
addresses=[a['local'] for interface in interfaces for a in interface['addr_info'] if a['family']=='inet']
if len(addresses)!=1:
    raise SystemExit('Cannot determine a unique CT 201 IPv4 address')
address=addresses[0]
if ipaddress.ip_address(address) not in ipaddress.ip_network('192.168.10.0/24'):
    raise SystemExit('Unexpected container address; verify CT identity')
if mode=='ip':
    print(address)
    sys.exit(0)
check=subprocess.run(SSH+['-S',str(BASE/'tunnel.sock'),'-O','check','localhost'],
                     stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
if check.returncode==0:
    print('Ollama tunnel already active on 127.0.0.1:11434')
    sys.exit(0)
subprocess.run(SSH+['-o','UserKnownHostsFile='+str(BASE/'known_hosts'),
    '-o','HostKeyAlias=lab-ai-01','-o','IdentitiesOnly=yes',
    '-i',str(Path.home()/'.ssh/id_ed25519_proxmox'),
    '-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3',
    '-M','-S',str(BASE/'tunnel.sock'),'-fN','-L','127.0.0.1:11434:127.0.0.1:11434',
    'root@'+address],check=True)
print('Ollama tunnel ready on 127.0.0.1:11434')
