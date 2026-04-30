import { supabase } from './supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const parseInviteEmails = (value = '') => {
  const emails = value
    .split(/[\s,;]+/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)

  return [...new Set(emails)]
}

export const validateInviteEmails = (value = '') => {
  const emails = parseInviteEmails(value)
  const invalid = emails.filter(email => !EMAIL_RE.test(email))
  return { emails, invalid }
}

export const sendCompanyInvites = async ({ companyId, emails }) => {
  const appOrigin = window.location.origin

  const { data, error } = await supabase.functions.invoke('send-company-invites', {
    body: {
      company_id: companyId,
      emails,
      app_origin: appOrigin
    }
  })

  if (!error) return data

  const { data: fallbackData, error: rpcError } = await supabase.rpc('create_company_invites', {
    p_company_id: companyId,
    p_emails: emails,
    p_app_origin: appOrigin
  })

  if (rpcError) throw rpcError

  return {
    ...(fallbackData || {}),
    delivery_status: 'queued',
    warning: 'Invite records were created, but the email edge function is not available yet.'
  }
}
