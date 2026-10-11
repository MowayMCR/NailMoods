"""Native capture, with exact pixels checked before delivery. No scaling."""
import json, os, pathlib, subprocess
out=pathlib.Path('artifacts/store-captures');out.mkdir(parents=True,exist_ok=True)
def sim(*args):return subprocess.check_output(['xcrun','simctl',*args],timeout=300)
inventory=json.loads(sim('list','devices','available','-j'))['devices']
runtime,devices=sorted([(r,d) for r,d in inventory.items() if 'iOS-26' in r])[-1]
results=[]
for label,needles,dimensions in [('iPhone_1206x2622',['iPhone 16 Pro','iPhone 17 Pro'],(1206,2622)),('iPad_2048x2732',['iPad Air 13','iPad Pro (12.9-inch)'],(2048,2732))]:
    device=next((d for needle in needles for d in devices if needle in d['name'] and 'Max' not in d['name']),None)
    assert device, f'No matching device: {label}; available={devices}'
    udid=device['udid'];folder=out/label;folder.mkdir(exist_ok=True)
    print(f'Native capture {device["name"]}',flush=True)
    try:
        if device['state']!='Booted':sim('boot',udid)
        sim('bootstatus',udid,'-b');sim('status_bar',udid,'override','--time','9:41','--batteryState','charged','--batteryLevel','100')
        result=out/(label+'.xcresult');log=out/(label+'.log')
        command=['xcodebuild','test','-project','ios/App/App.xcodeproj','-scheme','App','-configuration','Release','-destination','id='+udid,'-derivedDataPath',os.environ['RUNNER_TEMP']+'/nm-store','-clonedSourcePackagesDirPath',os.environ['RUNNER_TEMP']+'/nm-spm','-resultBundlePath',str(result),'-parallel-testing-enabled','NO','-only-testing:NailMoodsUITests/StoreCaptureTests','CODE_SIGNING_ALLOWED=NO']
        with log.open('w') as f:r=subprocess.run(command,stdout=f,stderr=subprocess.STDOUT,timeout=1200)
        if r.returncode:print('\n'.join(log.read_text(errors='replace').splitlines()[-100:]),flush=True)
        attachments=out/(label+'-attachments');subprocess.check_call(['xcrun','xcresulttool','export','attachments','--path',str(result),'--output-path',str(attachments)])
        assert r.returncode==0,'Native UI test failed; evidence retained'
        # Export manifest records preserve XCTest attachment display names.
        print((attachments/'manifest.json').read_text(),flush=True)
        results.append({'folder':label,'device':device['name'],'runtime':runtime,'expectedPixels':dimensions,'sourceCommit':os.environ.get('GITHUB_SHA'),'baseCommit':'fdf9851da0548f61b0939ff8daea69c0a9036956','appVersion':'0.8.1','fixtures':'Synthetic only, remote fetch mocked, actual UI and inspiration engine'})
    finally:sim('shutdown',udid)
(out/'capture-source.json').write_text(json.dumps(results,indent=2))
