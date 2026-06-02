// Shared CORS headers for all Edge Functions.
// Frontend de Vite corre en http://localhost:5173 en dev y en cualquier
// dominio en prod. Mantenemos '*' para evitar fricción; los endpoints
// validan JWT en el body, así que CORS abierto no es un riesgo en sí mismo.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
