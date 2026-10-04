import React from 'react';
import {ChevronLeft,ChevronRight,Plus} from 'lucide-react';
import {DAY_LABELS,monthDays,shiftMonth,monthTitle,dayAppointments,todayDate} from './month';
import {PLAN_LABELS} from './planning';
export default function MonthCalendar({month,onMonth,day,onDay,items,onAdd,disabled}){
 const today=todayDate(),rows=dayAppointments(items,day);
 return <section className="planningMonth" aria-label="Calendrier mensuel">
  <div className="monthToolbar"><button aria-label="Mois précédent" onClick={()=>onMonth(shiftMonth(month,-1))}><ChevronLeft size={20}/></button><h2 aria-live="polite">{monthTitle(month)}</h2><button aria-label="Mois suivant" onClick={()=>onMonth(shiftMonth(month,1))}><ChevronRight size={20}/></button></div>
  <button className="nmQuiet monthToday" onClick={()=>{onMonth(today.slice(0,7));onDay(today);}}>Aujourd’hui</button>
  <div className="monthWeek" aria-hidden="true">{DAY_LABELS.map(x=><span key={x}>{x}</span>)}</div>
  <div className="monthGrid">{monthDays(month).map(d=>{const events=dayAppointments(items,d.date);return <button key={d.date} className={'monthDay'+(!d.current?' outside':'')} aria-pressed={day===d.date} aria-current={today===d.date?'date':undefined} aria-label={d.date+' · '+events.length+' rendez-vous'+(events.length?' · '+events.map(e=>PLAN_LABELS[e.kind]+': '+e.title).join(', '):'')} onClick={()=>{onDay(d.date);if(!d.current)onMonth(d.date.slice(0,7));}}><b>{d.day}</b><span className="monthDots" aria-hidden="true">{events.slice(0,3).map(e=><i key={e.id} data-kind={e.kind}/>)}{events.length>3&&<small>+{events.length-3}</small>}</span></button>;})}</div>
  <div className="monthLegend">{Object.entries(PLAN_LABELS).map(([id,label])=><span key={id}><i data-kind={id}/>{label}</span>)}</div>
  <div className="monthAgendaTitle"><div><small>LE JOUR CHOISI</small><h3>{new Date(day+'T12:00:00Z').toLocaleDateString('fr-FR',{day:'numeric',month:'long',timeZone:'UTC'})}</h3></div><button className="nmQuiet" disabled={disabled} onClick={()=>onAdd(day)}><Plus size={18}/> Ajouter</button></div>
  {!rows.length&&<p className="planningHint">Une journée libre. Ajoute une pose, un rendez-vous ou un moment pour toi.</p>}
 </section>;
}
