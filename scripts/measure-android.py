import gzip,hashlib,json,sys,zipfile
from pathlib import Path
environment=sys.argv[1]
root=Path('android/app/build/outputs');out=Path('artifacts')/environment;out.mkdir(parents=True,exist_ok=True)
source=Path('public/recognition')
reference={p.name.removesuffix('.gz') if p.name.endswith('.traineddata.gz') else p.name:hashlib.sha256(gzip.decompress(p.read_bytes()) if p.name.endswith('.traineddata.gz') else p.read_bytes()).hexdigest() for p in source.iterdir() if p.is_file()}
rows=[];errors=[]
for p in sorted(root.rglob('*')):
 if p.suffix not in ('.apk','.aab'):continue
 with zipfile.ZipFile(p) as archive:
  ocr=[i for i in archive.infolist() if '/recognition/' in i.filename and not i.is_dir()]
  included={Path(i.filename).name:hashlib.sha256(archive.read(i)).hexdigest() for i in ocr}
  identical=included==reference
  if not identical:errors.append({'file':str(p),'missing':sorted(reference.keys()-included.keys()),'extra':sorted(included.keys()-reference.keys()),'changed':[name for name in reference.keys()&included.keys() if reference[name]!=included[name]]})
  meta=json.loads(archive.read(next(i.filename for i in archive.infolist() if i.filename.endswith('/mobile-build.json'))))
  if meta['environment']!=environment:raise RuntimeError('Wrong environment')
  row={'file':p.name,'bytes':p.stat().st_size,'mib':round(p.stat().st_size/1048576,3),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'ocr_file_count':len(ocr),'ocr_uncompressed_bytes':sum(i.file_size for i in ocr),'ocr_compressed_bytes':sum(i.compress_size for i in ocr),'ocr_content_identical_to_source':identical,'ocr_packaging_note':'Android expands fra/eng.traineddata.gz; hash verified against decompressed source. All other hashes identical.','metadata':meta,'ocr_files':[{'name':Path(i.filename).name,'bytes':i.file_size,'compressed_bytes':i.compress_size,'sha256':included[Path(i.filename).name]} for i in ocr]}
  rows.append(row)
  target=out/(environment+'-'+p.name);target.write_bytes(p.read_bytes())
(out/'measurements.json').write_text(json.dumps(rows,indent=2))
print(json.dumps([{k:v for k,v in r.items() if k!='ocr_files'} for r in rows],indent=2))
if errors:raise RuntimeError(json.dumps(errors))
