"""Fail before upload if the archived/exported bundle violates release contracts."""
import json, os, pathlib, plistlib, re, subprocess, sys, tempfile, zipfile

def inspect(app, signed=False):
    info = plistlib.loads((app/'Info.plist').read_bytes())
    expected_bundle = os.environ.get('NAILMOODS_IOS_BUNDLE_ID', 'com.nailmoods.app')
    assert info['CFBundleIdentifier'] == expected_bundle, 'Bundle ID mismatch'
    assert sorted(info['UIDeviceFamily']) == [1,2], 'iPhone and iPad required'
    assert int(re.search(r'\d+', info['DTSDKName']).group()) >= 26, 'iOS SDK 26+ required'
    assert info['CFBundleDisplayName'] == 'NailMoods', 'Unexpected display name'
    assert info['CFBundleVersion'] == os.environ['NAILMOODS_IOS_BUILD_NUMBER'], 'Build number mismatch'
    assert info['ITSAppUsesNonExemptEncryption'] is False
    assert 'NSUserTrackingUsageDescription' not in info, 'Unexpected ATT'
    assert 'UIInterfaceOrientationLandscapeLeft' in info['UISupportedInterfaceOrientations~ipad']
    manifest = plistlib.loads((app/'PrivacyInfo.xcprivacy').read_bytes())
    assert manifest['NSPrivacyTracking'] is False
    approved_data_types = {'Name','EmailAddress','UserID','Contacts','Health','PhotosorVideos','EmailsOrTextMessages',
                           'OtherUserContent','PurchaseHistory','ProductInteraction','OtherDiagnosticData',
                           'CoarseLocation','CustomerSupport','OtherDataTypes'}
    declared_types = {d['NSPrivacyCollectedDataType'] for d in manifest['NSPrivacyCollectedDataTypes']}
    assert declared_types == {'NSPrivacyCollectedDataType'+t for t in approved_data_types}, 'Unexpected or invalid Apple privacy data type'
    sdk_manifests = list(app.rglob('PrivacyInfo.xcprivacy'))
    assert len(sdk_manifests) > 1, 'Missing embedded SDK privacy manifests'
    privacy_resources = [{'path':str(p.relative_to(app)),
                          'accessedAPIs':plistlib.loads(p.read_bytes()).get('NSPrivacyAccessedAPITypes',[])}
                         for p in sdk_manifests]
    public = app/'public'
    build = json.loads((public/'mobile-build.json').read_text())
    assert build['appId'] == expected_bundle and build['environment'] == 'production'
    assert build['versionCode'] == int(info['CFBundleVersion'])
    scripts = '\n'.join(p.read_text() for p in public.rglob('*.js'))
    for forbidden in ['google-play-verify', 'registerPlugin("NailMoodsBilling")', 'ai-internal', 'nm_ai_history']:
        assert forbidden not in scripts, 'Forbidden iOS payload: ' + forbidden
    assert 'NailMoodsStoreKit' in scripts and 'apple-verify' in scripts
    for pattern in ['*.p8','*.p12','*.key']:
        assert not list(public.rglob(pattern)), 'Private file found in web bundle'
    if signed:
        subprocess.check_call(['codesign','--verify','--deep','--strict',str(app)])
        profile = plistlib.loads(subprocess.check_output(['security','cms','-D','-i',str(app/'embedded.mobileprovision')]))
        entitlements = plistlib.loads(subprocess.check_output(['codesign','-d','--entitlements',':-',str(app)], stderr=subprocess.DEVNULL))
        prefix = profile['ApplicationIdentifierPrefix'][0]
        assert entitlements['application-identifier'] == prefix + '.' + expected_bundle
        assert entitlements['com.apple.developer.team-identifier'] == os.environ['APPLE_TEAM_ID']
        assert entitlements.get('get-task-allow',False) is False
    return {'bundle':info['CFBundleIdentifier'],'version':info['CFBundleShortVersionString'],
            'build':info['CFBundleVersion'],'sdk':info['DTSDKName'],'devices':info['UIDeviceFamily'],
            'sdkPrivacyManifests':len(sdk_manifests),'privacyResources':privacy_resources,
            'signatureVerified':signed,'IAPlus':'compiled closed'}

path = pathlib.Path(sys.argv[1])
signed = '--signed' in sys.argv
if path.suffix == '.ipa':
    with tempfile.TemporaryDirectory() as directory:
        with zipfile.ZipFile(path) as archive:
            archive.extractall(directory)
        apps = list((pathlib.Path(directory)/'Payload').glob('*.app'))
        assert len(apps) == 1
        result = inspect(apps[0],signed)
else:
    result = inspect(path,signed)
print(json.dumps(result, indent=2))
