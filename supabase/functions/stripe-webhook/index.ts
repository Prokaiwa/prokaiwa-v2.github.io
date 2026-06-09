import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.17.0'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const signingSecret          = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!
const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY   = Deno.env.get('STRIPE_SERVICE_ROLE_KEY')!

// =========================================================
// HELPERS
// =========================================================

async function sendLineMessage(lineId: string, text: string) {
  const resp = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: lineId,
      messages: [{ type: 'text', text }]
    })
  })
  if (!resp.ok) {
    const errorBody = await resp.text()
    throw new Error(`LINE API error ${resp.status}: ${errorBody}`)
  }
}

// Writes a permanent record of every Stripe event to stripe_event_log.
// This is the single source of truth for all payment activity.
async function logStripeEvent(
  supabase: ReturnType<typeof createClient>,
  params: {
    stripeEventId: string
    stripeEventType: string
    userEmail?: string | null
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
    plan?: string | null
    amountJpy?: number | null
    outcome: 'success' | 'failed' | 'abandoned' | 'cancelled' | 'pending'
    failureReason?: string | null
    rawPayload?: unknown
  }
) {
  try {
    await supabase.from('stripe_event_log').insert({
      stripe_event_id:       params.stripeEventId,
      stripe_event_type:     params.stripeEventType,
      user_email:            params.userEmail            ?? null,
      stripe_customer_id:    params.stripeCustomerId     ?? null,
      stripe_subscription_id: params.stripeSubscriptionId ?? null,
      plan:                  params.plan                 ?? null,
      amount_jpy:            params.amountJpy            ?? null,
      outcome:               params.outcome,
      failure_reason:        params.failureReason        ?? null,
      raw_payload:           params.rawPayload           ?? null,
      alert_sent:            false,
      created_at:            new Date().toISOString()
    })
  } catch (err) {
    // Never let logging failure block the main webhook response
    console.error('⚠️ stripe_event_log insert failed:', err)
  }
}

// Fires an email alert to prokaiwa.english@gmail.com via notify-admin.
// Only called for failures and abandoned checkouts — not every event.
async function triggerAdminAlert(payload: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/notify-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')!}`
      },
      body: JSON.stringify(payload)
    })
  } catch (err) {
    // Never let alert failure block the main webhook response
    console.error('⚠️ notify-admin call failed:', err)
  }
}

// =========================================================
// MAIN HANDLER
// =========================================================

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()

  let receivedEvent
  try {
    receivedEvent = await stripe.webhooks.constructEventAsync(body, signature!, signingSecret)
  } catch (err) {
    console.error('❌ Signature verification failed:', err.message)
    return new Response(err.message, { status: 400 })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // =========================================================
  // RETRY PROTECTION — Skip already-processed events
  // =========================================================
  const eventId = receivedEvent.id
  const { data: existingEvent } = await supabaseAdmin
    .from('message_log')
    .select('id')
    .eq('line_message_id', `stripe_evt_${eventId}`)
    .maybeSingle()

  if (existingEvent) {
    console.log(`ℹ️ Event ${eventId} already processed, skipping`)
    return new Response(JSON.stringify({ ok: true, note: 'duplicate event' }), { status: 200 })
  }

  // =========================================================
  // checkout.session.completed — Initial payment after signup
  // =========================================================
  if (receivedEvent.type === 'checkout.session.completed') {
    const session = receivedEvent.data.object
    const userId = session.client_reference_id

    if (!userId) {
      console.error('❌ Missing client_reference_id in checkout session')
      await logStripeEvent(supabaseAdmin, {
        stripeEventId:    eventId,
        stripeEventType:  'checkout.session.completed',
        stripeCustomerId: session.customer as string,
        outcome:          'failed',
        failureReason:    'Missing client_reference_id',
        rawPayload:       session
      })
      await triggerAdminAlert({
        type:              'stripe_failure',
        stripe_event_type: 'checkout.session.completed',
        error_message:     'Missing client_reference_id — student record cannot be updated',
        stripe_customer_id: session.customer,
        page_url:          'Stripe Checkout',
        user_email:        session.customer_details?.email ?? null
      })
      return new Response('Webhook Error: Missing user ID', { status: 400 })
    }

    console.log('💳 checkout.session.completed for user:', userId)

    const updateData: Record<string, unknown> = {
      payment_status:      'paid',
      subscription_status: 'active',
      updated_at:          new Date().toISOString()
    }

    if (session.subscription) updateData.stripe_subscription_id = session.subscription
    if (session.customer)     updateData.stripe_customer_id     = session.customer

    // Fetch subscription period dates from Stripe
    if (session.subscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        if (sub.current_period_start) {
          updateData.subscription_period_start = new Date(sub.current_period_start * 1000).toISOString()
        }
        if (sub.current_period_end) {
          updateData.subscription_period_end = new Date(sub.current_period_end * 1000).toISOString()
          updateData.next_billing_date        = new Date(sub.current_period_end * 1000).toISOString()
        }
      } catch (subError) {
        console.error('⚠️ Could not fetch subscription details:', subError)
      }
    }

    const { error } = await supabaseAdmin
      .from('questionnaire_responses')
      .update(updateData)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Database error updating payment status:', error)
      await logStripeEvent(supabaseAdmin, {
        stripeEventId:       eventId,
        stripeEventType:     'checkout.session.completed',
        stripeCustomerId:    session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        outcome:             'failed',
        failureReason:       `DB update failed: ${error.message}`,
        rawPayload:          session
      })
      await triggerAdminAlert({
        type:              'stripe_failure',
        stripe_event_type: 'checkout.session.completed',
        error_message:     `Database update failed: ${error.message}`,
        stripe_customer_id: session.customer,
        user_email:        session.customer_details?.email ?? null
      })
      return new Response('Database error', { status: 500 })
    }

    console.log('✅ Payment status updated to paid')

    // Log successful event
    await logStripeEvent(supabaseAdmin, {
      stripeEventId:       eventId,
      stripeEventType:     'checkout.session.completed',
      userEmail:           session.customer_details?.email ?? null,
      stripeCustomerId:    session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      outcome:             'success',
      rawPayload:          { customer: session.customer, subscription: session.subscription }
    })

    // Log for retry protection
    await supabaseAdmin.from('message_log').insert({
      user_id:         userId,
      message_type:    'stripe_webhook',
      message_text:    `checkout.session.completed — subscription: ${session.subscription}, customer: ${session.customer}`,
      line_message_id: `stripe_evt_${eventId}`
    })

    // Check if user already has a line_id (added LINE before paying)
    const { data: user } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('line_id, given_name_romaji, plan')
      .eq('user_id', userId)
      .single()

    if (user && user.line_id) {
      try {
        const { data: tokenRow } = await supabaseAdmin
          .from('survey_tokens')
          .insert({ user_id: userId })
          .select('token')
          .single()

        const surveyLink = tokenRow
          ? `\n\n📋 レッスン開始前に、簡単なアンケートにお答えください：\nhttps://www.prokaiwa.com/needs-survey.html?token=${tokenRow.token}`
          : ''

        const welcomeMessage = `${user.given_name_romaji}さん、お支払いありがとうございます！🎉\n\nアカウントが有効になりました！最初の英会話プロンプトは明日の朝9時（日本時間）に届きます ☀️${surveyLink}\n\nご質問があればいつでもメッセージしてください。一緒に英語力を伸ばしましょう！💪\n\nThank you for your payment, ${user.given_name_romaji}! Your account is activated. Your first English prompt arrives tomorrow at 9 AM JST.`

        await sendLineMessage(user.line_id, welcomeMessage)
        console.log('✅ Welcome message sent via LINE')
      } catch (lineError) {
        console.error('⚠️ LINE welcome message failed:', lineError)
      }
    }
  }

  // =========================================================
  // checkout.session.expired — Student opened Stripe but never paid
  // =========================================================
  if (receivedEvent.type === 'checkout.session.expired') {
    const session = receivedEvent.data.object

    console.log('⏰ checkout.session.expired — abandoned checkout')

    await logStripeEvent(supabaseAdmin, {
      stripeEventId:    eventId,
      stripeEventType:  'checkout.session.expired',
      userEmail:        session.customer_details?.email ?? null,
      stripeCustomerId: session.customer as string ?? null,
      outcome:          'abandoned',
      rawPayload:       { customer: session.customer, customer_details: session.customer_details }
    })

    // Alert only if we know who it was — no point alerting on anonymous abandonments
    if (session.customer_details?.email) {
      await triggerAdminAlert({
        type:              'stripe_failure',
        stripe_event_type: 'checkout.session.expired',
        error_message:     'Student opened Stripe checkout but did not complete payment',
        user_email:        session.customer_details.email,
        page_url:          'Stripe Checkout (abandoned)',
        stripe_customer_id: session.customer ?? null
      })
    }

    // Log for retry protection
    await supabaseAdmin.from('message_log').insert({
      user_id:         session.client_reference_id ?? null,
      message_type:    'stripe_webhook',
      message_text:    `checkout.session.expired — abandoned by ${session.customer_details?.email ?? 'unknown'}`,
      line_message_id: `stripe_evt_${eventId}`
    })

    console.log('✅ Abandoned checkout logged')
  }

  // =========================================================
  // invoice.payment_failed — Card declined or payment issue
  // =========================================================
  if (receivedEvent.type === 'invoice.payment_failed') {
    const invoice = receivedEvent.data.object
    const subscriptionId = invoice.subscription as string

    console.log('❌ invoice.payment_failed for subscription:', subscriptionId)

    // Look up the student so we can include their email in the alert
    const { data: student } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('user_id, email, plan')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    const failureReason = invoice.last_finalization_error?.message
      ?? invoice.payment_intent?.last_payment_error?.message
      ?? 'Unknown payment failure reason'

    await logStripeEvent(supabaseAdmin, {
      stripeEventId:       eventId,
      stripeEventType:     'invoice.payment_failed',
      userEmail:           student?.email ?? null,
      stripeCustomerId:    invoice.customer as string,
      stripeSubscriptionId: subscriptionId,
      plan:                student?.plan ?? null,
      amountJpy:           invoice.amount_due ?? null,
      outcome:             'failed',
      failureReason,
      rawPayload: {
        customer:    invoice.customer,
        amount_due:  invoice.amount_due,
        attempt_count: invoice.attempt_count
      }
    })

    await triggerAdminAlert({
      type:                 'stripe_failure',
      stripe_event_type:    'invoice.payment_failed',
      error_message:        `Payment failed: ${failureReason}`,
      user_email:           student?.email ?? null,
      stripe_customer_id:   invoice.customer,
      stripe_subscription_id: subscriptionId,
      page_url:             'Stripe invoice renewal'
    })

    // Log for retry protection
    await supabaseAdmin.from('message_log').insert({
      user_id:         student?.user_id ?? null,
      message_type:    'stripe_webhook',
      message_text:    `invoice.payment_failed — ${failureReason}`,
      line_message_id: `stripe_evt_${eventId}`
    })

    console.log('✅ Payment failure logged and alert sent')
  }

  // =========================================================
  // customer.subscription.updated — Plan changes, payment issues
  // =========================================================
  if (receivedEvent.type === 'customer.subscription.updated') {
    const subscription = receivedEvent.data.object
    const subscriptionId = subscription.id

    console.log('🔄 customer.subscription.updated:', subscriptionId)

    const { data: student, error: findError } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('user_id, subscription_status, payment_paused')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (findError || !student) {
      console.log('⚠️ No student found for subscription:', subscriptionId)
      await logStripeEvent(supabaseAdmin, {
        stripeEventId:       eventId,
        stripeEventType:     'customer.subscription.updated',
        stripeSubscriptionId: subscriptionId,
        outcome:             'failed',
        failureReason:       'No matching student found in database'
      })
      return new Response(JSON.stringify({ ok: true, note: 'no matching student' }), { status: 200 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (subscription.status === 'active')   updateData.subscription_status = 'active'
    else if (subscription.status === 'past_due') updateData.subscription_status = 'past_due'
    else if (subscription.status === 'canceled') updateData.subscription_status = 'cancelled'
    else if (subscription.status === 'unpaid')   updateData.subscription_status = 'unpaid'

    // Period dates: newer Stripe API versions put current_period_start/end on
    // the subscription ITEM, not the subscription object — read both so renewals
    // actually advance the stored billing window.
    const subItem     = subscription.items?.data?.[0] ?? {}
    const periodStart = subscription.current_period_start ?? subItem.current_period_start
    const periodEnd   = subscription.current_period_end   ?? subItem.current_period_end
    if (periodStart) {
      updateData.subscription_period_start = new Date(periodStart * 1000).toISOString()
    }
    if (periodEnd) {
      updateData.subscription_period_end = new Date(periodEnd * 1000).toISOString()
      updateData.next_billing_date        = new Date(periodEnd * 1000).toISOString()
    }
    if (subscription.cancel_at_period_end && subscription.cancel_at) {
      updateData.cancellation_effective_date = new Date(subscription.cancel_at * 1000).toISOString()
    }

    // Keep payment_paused in sync with Stripe pause_collection so a pause/resume
    // done directly in Stripe (not via the teacher dashboard) still syncs.
    const isPaused = !!subscription.pause_collection
    updateData.payment_paused = isPaused
    if (isPaused !== !!student.payment_paused) {
      updateData.payment_paused_at = isPaused ? new Date().toISOString() : null
    }

    const { error: updateError } = await supabaseAdmin
      .from('questionnaire_responses')
      .update(updateData)
      .eq('stripe_subscription_id', subscriptionId)

    if (updateError) {
      console.error('❌ Failed to update subscription:', updateError)
      await logStripeEvent(supabaseAdmin, {
        stripeEventId:       eventId,
        stripeEventType:     'customer.subscription.updated',
        stripeSubscriptionId: subscriptionId,
        outcome:             'failed',
        failureReason:       `DB update failed: ${updateError.message}`
      })
      return new Response('Database error', { status: 500 })
    }

    await logStripeEvent(supabaseAdmin, {
      stripeEventId:       eventId,
      stripeEventType:     'customer.subscription.updated',
      stripeSubscriptionId: subscriptionId,
      outcome:             subscription.status === 'active' ? 'success' : subscription.status as 'failed'
    })

    await supabaseAdmin.from('message_log').insert({
      user_id:         student.user_id,
      message_type:    'stripe_webhook',
      message_text:    `customer.subscription.updated — status: ${subscription.status}`,
      line_message_id: `stripe_evt_${eventId}`
    })

    console.log('✅ Subscription updated:', subscription.status)
  }

  // =========================================================
  // customer.subscription.deleted — Subscription cancelled
  // =========================================================
  if (receivedEvent.type === 'customer.subscription.deleted') {
    const subscription = receivedEvent.data.object
    const subscriptionId = subscription.id

    console.log('🚫 customer.subscription.deleted:', subscriptionId)

    const { data: student, error: findError } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('user_id, subscription_status, had_video_access')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (findError || !student) {
      console.error('⚠️ No student found for subscription:', subscriptionId)
      await logStripeEvent(supabaseAdmin, {
        stripeEventId:       eventId,
        stripeEventType:     'customer.subscription.deleted',
        stripeSubscriptionId: subscriptionId,
        outcome:             'failed',
        failureReason:       'No matching student found in database'
      })
      return new Response(JSON.stringify({ ok: true, note: 'no matching student' }), { status: 200 })
    }

    if (student.subscription_status === 'cancelled') {
      console.log('ℹ️ Already cancelled in DB, skipping')
      return new Response(JSON.stringify({ ok: true, note: 'already cancelled' }), { status: 200 })
    }

    const now = new Date()
    let dashboardAccessExpiresAt = now.toISOString()

    if (student.had_video_access) {
      const expiresAt = new Date(now)
      expiresAt.setMonth(expiresAt.getMonth() + 4)
      dashboardAccessExpiresAt = expiresAt.toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('questionnaire_responses')
      .update({
        subscription_status:           'cancelled',
        cancelled_at:                  now.toISOString(),
        cancellation_effective_date:   now.toISOString(),
        dashboard_access_expires_at:   dashboardAccessExpiresAt,
        cancellation_reason_category:  'stripe_direct',
        updated_at:                    now.toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId)

    if (updateError) {
      console.error('❌ Failed to update cancellation:', updateError)
      await logStripeEvent(supabaseAdmin, {
        stripeEventId:       eventId,
        stripeEventType:     'customer.subscription.deleted',
        stripeSubscriptionId: subscriptionId,
        outcome:             'failed',
        failureReason:       `DB update failed: ${updateError.message}`
      })
      return new Response('Database error', { status: 500 })
    }

    await logStripeEvent(supabaseAdmin, {
      stripeEventId:       eventId,
      stripeEventType:     'customer.subscription.deleted',
      stripeSubscriptionId: subscriptionId,
      outcome:             'cancelled'
    })

    await supabaseAdmin.from('message_log').insert({
      user_id:         student.user_id,
      message_type:    'stripe_webhook',
      message_text:    `customer.subscription.deleted — cancelled`,
      line_message_id: `stripe_evt_${eventId}`
    })

    console.log('✅ Subscription marked as cancelled via Stripe')
  }

  // =========================================================
  // invoice.paid — Monthly renewal confirmation
  // =========================================================
  if (receivedEvent.type === 'invoice.paid') {
    const invoice = receivedEvent.data.object

    if (invoice.billing_reason === 'subscription_create') {
      console.log('ℹ️ Skipping initial subscription invoice (handled by checkout)')
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    const subscriptionId = invoice.subscription as string
    if (!subscriptionId) {
      return new Response(JSON.stringify({ ok: true, note: 'no subscription' }), { status: 200 })
    }

    console.log('💰 invoice.paid for subscription:', subscriptionId)

    const periodStart = invoice.lines?.data?.[0]?.period?.start
    const periodEnd   = invoice.lines?.data?.[0]?.period?.end

    const updateData: Record<string, unknown> = {
      payment_status:      'paid',
      subscription_status: 'active',
      updated_at:          new Date().toISOString()
    }

    if (periodStart) updateData.subscription_period_start = new Date(periodStart * 1000).toISOString()
    if (periodEnd) {
      updateData.subscription_period_end = new Date(periodEnd * 1000).toISOString()
      updateData.next_billing_date       = new Date(periodEnd * 1000).toISOString()
    }

    const { data: student } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('user_id, email, plan')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    const { error: updateError } = await supabaseAdmin
      .from('questionnaire_responses')
      .update(updateData)
      .eq('stripe_subscription_id', subscriptionId)

    if (updateError) {
      console.error('❌ Failed to update renewal:', updateError)
      await logStripeEvent(supabaseAdmin, {
        stripeEventId:       eventId,
        stripeEventType:     'invoice.paid',
        stripeSubscriptionId: subscriptionId,
        outcome:             'failed',
        failureReason:       `DB update failed: ${updateError.message}`
      })
      return new Response('Database error', { status: 500 })
    }

    await logStripeEvent(supabaseAdmin, {
      stripeEventId:       eventId,
      stripeEventType:     'invoice.paid',
      userEmail:           student?.email ?? null,
      stripeCustomerId:    invoice.customer as string,
      stripeSubscriptionId: subscriptionId,
      plan:                student?.plan ?? null,
      amountJpy:           invoice.amount_paid ?? null,
      outcome:             'success'
    })

    await supabaseAdmin.from('message_log').insert({
      user_id:         student?.user_id ?? null,
      message_type:    'stripe_webhook',
      message_text:    `invoice.paid — renewal for subscription: ${subscriptionId}`,
      line_message_id: `stripe_evt_${eventId}`
    })

    console.log('✅ Subscription renewal recorded')
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})