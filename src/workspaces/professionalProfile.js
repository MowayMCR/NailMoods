export const PROFESSIONAL_STATUSES = Object.freeze([
  {
    value: 'institute_owner',
    label: 'Propriétaire d’institut / salon',
    shortLabel: 'Propriétaire',
    description: 'Je gère un espace Institut, ses membres et ses rôles.',
  },
  {
    value: 'independent',
    label: 'Créatrice / PO / Nail Artist indépendante',
    shortLabel: 'Indépendante',
    description: 'J’exerce avec mon profil Pro personnel, sans équipe obligatoire.',
  },
  {
    value: 'institute_associate',
    label: 'Compte associé / collaboratrice d’un institut',
    shortLabel: 'Associée',
    description: 'Je rejoins un Institut et j’accède uniquement aux fonctions de mon rôle.',
  },
]);

export const PROFESSIONAL_LABELS = Object.freeze({
  plus: 'Plus',
  pro: 'Pro',
  independent: 'Créatrice indépendante',
  institute_owner: 'Propriétaire d’institut',
  institute_associate: 'Collaboratrice d’institut',
  institute: 'Institut',
  creator: 'Créateur / Marque',
});

export const INSTITUTE_ROLE_LABELS = Object.freeze({
  owner: 'Propriétaire',
  manager: 'Responsable',
  creator: 'Créatrice / PO',
  member: 'Collaboratrice',
});

export function professionalStatus(value) {
  return PROFESSIONAL_STATUSES.some(option => option.value === value) ? value : '';
}

export function professionalLabel(value) {
  return PROFESSIONAL_LABELS[value] || 'Profil Pro';
}

export function instituteRoleLabel(value) {
  return INSTITUTE_ROLE_LABELS[value] || 'Membre';
}
