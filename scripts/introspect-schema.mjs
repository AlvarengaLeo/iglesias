// Introspecciona el esquema real del proyecto Supabase vinculado para construir
// los diagramas ER con datos autoritativos. Usa la URL del pooler (.temp/pooler-url).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const ROOT = resolve(import.meta.dirname, '..');
let url = readFileSync(resolve(ROOT, 'supabase/.temp/pooler-url'), 'utf8').trim();

// Si la contrasena no esta en la URL, tomarla de .env.local
if (!/:[^:@/]+@/.test(url.replace('postgresql://', ''))) {
  const env = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
  const m = env.match(/SUPABASE_DB_PASSWORD=(.+)/);
  if (m) url = url.replace('@', `:${m[1].trim()}@`).replace('postgresql://:', 'postgresql://');
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, statement_timeout: 30000 });

const out = {};
try {
  await client.connect();

  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name;`);
  out.tables = tables.rows.map(r => r.table_name);

  const fks = await client.query(`
    SELECT tc.table_name AS src, kcu.column_name AS col,
           ccu.table_name AS ref_table, ccu.column_name AS ref_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'
    ORDER BY src, col;`);
  out.foreign_keys = fks.rows;

  const counts = await client.query(`
    SELECT 'public' AS s,
      (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables,
      (SELECT count(*) FROM information_schema.views WHERE table_schema='public') AS views,
      (SELECT count(*) FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION') AS functions;`);
  out.counts = counts.rows[0];

  const rls = await client.query(`
    SELECT count(*) FILTER (WHERE rowsecurity) AS rls_enabled, count(*) AS total
    FROM pg_tables WHERE schemaname='public';`);
  out.rls = rls.rows[0];

  writeFileSync(resolve(ROOT, 'supabase/.temp/introspection.json'), JSON.stringify(out, null, 2));
  console.log('OK tablas:', out.tables.length, '| FKs:', out.foreign_keys.length, '| funciones:', out.counts.functions, '| RLS:', out.rls.rls_enabled + '/' + out.rls.total);
} catch (e) {
  console.error('FALLO:', e.message);
  process.exit(2);
} finally {
  await client.end().catch(() => {});
}
