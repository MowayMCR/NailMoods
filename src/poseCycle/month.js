import {localDate,validDate} from '../journal.js';
export const DAY_LABELS=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
export function shiftMonth(month,delta){if(!/^\d{4}-\d{2}$/.test(month)||!validDate(month+'-01'))throw Error('Mois invalide');const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);return d.toISOString().slice(0,7);}
export function monthDays(month){shiftMonth(month,0);const first=new Date(month+'-01T12:00:00Z'),offset=(first.getUTCDay()+6)%7;const count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();return Array.from({length:Math.ceil((count+offset)/7)*7},(_,i)=>{const d=new Date(first);d.setUTCDate(i-offset+1);const date=d.toISOString().slice(0,10);return {date,day:d.getUTCDate(),current:date.startsWith(month)};});}
export function dayAppointments(rows,date){return rows.filter(p=>p.scheduled_on===date&&p.status!=='canceled').sort((a,b)=>(a.starts_at||'').localeCompare(b.starts_at||'')||a.title.localeCompare(b.title));}
export const monthTitle=month=>new Date(month+'-01T12:00:00Z').toLocaleDateString('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'});
export const todayDate=localDate;
