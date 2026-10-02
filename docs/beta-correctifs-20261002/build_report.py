from pathlib import Path
import json, html, csv, os
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT

ROOT = Path(__file__).resolve().parent
DELIVERY = Path(os.environ.get('NAILMOODS_DELIVERY_DIR', str(ROOT/'output'))).resolve()
OUT = DELIVERY / 'output/pdf/NailMoods_Rapport_Beta6_2026-10-02.pdf'
META = json.loads((DELIVERY/'build-verification.json').read_text())
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('NM', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('NM-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFontFamily('NM',normal='NM',bold='NM-Bold',italic='NM',boldItalic='NM-Bold')
C = colors.HexColor('#913b61'); SOFT = colors.HexColor('#f6eaf0'); INK = colors.HexColor('#30252a')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyNM',fontName='NM',fontSize=9,leading=13,textColor=INK,spaceAfter=7))
styles.add(ParagraphStyle(name='SmallNM',fontName='NM',fontSize=7.4,leading=10,textColor=INK))
styles.add(ParagraphStyle(name='HeadNM',fontName='NM-Bold',fontSize=15,leading=19,textColor=C,spaceBefore=12,spaceAfter=8))
styles.add(ParagraphStyle(name='TitleNM',fontName='NM-Bold',fontSize=24,leading=30,textColor=C,spaceAfter=12))
story=[]
def p(text,style='BodyNM'):
 return Paragraph(text,styles[style])
def para(text): story.append(p(text))
def head(text): story.append(p(text,'HeadNM'))
def table(headers,rows,widths,padding=7):
 data=[[p(html.escape(str(x)),'SmallNM') for x in headers]]+[[p(html.escape(str(x)),'SmallNM') for x in row] for row in rows]
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),SOFT),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),padding),('BOTTOMPADDING',(0,0),(-1,-1),padding),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,0),1,C),('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#dfcbd5'))]))
 story.append(t);story.append(Spacer(1,8))
def page(): story.append(PageBreak())

story.append(p('NailMoods - Correctifs bêta 6','TitleNM'))
para('Rapport consolidé du 2 octobre 2026. Un seul code métier pour Android et iOS. Android : candidat AAB signé, version <b>0.3.0-beta.6 / code 6</b>.')
para('<b>Critère de sortie non atteint :</b> aucun vrai appareil Android ou iOS disponible dans cet environnement. Le parcours caméra physique → reconnaissance → fiche → Collection reste à valider. Les tests navigateur emploient des images synthétiques ; ils ne valident pas une caméra native.')
head('1. Bugs reproduits et causes racines')
table(['État audité / problème','Cause vérifiée'],[
 ('Partiel - scan UPC-E OPI','Le lecteur JavaScript @zxing/library 0.21.3 ne décodait pas l’image UPC-E 09421215. Le catalogue savait déjà résoudre ce code.'),
 ('Partiel - scan/photo','L’import photo ne lançait pas systématiquement la reconnaissance. Le résultat et les erreurs natives n’étaient pas suffisamment visibles dans le formulaire.'),
 ('Partiel - URL','La lecture existante reposait sur des requêtes navigateur et une logique spécialisée Le Mini Macaron, insuffisante pour les autres fiches officielles.'),
 ('Absent - bibliothèque matériel','Catégories anciennes présentes, mais pas de référence commune de 34 outils avec sélection immédiate. Ajout standard via formulaire.'),
 ('Partiel - top coats','Finition Mat/Brillant présente ; catégories de produits Top Coat mat / brillant et filtre dédié absents.'),
 ('Partiel - ambiance / palette','Le moteur classait certains choix par mood, mais ne construisait pas une relation de palette cohérente pour toutes les ambiances.'),
 ('Absent - techniques automatiques','Pas de bouton visible de sélection automatique avec éligibilité par niveau et compatibilité.'),
 ('Absent - favori double-tap','Boutons favoris existants ; double-tap absent. Le repli inspiration pouvait aussi augmenter silencieusement une durée trop courte.'),
 ],[176,335])
head('2. Corrections effectuées / commits')
para('9cb4acf : corrections métier communes. b063f0b : import JSX explicite, corrigé après un échec macOS. <b>06c8f92</b> : finition visuelle matériel et preuves navigateur. Même commit final sur les branches Android et iOS ; aucune réécriture de main.')
para('Fichiers principaux : recognition.js, ProductImport.jsx, productImport.js, nativeMedia.js, cameraErrors.js ; EquipmentLibrary.jsx, equipmentLibrary.js, equipmentSeed.js ; productKinds.js, collection.js ; moodPalettes.js, techniqueRules.js, creationEngine.js, freeInspiration.js, CreateView.jsx ; TapFavorite.jsx, Discovery.jsx, ProfileView.jsx. Migrations et fonctions : section 4.')

page()
head('3. Éléments déjà corrigés avant cette passe')
para('Conservés : normalisation GTIN avec zéros initiaux et expansion UPC-E, recherche exacte et aliases du catalogue, confirmation avant ajout, palette NailMoods et prélèvement photo, génération Free avec collection vide, moteur multitechnique et garde sur les ongles différents.')
para('Déjà présents au contrôle du code : compteurs de messages non lus et actualisation toutes les 20 s à l’écran actif ; notifications discrètes ; contacts acceptés réutilisés sans nouvelle saisie d’identifiant ; gestion des comptes bloqués ; Journal raccordé à ShareToPoSheet ; questionnaire avant résumé de personnalisation. Ces points ne sont pas présentés comme de nouvelles corrections. Leur validation avec deux comptes authentifiés reste à effectuer.')
para('Aucune régression des P0 sociaux validés n’a été démontrée. Recherche/ouverture profil, invitations, publication, public → privé, blocage, signalement, suppression et Journal restent inchangés. Les contrôles automatisés passent, sans remplacer les essais réels à deux comptes.')
head('4. Base de données / serveur')
para('Migration source : <b>20261002184655_beta_equipment_library_product_import.sql</b>. Déployée en Recette (version 20261002184655) puis Production (version serveur 20261002191558). Vérification serveur : 34 outils actifs, politique de lecture active, index anti-doublon présent. Deux matériels Production existants conservés.')
para('equipment_library : id, slug, name, category, aliases, sort_order, active. Lecture RLS ; cache local et seed embarqué. Métadonnées du matériel conservées dans user_equipment. Index standard par workspace/slug et contrôle des noms personnalisés normalisés ; anciens éléments conservés.')
para('Edge Function <b>product-page</b> ACTIVE v1 sur Recette et Production, même empreinte de déploiement. JWT requis, validation getUser, quota 30/min par utilisatrice. JSON-LD Product, métadonnées/OpenGraph et enrichissement Shopify prudent. Formulaire modifiable et confirmation avant sauvegarde ; retour manuel avec les données fiables restantes.')
para('SSRF : HTTP/HTTPS, ports standard, exclusion localhost/IP privées et metadata cloud ; chaque réponse DNS et redirection contrôlée ; connexion épinglée à l’IP publique avec TLS pour le nom original ; 12 s, 2,5 Mo, 3 redirections, contrôle Content-Type. Données structurées absentes : aucune valeur inventée. Test négatif live sans auth : HTTP 401. Requête live authentifiée complète encore non vérifiée.')
para('Advisors : compteur privé RLS sans politique permissive et RPC SECURITY DEFINER auth.uid() intentionnels. Liens : <link href="https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy" color="#913b61">RLS privé</link> ; <link href="https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable" color="#913b61">RPC authentifiée</link>. Les alertes préexistantes pg_net et protection des mots de passe n’ont pas été modifiées.')
head('5. Catalogue - lacunes constatées')
table(['Marque / donnée','Constat au contrôle'],[
 ('Catalogue commun','2 631 références actives ; 1 047 associations de codes vérifiées. Aucun EAN ou produit commercial ajouté artificiellement.'),
 ('KIKO / CANNI','50 / 192 références actives ; aucun code vérifié. OCR/référence/fiche manuelle nécessaires. Les SKU CANNI partagés ne confirment pas une teinte.'),
 ('Manucurist / OPI','264 / 86 références actives ; 262 / 7 variantes de codes. Green et Green Flash distincts ; Bubble Bath UPC-E reconnu en test navigateur.'),
 ('Top coats','3 références nommées Mavala Star Gold/Pink/Silver. Pas de nouvelles références commerciales mat/brillant ; catégories génériques ajoutées au formulaire et aux filtres.'),
 ],[145,366])

page()
head('6. Android - build et signature')
para('Branche : <b>feat/google-play-billing-beta6</b>. Commit : '+META['commit']+'. Compilation Java avec Billing 9.1.0 et bundleRelease : '+META['androidBuild']+'. APK Recette préparé pour tester la caméra sur téléphone.')
para('Play Console consultée : dernier bundle utilisé <b>5 / 0.3.0-beta.5</b>, actif en test fermé. Code 6 conservé, sans choisir un numéro arbitraire. Application <b>com.nailmoods.app</b>, targetSdk 36 ; build release non debuggable.')
para('Clé d’importation existante retrouvée, certificat identique à Play Console. SHA-256 du certificat : <font size="7">58:4D:C4:C3:F4:77:C8:63:7C:CF:AF:FA:95:72:13:D8:41:25:07:34:B6:D6:67:70:D0:36:67:EE:4D:AE:08:C0</font>. Aucune clé créée ou réinitialisée. Signature stricte, bundletool et payload inchangé : '+META['signature']+'. Aucune publication Play effectuée.')
para('<link href="'+META['androidRunURL']+'" color="#913b61">Preuve du build Android GitHub Actions</link>. Le build embarque le lecteur WASM et les ressources OCR locales ; il ne dépend pas d’un CDN pour lire les codes.')
head('7. iOS - branche StoreKit exacte')
para('Branche retrouvée dans Git : <b>feat/apple-storekit-ios</b>. Même commit métier '+META['commit']+'. Synchronisation Capacitor, compilation simulateur et archive appareil non signée : '+META['iosBuild']+'.')
para('<link href="'+META['iosRunURL']+'" color="#913b61">Preuve du build iOS GitHub Actions</link>. Archive Recette 0.3.0 / build 1, com.nailmoods.app.recette ; aucun IPA signé, aucune distribution TestFlight. La signature Apple et les essais caméra/permissions sur iPhone nécessitent l’appareil et l’équipe Apple. Google Play Billing, StoreKit et droits Free/Plus/Pro/bêta manuels n’ont pas été activés ou reconfigurés dans ce lot.')

matrix=[
 ('Scan produit connu','PASS navigateur : fiche → ajout → couleur → reload, image EAN-13'),
 ('Scan KIKO','PASS OCR synthétique ; catalogue sans EAN vérifié'),
 ('Scan Manucurist','PASS lecteur EAN-13 Green et Green Flash'),
 ('Scan OPI UPC-E','PASS lecteur réel WASM sur image 09421215 → Bubble Bath'),
 ('CANNI avec/sans code fiable','PASS logique de refus des rapprochements ambigus ; étiquette réelle à tester'),
 ('EAN-8 / UPC-A / zéro initial','PASS lecteur images ; zéro préservé / forme GTIN équivalente'),
 ('Code inconnu / absent du catalogue','PASS message distinct, ajout manuel et EAN conservé'),
 ('Code non détecté','PASS contrat distinct du code connu sans produit'),
 ('OCR étiquette / reconnaissance photo','PASS Tesseract sur texte KIKO synthétique ; photos réelles à tester'),
 ('Caméra refusée','PASS mapping erreurs / annulation ; permission native à tester'),
 ('URL produit exploitable','PASS parsing HTML officiel de 4 marques ; Edge live authentifiée à tester'),
 ('URL site inaccessible','PASS timeout/SSRF/manuel en tests serveur ; site live à tester'),
 ('Ajout matériel bibliothèque','PASS UI navigateur et logique, lecture serveur 34 outils'),
 ('Retrait matériel','PASS UI navigateur et logique'),
 ('Doublon matériel','PASS logique et PostgreSQL isolé'),
 ('Matériel personnalisé','PASS ajout/édition/remarque/reload local ; cloud à tester'),
 ('Persistance / hors réseau','PASS local/cache ; reconnexion authentifiée à tester'),
 ('Top Coat mat/brillant','PASS catégories, recherche et filtre ; UI native à tester'),
 ('Couleur produit','PASS palette NailMoods après scan, couleur sauvegardée ; pas de picker système'),
 ('Free sans collection','PASS tests moteur, zéro produit/matériel/sticker ; compte neuf réel à tester'),
 ('Favori double-tap','PASS UI ajout/retrait et retour visuel ; fil authentifié à tester'),
]
generation=[
 ('Mood doux','PASS palettes claires et cohérentes'),
 ('Mood audacieux','PASS contrastes contrôlés ; débutant/30 min sans complexité imposée'),
 ('10 générations même mood','PASS 7 moods, au moins 6 palettes différentes par série'),
 ('Débutant + aléatoire','PASS 300 sélections, aucune technique au-dessus du niveau'),
 ('Avancé + aléatoire','PASS techniques avancées possibles ; toutes les familles éligibles apparaissent'),
 ('Aléatoire répété','PASS au moins 15 combinaisons distinctes sur 30 clics simulés'),
 ('Multitechnique','PASS compatibilités et incompatibilités ; aussi des choix simples'),
 ('Avancé → Débutant','PASS recalcul automatique et UI ; manuel conservé avec avertissement'),
 ('Couleurs manuelles','PASS jamais remplacées par le mood, toutes présentes sur les cartes'),
 ('Technique manuelle','PASS jamais remplacée silencieusement ; infaisabilité explicitée'),
]
page()
head('8. Matrice fonctionnelle - preuves et limites')
para('<b>415 tests réussis / 417 ; 0 échec ; 2 ignorés.</b> Les deux tests ignorés demandent la configuration de comptes Recette A/B : tiers réels et intégration média. Six parcours navigateur passent, sans erreur JavaScript. Les colonnes Android/iOS ci-dessous concernent l’usage réel sur appareil et restent NV (non vérifié).')
table(['Fonction','Résultat commun effectivement vérifié','Android','iOS'],[(a,b,'NV appareil','NV appareil') for a,b in matrix],[122,279,55,55],padding=4)

page()
head('8. Matrice générateur et non-régression')
para('Taxonomie réutilisée : <b>46 moods et 53 libellés techniques</b>, plus les six ambiances historiques. Niveau réel 0/1/2. Palette composée par relations ; saturation/luminosité/contraste/accents guidés par mood. Filtrage difficulté/temps/matériel demandé avant tirage. Choix manuels prioritaires ; automatique recalculé et historique de session utilisé.')
table(['Cas','Résultat commun','Android','iOS'],[(a,b,'NV appareil','NV appareil') for a,b in generation],[130,271,55,55])
para('P0 sociaux non rouverts : recherche profil, fiche profil, invitation/acceptation, publication, public → privé, blocage, signalement, suppression de compte, Journal et connexions déjà validées. Tests automatisés présents réussis ; essais réels Android/iOS à deux comptes non exécutés dans cette passe.')
head('Preuves inspectables dans le package')
para('tests-final.txt et journaux CI : assertions moteur, droits et PostgreSQL ; browser-e2e.json/.txt : six scénarios, détails des produits et de l’OCR ; scan-found.png, scan-unknown.png, equipment-library.png, technique-dice.png : captures réelles du navigateur. play-console-version.json et play-console-upload-certificate.json : version et certificat lus dans Play Console.')
para('real-page-parsing.json : HTML officiel HTTP 200 de Manucurist, KIKO, OPI, CANNI, Le Mini Macaron. Quatre fiches structurées reconnues ; CANNI fournit des données partielles. real-product-urls.json : transport TCP épinglé bloqué par la sortie réseau du workspace, donc aucun PASS Edge complet. recette-deployment.json / production-deployment.json : reçus de déploiement et vérifications SQL.')
para('Limite : pas de preuve de persistance après reconnexion d’un compte, de caméra/permis native, de paiement réel ou de TestFlight. Le lot reste candidat tant que le scan physique demandé n’est pas validé.')

page()
head('9. Package de livraison réellement disponible')
para('AAB Production signé ; APK Recette de test ; archive iOS non signée ; archive du code commun ; patch Git ; migration, seed matériel et Edge Function ; rapport PDF ; matrices CSV ; journaux et captures des tests ; fichiers SHA256SUMS et vérification de signature. Catalogue commercial inchangé : empreinte du fichier source fournie. Aucune clé privée ni mot de passe inclus.')
para('L’AAB est un candidat de test fermé. Sa construction et sa signature sont vérifiées ; cela ne constitue pas un PASS caméra sur appareil, ni un achat réel Google Play/StoreKit.')
head('10. RESTE À FAIRE MARIE')
para('<b>1.</b> Importer l’AAB signé dans le test fermé Google Play. Installer cette version sur un vrai Android et valider scan → bonne fiche → couleur → Collection → relance, avec au moins Manucurist et OPI UPC-E. Tester aussi refus caméra et produit inconnu ; transmettre les résultats ou un accès au téléphone de test.')
para('<b>2.</b> Valider les fiches URL après connexion, la persistance après déconnexion/reconnexion et les parcours sociaux avec les comptes bêta déjà connectés. Ces vérifications n’ont pas de preuve live disponible ici.')
para('<b>3.</b> Pour iOS/TestFlight : fournir la signature de l’équipe Apple dans le workflow prévu et un iPhone de test. Rien à recréer pour la clé Android. Aucun changement arbitraire de version requis.')

page()
head('Captures de vérification de l’interface commune')
para('Chromium, largeur 390 px. Images et texte synthétiques ; ces captures montrent le parcours d’interface, sans simuler une validation matérielle Android/iOS.')
images=[]
for name in ['scan-found','equipment-library','technique-dice']:
 images.append(Image(str(ROOT/'evidence'/f'{name}.png'),width=156,height=338))
t=Table([images, [p('Code détecté / produit trouvé','SmallNM'),p('Bibliothèque et sélection','SmallNM'),p('Bouton Techniques visible','SmallNM')]],colWidths=[170,170,170]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0)]));story.append(t)
story.append(Spacer(1,18));para('AAB signé - SHA-256 : <font size="8">'+META['signedSHA256']+'</font>. Les autres empreintes sont regroupées dans SHA256SUMS.txt. Les clés de signature sont exclues du package.')
def footer(canvas,doc):
 canvas.saveState();canvas.setFont('NM',7);canvas.setFillColor(C);canvas.drawString(42,27,'NailMoods · Correctifs bêta 6 · 02/10/2026');canvas.drawRightString(553,27,f'{doc.page}');canvas.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=(595,842),rightMargin=42,leftMargin=42,topMargin=36,bottomMargin=44,title='NailMoods - Rapport correctifs bêta 6',author='NailMoods')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
for name,rows in [('Matrice_Fonctions.csv',matrix),('Matrice_Generateur.csv',generation)]:
 with (DELIVERY/name).open('w',newline='',encoding='utf-8-sig') as f:
  writer=csv.writer(f,delimiter=';');writer.writerow(['Fonction / cas','Résultat commun','Android','iOS']);writer.writerows((a,b,'NON VERIFIE SUR APPAREIL','NON VERIFIE SUR APPAREIL') for a,b in rows)
print(OUT)
