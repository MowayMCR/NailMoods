import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {createReminderScheduler} from './reminderScheduler.js';
import {queueNotificationLink} from './projectLinks.js';
const scheduler=createReminderScheduler(LocalNotifications);let listening;
export const nativePlanning=()=>Capacitor.isNativePlatform();
export async function setupPlanningNotifications(){if(!nativePlanning())return;if(!listening)listening=LocalNotifications.addListener('localNotificationActionPerformed',e=>queueNotificationLink(e.notification.extra));if(Capacitor.getPlatform()==='android')await LocalNotifications.createChannel({id:'nailmoods-planning',name:'Planning NailMoods',description:'Les rappels que tu choisis',importance:3,visibility:-1});}
export async function requestPlanningNotifications(){if(!nativePlanning())return {display:'web'};await setupPlanningNotifications();return LocalNotifications.requestPermissions();}
export async function clearPlanningNotifications(){scheduler.invalidate();if(nativePlanning())await scheduler.clear();}
export const invalidatePlanningNotifications=()=>scheduler.invalidate();
export async function syncPlanningNotifications(input){if(!nativePlanning())return {state:'web',count:0};await setupPlanningNotifications();return scheduler.sync(input);}
