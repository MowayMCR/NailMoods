import React, { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react';

export async function preparePhoto(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new Error('Choisis une photo JPG, PNG ou WebP.');
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Cette photo est trop volumineuse. Choisis une image de moins de 20 Mo.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Impossible de préparer cette photo. Essaie une autre image.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    throw new Error('Cette image ne peut pas être lue. Essaie une photo JPG, PNG ou WebP.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ProductPhoto({ value, onChange, onBusy, alt = 'Photo du produit', cameraLabel = 'Photographier le produit' }) {
  const gallery = useRef(null);
  const camera = useRef(null);
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; onBusy(false); };
  }, [onBusy]);

  async function choose(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    onBusy(true);
    try {
      const photo = await preparePhoto(file);
      if (active.current) onChange(photo);
    } catch (err) {
      if (active.current) setError(err.message);
    } finally {
      if (active.current) { setBusy(false); onBusy(false); }
    }
  }

  return <div className="productPhotoField">
    <div className="fieldHead"><b>Photo (facultatif)</b></div>
    {value && <img className="photoPreview" src={value} alt={alt} />}
    <input ref={gallery} hidden type="file" accept="image/*" aria-label="Choisir une photo" onChange={choose} />
    <input ref={camera} hidden type="file" accept="image/*" capture="environment" aria-label={cameraLabel} onChange={choose} />
    <div className="photoActions">
      <button type="button" disabled={busy} onClick={() => gallery.current.click()}><ImageIcon />{value ? 'Changer la photo' : 'Importer une photo'}</button>
      <button type="button" disabled={busy} onClick={() => camera.current.click()}><Camera />Prendre une photo</button>
    </div>
    {value && <button type="button" className="removePhoto" disabled={busy} onClick={() => onChange('')}><Trash2 />Retirer la photo</button>}
    {busy && <p className="fieldHelp" role="status">Préparation de la photo…</p>}
    {error && <p className="formError" role="alert">{error}</p>}
  </div>;
}
