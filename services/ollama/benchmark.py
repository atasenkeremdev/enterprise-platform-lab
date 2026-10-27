#!/usr/bin/env python3
"""Harmless, fixed-prompt CPU inference benchmark; generated code is never executed."""
from datetime import datetime, timezone
import json
import time
import urllib.request

BASE = 'http://127.0.0.1:11434'
MODEL = 'qwen2.5-coder:1.5b'
PROMPT = 'Write a short Python function that returns the sum of even integers in a list. Include one example. Output only code.'

def request(body):
    return urllib.request.Request(BASE+'/api/generate',data=json.dumps(body).encode(),
                                  headers={'Content-Type':'application/json'})

# Unload before the first run; this is model-cold, not a cleared OS page cache.
with urllib.request.urlopen(request({'model':MODEL,'keep_alive':0}),timeout=30) as response:
    response.read()
started_at=datetime.now(timezone.utc).isoformat()
results=[]
for index in range(3):
    payload={'model':MODEL,'prompt':PROMPT,'stream':True,'keep_alive':'2m',
             'options':{'num_ctx':1024,'num_predict':128,'num_thread':2,
                        'num_gpu':0,'seed':42,'temperature':0}}
    start=time.perf_counter()
    first=None
    text=[]
    final=None
    with urllib.request.urlopen(request(payload),timeout=180) as response:
        for line in response:
            item=json.loads(line)
            if item.get('error'):
                raise RuntimeError(item['error'])
            if item.get('response'):
                if first is None:
                    first=time.perf_counter()-start
                text.append(item['response'])
            if item.get('done'):
                final=item
    wall=time.perf_counter()-start
    assert final and text, 'No generated response'
    results.append({'run':index+1,'condition':'model-cold' if index==0 else 'warm',
        'wall_seconds':round(wall,3),'first_token_seconds':round(first,3),
        'load_seconds':round(final.get('load_duration',0)/1e9,3),
        'prompt_tokens':final.get('prompt_eval_count'),
        'generated_tokens':final['eval_count'],
        'generation_seconds':round(final['eval_duration']/1e9,3),
        'tokens_per_second':round(final['eval_count']/(final['eval_duration']/1e9),2),
        'response':''.join(text)})
print(json.dumps({'started_at_utc':started_at,'finished_at_utc':datetime.now(timezone.utc).isoformat(),'model':MODEL,'prompt':PROMPT,'options':payload['options'],'results':results},indent=2))
