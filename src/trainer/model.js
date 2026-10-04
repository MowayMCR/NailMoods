export const EXERCISES=Object.freeze([
 {id:'lines',name:'Lignes fines',hint:'Suis chaque ligne lentement, puis essaie sans le modèle.',paths:['M30 40V120','M50 40V120','M70 40V120']},
 {id:'french',name:'French',hint:'Dessine une courbe régulière d’un bord à l’autre.',paths:['M20 35Q50 65 80 35','M22 25Q50 49 78 25']},
 {id:'micro',name:'Micro French',hint:'Garde une bande très fine le long du bord libre.',paths:['M25 27Q50 3 75 27','M25 30Q50 9 75 30']},
 {id:'dots',name:'Dots',hint:'Pose de petits points espacés, sans les étirer.',paths:['M35 55h.01','M65 55h.01','M50 80h.01','M35 105h.01','M65 105h.01']},
 {id:'waves',name:'Vagues',hint:'Accompagne la courbe avec un mouvement continu.',paths:['M32 35C72 60 12 95 52 125','M48 35C88 60 28 95 68 125']},
 {id:'flowers',name:'Fleurs',hint:'Commence par le cœur, puis dessine cinq petits pétales.',paths:['M50 80h.01','M50 74C32 58 52 46 54 70','M56 75C69 50 87 72 61 79','M60 84C85 87 71 110 55 89','M50 91C44 114 26 96 44 84','M42 80C18 76 35 58 47 74']},
 {id:'leopard',name:'Léopard',hint:'Varie les taches et laisse leurs contours ouverts.',paths:['M30 55Q19 42 33 40','M39 40Q53 49 41 58','M60 90Q48 73 63 72','M70 74Q83 86 72 94','M33 125Q18 111 31 104','M39 107Q54 117 42 129']},
 {id:'graphic',name:'Formes graphiques',hint:'Compose avec des diagonales et des espaces laissés libres.',paths:['M25 50L75 100','M25 95L65 55L65 120Z']},
]);
export function exercise(id){return EXERCISES.find(e=>e.id===id)||EXERCISES[0];}
export function canvasPoint(event,rect){return {x:Math.max(0,Math.min(100,(event.clientX-rect.left)*100/rect.width)),y:Math.max(0,Math.min(160,(event.clientY-rect.top)*160/rect.height))};}
