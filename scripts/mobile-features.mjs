// One launch policy for both stores. This flag only exposes the pose cycle;
// premium permissions and IA+ remain independently enforced by their services.
export function mobileFeatures(environment, env = process.env) {
  if (!['production', 'recette'].includes(environment)) throw new Error('Unknown mobile environment');
  const poseCycle = env.VITE_POSE_CYCLE_ENABLED ?? 'true';
  if (!['true', 'false'].includes(poseCycle)) throw new Error('VITE_POSE_CYCLE_ENABLED must be true or false');
  return {poseCycle: poseCycle === 'true'};
}
