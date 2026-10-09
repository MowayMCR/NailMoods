raise SystemExit('Beta delivery paused by Marie pending advertising additions; do not sign or upload.')
"""Install CI signing assets. Never print keys, profile contents or passwords."""
import base64, datetime, hashlib, json, os, pathlib, plistlib, re, secrets, subprocess

def configure_app_profile(text, bundle, team, uuid):
    """Apply an app profile only to App, never SPM frameworks or XCTest."""
    count = 0
    def update(match):
        nonlocal count
        settings = match.group(2)
        if 'INFOPLIST_FILE = App/Info.plist;' not in settings:
            return match.group(0)
        if not re.search(r'PRODUCT_BUNDLE_IDENTIFIER = "?' + re.escape(bundle) + r'"?;', settings):
            raise SystemExit('App build settings do not match the confirmed Bundle ID')
        if 'PROVISIONING_PROFILE' in settings:
            raise SystemExit('App already has a profile override; review it before CI signing')
        settings = settings.replace('CODE_SIGN_STYLE = Automatic;', 'CODE_SIGN_STYLE = Manual;')
        settings += '\n\t\t\t\tDEVELOPMENT_TEAM = "' + team + '";'
        settings += '\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "' + uuid + '";'
        count += 1
        return match.group(1) + settings + match.group(3)
    result = re.sub(r'(buildSettings = \{)(.*?)(\n\t{3}\};)', update, text, flags=re.S)
    if count != 2:
        raise SystemExit('Expected exactly two App build configurations for manual signing')
    return result

def run(*args, **kwargs):
    try:
        return subprocess.check_output(args, stderr=subprocess.PIPE, **kwargs)
    except subprocess.CalledProcessError as error:
        # Only fixed command names and fixed diagnostic messages may be logged.
        # Never expose arguments, stderr, certificate contents or passwords.
        labels = {
            'cms': 'read provisioning profile',
            'create-keychain': 'create temporary keychain',
            'set-keychain-settings': 'configure temporary keychain',
            'unlock-keychain': 'unlock temporary keychain',
            'import': 'import distribution P12',
            'set-key-partition-list': 'authorize signing private key',
            'find-identity': 'find distribution identity',
            'list-keychains': 'register temporary keychain',
        }
        operation = labels.get(args[1] if len(args) > 1 else '', 'signing command')
        detail = (error.stderr or b'').decode('utf-8', errors='replace').lower()
        hint = ''
        if 'mac verification failed' in detail or 'password is incorrect' in detail:
            hint = ' Check the P12 password and PKCS12 export compatibility; this error alone does not distinguish them.'
        elif 'decode' in detail or 'unknown format' in detail or 'invalid format' in detail:
            hint = ' Check the file format and the secret containing its base64 data.'
        elif 'item could not be found' in detail:
            hint = ' Check that the P12 contains its associated private key.'
        elif 'interaction is not allowed' in detail:
            hint = ' The runner could not access the temporary signing keychain.'
        raise SystemExit('Signing operation failed: ' + operation + hint) from None

required = ['APPLE_TEAM_ID', 'APPLE_DISTRIBUTION_P12_BASE64', 'APPLE_DISTRIBUTION_P12_PASSWORD',
            'APPLE_PROVISIONING_PROFILE_BASE64', 'APP_STORE_CONNECT_KEY_ID',
            'APP_STORE_CONNECT_ISSUER_ID', 'APP_STORE_CONNECT_PRIVATE_KEY']
missing = [name for name in required if not os.environ.get(name)]
if missing:
    raise SystemExit('Missing GitHub secrets: ' + ', '.join(missing))
team = os.environ['APPLE_TEAM_ID']
key_id = os.environ['APP_STORE_CONNECT_KEY_ID']
if not re.fullmatch(r'[A-Z0-9]{10}', team) or not re.fullmatch(r'[A-Z0-9]{10}', key_id):
    raise SystemExit('Invalid Apple Team ID / API Key ID')
bundle = os.environ['NAILMOODS_IOS_BUNDLE_ID']
root = pathlib.Path(os.environ['RUNNER_TEMP']) / 'nm-apple-signing'
root.mkdir(mode=0o700, exist_ok=True)
os.chmod(root, 0o700)
p12 = root / 'distribution.p12'
profile = root / 'distribution.mobileprovision'
p12.write_bytes(base64.b64decode(os.environ['APPLE_DISTRIBUTION_P12_BASE64'], validate=True))
profile.write_bytes(base64.b64decode(os.environ['APPLE_PROVISIONING_PROFILE_BASE64'], validate=True))
data = plistlib.loads(run('security', 'cms', '-D', '-i', str(profile)))
entitlements = data.get('Entitlements', {})
app_prefix = data.get('ApplicationIdentifierPrefix', [''])[0]
if (data.get('TeamIdentifier') != [team] or entitlements.get('application-identifier') != app_prefix + '.' + bundle
        or entitlements.get('com.apple.developer.team-identifier') != team
        or entitlements.get('get-task-allow', False) or data.get('ProvisionedDevices')
        or data.get('ProvisionsAllDevices') or data['ExpirationDate'] <= datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)):
    raise SystemExit('Profile is not a valid, unexpired App Store profile for this Team and Bundle ID')
keychain = root / 'signing.keychain-db'
password = secrets.token_urlsafe(32)
run('security', 'create-keychain', '-p', password, str(keychain))
run('security', 'set-keychain-settings', '-lut', '21600', str(keychain))
run('security', 'unlock-keychain', '-p', password, str(keychain))
run('security', 'import', str(p12), '-P', os.environ['APPLE_DISTRIBUTION_P12_PASSWORD'], '-k', str(keychain),
    '-T', '/usr/bin/codesign', '-T', '/usr/bin/security')
run('security', 'set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-s', '-k', password, str(keychain))
identities = run('security', 'find-identity', '-v', '-p', 'codesigning', str(keychain)).decode()
allowed = [hashlib.sha1(cert).hexdigest().upper() for cert in data['DeveloperCertificates']]
if not any(fingerprint in identities and 'Apple Distribution' in identities for fingerprint in allowed):
    raise SystemExit('The P12 identity does not match the provisioning profile')
run('security', 'list-keychains', '-d', 'user', '-s', str(keychain), str(pathlib.Path.home()/'Library/Keychains/login.keychain-db'))
uuid = data['UUID']
if not re.fullmatch(r'[A-Fa-f0-9-]{36}', uuid):
    raise SystemExit('Invalid profile UUID')
api_directory = pathlib.Path.home() / '.appstoreconnect/private_keys'
api_path = api_directory / ('AuthKey_' + key_id + '.p8')
# Register every external path before creating it, so partial failures clean up.
(root/'cleanup.json').write_text(json.dumps({'uuid':uuid,'api_path':str(api_path)}))
for directory in ['Library/MobileDevice/Provisioning Profiles', 'Library/Developer/Xcode/UserData/Provisioning Profiles']:
    destination = pathlib.Path.home() / directory
    destination.mkdir(parents=True, exist_ok=True)
    (destination / (uuid + '.mobileprovision')).write_bytes(profile.read_bytes())
api_directory.mkdir(mode=0o700, parents=True, exist_ok=True)
key = os.environ['APP_STORE_CONNECT_PRIVATE_KEY'].replace('\\n', '\n')
if not key.startswith('-----BEGIN PRIVATE KEY-----'):
    raise SystemExit('API private key must contain the original PEM .p8 content')
api_path.write_text(key)
os.chmod(api_path, 0o600)
plistlib.dump({'method':'app-store-connect','destination':'export','signingStyle':'manual','teamID':team,
              'signingCertificate':'Apple Distribution','provisioningProfiles':{bundle:uuid},
              'manageAppVersionAndBuildNumber':False,'uploadSymbols':True,'stripSwiftSymbols':True},
             (root/'ExportOptions.plist').open('wb'))
project = pathlib.Path('ios/App/App.xcodeproj/project.pbxproj')
project.write_text(configure_app_profile(project.read_text(), bundle, team, uuid))
# Non-secret outputs only.
with open(os.environ['GITHUB_ENV'], 'a') as output:
    output.write('NM_PROFILE_UUID=' + uuid + '\nNM_SIGNING_DIR=' + str(root) + '\n')
print('Distribution identity, profile and API key installed in the temporary runner.')
