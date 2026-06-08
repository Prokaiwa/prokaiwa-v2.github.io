import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.17.0'

// Validate Stripe API key
const stripeKey = Deno.env.get('STRIPE_API_KEY');
if (!stripeKey) {
  throw new Error('STRIPE_API_KEY environment variable is not set');
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')

// Validate Supabase credentials
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is not set');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    console.log('✅ User authenticated:', user.id)

    // =====================================================
    // GET CANCELLATION REQUEST DATA
    // =====================================================
    const { 
      reason_category, 
      reason_details, 
      satisfaction_rating,
      would_recommend,
      additional_comments,
      retention_offer_shown,
      retention_offer_result,
      is_alumni
    } = await req.json()

    if (!reason_category) {
      throw new Error('Missing cancellation reason')
    }

    console.log('📋 Cancellation reason:', reason_category)

    // =====================================================
    // GET USER DATA
    // =====================================================
    const { data: userData, error: userError } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (userError) {
      console.error('❌ Error fetching user data:', userError)
      throw new Error('Database error: ' + userError.message)
    }

    if (!userData) {
      throw new Error('No subscription record found for this user')
    }

    console.log('👤 User data loaded:', {
      plan: userData.plan,
      subscription_id: userData.stripe_subscription_id,
      had_video_access: userData.had_video_access
    })

// =====================================================
// CANCEL STRIPE SUBSCRIPTION
// =====================================================
if (!userData.stripe_subscription_id) {
    throw new Error('No active subscription found')
}

console.log('🔄 Attempting to cancel Stripe subscription:', userData.stripe_subscription_id)

// Initialize variables
let subscriptionEndDate = new Date(userData.subscription_period_end)
let isAlreadyCancelled = false

try {
    // Try to cancel the subscription in Stripe
    const cancelledSubscription = await stripe.subscriptions.cancel(
        userData.stripe_subscription_id
    )
    
    console.log('✅ Stripe subscription cancelled:', cancelledSubscription.id)
    subscriptionEndDate = new Date(cancelledSubscription.current_period_end * 1000)
    
} catch (stripeError: any) {
    // Handle "already cancelled" case gracefully
    if (stripeError.code === 'resource_missing') {
        console.log('⚠️ Subscription already cancelled in Stripe, proceeding with database cleanup')
        isAlreadyCancelled = true
        // subscriptionEndDate already initialized above
    } else {
        // Other Stripe errors should still fail
        console.error('❌ Stripe error:', stripeError)
        throw stripeError
    }
}

// =====================================================
// CALCULATE ACCESS EXPIRATION
// =====================================================
const now = new Date()

// Calculate dashboard access expiration
let dashboardAccessExpiresAt: Date
if (userData.had_video_access) {
    // Power Pack users get 4 months from subscription end
    dashboardAccessExpiresAt = new Date(subscriptionEndDate)
    dashboardAccessExpiresAt.setMonth(dashboardAccessExpiresAt.getMonth() + 4)
    console.log('📅 Dashboard access extended to:', dashboardAccessExpiresAt.toISOString())
} else {
    // LINE Practice Plan users: access ends with subscription
    dashboardAccessExpiresAt = new Date(subscriptionEndDate)
    console.log('📅 Dashboard access ends with subscription:', dashboardAccessExpiresAt.toISOString())
}

    // =====================================================
    // CALCULATE MONTHS SUBSCRIBED
    // =====================================================
    const subscriptionStartDate = new Date(userData.subscription_period_start)
    const monthsSubscribed = Math.max(1, Math.floor(
      (now.getTime() - subscriptionStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    ))

    // =====================================================
    // HANDLE ALUMNI CODE IF REQUESTED
    // =====================================================
    let alumniCode = null
    if (is_alumni) {
      alumniCode = `ALUMNI_${user.id.substring(0, 8).toUpperCase()}_50PCT`
      console.log('🎓 Generating alumni code:', alumniCode)
    }

    // =====================================================
    // UPDATE DATABASE
    // =====================================================
    const updateData: any = {
      subscription_status: 'cancelled',
      cancelled_at: now.toISOString(),
      cancellation_effective_date: subscriptionEndDate.toISOString(),
      cancellation_reason_category: reason_category,
      cancellation_reason_details: typeof reason_details === 'string' ? reason_details : JSON.stringify(reason_details),
      dashboard_access_expires_at: dashboardAccessExpiresAt.toISOString(),
      updated_at: now.toISOString()
    }

    // Add alumni fields if applicable
    if (alumniCode) {
      updateData.alumni_code = alumniCode
      updateData.alumni_created_at = now.toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('questionnaire_responses')
      .update(updateData)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('❌ Database update failed:', updateError)
      throw new Error('Failed to update cancellation status')
    }

    console.log('✅ Database updated with cancellation data')

    // =====================================================
    // RECORD CANCELLATION EVENT
    // =====================================================
    const { error: eventError } = await supabaseAdmin
      .from('cancellation_events')
      .insert({
        user_id: user.id,
        student_id: userData.id,
        cancelled_at: now.toISOString(),
        plan_at_cancellation: userData.plan,
        months_subscribed: monthsSubscribed,
        reason_category: reason_category,
        reason_details: reason_details || {},
        retention_offer_shown: retention_offer_shown || null,
        retention_offer_result: retention_offer_result || 'not_shown',
        satisfaction_rating: satisfaction_rating || 0,
        would_recommend: would_recommend || '',
        additional_comments: additional_comments || '',
        immediately_cancelled: true
      })

    if (eventError) {
      console.error('⚠️ Failed to record cancellation event:', eventError)
      // Don't throw - this is analytics, not critical
    } else {
      console.log('✅ Cancellation event recorded')
    }

    // =====================================================
    // RETURN SUCCESS
    // =====================================================
    const responseData: any = {
    success: true,
    message: isAlreadyCancelled 
        ? 'Subscription was already cancelled'
        : 'Subscription cancelled successfully',
    access_until: subscriptionEndDate.toISOString(),
    dashboard_access_until: dashboardAccessExpiresAt.toISOString(),
    had_video_access: userData.had_video_access,
    plan: userData.plan,
    was_already_cancelled: isAlreadyCancelled
}

    if (alumniCode) {
      responseData.alumniCode = alumniCode
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Cancellation error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred during cancellation'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})