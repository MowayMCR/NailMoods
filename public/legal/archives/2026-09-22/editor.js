// Config contains only fields explicitly intended for public publication. No private-address source.
fetch('./editor.json', { cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error('configuration');
  return response.json();
}).then(editor => {
  const target = document.getElementById('legal-editor');
  if (!target) return;
  const entries = [
    ['Éditeur actuel', editor.publicLegalName],
    ['Statut', editor.editorType === 'company' ? 'Société' : editor.editorType === 'project_in_creation' ? 'Projet en cours de création' : 'À compléter / À valider'],
    ...(editor.editorType === 'company' || editor.editorType === 'project_in_creation' ? [['Structure prévue', editor.companyLegalForm], ['Immatriculation', editor.companyRegistrationNumber]] : []),
    ['Contact confidentialité', editor.privacyContactEmail],
    ['Support', editor.supportContactEmail],
    ['Adresse légale / professionnelle publiée', editor.publishedProfessionalAddress],
    ['Conservation', editor.retentionPolicy],
    ['Suppression de compte', editor.accountDeletionProcedure],
    ['Version des CGU', editor.termsVersion],
    ['Version confidentialité', editor.privacyVersion],
    ['Date d’effet', editor.effectiveDate],
  ];
  for (const [label, value] of entries) {
    const p = document.createElement('p');
    p.textContent = `${label} : ${typeof value === 'string' && value.trim() ? value : 'à renseigner avant publication définitive'}`;
    target.append(p);
  }
}).catch(() => {
  const target = document.getElementById('legal-editor');
  if (target) target.textContent = 'Coordonnées légales indisponibles. Réessayez ultérieurement.';
});
