import {track} from './analytics/analytics.js';
import { browserStorage } from './storage.js';
import { permissions, readGuestConsent, TECHNOLOGIES } from './privacy/policy.js';

export const PHOTO_ANALYTICS_EVENTS = Object.freeze([
  'inspiration_import_started', 'inspiration_image_added', 'inspiration_image_removed',
  'inspiration_import_completed', 'inspiration_analysis_started', 'inspiration_analysis_succeeded',
  'inspiration_analysis_failed', 'create_mode_selected', 'generation_started',
  'generation_succeeded', 'generation_failed', 'inspiration_project_created',
  'nail_art_choice', 'nail_art_level_selected',
]);

export function photoAnalyticsMetadata(value = {}) {
  const metadata = {};
  if (typeof value.nail_art === 'boolean') metadata.nail_art = value.nail_art;
  if (['simple', 'intermediate', 'pro'].includes(value.level)) metadata.level = value.level;
  if (Number.isInteger(value.image_count) && value.image_count >= 0 && value.image_count <= 4) metadata.image_count = value.image_count;
  if (['collection_only', 'open_possibilities'].includes(value.mode)) metadata.mode = value.mode;
  return metadata;
}

// Consent-gated and non-blocking. Images, names, colors and free text are deliberately discarded.
export function trackPhotoEvent(event, metadata = {}, storage = browserStorage) {
  if (!PHOTO_ANALYTICS_EVENTS.includes(event)) return false;
  track(event,photoAnalyticsMetadata(metadata));
  if (!TECHNOLOGIES.analytics || storage.accountScoped || !permissions({ consent: readGuestConsent(storage) }).analytics) return false;
  try {
    const rows = JSON.parse(storage.getItem('nm-photo-events-v1') || '[]');
    const bounded = Array.isArray(rows) ? rows.slice(-199) : [];
    bounded.push({ event, occurred_at: new Date().toISOString(), metadata: photoAnalyticsMetadata(metadata) });
    storage.setItem('nm-photo-events-v1', JSON.stringify(bounded));
    return true;
  } catch { return false; }
}
