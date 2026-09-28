#!/usr/bin/env python3
"""Create a durable upload key OUTSIDE the repository. Never print passwords."""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--directory', required=True)
    p.add_argument('--keytool', default='keytool')
    args = p.parse_args()
    directory = Path(args.directory).expanduser().resolve()
    if directory == ROOT or ROOT in directory.parents:
        p.error('The key directory must be outside the source repository.')
    if directory.exists() and any(directory.iterdir()):
        p.error('Use an empty directory. Existing keys are never overwritten.')
    os.umask(0o077)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    directory.chmod(0o700)
    key = directory / 'NailMoods-upload-2026.p12'
    password = directory / 'NailMoods-upload-2026.password.txt'
    certificate = directory / 'NailMoods-upload-certificate.pem'
    alias = 'nailmoods-upload-2026'
    tool = shutil.which(args.keytool)
    if not tool:
        p.error('JDK keytool not found.')
    with password.open('x') as f:
        f.write(secrets.token_urlsafe(48) + '\n')
    subprocess.run([tool, '-genkeypair', '-keystore', str(key), '-storetype', 'PKCS12',
                    '-alias', alias, '-keyalg', 'RSA', '-keysize', '3072',
                    '-sigalg', 'SHA256withRSA', '-validity', '10000',
                    '-dname', 'CN=NailMoods Android Upload, C=FR',
                    '-storepass:file', str(password), '-keypass:file', str(password)], check=True)
    subprocess.run([tool, '-exportcert', '-rfc', '-keystore', str(key),
                    '-alias', alias, '-storepass:file', str(password),
                    '-file', str(certificate)], check=True)
    result = subprocess.run([tool, '-list', '-v', '-keystore', str(key),
                             '-alias', alias, '-storepass:file', str(password)],
                            check=True, capture_output=True, text=True)
    (directory / 'certificate-details.txt').write_text(result.stdout)
    (directory / 'key-metadata.json').write_text(json.dumps({
        'alias': alias, 'format': 'PKCS12', 'algorithm': 'RSA', 'bits': 3072,
        'role': 'Google Play upload key; NOT the future Play app signing key',
        'package': 'com.nailmoods.app', 'validity_days': 10000,
        'keystore': key.name, 'password_file': password.name,
        'public_certificate': certificate.name,
    }, indent=2) + '\n')
    print('Upload key created outside the repository. Password not displayed.')
    print('Back up the encrypted keystore and move its separate password to a password manager.')

if __name__ == '__main__':
    main()
