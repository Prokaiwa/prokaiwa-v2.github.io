import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ALLOWED_ORIGIN          = 'https://www.prokaiwa.com'

const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

Deno.serve(async (req) => {

  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const body = await req.json()
    const { token, answers } = body

    // ── 1. Validate token is present ────────────────────────────────────────
    if (!token || typeof token !== 'string') {
      console.error('❌ Missing or invalid token')
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Look up token in survey_tokens ───────────────────────────────────
    const { data: tokenRow, error: tokenError } = await supabase
      .from('survey_tokens')
      .select('id, user_id, used_at, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (tokenError) {
      console.error('❌ Token lookup error:', tokenError.message)
      return new Response(
        JSON.stringify({ error: 'Server error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tokenRow) {
      console.error('❌ Token not found:', token)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Check token has not already been used ─────────────────────────────
    // Unlike the needs survey (which is single-use), we allow re-submission
    // so a student can update their answers if they accidentally submit early.
    // We still record used_at on first submission.
    const alreadyUsed = !!tokenRow.used_at

    // ── 4. Check token has not expired ──────────────────────────────────────
    const now = new Date()
    const expiresAt = new Date(tokenRow.expires_at)
    if (now > expiresAt) {
      console.error('❌ Token expired for user:', tokenRow.user_id)
      return new Response(
        JSON.stringify({ error: 'This survey link has expired. Please contact your teacher.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = tokenRow.user_id
    console.log('✅ Token valid for user:', userId)

    // ── 5. Build the row to upsert ───────────────────────────────────────────
    // We use upsert on user_id so re-submissions update the existing row
    // rather than creating duplicates.
    const row = {
      user_id: userId,
      updated_at: now.toISOString(),

      // Section 1
      overall_satisfaction:     answers.overall_satisfaction     ?? null,
      overall_feelings_open:    answers.overall_feelings_open    ?? null,
      would_recommend:          answers.would_recommend          ?? null,
      likelihood_to_continue:   answers.likelihood_to_continue   ?? null,
      overall_emotional_open:   answers.overall_emotional_open   ?? null,

      // Section 2
      prompt_difficulty:          answers.prompt_difficulty          ?? null,
      prompt_relevance:           answers.prompt_relevance           ?? null,
      prompt_helped_improve:      answers.prompt_helped_improve      ?? null,
      prompts_responded_to:       answers.prompts_responded_to       ?? null,
      prompt_frequency_rating:    answers.prompt_frequency_rating    ?? null,
      prompt_topic_preferences:   answers.prompt_topic_preferences   ?? null,
      prompt_feeling_scale:       answers.prompt_feeling_scale       ?? null,
      prompt_feeling_open:        answers.prompt_feeling_open        ?? null,
      prompt_feedback_open:       answers.prompt_feedback_open       ?? null,

      // Section 3
      line_setup_ease:            answers.line_setup_ease            ?? null,
      line_enjoyment:             answers.line_enjoyment             ?? null,
      line_vs_app_preference:     answers.line_vs_app_preference     ?? null,
      line_message_clarity:       answers.line_message_clarity       ?? null,
      comfortable_voice:          answers.comfortable_voice          ?? null,
      comfortable_text:           answers.comfortable_text           ?? null,
      line_feeling_open:          answers.line_feeling_open          ?? null,
      line_change_open:           answers.line_change_open           ?? null,

      // Section 4
      received_feedback:          answers.received_feedback          ?? null,
      feedback_helpfulness:       answers.feedback_helpfulness       ?? null,
      feedback_encouraging:       answers.feedback_encouraging       ?? null,
      feedback_type_preferences:  answers.feedback_type_preferences  ?? null,
      teacher_feeling_open:       answers.teacher_feeling_open       ?? null,
      message_to_teacher_open:    answers.message_to_teacher_open    ?? null,

      // Section 5
      account_setup_ease:         answers.account_setup_ease         ?? null,
      questionnaire_rating:       answers.questionnaire_rating       ?? null,
      had_setup_problems:         answers.had_setup_problems         ?? null,
      setup_problem_description:  answers.setup_problem_description  ?? null,
      welcome_video_rating:       answers.welcome_video_rating       ?? null,
      onboarding_feeling_open:    answers.onboarding_feeling_open    ?? null,
      onboarding_improve_open:    answers.onboarding_improve_open    ?? null,

      // Section 6
      dashboard_usage:                  answers.dashboard_usage                  ?? null,
      dashboard_navigation_ease:        answers.dashboard_navigation_ease        ?? null,
      wanted_dashboard_nudge:           answers.wanted_dashboard_nudge           ?? null,
      dashboard_use_more_open:          answers.dashboard_use_more_open          ?? null,
      dashboard_liked_open:             answers.dashboard_liked_open             ?? null,
      dashboard_confused_open:          answers.dashboard_confused_open          ?? null,
      dashboard_change_open:            answers.dashboard_change_open            ?? null,
      dashboard_progress_feeling_open:  answers.dashboard_progress_feeling_open  ?? null,

      // Section 7
      enjoyed_most_open:          answers.enjoyed_most_open          ?? null,
      most_frustrating_open:      answers.most_frustrating_open      ?? null,
      wished_platform_had_open:   answers.wished_platform_had_open   ?? null,
      would_remove_open:          answers.would_remove_open          ?? null,
      continue_motivation_open:   answers.continue_motivation_open   ?? null,
      one_word_description_open:  answers.one_word_description_open  ?? null,
      final_comments_open:        answers.final_comments_open        ?? null,
    }

    // ── 6. Upsert into trial_feedback_survey ────────────────────────────────
    const { error: upsertError } = await supabase
      .from('trial_feedback_survey')
      .upsert(row, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('❌ Upsert error:', upsertError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to save your responses. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Feedback saved for user:', userId)

    // ── 7. Mark token as used (only on first submission) ────────────────────
    if (!alreadyUsed) {
      const { error: tokenUpdateError } = await supabase
        .from('survey_tokens')
        .update({ used_at: now.toISOString() })
        .eq('token', token)

      if (tokenUpdateError) {
        // Non-fatal — feedback is already saved, just log it
        console.warn('⚠️ Could not mark token as used:', tokenUpdateError.message)
      } else {
        console.log('✅ Token marked as used')
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Unexpected server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})