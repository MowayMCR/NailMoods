// Never fall back to a cached author snapshot after the server removes sender_id.
export function messageAuthor(message, visibleProfile) {
  if (!message.sender_id) return { displayName: 'Compte supprimé', handle: null, avatarUrl: null, profileId: null };
  return { displayName: visibleProfile?.display_name || 'Membre NailMoods', handle: visibleProfile?.username || null, avatarUrl: visibleProfile?.avatar_url || null, profileId: message.sender_id };
}
