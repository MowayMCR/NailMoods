"""Verify AdMob metadata in the Gradle-merged release manifest."""
import json, pathlib, xml.etree.ElementTree as ET
expected=json.loads(pathlib.Path('src/ads/android-config.json').read_text())['applicationId']
paths=[p for p in pathlib.Path('android/app/build/intermediates').rglob('AndroidManifest.xml') if 'merged_manifest' in str(p) and '/release/' in str(p)]
assert paths, 'Merged release manifest not found'
key='{http://schemas.android.com/apk/res/android}'
for path in paths:
    root=ET.parse(path).getroot()
    metadata={x.get(key+'name'):x.get(key+'value') for x in root.findall('./application/meta-data')}
    assert metadata.get('com.google.android.gms.ads.APPLICATION_ID')==expected, 'AdMob app ID mismatch'
    assert metadata.get('com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT')=='true', 'Measurement must be delayed'
print(json.dumps({'admobAppId':expected,'measurementDelayed':True,'manifests':[str(p) for p in paths]},indent=2))
