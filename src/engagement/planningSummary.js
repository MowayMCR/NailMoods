import {zonedDate, timezoneValid} from '../poseCycle/model.js';
import {validDate} from '../journal.js';

// Only pending dates from this account/workspace; no notes or media are projected.
export function upcomingMoments(rows, {userId, workspaceId}, now = Date.now()) {
  return rows.filter(row => row.user_id === userId && row.workspace_id === workspaceId
    && row.status === 'scheduled' && validDate(row.scheduled_on) && timezoneValid(row.timezone)
    && (row.starts_at ? Number.isFinite(Date.parse(row.starts_at)) && Date.parse(row.ends_at || row.starts_at) >= now
      : row.scheduled_on >= zonedDate(now, row.timezone)))
    .sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on) || (a.starts_at || '').localeCompare(b.starts_at || '') || a.id.localeCompare(b.id))
    .slice(0, 2).map(({id, title, kind, scheduled_on, starts_at, timezone, project_id}) => ({id, title, kind, scheduled_on, starts_at, timezone, project_id}));
}
export const momentDate = row => new Date(row.scheduled_on + 'T12:00:00Z').toLocaleDateString('fr-FR', {day:'numeric',month:'long',timeZone:'UTC'});
