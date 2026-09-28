#!/usr/bin/env python3
"""Sign an approved unsigned AAB without rebuilding or changing its payload."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SIGNATURE = re.compile(r'^META-INF/([^/]+\.(SF|RSA|DSA|EC)|SIG-[^/]+)$', re.I)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def payload(path):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate ZIP entries are forbidden.')
        return {name: hashlib.sha256(archive.read(name)).hexdigest() for name in names
                if not name.endswith('/') and name.upper() != 'META-INF/MANIFEST.MF'
                and not SIGNATURE.match(name)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--expected-sha256', required=True)
    parser.add_argument('--jdk-bin', required=True)
    parser.add_argument('--bundletool', required=True)
    args = parser.parse_args()
    source, output = Path(args.input).resolve(), Path(args.output).resolve()
    key = Path(os.environ['NM_UPLOAD_KEYSTORE']).expanduser().resolve()
    password = Path(os.environ['NM_UPLOAD_PASSWORD_FILE']).expanduser().resolve()
    alias = os.environ['NM_UPLOAD_KEY_ALIAS']
    for secret in [key, password]:
        if ROOT in secret.parents or not secret.is_file():
            parser.error('Signing secrets must be regular files outside the repository.')
        if secret.stat().st_mode & 0o077:
            parser.error('Signing secrets must have private permissions (chmod 600).')
    if output.exists() or source == output:
        parser.error('Output must be new; existing bundles are never overwritten.')
    if digest(source) != args.expected_sha256.lower():
        parser.error('Input differs from the approved build hash.')
    with zipfile.ZipFile(source) as archive:
        if any(SIGNATURE.match(n) for n in archive.namelist()):
            parser.error('Input must be unsigned.')
        meta = json.loads(archive.read('base/assets/public/mobile-build.json'))
    if meta['environment'] != 'production' or meta['appId'] != 'com.nailmoods.app':
        parser.error('This upload procedure accepts only the Production app ID.')
    jdk = Path(args.jdk_bin)
    java = str(jdk / 'java')
    bundletool = str(Path(args.bundletool).resolve())
    subprocess.run([java, '-jar', bundletool, 'validate', '--bundle='+str(source)], check=True, capture_output=True)
    manifest = subprocess.run([java, '-jar', bundletool, 'dump', 'manifest',
                               '--bundle='+str(source)], check=True, capture_output=True, text=True).stdout
    if 'android:debuggable="true"' in manifest:
        parser.error('A debug bundle cannot be a Play release.')
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([str(jdk / 'jarsigner'), '-keystore', str(key), '-storetype', 'PKCS12',
                    '-storepass:file', str(password), '-keypass:file', str(password),
                    '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256',
                    '-signedjar', str(output), str(source), alias], check=True)
    verification = subprocess.run([str(jdk / 'jarsigner'), '-verify', '-strict',
                                    '-keystore', str(key), '-storepass:file', str(password),
                                    str(output), alias], check=True, capture_output=True, text=True)
    subprocess.run([java, '-jar', bundletool, 'validate', '--bundle='+str(output)], check=True, capture_output=True)
    before, after = payload(source), payload(output)
    if before != after:
        raise RuntimeError('Payload changed during signing; do not distribute this file.')
    if digest(source) != args.expected_sha256.lower():
        raise RuntimeError('Source bundle was changed; do not distribute.')
    proof = {**meta, 'source_sha256': digest(source), 'signed_sha256': digest(output),
             'signed_bytes': output.stat().st_size, 'payload_files': len(before),
             'payload_unchanged': True, 'bundletool_validation': 'PASS',
             'jarsigner_strict_trusted_alias': 'PASS', 'key_alias': alias,
             'signing_algorithm': 'SHA256withRSA', 'apk_debuggable': False,
             'ocr_files': sum('/recognition/' in n for n in before)}
    output.with_suffix('.verification.json').write_text(json.dumps(proof, indent=2)+'\n')
    output.with_suffix('.signature.txt').write_text(verification.stdout+verification.stderr)
    print(json.dumps(proof, indent=2))

if __name__ == '__main__':
    main()
