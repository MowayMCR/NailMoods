# NailMoods

Prototype V0.1 de NailMoods, une application web mobile-first pour créer des inspirations de manucure à partir de sa collection, de ses moods et de ses habitudes.

## Test local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Déploiement

Le dépôt contient un workflow GitHub Pages dans `.github/workflows/deploy-pages.yml`. Une fois GitHub Pages configuré sur **GitHub Actions**, chaque mise à jour de `main` construit et publie automatiquement l'application.

Les données de cette V0.1 sont conservées localement dans le navigateur (`localStorage`). Aucun backend n'est nécessaire pour ce prototype.

## Phase 2 — collection et matériel

- Le filtre **Matériel** donne accès à un ajout direct. Le menu général **Ajouter** propose aussi **Matériel & accessoires**.
- Une fiche matériel contient sa catégorie, son nom, sa marque, sa référence, sa quantité et ses notes. Les stickers, décorations et capsules peuvent préciser une couleur ou un motif.
- Les cartes matériel utilisent une icône dédiée ou la photo ajoutée. Elles ne contribuent pas au compteur des couleurs de vernis.
- Une photo peut être importée ou prise avec le téléphone, puis remplacée ou retirée. Elle est réduite à 1 200 px maximum dans la collection (800 px dans le journal) et conservée avec la fiche sur l'appareil. Un échec de stockage laisse la fiche ouverte et préserve la collection enregistrée.
- Les liens et photos peuvent maintenant compléter les fiches : voir la phase 6 bis ci-dessous.
- La clé `nm-collection-v2` est conservée pour retrouver les produits existants ; le profil `nm-profile` n'est pas modifié.

## Phase 3 — créer une manucure

Accès direct : `https://mowaymcr.github.io/NailMoods/#creer`, ou onglet **Créer**.

- Trois envies : comme d'habitude, envie de changement, surprends-moi (Safe / Creative / Chaos).
- Tuiles tactiles pour l'humeur, l'univers, l'occasion, le temps, la difficulté et les limites. Les premiers choix viennent du profil ; les ajustements ne modifient pas ce profil.
- La tuile **Nombre de vernis** propose **Automatique** ou exactement **1, 2, 3, 4 ou 5 vernis colorés**. Le nombre est conservé et affiché sur chaque proposition. Stickers, bases et top coats ne sont pas comptés. Les compositions à trois, quatre et cinq références utilisent chaque vernis dans les cinq ongles de l'aperçu.
- Si le nombre demandé ne peut pas être atteint avec les produits du même type de pose et les limites actuelles, l'écran indique le maximum disponible et propose d'ajuster le choix. Il ne réduit jamais silencieusement le nombre demandé. Des références partageant une teinte générique provisoire restent sélectionnables séparément.
- Jusqu'à quatre propositions distinctes, avec cinq ongles schématiques, noms des produits et outils de l'inventaire, durée indicative et explication du choix. S'il n'y a pas assez de possibilités, le nombre réel est affiché.
- Les propositions sont composées localement avec des règles et les caractéristiques saisies. Il n'y a pas de génération d'images ou d'analyse IA distante. Les schémas ne prédisent pas le rendu photographique ni les motifs exacts des stickers.
- Semi-permanent et gel nécessitent une lampe déclarée ; cat-eye nécessite un aimant. Les dessins nécessitent les outils correspondants et un niveau suffisant. Les modes surprise ne contournent jamais les limites.
- Les effets à superposer dont la base et les accessoires ne sont pas identifiés restent signalés comme à préciser. Les bases/top coats ne sont pas utilisés comme vernis colorés. Les technologies de vernis différentes ne sont pas combinées dans une même proposition.
- Les durées portent sur la couleur et la décoration, hors préparation, dépose et séchage. La présence dans l'inventaire ne remplace pas la vérification de compatibilité dans les notices des produits et de la lampe.
- L'envie et l'idée retenue sont conservées dans `nm-creation-v1`. Modifier l'inventaire invalide les anciennes propositions et invite à relancer la création. Les données de collection et de profil sont conservées.
- Les fiches détaillées sont disponibles en phase 4 et les tutoriels guidés en phase 5.

## Phase 4 — fiches d’inspiration, variantes et favoris

- **Voir la fiche** ouvre chaque proposition : cinq ongles tactiles du pouce à l’auriculaire, détails des couleurs / French / lignes / pois / stickers, références, marque, finition, matériel, durée indicative et difficulté. La répartition s’applique aux deux mains.
- Les photos déjà ajoutées à la collection apparaissent avec les références. Les liens HTTP(S) enregistrés ouvrent la boutique ; **Voir ma fiche** retrouve directement le produit dans la collection.
- Les variantes conservent le nombre exact de vernis, le temps maximal, le niveau et les limites de l’idée initiale. Elles utilisent l’inventaire actuel, privilégient la même palette et restent distinctes. S’il n’existe aucune variante, le message l’indique.
- Les cœurs conservent des copies des compositions dans `nm-inspirations-v1`, indépendamment des futures générations. Les photos ne sont pas dupliquées. Les favoris se retrouvent dans **Créer → Mes inspirations favorites** ou depuis l’accueil, avec leur propre route `#favoris`.
- Une fiche favorite garde les références et teintes enregistrées même après une modification de la collection. Un produit supprimé, épuisé ou modifié est signalé. Il ne devient pas disponible artificiellement.
- La dernière inspiration retenue et douze fiches récentes permettent de rouvrir une fiche ou de revenir en arrière, y compris après rechargement. Les favoris ne sont pas limités aux douze fiches récentes. Les erreurs de stockage sont affichées ; un favori n’est confirmé qu’après enregistrement.
- L’accueil donne accès à **Profil, Collection, Créer et Favoris**. Le profil validé en phase 1 a été réintégré depuis son historique, avec ses sélecteurs visuels, univers, thèmes, avatars et sa clé de stockage d’origine. Le bouton Profil de l’en-tête fonctionne aussi. Les clés `nm-profile`, `nm-collection-v2` et `nm-creation-v1` restent inchangées.
- Les tutoriels sont disponibles en phase 5 et les photos, produits utilisés et notes du journal en phase 6.

## Phase 5 — réaliser une pose guidée

- Depuis **Créer → Voir la fiche → Démarrer le tutoriel**, choisir la première main puis suivre la préparation, les couleurs, les dessins ou stickers de l’inspiration et la finition. Les ongles concernés restent indiqués visuellement et par leur nom. Pour les effets magnétiques, le conseil de travailler ongle par ongle est conservé, avec une seule validation de la couleur pour cette main.
- Chaque étape reprend les références de l’inspiration enregistrée. Les couches, la préparation et les instructions de compatibilité restent celles du fabricant ; le guide ne les déduit pas de la teinte. Aucune base, couche de finition ou durée sous lampe n’est imposée automatiquement. Les systèmes varient, y compris les lampes d’une même marque ([FAQ Le Mini Macaron](https://leminimacaron.eu/pages/faqs)).
- Un seul bouton (**Produits prêts**, **Couleur terminée**, **Dessin terminé**…) valide l’étape et passe directement à la suivante. Aucun doigt ou produit n’est à cocher. Il est possible de consulter toutes les étapes et de revenir aux précédentes ; une étape future ne peut pas être validée avant celles qui la précèdent. **Terminer ma pose**, sur la finition de la dernière main, enregistre directement la fin : aucun contrôle final supplémentaire.
- Les minuteurs sont facultatifs, repliés par défaut, et saisis par l’utilisatrice (1 seconde à 60 minutes). Ils sont associés à l’étape et peuvent être mis en pause, repris, remis à zéro ou relancés pour une nouvelle couche. Un minuteur déjà commencé reste visible à la reprise. La durée n’est jamais présélectionnée depuis le type de vernis. Un compte à rebours actif bloque la validation jusqu’à sa fin ou sa mise en pause ; son expiration ne valide aucune étape.
- Le décompte utilise une échéance absolue, conservée dans `nm-tutorials-v1` : navigation, rechargement et mise en arrière-plan ne repartent pas de la durée initiale. Mettre la pose en pause fige le minuteur ; reprendre la pose ne relance pas automatiquement la lampe ou le minuteur. La fin est visuelle, sans son ni notification garantie écran verrouillé ; le temps écoulé est retrouvé au retour.
- La tuile de reprise reste visible dans les autres écrans. **Accueil → Mes poses guidées** donne accès à toutes les poses préparées, en pause ou terminées. Démarrer une autre pose met la précédente en pause ; refaire une pose crée un suivi distinct, sans supprimer la précédente.
- Les sessions contiennent une copie de la composition et des étapes, sans dupliquer les photos. Les modifications de collection sont signalées, sans remplacer silencieusement les produits du tutoriel. Les échecs de sauvegarde laissent la progression précédente intacte et affichent un message.
- Les anciennes poses sont adaptées au parcours simplifié sans changer leur composition. Les étapes déjà validées et les minuteurs sont conservés ; les anciennes étapes magnétiques par doigt sont regroupées par couleur et par main. Une pose dont seul le contrôle final restait à faire est terminée. La même clé de stockage conserve les sessions, désormais en version 2.
- Profil, Collection, Créer, fiches, variantes et favoris restent accessibles, avec leurs clés de stockage d’origine. À la fin d’un tutoriel, **Ajouter au journal** ouvre le formulaire de la phase 6 ; une pose déjà enregistrée propose **Voir dans mon journal**.

## Phase 6 — journal des poses

- Accès par l’onglet **Journal**, la tuile de l’accueil ou la fin d’un tutoriel. **À raconter** retrouve aussi les poses terminées avant cette mise à jour. Aucune pose inachevée n’est ajoutée au journal.
- **Ajouter une pose** permet de garder une pose réalisée sans tutoriel. Nom et date sont préremplis ; photo, références et retours restent facultatifs. Une pose peut être enregistrée immédiatement puis complétée plus tard.
- Import ou prise d’une photo du résultat, préparation à 800 px maximum, remplacement et retrait. La photo personnelle et l’aperçu schématique de l’inspiration sont distingués. La préparation d’une image désactive l’enregistrement jusqu’à sa fin.
- Depuis un tutoriel, les références sont préremplies. Elles restent ajustables dans la collection pour refléter les produits réellement utilisés. L’inspiration d’origine reste une copie distincte : changer les produits du journal ne la réécrit pas. Les références archivées restent lisibles après modification ou suppression dans la collection, sans copier les photos des produits.
- Ressenti **J’adore / J’aime bien / À ajuster**, choix **À refaire**, notes libres. Les détails facultatifs repliés permettent de noter la facilité de réalisation et la tenue observée, à renseigner après avoir porté la pose. Les retours structurés peuvent guider les suggestions depuis la phase 7, décrite ci-dessous.
- Historique classé par date de pose, recherche dans les noms, marques, dates et notes, filtre **À refaire**, modification et suppression avec confirmation. Une même session guidée ne crée pas de doublons ; refaire une inspiration lors d’une autre session crée un souvenir distinct.
- Supprimer un souvenir ne supprime ni son tutoriel ni les produits. Sa suggestion est masquée pour ne pas le faire réapparaître automatiquement ; un ajout explicite depuis le tutoriel reste possible.
- Stockage local dans `nm-journal-v1`, séparé du profil, de la collection, des inspirations et des tutoriels. La synchronisation entre appareils reste prévue pour la phase 11. Une erreur de stockage conserve les données précédentes et le formulaire en cours ; aucun succès n’est affiché avant l’enregistrement.

## Phase 6 bis — liens, photos et teintes

### Stickers et décorations dans les idées

- **Créer → Décorations** propose **Automatique**, **Avec mes décorations** ou **Sans décorations**. Toucher une planche de la collection impose cette référence dans chaque proposition, dans les limites du temps et du nombre de vernis choisis.
- Les catégories **Stickers / décalcomanies** et **Strass / décorations** sont utilisables avec 1 à 5 vernis, y compris les duos et les envies **Sans dessin**. Une référence épuisée ou supprimée ne peut pas être remplacée silencieusement.
- La carte de l’idée affiche la photo de la décoration si elle existe. Les feuilles, lignes, étoiles, lunes, fleurs, cœurs et strass restent des motifs schématiques déduits des caractéristiques saisies, sans détourage automatique de la planche.
- La référence choisie est conservée dans la fiche, le tutoriel, les variantes et le journal. L’ancien choix **Sans stickers** est repris par **Sans décorations**.

### Liens, photos et teintes

- **Collection → Ajouter → Coller une URL**, ou ouvrir une ancienne fiche et toucher **Récupérer depuis le lien**. Les fiches Shopify publiques lisibles (dont Le Mini Macaron Europe, vérifié) fournissent nom, marque, photos, références et variantes. Les autres pages sont utilisables lorsqu’elles autorisent la lecture directe et contiennent un seul produit dans leurs données structurées. Une boutique qui bloque la lecture affiche un message et laisse la fiche utilisable. Il n’y a ni proxy tiers ni clé secrète dans le navigateur.
- Les informations sont proposées dans **À vérifier** : on choisit la variante exacte, la photo et les champs à reprendre, puis **Utiliser ces informations** et **Enregistrer**. Un identifiant de variante absent du catalogue impose un nouveau choix. Les fiches existantes, photos personnelles et teintes précises ne sont pas remplacées automatiquement.
- Nature, finition et effet sont suggérés uniquement à partir du nom, de la catégorie et des étiquettes explicites de la boutique. La description peut mentionner d’autres produits : elle ne sert pas à déduire ces caractéristiques. Les kits mixtes restent à préciser. Aucun temps de catalysation ou compatibilité n’est déduit.
- **Lire l’étiquette ou la capture** effectue une lecture de texte en français et anglais sur l’appareil avec Tesseract.js. Le résultat est corrigeable ; une ligne peut devenir le nom après vérification. **Chercher chez Le Mini Macaron** propose les références dont le nom distinctif complet figure dans le texte. Une correspondance n’est jamais confirmée toute seule. Il s’agit de lecture de texte, pas d’une reconnaissance visuelle universelle du flacon.
- **Ma teinte → Prélever une teinte dans la photo** permet de toucher la zone du vernis ou de choisir parmi des teintes extraites des pixels. Le code hexadécimal exact est conservé ; famille et profondeur sont proposées séparément. Le code reste ajustable manuellement. Les reflets, le fond et l’éclairage peuvent fausser le prélèvement : on vérifie la zone, la finition et les effets. Une photo distante non analysable peut être remplacée par une capture locale.
- Les prochaines créations utilisent ce code couleur. Modifier ensuite la famille ne remplace pas une teinte prélevée ou personnalisée. Les anciennes inspirations favorites, poses et souvenirs conservent leur composition enregistrée. Un changement de collection invite à générer de nouvelles idées.
- **Scanner le produit** lit une photo de code-barres EAN/UPC/ITF, prise avec le téléphone ou importée. Les chiffres peuvent aussi être saisis. La recherche couvre le catalogue public **Le Mini Macaron Europe** : contrôle de clé, recherche de référence, puis vérification du code dans la variante réelle. Une référence absente reste ajoutable avec son nom, sa photo ou son lien. Ce n’est pas une base mondiale de codes-barres.
- Les moteurs de lecture sont chargés seulement à la demande et servis avec l’application. Les photos personnelles ne sont pas envoyées à un service de reconnaissance. Les boutiques/CDN reçoivent les demandes de fiches et d’images publiques, sans cookies ni identifiants de la boutique. Les photos importées restent dans le stockage local ; les photos de boutique sont des liens et nécessitent une connexion pour être affichées.
- Annuler, modifier le lien ou fermer la fiche invalide la recherche en cours. Une réponse tardive ne modifie pas une autre fiche. Les limites de taille, délais et erreurs de stockage sont gérés sans perdre les produits existants.

Références techniques : [Shopify Product API](https://shopify.dev/docs/api/ajax/reference/product), [Tesseract.js](https://github.com/naptha/tesseract.js), [ZXing Browser](https://github.com/zxing-js/browser). Les accès inter-sites dépendent des autorisations de chaque boutique ; le support n’est pas garanti pour toutes les URL.

### Pose réalisée sans suivre le tutoriel

- La fiche d’inspiration propose **Marquer comme faite**, sous **Démarrer le tutoriel**. La pose apparaît terminée dans **Mes poses**, et un badge **Déjà réalisée** figure sur les idées et favoris correspondants.
- Le tutoriel est indiqué comme passé ; ses étapes ne sont pas artificiellement cochées. Si cette pose était déjà commencée, ses étapes réellement validées sont conservées et son minuteur est arrêté. Les autres poses ne changent pas.
- **Ajouter au journal** reste facultatif. Une seconde pression retrouve la même pose sans doublon ; **Refaire cette pose** commence une nouvelle réalisation. L’état survit au rechargement. Une sauvegarde échouée ne marque rien comme fait.

## Phase 7 — intelligence personnelle

- **Créer → Des idées qui me ressemblent**, également disponible dans **Profil**, ouvre **Ce qui guide mes idées** : inspirations favorites, poses réalisées et retours du journal, références appréciées, vernis encore absents des poses enregistrées et techniques signalées comme difficiles.
- Le classement utilise des règles locales : les inspirations favorites et les retours **J’adore / J’aime bien / À refaire** renforcent les références et compositions concernées. Terminer une pose indique une utilisation, sans supposer qu’elle a plu. **À ajuster** réduit le poids de la composition essayée sans pénaliser tous ses vernis.
- **Comme d’habitude** privilégie les goûts et références familières ; **Envie de changement** favorise les vernis peu utilisés et évite de trop répéter les dernières compositions ; **Surprends-moi** conserve sa variété. La difficulté ressentie ajuste doucement le classement, sans modifier les niveaux accessibles. Les cartes et fiches expliquent les signaux utilisés lorsqu’ils s’appliquent.
- Le nombre de vernis, les décorations choisies, le temps, le niveau, les limites et la disponibilité du matériel restent prioritaires. Les ongles et pastilles conservent la teinte précise de chaque référence ; aucune couleur moyenne n’est déduite des goûts. Les variantes utilisent aussi les retours au moment où elles sont demandées.
- Une session terminée et son entrée dans le journal comptent comme une seule pose. Les produits réellement renseignés dans le journal remplacent ceux de l’inspiration pour les signaux d’utilisation. S’ils ont changé, aucune technique ni composition d’origine n’est supposée avoir été réalisée. Les poses manuelles peuvent contribuer avec leurs références et retours explicites.
- Le modèle est recalculé à partir des données présentes : corriger ou retirer un retour/favori retire son influence. Supprimer un souvenir conserve l’utilisation neutre d’un éventuel tutoriel terminé. Les notes libres, photos et durées de tenue ne sont pas interprétées ; aucun service distant ne reçoit ces données.
- **Adapter mes prochaines idées à mes retours** permet de mettre en pause ou réactiver la personnalisation. Le réglage est conservé dans `nm-personalization-v1`. Le profil et les choix du jour restent actifs ; journal et favoris ne sont pas effacés. En cas d’échec de sauvegarde, l’ancien réglage reste en place et le message apparaît dans le panneau.
- Un instantané compact des signaux est conservé avec chaque génération dans `nm-creation-v1` : un cœur, un retour ou une pause de la personnalisation ne déplace pas les idées déjà affichées, y compris après rechargement. **Recomposer mes idées** applique les nouveaux signaux. Les anciennes générations restent lisibles avec leur classement précédent jusqu’à cette action. Les copies des favoris, tutoriels et souvenirs ne sont pas réécrites.
- Aucun journal complet n’est requis pour commencer : un favori ou un retour associé à des produits suffit. Sans historique exploitable, le classement initial continue de fonctionner.

## Phase 8 — accueil intelligent

- L’accueil s’adapte à la situation : pose en cours en premier, puis idée retenue encore à réaliser, puis création d’une nouvelle pose. Une pose déjà terminée n’est plus présentée comme une idée en attente. Si plusieurs suivis existent pour la même inspiration, la reprise ouvre la session précise affichée.
- La progression et l’étape actuelle apparaissent sur l’accueil. Un minuteur en cours conserve son échéance et son décompte ; son expiration ne valide pas d’étape. Reprendre une pose en pause ne relance pas son minuteur. L’échec d’une sauvegarde de reprise laisse la pose en pause et affiche un message.
- **Une inspiration pour toi** compose un aperçu à partir de la collection actuelle, du profil, des derniers choix de **Créer** et de la personnalisation lorsqu’elle est active. Le nombre de vernis, la planche de décorations, le temps et les limites restent respectés. Les ongles et pastilles reprennent les teintes précises, et la photo de la décoration s’affiche lorsqu’elle existe.
- Le même jour et à données identiques, la première suggestion reste stable. Le bouton **Proposer une autre inspiration** permet de varier lorsqu’il existe une alternative. Les compositions déjà retenues ou en cours ne sont pas dupliquées dans cet aperçu. **Découvrir cette idée** ouvre sa fiche avec les mêmes choix pour les variantes et le tutoriel.
- Ouvrir l’accueil ou renouveler son aperçu ne modifie pas la génération, l’idée choisie ou les réglages déjà enregistrés dans **Créer**. Le lecteur de ces réglages est partagé, y compris la reprise des anciennes limites **Sans stickers**. Aucun nouvel espace de stockage n’est nécessaire pour l’accueil.
- Une collection vide, un accessoire manquant, une décoration indisponible, un nombre de vernis impossible ou un temps trop court donnent une explication et un accès au bon parcours. Une ancienne idée retenue conserve sa copie ; les références modifiées ou manquantes sont signalées avant d’ouvrir sa fiche.
- Une pose terminée non encore racontée propose **Ajouter au journal**, sans obligation de photo ou de ressenti. Les poses déjà enregistrées ou masquées ne sont pas proposées à nouveau. À défaut, l’accueil retrouve le dernier souvenir par date de pose et sa photo personnelle, si elle existe.
- Avec un historique et la personnalisation activée, **Une couleur à explorer** retrouve une référence de la collection qui ne figure pas encore dans les poses enregistrées. Le panneau **Des idées qui me ressemblent** reste accessible depuis l’accueil ; mettre en pause n’efface pas l’aperçu en cours. Son actualisation explicite applique les nouveaux réglages.
- **Tout mon NailMoods** garde les accès à Collection, Créer, Mes poses, Journal, Favoris et Profil. Les compteurs de poses dédupliquent les tutoriels et leurs souvenirs associés.

## Suite validée du projet

- Phases 1 à 6 et 6 bis validées par Marie. La représentation schématique est conservée avec la priorité aux teintes précises ; couverture des boutiques et limites décrites ci-dessus.
- Phase 7 développée et publiée ; poursuite du projet demandée par Marie.
- Phase 8 développée, prête à tester et à valider par Marie.
- Phase 9 : premier démarrage guidé ; phase 10 : application native ; phase 11 : compte et synchronisation ; phase 12 : version publique et stores.
- Toutes les phases déjà réalisées restent accessibles pendant le développement des suivantes.

Tests du moteur : `npm test`. Construction : `npm run build`.
