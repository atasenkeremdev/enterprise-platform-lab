#!/usr/bin/env python3
"""Offline release verification; never runs oc or contacts a cluster."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile

app = Path(__file__).resolve().parents[1]
release = json.loads((app/'public/downloads/openshift-maintenance-release.json').read_text())
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--archive', type=Path)
args = p.parse_args()
archive = args.archive or app/'public/downloads'/release['filename']
data = archive.read_bytes()
assert hashlib.sha256(data).hexdigest() == release['sha256'], 'Archive checksum mismatch'
assert len(data) == release['bytes'], 'Archive length mismatch'
with tempfile.TemporaryDirectory() as directory:
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        assert len(names) == len(set(names)), 'Duplicate ZIP entries'
        assert all(not Path(name).is_absolute() and '..' not in Path(name).parts and '\\' not in name for name in names)
        assert z.testzip() is None
        assert not any(name.endswith(('PRODUCT-BRIEF.md','LICENSE-NOTICE.md')) for name in names)
        z.extractall(directory)
    root = Path(directory)/'openshift-maintenance-evidence-pack'
    manifest = json.loads((root/'release-manifest.json').read_text())
    assert manifest['releaseStatus'] == 'free_preview'
    assert manifest['version'] == release['version']
    assert manifest['liveOpenShiftValidated'] is False
    actual = {str(f.relative_to(root)) for f in root.rglob('*') if f.is_file()} - {'release-manifest.json'}
    assert actual == set(manifest['files']), 'Unexpected or missing packaged files'
    for name, sha in manifest['files'].items():
        assert hashlib.sha256((root/name).read_bytes()).hexdigest() == sha
    for f in (root/'examples').rglob('*.json'):
        assert json.loads(f.read_text())['origin'] == 'synthetic'
    assert (root/'FREE-PREVIEW-TERMS.md').is_file()
    assert (root/'examples/synthetic-run/comparison/comparison.md').is_file()
    pdf = (root/'Quickstart-Guide.pdf').read_bytes()
    assert pdf.startswith(b'%PDF-')
    assert len(re.findall(rb'/Type\s*/Page\b',pdf)) == 3
    assert b'/Users/atasen/' not in pdf
    subprocess.run([sys.executable,'-m','unittest','discover','-s',str(root/'tests'),'-v'],check=True,cwd=root)
print('Public ZIP checksum, inventory, manifests, synthetic-only examples, PDF and 12 offline tests passed')
