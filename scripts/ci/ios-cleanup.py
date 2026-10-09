import json, os, pathlib, shutil, subprocess
root = pathlib.Path(os.environ['RUNNER_TEMP']) / 'nm-apple-signing'
metadata = root / 'cleanup.json'
if metadata.exists():
    data = json.loads(metadata.read_text())
    for directory in ['Library/MobileDevice/Provisioning Profiles', 'Library/Developer/Xcode/UserData/Provisioning Profiles']:
        (pathlib.Path.home()/directory/(data['uuid']+'.mobileprovision')).unlink(missing_ok=True)
    pathlib.Path(data['api_path']).unlink(missing_ok=True)
subprocess.run(['security','delete-keychain',str(root/'signing.keychain-db')], capture_output=True)
shutil.rmtree(root, ignore_errors=True)
print('Temporary signing files removed.')
