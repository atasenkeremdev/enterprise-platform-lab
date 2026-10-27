#!/usr/bin/env python3
"""Run on pve; sample memory during a benchmark and stop only Ollama if unsafe."""
import json
from pathlib import Path
import subprocess
import threading
import time

samples=[]
stop=threading.Event()
aborted=[]

def sample():
    mem={line.split(':',1)[0]:int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines()}
    psi={line.split()[0]:float(line.split()[1].split('=')[1]) for line in Path('/proc/pressure/memory').read_text().splitlines()}
    vm={line.split()[0]:int(line.split()[1]) for line in Path('/proc/vmstat').read_text().splitlines()}
    cg=Path('/sys/fs/cgroup/lxc/201')
    events={line.split()[0]:int(line.split()[1]) for line in (cg/'memory.events').read_text().splitlines()}
    return {'available_mib':round(mem['MemAvailable']/1024,1),
            'swap_used_mib':round((mem['SwapTotal']-mem['SwapFree'])/1024,1),
            'psi_some_avg10':psi['some'],'psi_full_avg10':psi['full'],
            'pswpin':vm['pswpin'],'pswpout':vm['pswpout'],
            'ct_memory_mib':round(int((cg/'memory.current').read_text())/1024/1024,1),
            'ct_oom':events['oom'],'ct_oom_kill':events['oom_kill']}

baseline=sample()
if baseline['ct_oom'] or baseline['ct_oom_kill'] or baseline['available_mib'] < 1024 or baseline['psi_some_avg10']>2 or baseline['psi_full_avg10']>0.5:
    raise SystemExit('Unsafe baseline; benchmark not started')

def monitor():
    while not stop.is_set():
        row=sample()
        samples.append(row)
        if row['ct_oom']>baseline['ct_oom'] or row['ct_oom_kill']>baseline['ct_oom_kill'] or row['available_mib']<1024 or row['swap_used_mib']-baseline['swap_used_mib']>64 or row['psi_some_avg10']>2 or row['psi_full_avg10']>0.5:
            aborted.append(row)
            subprocess.run(['pct','exec','201','--','systemctl','stop','ollama'],capture_output=True,timeout=30)
            stop.set()
            return
        stop.wait(0.5)

thread=threading.Thread(target=monitor)
thread.start()
try:
    result=subprocess.run(['pct','exec','201','--','python3','/root/benchmark.py'],
                          capture_output=True,text=True,timeout=600)
finally:
    stop.set()
    thread.join(timeout=35)
report={'baseline':baseline,'samples':len(samples),'interval_seconds':0.5,
        'min_available_mib':min(x['available_mib'] for x in samples),
        'max_swap_used_mib':max(x['swap_used_mib'] for x in samples),
        'max_psi_some_avg10':max(x['psi_some_avg10'] for x in samples),
        'max_psi_full_avg10':max(x['psi_full_avg10'] for x in samples),
        'swap_pages_in_delta':samples[-1]['pswpin']-baseline['pswpin'],
        'swap_pages_out_delta':samples[-1]['pswpout']-baseline['pswpout'],
        'max_ct_memory_mib':max(x['ct_memory_mib'] for x in samples),
        'ct_oom_delta':samples[-1]['ct_oom']-baseline['ct_oom'],
        'ct_oom_kill_delta':samples[-1]['ct_oom_kill']-baseline['ct_oom_kill'],
        'aborted':bool(aborted)}
if result.returncode or aborted:
    report['benchmark_error']=result.stderr[-2000:]
else:
    report['benchmark']=json.loads(result.stdout)
Path('/tmp/epl-ai-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if result.returncode or aborted:
    raise SystemExit(1)
