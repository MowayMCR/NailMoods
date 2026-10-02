export function billingPeriodLabel(period) {
  return { P1M: 'mois', P1Y: 'an' }[period] || '';
}
export function hasGoogleSubscription(state, now = Date.now()) {
  return (state?.subscriptions || []).some(s => ['pending','on_hold','paused'].includes(s.status) ||
    (['active','grace','canceled'].includes(s.status) &&
    s.items?.some(item => Date.parse(item.expiresAt) > now)));
}
export function hasPaidGoogleAccess(state, now = Date.now()) {
  return (state?.subscriptions || []).some(s => ['active','grace','canceled'].includes(s.status) &&
    s.items?.some(item => Date.parse(item.expiresAt) > now));
}
export function billingNotice(results, state, restore = false) {
  const list = Array.isArray(results) ? results : results?.synced || [];
  if (list.some(r => r.purchaseState === 'pending')) return 'Paiement en attente. Ton accès sera mis à jour après confirmation de Google Play.';
  if (results?.failures?.length || results?.reconciliationFailed) return 'La vérification est incomplète. Réessaie « Restaurer mes achats ».';
  if (hasPaidGoogleAccess(state)) return restore ? 'Tes abonnements vérifiés ont été restaurés.' : 'Ton abonnement est vérifié. Ton accès a été mis à jour.';
  return restore ? 'Aucun abonnement actif à restaurer pour ce compte.' : 'Aucun abonnement actif confirmé. Réessaie la restauration si Google indique un achat terminé.';
}
export function billingError(error) {
  const code = error?.message || '';
  return ({
    purchase_canceled: 'Achat annulé. Ton offre reste inchangée.',
    billing_not_configured: 'Les abonnements ne sont pas encore ouverts. Free et tes accès offerts restent disponibles.',
    billing_not_available: 'Les achats sont disponibles dans la version Android distribuée par Google Play.',
    billing_ineligible: 'Confirme les conditions et ta majorité dans Confidentialité avant de souscrire.',
    existing_subscription: 'Un abonnement existe déjà. Restaure tes achats ou gère-le dans Google Play.',
    manual_entitlement_active: 'Tu bénéficies déjà d’un accès offert par NailMoods.',
    price_changed: 'Cette offre a changé. Actualise les offres et vérifie le prix avant de réessayer.',
    purchase_account_mismatch: 'Cet achat est associé à un autre compte NailMoods. Connecte-toi au compte utilisé pour l’achat.',
    purchase_token_owned_by_another_account: 'Cet achat est déjà lié à un autre compte NailMoods.',
    product_unavailable: 'Cette offre est momentanément indisponible.',
    billing_unavailable: 'Google Play est indisponible. Vérifie ta connexion et le compte Google du Play Store.',
    rate_limit: 'Trop de tentatives rapprochées. Patiente une minute puis réessaie.',
  })[code] || 'L’achat n’a pas pu être vérifié. Aucun accès payant n’est accordé sans confirmation du serveur.';
}
