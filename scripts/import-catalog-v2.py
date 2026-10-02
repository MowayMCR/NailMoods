"""Compile the audited workbook; never infer identities, colors or barcode links."""
import argparse, collections, hashlib, json, re
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'V2-2026-10-01'
EXPECTED_SHA = '5ee75d3dfba63791a99a3761486db494bf27d7a9e067d88a809f473f3d1fc9ff'

def text(value):
    return '' if value is None else str(value).strip()

def rows(sheet):
    iterator = sheet.values
    headers = next(iterator)
    return [dict(zip(headers, row)) for row in iterator]

def valid_gtin(code):
    if not re.fullmatch(r'\d{14}', code):
        return False
    total = sum(int(c) * (3 if i % 2 == 0 else 1) for i, c in enumerate(reversed(code[:-1])))
    return (10 - total % 10) % 10 == int(code[-1])

def product_type(source):
    kind = source.casefold()
    if any(word in kind for word in ['builder', 'construction', 'base gel', 'base uv', 'nail art', 'gel couleur']):
        return 'Gel'
    if any(word in kind for word in ['semi-permanent', 'gel polish']):
        return 'Semi-permanent'
    if 'poudre' in kind:
        return 'Autre'
    return 'Vernis' if kind else 'Autre'

def main(path):
    checksum = hashlib.sha256(path.read_bytes()).hexdigest()
    if checksum != EXPECTED_SHA:
        raise ValueError('Workbook differs from the audited release source')
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    merged, scan = rows(workbook['Catalogue fusionné']), rows(workbook['Index scan'])
    old = json.loads((ROOT / 'public/catalog-v1.json').read_text())['products']
    active = [r for r in merged if r['État de ligne'] == 'Oui']
    by_key, products, mappings = {}, [], []
    for row in active:
        key, source_number = text(row['Clé de rapprochement']), row['N° V1']
        if key in by_key or not key:
            raise ValueError('Duplicate or absent identity key')
        historic = old[int(source_number) - 1] if source_number else {}
        catalog_id = historic.get('catalogId') or 'nm-v2-' + hashlib.sha256(key.encode()).hexdigest()[:16]
        source_type = text(row['Type de produit'])
        p = dict(catalogId=catalog_id, catalogVersion=VERSION, brand=text(row['Marque']),
            collection=text(row['Gamme retenue']), name=text(row['Teinte retenue']),
            reference=text(row['Référence teinte']), sku=text(row['SKU variante']),
            type=product_type(source_type), sourceType=source_type, url=text(row['URL identité']),
            sourceCheckedAt='2026-10-01', identityStatus=text(row['Identité']),
            family=text(row['Famille couleur sourcée']), finish=text(row['Finition sourcée']),
            coverage=text(row['Couvrance sourcée']), volume=text(row['Format contrôlé']),
            lamp=text(row['Lampe']), usage='Sur une couleur de base' if 'nail art' in source_type else
            'Autre' if any(t in source_type.lower() for t in ['base', 'builder', 'construction', 'soin', 'diluant', 'top coat', 'poudre', 'kit']) else 'Couleur seule')
        # Historical corrections are traced, never imported as wrong shade-number aliases.
        historic_name = historic.get('name')
        names = [text(row['Alias de nom'])]
        if historic_name == p['name']:
            names.append(historic_name)
        p['nameAliases'] = sorted({n for n in names if n and n != p['name']})
        official_hex = text(row['HEX nuancier officiel'])
        if re.fullmatch(r'#[0-9a-fA-F]{6}', official_hex):
            p.update(catalogColor=official_hex, colorValidated=True)
        # A shared manufacturer SKU remains traceable but is not identity evidence.
        p['skuUnique'] = row['Unicité SKU'] == 'Unique dans cette gamme'
        p = {k: v for k, v in p.items() if v not in ('', [], None)}
        by_key[key] = p
        products.append(p)
    associations = 0
    for row in scan:
        if row['Statut association'] != 'Vérifié pour import':
            continue
        p = by_key.get(text(row['Clé de rapprochement']))
        if p is None:
            raise ValueError('Verified barcode without an active identity')
        code = text(row['GTIN-14'])
        if not valid_gtin(code):
            raise ValueError('Invalid verified GTIN')
        p.setdefault('barcodeAliases', [])
        if code not in p['barcodeAliases']:
            p['barcodeAliases'].append(code)
        p.setdefault('scanVariants', []).append(dict(gtin=code, rawBarcode=text(row['Code brut publié']),
            symbology=text(row['Symbologie']), volume=text(row['Format']), sku=text(row['SKU contrôlé']),
            source=text(row['URL source'])))
        p.setdefault('gtin', code)
        associations += 1
    # Explicit mapping for every legacy ID, including quarantined rows and aliases.
    for number, historic in enumerate(old, 1):
        source_rows = [r for r in merged if r['N° V1'] == number]
        if len(source_rows) != 1:
            raise ValueError('Legacy source row is not uniquely traceable')
        row = source_rows[0]
        target = by_key.get(text(row['Clé de rapprochement']))
        if str(row['État de ligne']).startswith('Alias'):
            if row['Teinte retenue'] == 'Expresso':
                target = next(p for p in products if p['brand'] == 'Le Mini Macaron' and p['name'] == 'Espresso')
            elif target is None:
                target = next(p for p in products if p['brand'] == row['Marque'] and p['name'] == row['Teinte retenue'] and p['collection'] == row['Gamme retenue'])
            target.setdefault('nameAliases', []).append(historic['name'])
        mappings.append(dict(legacyCatalogId=historic['catalogId'], catalogId=target['catalogId'] if target else None,
            state=text(row['État de ligne']), original=historic,
            reason=text(row['Décision / corrections'])))
    ids = [p['catalogId'] for p in products]
    if len(ids) != len(set(ids)) or len(products) != 2631 or associations != 1047 or len(mappings) != 1801:
        raise ValueError('Release counters or IDs do not match audit')
    payload = dict(version=VERSION, sourceFile=path.name, sourceSha256=checksum, count=len(products),
        verifiedBarcodeAssociations=associations, quarantinedCount=351, products=products)
    for filename, data in [('catalog-v2.json', payload), ('catalog-v2-id-map.json', dict(version=VERSION, mappings=mappings))]:
        (ROOT / 'public' / filename).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps({k: v for k, v in payload.items() if k != 'products'}, ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('workbook', type=Path)
    main(parser.parse_args().workbook)
