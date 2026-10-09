import {diyChecklist} from '../poseCycle/diy.js';
import {snapshotIdea} from '../inspirations.js';
// This is the existing DIY comparison, not a second inventory matcher.
export function collectionEvidence(idea, items) {
  const check=diyChecklist(snapshotIdea(idea),items);
  return {owned:check.counts.owned,total:check.rows.length,complete:check.rows.length>0&&check.rows.every(r=>r.state==='owned')&&!check.notes.length&&!check.partial.length,
    uncertain:check.notes.length>0||check.partial.length>0||check.counts.check>0};
}
