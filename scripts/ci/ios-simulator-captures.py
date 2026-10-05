"""Capture the installed native simulator app; never label browser shots as simulator shots."""
import json, os, pathlib, subprocess, sys, time
app = sys.argv[1]
out = pathlib.Path('artifacts/ios/simulator')
out.mkdir(parents=True, exist_ok=True)
def run(*args):
    return subprocess.check_output(['xcrun','simctl',*args])
inventory = json.loads(run('list','devices','available','-j'))['devices']
groups = [(runtime,devices) for runtime,devices in inventory.items() if 'iOS-26' in runtime]
assert groups, 'No iOS 26 simulator runtime installed'
runtime, devices = sorted(groups)[-1]
selections=[]
for label, needle in [('iphone','iPhone'),('ipad-mini','iPad mini'),('ipad-standard','iPad (A16)'),('ipad-large','iPad Pro 13')]:
    match = next((device for device in devices if needle in device['name']),None)
    if match is None and label=='ipad-standard':
        match=next((device for device in devices if 'iPad Air 11' in device['name']),None)
    assert match, 'Required simulator unavailable: ' + label
    selections.append((label,match))
results=[]
for label, device in selections:
    udid=device['udid']
    try:
        if device['state']!='Booted': run('boot',udid)
        run('bootstatus',udid,'-b')
        run('status_bar',udid,'override','--time','9:41','--batteryState','charged','--batteryLevel','100')
        run('install',udid,app)
        run('launch',udid,os.environ['NAILMOODS_IOS_BUNDLE_ID'])
        result_path = out/(label+'.xcresult')
        with (out/(label+'-uitest.log')).open('w') as log:
            subprocess.check_call(['xcodebuild','test','-project','ios/App/App.xcodeproj','-scheme','App',
                '-configuration','Release','-destination','id='+udid,
                '-derivedDataPath',os.environ['RUNNER_TEMP']+'/nm-simulator',
                '-clonedSourcePackagesDirPath',os.environ['RUNNER_TEMP']+'/nm-spm',
                '-resultBundlePath',str(result_path),'CODE_SIGNING_ALLOWED=NO'],stdout=log,stderr=subprocess.STDOUT)
        subprocess.check_call(['xcrun','xcresulttool','export','attachments','--path',str(result_path),'--output-path',str(out/(label+'-attachments'))])
        run('launch',udid,os.environ['NAILMOODS_IOS_BUNDLE_ID'])
        time.sleep(2)
        run('io',udid,'screenshot',str(out/(label+'-after-test.png')))
        results.append({'label':label,'device':device['name'],'runtime':runtime,'screenshot':'portrait and iPad landscape in XCTest attachments','scope':'Native navigation launch and supported orientation; no login, camera or purchase validation'})
    finally:
        run('shutdown',udid)
(out/'captures.json').write_text(json.dumps(results,indent=2))
