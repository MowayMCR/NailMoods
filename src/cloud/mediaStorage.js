const BUCKET = 'nailmoods-private';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class MediaStorageError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function extension(type) {
  return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
}

function safePart(value) {
  return String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'item';
}

export function mediaPath({ userId, workspaceId, kind, objectId, contentType = 'image/jpeg' }) {
  if (!userId || !workspaceId || !kind || !objectId) throw new MediaStorageError('invalid_path', 'Le chemin de cette image est incomplet.');
  return `${userId}/${workspaceId}/${safePart(kind)}/${safePart(objectId)}.${extension(contentType)}`;
}

export function validateImage(file) {
  if (!file || typeof file.size !== 'number' || typeof file.type !== 'string') throw new MediaStorageError('invalid_file', 'Cette image n’est pas valide.');
  if (!ALLOWED.has(file.type)) throw new MediaStorageError('unsupported_type', 'Utilise une image JPG, PNG ou WebP.');
  if (file.size > MAX_BYTES) throw new MediaStorageError('too_large', 'Cette image dépasse la limite de 5 Mo.');
  return file;
}

export function dataUrlToBlob(value) {
  if (typeof value !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/i.test(value)) throw new MediaStorageError('invalid_file', 'Cette image n’est pas valide.');
  const [header, encoded] = value.split(',', 2);
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  return new Blob([bytes], { type: header.slice(5).split(';')[0] });
}

export function createMediaStorage(client, { userId } = {}) {
  if (!client?.storage) throw new MediaStorageError('unavailable', 'Le stockage des images est momentanément indisponible.');
  return {
    bucket: BUCKET,
    async upload({ userId, workspaceId, kind, objectId, file, signal }) {
      validateImage(file);
      const path = mediaPath({ userId, workspaceId, kind, objectId, contentType: file.type });
      const { data, error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: true, signal });
      if (error) throw new MediaStorageError('upload_failed', 'La photo n’a pas pu être enregistrée. Réessaie.');
      return { path: data.path || path, bucket: BUCKET, contentType: file.type, bytes: file.size };
    },
    async signedUrl(path, expiresIn = 300) {
      if (typeof path !== 'string' || !path || (userId && userIdPrefix(path) !== userId)) throw new MediaStorageError('forbidden_path', 'Cette image ne peut pas être ouverte ici.');
      const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, expiresIn);
      if (error) throw new MediaStorageError('download_failed', 'La photo n’a pas pu être chargée.');
      return data.signedUrl;
    },
    async download(path) {
      const {data,error}=await client.storage.from(BUCKET).download(path);
      if(error)throw new MediaStorageError('download_failed','La photo n’a pas pu être chargée.');
      return data;
    },
    publicUrl(kind, objectId) {
      if (typeof kind !== 'string' || typeof objectId !== 'string' || !kind || !objectId) throw new MediaStorageError('forbidden_path', 'Cette image ne peut pas être ouverte ici.');
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_MEDIA_READ_URL) || `${client.supabaseUrl || ''}/functions/v1/media-read`;
      if (!base) throw new MediaStorageError('unavailable', 'La lecture de cette image n’est pas configurée.');
      const url = new URL(base);
      url.searchParams.set('kind', kind);
      url.searchParams.set('id', objectId);
      return url.href;
    },
    async uploadPublic({ userId, workspaceId, kind, objectId, file }) {
      validateImage(file);
      const path = mediaPath({ userId, workspaceId, kind, objectId:objectId+'-'+crypto.randomUUID(), contentType: file.type });
      // A publication gets a fresh immutable path. Upsert unnecessarily requires
      // SELECT, which this protected bucket deliberately does not grant.
      const { data, error } = await client.storage.from('nailmoods-public').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new MediaStorageError('upload_failed', 'La version publique de la photo n’a pas pu être enregistrée.');
      return { path: data.path || path, bucket: 'nailmoods-public', contentType: file.type, bytes: file.size };
    },
    async remove(paths) {
      const list = (Array.isArray(paths) ? paths : [paths]).filter(path => typeof path === 'string');
      if (!list.length) return;
      const { error } = await client.storage.from(BUCKET).remove(list);
      if (error) throw new MediaStorageError('delete_failed', 'La photo n’a pas pu être supprimée.');
    },
    async removePublic(paths) {
      const list = (Array.isArray(paths) ? paths : [paths]).filter(path => typeof path === 'string');
      if (!list.length) return;
      const { error } = await client.storage.from('nailmoods-public').remove(list);
      if (error) throw new MediaStorageError('delete_failed', 'La version publique de la photo n’a pas pu être supprimée.');
    },
  };
}

function userIdPrefix(path) { return path.split('/')[0] || ''; }

export { BUCKET, MAX_BYTES };
