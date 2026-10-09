"""Record TestFlight availability after the successful signed upload, without credentials."""
import json, pathlib, runpy
state=runpy.run_path('scripts/ci/apple-processing.py')
get=state['get']; result=state['result']; app=state['app']
result['betaBuildDetails']=get('builds/'+result['buildId']+'/buildBetaDetail',{})['data']['attributes']
groups=get('betaGroups',{'filter[app]':app,'limit':200})['data']
assigned=get('betaGroups',{'filter[app]':app,'filter[builds]':result['buildId'],'limit':200})['data']
result['groupPreparation']=[{'id':g['id'],'name':g['attributes']['name'],'internal':g['attributes'].get('isInternalGroup',False),'allBuilds':g['attributes'].get('hasAccessToAllBuilds',False),'assigned':any(a['id']==g['id'] for a in assigned)} for g in groups]
pathlib.Path('artifacts/ios/apple-testflight-status.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
