// Legacy document hook. Current pages have accessible static content.
const target = document.getElementById('legal-editor');
if (target) { const link = document.createElement('a'); link.href = 'informations.html'; link.textContent = 'Mentions légales actuelles de NailMoods'; target.replaceChildren(link); }
