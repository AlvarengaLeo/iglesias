import { supabase } from '../lib/supabase.js';

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

// ----- Dashboard BI (Fase 4) -----
export const dashboard = (months = 6) => call('eb_dashboard', { p_months: months });

// ----- Configuración (Fase 7) -----
export const listAudit = (search, action) => call('eb_list_audit', { p_search: search || null, p_action: action || null, p_limit: 150 });
export const listFlags = () => call('eb_list_flags', {});
export const setFlag = (key, enabled) => call('eb_set_flag', { p_key: key, p_enabled: enabled });
export const listStaff = () => call('eb_list_staff', {});
export const setStaffRole = (userId, role) => call('eb_set_staff_role', { p_user_id: userId, p_role: role });
export const setStaffActive = (userId, active) => call('eb_set_staff_active', { p_user_id: userId, p_active: active });
export const listPlans = () => call('eb_list_plans', {});
export const updatePlan = (id, name, monthlyCents, isActive) => call('eb_update_plan', { p_id: id, p_name: name, p_monthly_price_cents: monthlyCents, p_is_active: isActive });
export const getSettings = () => call('eb_get_settings', {});
export const updateSettings = (companyName, supportEmail, website, termsUrl) =>
  call('eb_update_settings', { p_company_name: companyName, p_support_email: supportEmail, p_website: website, p_terms_url: termsUrl });

// ----- Iglesias (Fase 1) -----
export const listChurches = (params) => call('eb_list_churches', params);
export const churchOverview = (id) => call('eb_church_overview', { p_church_id: id });
export const churchUsers = (id) => call('eb_church_users', { p_church_id: id });
export const churchActivity = (id, limit = 30) => call('eb_church_activity', { p_church_id: id, p_limit: limit });

// ----- Onboarding (Fase 5) -----
export const churchOnboarding = (id) => call('eb_church_onboarding', { p_church_id: id });
export const setOnboardingTask = (id, taskKey, status) => call('eb_set_onboarding_task', { p_church_id: id, p_task_key: taskKey, p_status: status });

// ----- Leads (Fase 2) -----
export const listLeads = (status, search) => call('eb_list_leads', { p_status: status || null, p_search: search || null, p_limit: 100 });

export async function leadNotes(leadId) {
  const { data, error } = await supabase.from('eb_lead_notes')
    .select('id, body, author_name, created_at').eq('lead_id', leadId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function addLeadNote(leadId, body, authorId, authorName) {
  const { error } = await supabase.from('eb_lead_notes')
    .insert({ lead_id: leadId, body, author_user_id: authorId, author_name: authorName });
  if (error) throw error;
}
export async function setLeadStatus(leadId, status) {
  const { error } = await supabase.from('eb_leads').update({ status }).eq('id', leadId);
  if (error) throw error;
}
export async function provisionChurch(payload) {
  const { data, error } = await supabase.functions.invoke('eb-provision-church', { body: payload });
  if (error) {
    let m = error.message;
    try { const t = await error.context?.response?.text(); const p = JSON.parse(t); m = p.message || p.error || m; } catch { /* keep */ }
    throw new Error(m);
  }
  return data;
}

// ----- Soporte (Fase 6) -----
export const listTickets = (status, search) => call('eb_list_tickets', { p_status: status || null, p_search: search || null, p_limit: 100 });
export const ticketDetail = (id) => call('eb_ticket_detail', { p_ticket_id: id });
export const createTicket = (churchId, subject, description, category, priority) =>
  call('eb_create_ticket', { p_church_id: churchId || null, p_subject: subject, p_description: description || null, p_category: category || 'general', p_priority: priority || 'medium' });
export const addTicketMessage = (id, body, isInternal) => call('eb_add_ticket_message', { p_ticket_id: id, p_body: body, p_is_internal: !!isInternal });
export const setTicketStatus = (id, status, assignSelf) => call('eb_set_ticket_status', { p_ticket_id: id, p_status: status, p_assign_self: assignSelf ?? null });

// ----- Facturación (Fase 3) -----
export const billingOverview = () => call('eb_billing_overview', {});
export const listSubscriptions = (status, search) => call('eb_list_subscriptions', { p_status: status || null, p_search: search || null, p_limit: 100 });
export const subscriptionDetail = (id) => call('eb_subscription_detail', { p_subscription_id: id });
export const recordPayment = (id, amountCents, status, method, notes) =>
  call('eb_record_payment', { p_subscription_id: id, p_amount_cents: amountCents, p_status: status, p_payment_method: method, p_notes: notes || null });
export const setSubscriptionStatus = (id, status, reason) =>
  call('eb_set_subscription_status', { p_subscription_id: id, p_status: status, p_reason: reason || null });
