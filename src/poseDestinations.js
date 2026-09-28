// Presentation only: original snapshots, IDs and storage collections stay separate.
export function poseDestinations(library={},sessions=[]) {
 const projects=library.projects||[];
 const pending=new Map(projects.map(idea=>[idea.key,idea]));
 if(library.selected) pending.set(library.selected.key,library.selected);
 const toTry=(library.favorites||[]).filter(idea=>!pending.has(idea.key));
 return {toTry,projects:[...pending.values()],sessions:sessions.filter(session=>session.status!=='completed')};
}
