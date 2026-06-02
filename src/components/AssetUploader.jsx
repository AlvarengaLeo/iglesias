import { useRef, useState, useEffect } from 'react';
import { Icon } from './Icon.jsx';
import { uploadChurchAsset, STORAGE_CONFIG } from '../lib/storage.js';

// Componente reusable de upload para assets de iglesia (logo, hero, signature).
// - Drag-drop + click para abrir file picker
// - Preview de la imagen actual (currentUrl) o de la seleccionada
// - Validaciones cliente-side ya en uploadChurchAsset; aquí surface el error
// - shape="circle" para logos; "rect" para hero
//
// Props:
//   churchId      string (requerido)
//   kind          'logo' | 'hero' | 'signature'
//   currentUrl    string | null       — URL actual del asset (preview inicial)
//   onUploaded    ({path, publicUrl}) => void
//   onRemove      () => void          — opcional: si se quiere botón "quitar"
//   disabled      boolean
//   shape         'circle' | 'rect'   (default 'rect')
//   label         string              — texto del botón
//   helpText      string

export function AssetUploader({
  churchId,
  kind,
  currentUrl,
  onUploaded,
  onRemove,
  disabled = false,
  shape = 'rect',
  label = 'Subir imagen',
  helpText,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(currentUrl || null);

  // Sincronizar preview cuando currentUrl cambie externamente
  // (ej: church cargó después de montar, o se actualizó vía refreshChurch).
  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  const acceptStr = STORAGE_CONFIG.allowedMime.join(',');

  const triggerPick = () => {
    if (disabled || busy) return;
    inputRef.current?.click();
  };

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const result = await uploadChurchAsset({ churchId, file, kind });
      setPreview(result.publicUrl);
      onUploaded?.(result);
    } catch (e) {
      setError(e.message || 'Error al subir el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    handleFile(f);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || busy) return;
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !busy) setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    onRemove?.();
  };

  const previewSize = shape === 'circle' ? 96 : shape === 'square' ? 72 : 160;
  const previewStyle = {
    width: previewSize,
    height: shape === 'circle' || shape === 'square' ? previewSize : previewSize * 0.66,
    borderRadius: shape === 'circle' ? '50%' : shape === 'square' ? 14 : 8,
    objectFit: shape === 'rect' ? 'cover' : 'contain',
    border: '1px solid var(--border, #E5DCD3)',
    background: '#F5EFE6',
  };

  const dropStyle = {
    border: `1px dashed ${dragging ? 'var(--primary, #1F2B38)' : 'var(--border, #E5DCD3)'}`,
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    cursor: disabled || busy ? 'not-allowed' : 'pointer',
    transition: 'border-color 120ms',
    background: dragging ? 'rgba(31,43,56,0.04)' : 'transparent',
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <div>
      <div
        style={dropStyle}
        onClick={triggerPick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerPick()}
      >
        {preview ? (
          <img src={preview} alt="preview" style={previewStyle} />
        ) : (
          <div style={{ ...previewStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A8A78' }}>
            <Icon name="image" size={28} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={(e) => { e.stopPropagation(); triggerPick(); }}
              disabled={disabled || busy}
            >
              <Icon name="upload" size={12} /> {busy ? 'Subiendo…' : label}
            </button>
            {preview && onRemove && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleRemove}
                disabled={disabled || busy}
              >
                <Icon name="x" size={12} /> Quitar
              </button>
            )}
          </div>
          {helpText && (
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted, #7A6B5D)' }}>
              {helpText}
            </p>
          )}
          <p style={{ marginTop: 4, fontSize: 11, color: 'var(--muted, #7A6B5D)' }}>
            PNG, JPG, WebP o SVG · se optimiza automáticamente
          </p>
          {error && (
            <p style={{ marginTop: 6, fontSize: 12, color: 'var(--danger, #B03A2E)' }}>
              {error}
            </p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
