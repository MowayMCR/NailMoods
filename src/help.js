import { browserStorage } from './storage.js';

export const guides = {
  scan: { title: 'Scan & Génère', slides: [['palette','Montre tes couleurs','Photographie un ou deux vernis. Tu peux aussi choisir une couleur sans photo. Vérifie ou corrige la teinte avant de continuer.'],['sparkles','Une référence inconnue ? Continue','La couleur suffit pour créer tes idées. Choisis un effet, puis ouvre une pose pour voir les couleurs et sa recette.']] },
  home: { title: 'Bienvenue dans NailMoods', slides: [['palette', 'Tes produits, tes inspirations', 'Ouvre Créer puis Inspire-moi, même sans collection.'], ['sparkles', 'Ta première pose', 'Ouvre Créer, choisis une idée et conserve-la dans tes favoris.']] },
  collection: { title: 'Ma collection', slides: [['package', 'Ajoute ce que tu possèdes', 'Photo, URL, scan ou saisie manuelle : choisis avec Ajouter.'], ['palette', 'Vérifie ta vraie teinte', 'Ouvre le produit pour ajuster sa couleur et son type de pose.'], ['lamp', 'Pense aussi au matériel', 'Ajoute ta lampe et tes stickers. Filtrer et trier permet de retrouver tes favoris, marques et couleurs.']] },
  equipment: { title: 'Mon matériel', slides: [['lamp', 'Tes outils, à part', 'Renseigne ta lampe, tes pinceaux et tes accessoires dans Matériel.'], ['sticker', 'Une idée réalisable', 'La génération tient compte de ta lampe, de ton aimant et de tes outils. Ajoute aussi tes stickers.']] },
  generator: { title: 'Générer une idée', slides: [['palette', 'Tes couleurs à toi', 'Inspire-moi fonctionne immédiatement. Avec ma collection privilégie tes teintes.'], ['sparkles', 'Choisis ton envie', 'Mood, nombre de vernis, temps et décorations : adapte les choix.'], ['heart', 'Garde ta préférée', 'Génère une idée, ouvre sa fiche et ajoute-la aux favoris.']] },
  moodboard: { title: 'Inspirations & moodboards', slides: [['palette', 'Lis ta pose en images', 'Les ongles et les pastilles reprennent tes couleurs. La fiche indique leur répartition.'], ['sticker', 'Tes décorations', 'Choisis tes stickers dans Créer. Le motif dessiné reste schématique.'], ['heart', 'Retrouve tes idées', 'Le cœur conserve ta pose. Renomme-la ou crée une variante depuis sa fiche, sans modifier l’original.']] },
  journal: { title: 'Mon journal', slides: [['book', 'Tes poses réalisées', 'Après une pose, ajoute-la au journal. Photo et ressenti sont facultatifs.'], ['palette', 'Retrouve les détails', 'Ouvre un souvenir pour revoir la pose et ses produits.'], ['heart', 'Une idée pour plus tard ?', 'Les inspirations à essayer restent dans Mes inspirations favorites, depuis Accueil ou Créer.']] },
  profile: { title: 'Mon profil', slides: [['sparkles', 'À ton rythme', 'Choisis ton niveau, ton temps et ton type de pose habituel.'], ['palette', 'Ton univers', 'Personnalise tes préférences et ton apparence en touchant les tuiles.']] },
  tutorial: { title: 'Ma pose guidée', slides: [['palette', 'Une étape à la fois', 'Observe les ongles et les produits associés à chaque geste.'], ['book', 'Garde ta progression', 'Valide les étapes réalisées. Tu peux faire une pause et reprendre dans Mes poses.'], ['heart', 'Ton souvenir', 'À la fin, retrouve ta pose et ajoute-la au journal.']] },
};
const seenInMemory = new Set();
const seenKey = screen => `nm-help-v1:${screen}_help_seen`;
// This web version has one anonymous local profile per browser, no server accounts.
export function helpSeen(screen, storage = browserStorage) {
  if (seenInMemory.has(screen)) return true;
  try { return storage.getItem(seenKey(screen)) === 'true'; } catch { return false; }
}
export function markHelpSeen(screen, storage = browserStorage) {
  seenInMemory.add(screen);
  try { storage.setItem(seenKey(screen), 'true'); } catch { /* Help must never block. */ }
}
export function trackHelp(event, { screen, source, slide, step }, storage = browserStorage) {
  const entry = { event, screen, source, slide, step, timestamp: new Date().toISOString() };
  try {
    const saved = JSON.parse(storage.getItem('nm-help-events-v1') || '[]');
    const events = Array.isArray(saved) ? saved : [];
    storage.setItem('nm-help-events-v1', JSON.stringify([...events.slice(-199), entry]));
  } catch { /* Optional, bounded local instrumentation. No remote collection. */ }
}
