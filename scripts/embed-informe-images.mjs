// Incrusta imagenes como data-URI en el informe HTML para dejarlo autocontenido.
// Uso: node scripts/embed-informe-images.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const HTML = resolve(ROOT, 'docs/INFORME_PROYECTO_EB_CONNECT.html');

// token -> ruta del archivo de imagen
const MAP = {
  'logo': 'public/logo-web.png',
  'equipos-ui-calendario-final.jpeg': 'docs/equipos-ui-calendario-final.jpeg',
  'equipos-ui-calendario-v2-mes.jpeg': 'docs/equipos-ui-calendario-v2-mes.jpeg',
  'equipos-ui-calendario-v2-lista.jpeg': 'docs/equipos-ui-calendario-v2-lista.jpeg',
  'equipos-ui-cultos-tabla.jpeg': 'docs/equipos-ui-cultos-tabla.jpeg',
  'equipos-ui-asignacion.jpeg': 'docs/equipos-ui-asignacion.jpeg',
  'equipos-ui-mi-servicio-servidor.jpeg': 'docs/equipos-ui-mi-servicio-servidor.jpeg',
  'equipos-ui-chat.jpeg': 'docs/equipos-ui-chat.jpeg',
  'shot-commercial-hero.jpeg': 'docs/shot-commercial-hero.jpeg',
  'shot-portal-home.jpeg': 'docs/shot-portal-home.jpeg',
  'shot-portal-donation.jpeg': 'docs/shot-portal-donation.jpeg',
  'shot-crm-dashboard.jpeg': 'docs/shot-crm-dashboard.jpeg',
  'shot-crm-donaciones.jpeg': 'docs/shot-crm-donaciones.jpeg',
  'shot-crm-personas.jpeg': 'docs/shot-crm-personas.jpeg',
  'shot-crm-reportes.jpeg': 'docs/shot-crm-reportes.jpeg',
  'shot-crm-portal-editor.jpeg': 'docs/shot-crm-portal-editor.jpeg',
  'shot-crm-configuracion.jpeg': 'docs/shot-crm-configuracion.jpeg',
  'shot-backoffice-login.jpeg': 'docs/shot-backoffice-login.jpeg',
};

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function dataUri(relPath) {
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) throw new Error('No existe la imagen: ' + relPath);
  const b64 = readFileSync(abs).toString('base64');
  const mime = MIME[extname(abs).toLowerCase()] || 'application/octet-stream';
  return `data:${mime};base64,${b64}`;
}

let html = readFileSync(HTML, 'utf8');
let replaced = 0, missing = [];

for (const [token, relPath] of Object.entries(MAP)) {
  const needle = `@@IMG:${token}@@`;
  if (html.includes(needle)) {
    const uri = dataUri(relPath);
    html = html.split(needle).join(uri);
    replaced++;
  }
}

// Detectar tokens sin mapear
const leftover = [...html.matchAll(/@@IMG:([^@]+)@@/g)].map(m => m[1]);
if (leftover.length) missing.push(...new Set(leftover));

writeFileSync(HTML, html, 'utf8');

const sizeMb = (Buffer.byteLength(html, 'utf8') / (1024 * 1024)).toFixed(2);
console.log(`Imagenes incrustadas: ${replaced}/${Object.keys(MAP).length}`);
console.log(`Tamano final del HTML: ${sizeMb} MB`);
if (missing.length) console.log('ADVERTENCIA, tokens sin resolver:', missing.join(', '));
else console.log('Sin tokens pendientes. Documento autocontenido.');
