// EB Connect — eb-provision-church
// Convierte un lead en iglesia (RPC atómico eb_convert_lead) y envía el email de
// invitación al admin de la iglesia. Solo staff EB con rol super_admin/sales.
import { authenticate, jsonResponse, jsonError } from '../_shared/auth.ts';
import { handlePreflight } from '../_shared/cors.ts';

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { callerClient, adminClient } = auth;

  // Gate: staff EB con rol super_admin/sales.
  const { data: ebRole, error: rErr } = await callerClient.rpc('eb_staff_role');
  if (rErr) return jsonError(500, 'role_check_failed', rErr.message);
  if (!['super_admin', 'sales'].includes(ebRole)) {
    return jsonError(403, 'forbidden', 'solo super_admin/sales pueden convertir leads');
  }

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return jsonError(400, 'invalid_json'); }
  const leadId = (body.lead_id ?? '').trim();
  const legalName = (body.legal_name ?? '').trim();
  const publicName = (body.public_name ?? '').trim();
  const slug = (body.slug ?? '').trim().toLowerCase();
  const adminEmail = (body.admin_email ?? '').trim().toLowerCase();
  const adminFullName = body.admin_full_name?.trim() || null;
  const planCode = (body.plan_code ?? 'ministry').trim();

  if (!leadId) return jsonError(400, 'lead_id_required');
  if (!legalName || !publicName) return jsonError(400, 'name_required');
  if (!slug || !/^[a-z0-9-]{2,}$/.test(slug)) return jsonError(400, 'invalid_slug');
  if (!EMAIL_RX.test(adminEmail)) return jsonError(400, 'invalid_admin_email');

  // 1) Conversión atómica (corre como el staff → el check de rol del RPC pasa).
  const { data: conv, error: cErr } = await callerClient.rpc('eb_convert_lead', {
    p_lead_id: leadId, p_legal_name: legalName, p_public_name: publicName, p_slug: slug,
    p_admin_email: adminEmail, p_admin_full_name: adminFullName, p_plan_code: planCode,
  });
  if (cErr) return jsonError(400, 'convert_failed', cErr.message);

  // 2) Enviar email de invitación al admin (lo lleva al CRM #accept-invite).
  const origin = req.headers.get('origin') ?? 'http://localhost:5173';
  const { error: invErr } = await adminClient.auth.admin.inviteUserByEmail(adminEmail, {
    data: { invitation_token: conv.invitation_token, church_id: conv.church_id, role: 'admin', full_name: adminFullName, must_change_password: true },
    redirectTo: `${origin}/#accept-invite`,
  });

  return jsonResponse(200, {
    church_id: conv.church_id,
    subscription_id: conv.subscription_id,
    admin_email: adminEmail,
    email_sent: !invErr,
    email_error: invErr?.message ?? null,
  });
});
