"""Import the approved V1 CSV without guessing colors or product references."""
import csv, json, hashlib, sys
from pathlib import Path
rows = list(csv.DictReader(Path(sys.argv[1]).open(encoding='utf-8-sig')))
products=[]
for row in rows:
    if row['Statut vérification'].strip() != 'confirmé':
        continue
    key='|'.join(row[k].strip() for k in ['Marque','Gamme','Référence','Teinte'])
    kind=row['Type'].lower()
    product={
      'catalogId':'nm-v1-'+hashlib.sha256(key.encode()).hexdigest()[:16],
      'brand':row['Marque'],'collection':row['Gamme'],'name':row['Teinte'],'reference':row['Référence'],
      'type':'Vernis' if kind in ['vernis classique','gel-like polish','gel finish'] else 'Gel' if kind in ['builder gel','base gel','nail art gel'] else 'Semi-permanent',
      'sourceType':row['Type'], 'url':row['URL source'], 'family':row['Famille couleur'],
      'finish':{'crème':'Crème','pailleté':'Pailleté','brillant':'Brillant'}.get(row['Finition'].lower(), row['Finition']),
      'sourceCheckedAt':row['Dernière vérification'],
      'usage':'Sur une couleur de base' if kind == 'nail art gel' else 'Autre' if kind in ['builder gel','base gel'] else 'Couleur seule',
    }
    # HEX estimé is not validated catalogue color. V1 currently has no hex values.
    if row['HEX estimé']: product['estimatedColor']=row['HEX estimé']
    products.append({k:v for k,v in product.items() if v})
ids=[p['catalogId'] for p in products]
if len(ids)!=len(set(ids)): raise ValueError('Duplicate brand/range/reference/name in source')
payload={'version':'V1-2026-09-17','sourceFile':Path(sys.argv[1]).name,'count':len(products),'products':products}
Path('public/catalog-v1.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
print('Imported',len(products),'references; no colors inferred')
