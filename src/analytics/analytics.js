const MAX_QUEUE = 100;
const BATCH_SIZE = 20;
const FLUSH_MS = 5000;
const IDLE_MS = 30 * 60 * 1000;
let active = null;
export function setActiveAnalytics(value) { active = value; }
export function track(eventName, metadata = {}, fields = {}) { active?.track(eventName, metadata, fields); }

function uuid() { return crypto.randomUUID(); }
function scalar(value) { return value == null || ['string', 'number', 'boolean'].includes(typeof value); }
export function sanitizeMetadata(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => /^[a-z][a-z0-9_]{0,39}$/.test(key) && scalar(item)).slice(0, 20));
}
export function createAnalytics({ client, enabled, appVersion = '0.1.0', workspaceType = 'personal' }) {
  let queue = [], timer = null, flushing = false, stopped = false, lastActivity = Date.now();
  let sessionId = sessionStorage.getItem('nm-analytics-session');
  let sessionStartedAt = Number(sessionStorage.getItem('nm-analytics-started')) || 0;
  function ensureSession() {
    const now = Date.now();
    if (!sessionId || !sessionStartedAt || now - lastActivity > IDLE_MS) {
      sessionId = uuid(); sessionStartedAt = now;
      sessionStorage.setItem('nm-analytics-session', sessionId);
      sessionStorage.setItem('nm-analytics-started', String(now));
      enqueue('session_started', { resumed: false });
    }
    lastActivity = now;
  }
  async function flush() {
    if (!enabled || stopped || flushing || queue.length === 0) return;
    flushing = true; const batch = queue.splice(0, BATCH_SIZE);
    try { const { error } = await client.rpc('record_analytics_events', { p_events: batch }); if (error) throw error; }
    catch { if (!stopped) queue = [...batch, ...queue].slice(-MAX_QUEUE); }
    finally { flushing = false; if (queue.length) schedule(); }
  }
  function schedule() { if (timer || stopped) return; timer = setTimeout(() => { timer = null; void flush(); }, FLUSH_MS); }
  function enqueue(eventName, metadata = {}, fields = {}) {
    if (!enabled || stopped) return;
    if (eventName !== 'session_started') ensureSession();
    queue.push({ event_name: eventName, occurred_at: new Date().toISOString(), session_id: sessionId,
      screen: fields.screen || null, workspace_type: workspaceType, app_version: appVersion,
      metadata: sanitizeMetadata(metadata), duration_ms: fields.duration_ms ?? null,
      success: fields.success ?? null, error_code: fields.error_code ?? null });
    queue = queue.slice(-MAX_QUEUE); if (queue.length >= BATCH_SIZE) void flush(); else schedule();
  }
  function stop() { stopped = true; if (timer) clearTimeout(timer); timer = null; queue = []; }
  function end() { if (!enabled || stopped) return; enqueue('session_ended', {}, { duration_ms: Date.now() - sessionStartedAt }); void flush(); }
  if (enabled) { ensureSession(); enqueue('app_opened'); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') enqueue('session_resumed'); }); window.addEventListener('pagehide', end); }
  return { track: enqueue, flush, stop };
}
