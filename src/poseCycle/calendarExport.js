import {Capacitor,registerPlugin} from '@capacitor/core';
import {calendarICS,calendarPayload} from './calendar.js';
const CalendarEditor=registerPlugin('NailMoodsCalendar');
export async function exportCalendar(plan,project,{includeDetails=false,icsOnly=false}={}){
 const native=Capacitor.isNativePlatform(),options={environment:import.meta.env.VITE_DEPLOYMENT_ENV,includeDetails,webBase:native?null:location.href};
 if(native&&!icsOnly){const result=await CalendarEditor.open(calendarPayload(plan,project,options));if(result.saved===false)return 'Ajout au calendrier annulé.';if(result.saved===true)return 'Événement ajouté à ton calendrier.';return 'Éditeur du calendrier ouvert. Vérifie et confirme l’événement dans ton calendrier.';}
 const text=calendarICS(plan,project,options);
 if(native){const [{Filesystem,Directory,Encoding},{Share}]=await Promise.all([import('@capacitor/filesystem'),import('@capacitor/share')]);const file=await Filesystem.writeFile({path:'nailmoods-planning.ics',data:text,directory:Directory.Cache,encoding:Encoding.UTF8});try{await Share.share({title:'Mon événement NailMoods',files:[file.uri]});}finally{await Filesystem.deleteFile({path:'nailmoods-planning.ics',directory:Directory.Cache}).catch(()=>{});}return 'Fichier calendrier proposé au partage.';}
 const url=URL.createObjectURL(new Blob([text],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='NailMoods-'+plan.scheduled_on+'.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return 'Fichier .ics téléchargé. Ouvre-le dans ton calendrier pour confirmer l’ajout.';
}
