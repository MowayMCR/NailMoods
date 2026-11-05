"""Inspect every shipped privacy manifest. This is not Xcode's Organizer report.

Usage: privacy-report.py App.app|App.ipa report.json
No network, credentials or SDK manifest modifications.
"""
import hashlib, io, json, pathlib, plistlib, sys, zipfile

source, output = map(pathlib.Path, sys.argv[1:3])
if source.is_dir():
    entries = [(str(p.relative_to(source)), p.read_bytes())
               for p in sorted(source.rglob('PrivacyInfo.xcprivacy'))]
    info = plistlib.loads((source / 'Info.plist').read_bytes())
else:
    with zipfile.ZipFile(source) as z:
        roots = [n for n in z.namelist() if n.startswith('Payload/')
                 and n.count('/') == 2 and n.endswith('.app/Info.plist')]
        if len(roots) != 1:
            raise ValueError('Expected one application Info.plist')
        info = plistlib.loads(z.read(roots[0]))
        entries = [(n, z.read(n)) for n in sorted(z.namelist())
                   if n.endswith('/PrivacyInfo.xcprivacy')]
if not entries:
    raise ValueError('No shipped privacy manifests')
manifests, collected = [], {}
for path, raw in entries:
    value = plistlib.loads(raw)
    manifests.append({'path': path, 'sha256': hashlib.sha256(raw).hexdigest(),
                      'manifest': value})
    for row in value.get('NSPrivacyCollectedDataTypes', []):
        key = row['NSPrivacyCollectedDataType']
        item = collected.setdefault(key, {'type': key, 'linked': False,
                                         'trackingDeclared': False,
                                         'purposes': set(), 'sources': []})
        item['linked'] |= bool(row.get('NSPrivacyCollectedDataTypeLinked'))
        item['trackingDeclared'] |= bool(row.get('NSPrivacyCollectedDataTypeTracking'))
        item['purposes'].update(row.get('NSPrivacyCollectedDataTypePurposes', []))
        item['sources'].append(path)
for item in collected.values():
    item['purposes'] = sorted(item['purposes'])
report = {'kind': 'shipped-manifest-static-report',
          'notXcodeOrganizerReport': True, 'notRuntimeProof': True,
          'bundle': info['CFBundleIdentifier'], 'version': info['CFBundleShortVersionString'],
          'build': info['CFBundleVersion'], 'manifests': manifests,
          'collectedDataUnion': [collected[k] for k in sorted(collected)],
          'warnings': ['SDK declarations describe possible SDK practices; App Store answers require actual app configuration and behavior.',
                       'No ATT prompt does not prove that no tracking occurs.',
                       'Do not edit third-party SDK manifests to suppress declarations.']}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'build': report['build'], 'manifests': len(manifests),
                  'types': len(collected), 'report': str(output)}))
