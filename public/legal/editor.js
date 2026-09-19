// Config contains only fields explicitly intended for public publication. No private-address source.
fetch('./editor.json', { cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error('configuration');
  return response.json();
}).then(editor => {
  const target = document.getElementById('legal-editor');
  if (!target) return;
  const entries = [
    ['Éditeur', editor.publicLegalName],
    ['Statut', editor.editorType === 'company' ? 'Société' : 'Personne physique'],
    ...(editor.editorType === 'company' ? [['Forme juridique', editor.companyLegalForm], ['Immatriculation', editor.companyRegistrationNumber]] : []),
    ['Contact confidentialité', editor.privacyContactEmail],
    ['Adresse légale / professionnelle publiée', editor.publishedProfessionalAddress],
    ['Conservation', editor.retentionPolicy],
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
