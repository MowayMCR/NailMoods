export const techniqueGroups = ['French','Dégradés','Motifs','Matières','Effets','Décors','Dessin libre','Composition'];
export const techniqueLabel = value => ({Marble:'Marbré',Leopard:'Léopard',Tortoiseshell:'Écaille de tortue',Freehand:'Dessin à main levée','Line art':'Lignes','Dot art':'Pois','One stroke':'Peinture en un trait','Cow print':'Motif vache',Zebra:'Zèbre','Snake print':'Motif serpent','Blooming gel':'Blooming','Aura nails':'Aura','Chrome powder':'Poudre chrome','Cat-eye magnetic':'Cat-eye magnétique','Velvet nails':'Velours','Glazed nails':'Glacé','Jelly nails':'Jelly','Glass nails':'Effet verre','Syrup nails':'Translucide','Milky nails':'Laiteux','Soap nails':'Effet naturel','3D gel':'Gel 3D',Encapsulated:'Incrustations'}[value] || value);
export function techniqueGroup(value) {
 if (/french/i.test(value)) return 'French';
 if (['Babyboomer','Ombré','Dégradé','Gradient nails','Aura nails','Airbrush','Watercolor'].includes(value)) return 'Dégradés';
 if (['Marble','Blooming gel','Tortoiseshell','Crocodile','Snake print','Leopard','Cow print','Zebra','Stamping'].includes(value)) return 'Motifs';
 if (['Jelly nails','Glass nails','Syrup nails','Milky nails','Soap nails'].includes(value)) return 'Matières';
 if (['Chrome powder','Cat-eye magnetic','Velvet nails','Glazed nails'].includes(value)) return 'Effets';
 if (['Encapsulated','3D gel','Charms','Strass','Foil','Flakes'].includes(value)) return 'Décors';
 if (['Freehand','Line art','Dot art','One stroke'].includes(value)) return 'Dessin libre';
 return 'Composition';
}
