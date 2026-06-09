import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.17.0'

// Teacher-facing subscription management: cancel / pause / resume a student's
// Stripe subscription and keep questionnaire_responses in sync.
// Caller must be an authenticated, active teacher.

const stripeKey = Deno.env.get('STRIPE_API_KEY')
if (!stripeKey) {
  throw new Error('STRIPE_API_KEY environment variable is not set')
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── AuthN: valid Supabase user ────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Server is not configured')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) throw new Error('Invalid authentication')

    // ── AuthZ: must be an active teacher ──────────────────────
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('teachers')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (teacherError) throw new Error('Database error: ' + teacherError.message)
    if (!teacher || !teacher.is_active) {
      throw new Error('Not authorized — active teacher account required')
    }

    // ── Input ─────────────────────────────────────────────────
    const { student_id, action } = await req.json()
    if (!student_id) throw new Error('Missing student_id')
    if (!['cancel', 'pause', 'resume'].includes(action)) {
      throw new Error('Invalid action — must be cancel, pause, or resume')
    }

    // ── Load the student record ───────────────────────────────
    const { data: student, error: studentError } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('id, user_id, plan, stripe_subscription_id, subscription_status, subscription_period_start, subscription_period_end, had_video_access')
      .eq('id', student_id)
      .maybeSingle()
    if (studentError) throw new Error('Database error: ' + studentError.message)
    if (!student) throw new Error('Student not found')
    if (!student.stripe_subscription_id) throw new Error('This student has no Stripe subscription')

    const now = new Date()
    const result: Record<string, unknown> = { success: true, action }

    // ── CANCEL ────────────────────────────────────────────────
    if (action === 'cancel') {
      let periodEnd = student.subscription_period_end ? new Date(student.subscription_period_end) : now
      try {
        const cancelled = await stripe.subscriptions.cancel(student.stripe_subscription_id)
        if (cancelled.current_period_end) periodEnd = new Date(cancelled.current_period_end * 1000)
      } catch (e) {
        // If it's already gone in Stripe, proceed with DB cleanup; otherwise re-throw.
        if ((e as { code?: string }).code !== 'resource_missing') throw e
      }

      const dashboardExpires = new Date(periodEnd)
      if (student.had_video_access) dashboardExpires.setMonth(dashboardExpires.getMonth() + 4)

      const { error: upErr } = await supabaseAdmin
        .from('questionnaire_responses')
        .update({
          subscription_status: 'cancelled',
          payment_paused: false,
          payment_paused_at: null,
          cancelled_at: now.toISOString(),
          cancellation_effective_date: now.toISOString(),
          cancellation_reason_category: 'teacher_cancelled',
          dashboard_access_expires_at: dashboardExpires.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', student.id)
      if (upErr) throw new Error('Failed to update student record: ' + upErr.message)

      // Best-effort analytics row (never blocks success)
      const monthsSubscribed = student.subscription_period_start
        ? Math.max(1, Math.floor((now.getTime() - new Date(student.subscription_period_start).getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : 1
      await supabaseAdmin.from('cancellation_events').insert({
        user_id: student.user_id,
        student_id: student.id,
        cancelled_at: now.toISOString(),
        plan_at_cancellation: student.plan,
        months_subscribed: monthsSubscribed,
        reason_category: 'teacher_cancelled',
        reason_details: {},
        retention_offer_result: 'not_shown',
        immediately_cancelled: true,
      })

      result.message = 'Subscription cancelled'
    }

    // ── PAUSE (Stripe pause_collection, void behavior) ────────
    if (action === 'pause') {
      await stripe.subscriptions.update(student.stripe_subscription_id, {
        pause_collection: { behavior: 'void' },
      })
      const { error: upErr } = await supabaseAdmin
        .from('questionnaire_responses')
        .update({
          payment_paused: true,
          payment_paused_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', student.id)
      if (upErr) throw new Error('Failed to update student record: ' + upErr.message)
      result.message = 'Payments paused'
    }

    // ── RESUME (clear pause_collection) ───────────────────────
    if (action === 'resume') {
      await stripe.subscriptions.update(student.stripe_subscription_id, {
        pause_collection: '',
      })
      const { error: upErr } = await supabaseAdmin
        .from('questionnaire_responses')
        .update({
          payment_paused: false,
          payment_paused_at: null,
          updated_at: now.toISOString(),
        })
        .eq('id', student.id)
      if (upErr) throw new Error('Failed to update student record: ' + upErr.message)
      result.message = 'Payments resumed'
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('teacher-manage-subscription error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
