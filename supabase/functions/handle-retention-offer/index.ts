import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.11.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { offerType, offerDetails, cancellationData } = await req.json()

    console.log('Processing retention offer:', { offerType, userId: user.id })

    // FIX 1: Use maybeSingle() — single() crashes if no row exists (hard rule)
    const { data: userData, error: userError } = await supabase
      .from('questionnaire_responses')
      .select('id, stripe_subscription_id, plan')
      .eq('user_id', user.id)
      .maybeSingle()

    if (userError) {
      console.error('Database error:', userError)
      throw new Error('Database error: ' + userError.message)
    }

    if (!userData) {
      throw new Error('No subscription record found for this user')
    }

    console.log('User data retrieved:', { studentId: userData.id, plan: userData.plan })

    const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    let result: any = {}

    // Process based on offer type
    switch (offerType) {
      case 'downgrade':
        const linePracticePrice = Deno.env.get('STRIPE_LINE_PRACTICE_PRICE_ID')
        const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id)
        
        await stripe.subscriptions.update(userData.stripe_subscription_id, {
          items: [{
            id: subscription.items.data[0].id,
            price: linePracticePrice,
          }],
        })
        
        await supabase
          .from('questionnaire_responses')
          .update({ plan: 'line' })
          .eq('user_id', user.id)
        
        result.message = 'Downgraded to LINE Practice Plan'
        break

      case 'discount':
        const couponCode = offerDetails.couponCode || 'RETAIN_20PCT_3MO'
        
        await stripe.subscriptions.update(userData.stripe_subscription_id, {
          coupon: couponCode,
        })

        result.message = '20% discount applied for 3 months'
        break

      case 'pause':
        const pauseMonths = offerDetails.pauseMonths || 2
        const resumeDate = new Date()
        resumeDate.setMonth(resumeDate.getMonth() + pauseMonths)

        await stripe.subscriptions.update(userData.stripe_subscription_id, {
          pause_collection: {
            behavior: 'void',
            resumes_at: Math.floor(resumeDate.getTime() / 1000),
          },
        })

        await supabase
          .from('questionnaire_responses')
          .update({ subscription_status: 'paused' })
          .eq('user_id', user.id)

        result.message = `Subscription paused for ${pauseMonths} months`
        break

      case 'consultation':
        result.message = 'Consultation request recorded'
        result.redirect = 'dashboard.html?show_calendar=true'
        break

      case 'waitlist':
        const { data: waitlistData, error: waitlistError } = await supabase
          .from('advanced_waitlist')
          .insert({
            user_id: user.id,
            email: user.email,
            current_level: cancellationData.details.current_level,
            interests: cancellationData.details.want_to_improve,
          })
          .select()
          .single()

        if (waitlistError) throw waitlistError

        result.message = 'Added to advanced content waitlist'
        break

      case 'technical_support':
        await stripe.subscriptions.update(userData.stripe_subscription_id, {
          coupon: 'FREE_1MO',
        })

        result.message = 'Free month applied, support team will contact you'
        break

      case 'alumni':
        const alumniCode = `ALUMNI_${user.id.substring(0, 8).toUpperCase()}_50PCT`
        
        await supabase
          .from('questionnaire_responses')
          .update({
            alumni_code: alumniCode,
            alumni_created_at: new Date().toISOString(),
            subscription_status: 'cancelled'
          })
          .eq('user_id', user.id)

        await stripe.subscriptions.cancel(userData.stripe_subscription_id)

        result.message = 'Alumni status granted'
        result.alumniCode = alumniCode
        break

      default:
        throw new Error('Invalid offer type')
    }

    // Record in cancellation_events
    await supabase
      .from('cancellation_events')
      .insert({
        user_id: user.id,
        student_id: userData.id,
        plan_at_cancellation: userData.plan,
        reason_category: cancellationData.reason,
        reason_details: cancellationData.details,
        retention_offer_shown: offerType,
        retention_offer_result: 'accepted',
        immediately_cancelled: false,
      })

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // FIX 2: Proper error serialization — error.message is undefined for some error types
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error in handle-retention-offer:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})