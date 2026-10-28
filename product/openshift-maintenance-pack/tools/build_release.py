#!/usr/bin/env python3
"""Build free preview artifacts locally; never uploads or contacts a cluster."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import zipfile

VERSION = '0.1.0-free-preview'
root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out-dir', type=Path, required=True)
args = parser.parse_args()
args.out_dir.mkdir(parents=True, exist_ok=True)
files = sorted(p for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts and not p.name.startswith('.') and p.suffix != '.pyc')
entries = {}
for p in files:
    if p.is_symlink():
        raise SystemExit('Symlinks are not allowed')
    data = p.read_bytes()
    if p.suffix == '.json' and 'examples' in p.relative_to(root).parts:
        if json.loads(data).get('origin') != 'synthetic':
            raise SystemExit('Only synthetic examples may be published')
    entries[str(p.relative_to(root))] = data
manifest = {'version': VERSION, 'releaseStatus': 'free_preview', 'liveOpenShiftValidated': False,
            'files': {name: hashlib.sha256(data).hexdigest() for name, data in entries.items()}}
entries['release-manifest.json'] = (json.dumps(manifest, indent=2, sort_keys=True)+'\n').encode()
name = 'openshift-maintenance-evidence-pack-'+VERSION+'.zip'
archive_path = args.out_dir/name
# A local rebuild intentionally updates these generated public assets.
with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for path, data in sorted(entries.items()):
        info = zipfile.ZipInfo('openshift-maintenance-evidence-pack/'+path, (2026,1,1,0,0,0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info,data)
sha = hashlib.sha256(archive_path.read_bytes()).hexdigest()
(args.out_dir/(name+'.sha256')).write_text(sha+'  '+name+'\n')
(args.out_dir/'openshift-maintenance-quickstart.pdf').write_bytes((root/'Quickstart-Guide.pdf').read_bytes())
release = {'version':VERSION, 'filename':name, 'url':'/downloads/'+name, 'sha256':sha, 'bytes':archive_path.stat().st_size,
           'guideUrl':'/downloads/openshift-maintenance-quickstart.pdf', 'checksumUrl':'/downloads/'+name+'.sha256',
           'liveOpenShiftValidated':False, 'offlineTests':12}
(args.out_dir/'openshift-maintenance-release.json').write_text(json.dumps(release,indent=2)+'\n')
print('Built free public preview; bytes:',release['bytes'],'SHA-256:',sha)
