import { supabase } from './supabase'

const DRAFT_KIND = 'add_company'

export const loadCompanyDraft = async () => {
  const { data, error } = await supabase
    .from('company_drafts')
    .select('*')
    .eq('draft_kind', DRAFT_KIND)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data
}

export const saveCompanyDraft = async ({ draftId, currentStep, formData }) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('You must be signed in to save a draft.')

  const payload = {
    draft_kind: DRAFT_KIND,
    user_id: user.id,
    current_step: currentStep,
    form_data: formData,
    status: 'active',
    updated_at: new Date().toISOString()
  }

  if (draftId) {
    const { data, error } = await supabase
      .from('company_drafts')
      .update(payload)
      .eq('id', draftId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('company_drafts')
    .insert(payload)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const existing = await loadCompanyDraft()
      if (existing?.id) {
        return saveCompanyDraft({ draftId: existing.id, currentStep, formData })
      }
    }
    throw error
  }

  return data
}

export const finalizeCompanyDraft = async (draftId) => {
  const { data, error } = await supabase.rpc('finalize_company_draft', {
    p_draft_id: draftId
  })

  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}
