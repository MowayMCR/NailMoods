"""Check Apple processing using the existing CI API key; log no credentials."""
import base64, json, os, pathlib, subprocess, time, urllib.parse, urllib.request

out = pathlib.Path('artifacts/ios')
key = pathlib.Path.home()/'.appstoreconnect/private_keys'/('AuthKey_'+os.environ['APP_STORE_CONNECT_KEY_ID']+'.p8')
def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()
def token():
    now = int(time.time())
    head = b64(json.dumps({'alg':'ES256','kid':os.environ['APP_STORE_CONNECT_KEY_ID'],'typ':'JWT'}).encode())
    body = b64(json.dumps({'iss':os.environ['APP_STORE_CONNECT_ISSUER_ID'],'iat':now,'exp':now+1200,'aud':'appstoreconnect-v1'}).encode())
    message = (head+'.'+body).encode()
    der = subprocess.check_output(['openssl','dgst','-sha256','-sign',str(key)],input=message,stderr=subprocess.DEVNULL)
    # P-256 ASN.1 signature: convert its two integers to JWT's 64-byte format.
    offset = 2
    assert der[0] == 48 and der[1] < 128
    values=[]
    for _ in range(2):
        assert der[offset] == 2
        length=der[offset+1]; values.append(int.from_bytes(der[offset+2:offset+2+length],'big').to_bytes(32,'big'));offset+=2+length
    return message.decode()+'.'+b64(b''.join(values))
def get(path, params):
    url='https://api.appstoreconnect.apple.com/v1/'+path+'?'+urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url,headers={'Authorization':'Bearer '+token()}),timeout=60) as response:
        return json.load(response)
bundle=os.environ['NAILMOODS_IOS_BUNDLE_ID']; number=os.environ['NAILMOODS_IOS_BUILD_NUMBER']
apps=get('apps',{'filter[bundleId]':bundle,'limit':2})['data']
assert len(apps)==1,'Existing Apple application not uniquely resolved'
app=apps[0]['id']
result={'bundle':bundle,'build':number,'uploadAccepted':True,'processingState':'NOT_YET_LISTED'}
for attempt in range(20):
    builds=get('builds',{'filter[app]':app,'filter[version]':number,'limit':10})['data']
    if builds:
        build=builds[0];result.update(buildId=build['id'],processingState=build['attributes']['processingState'])
        if result['processingState'] in ['VALID','FAILED','INVALID']:break
    print('Apple processing: '+result['processingState'],flush=True)
    time.sleep(30)
groups=get('betaGroups',{'filter[app]':app,'limit':200})['data']
result['existingGroups']=[{'id':g['id'],'name':g['attributes']['name'],'internal':g['attributes'].get('isInternalGroup',False)} for g in groups]
result['groupAssignment']='Prepared: existing groups identified; no public App Store release'
(out/'apple-processing.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
if result['processingState']!='VALID':raise SystemExit('Apple has not confirmed a valid processed build')
