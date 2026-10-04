// One tutorial timer alongside (never replacing) the Planning reminders.
export const TIMER_NOTIFICATION_ID=1700000100;
const ours=n=>n.id===TIMER_NOTIFICATION_ID&&n.extra?.scope==='pose-timer';
export function timerNotice({session,userId,workspaceId,now=Date.now()}){
 const t=session?.timer;
 if(!session?.alertsEnabled||!userId||!workspaceId||session?.status!=='active'||t?.status!=='running'||!Number.isFinite(t.endsAt)||t.endsAt<=now)return null;
 return {id:TIMER_NOTIFICATION_ID,title:'NailMoods · Temps écoulé',body:'Reviens à ton étape lorsque tu es prête ♡',sound:'default',channelId:'nailmoods-timer',isExactNotification:false,schedule:{at:new Date(t.endsAt),allowWhileIdle:true},extra:{scope:'pose-timer',userId,workspaceId,sessionId:session.id,endsAt:t.endsAt}};
}
export function createTimerScheduler(adapter){let epoch=0,queue=Promise.resolve();const serial=job=>{const r=queue.then(job,job);queue=r.catch(()=>{});return r;};
 async function cancel(){const p=await adapter.getPending();const notifications=p.notifications.filter(ours).map(n=>({id:n.id}));if(notifications.length)await adapter.cancel({notifications});}
 return {
 invalidate(){epoch++;},
 clear(){++epoch;return serial(async()=>{await cancel();const d=await adapter.getDeliveredNotifications();const notifications=d.notifications.filter(ours);if(notifications.length)await adapter.removeDeliveredNotifications({notifications});});},
 sync(input){const ticket=epoch;return serial(async()=>{if(ticket!==epoch)return {state:'superseded'};const notification=timerNotice(input),p=await adapter.getPending(),existing=p.notifications.filter(ours);if(ticket!==epoch)return {state:'superseded'};
 const same=notification&&existing.length===1&&['userId','workspaceId','sessionId','endsAt'].every(k=>existing[0].extra?.[k]===notification.extra[k]);
 if(!same&&existing.length)await adapter.cancel({notifications:existing.map(n=>({id:n.id}))});
 if(!notification)return {state:'idle'};
 if((await adapter.checkPermissions()).display!=='granted'){if(same)await cancel();return {state:'permission'};}
 if(ticket!==epoch)return {state:'superseded'};if(!same)await adapter.schedule({notifications:[notification]});if(ticket!==epoch){await cancel();return {state:'superseded'};}return {state:'scheduled'};});}
 };
}
