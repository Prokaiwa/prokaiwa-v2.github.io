import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const REMINDERS = {
  day3: (name: string) => `Hi ${name}! Just checking in - did you see your English prompt? No pressure, but daily practice = better results! 😊`,
  day5: (name: string) => `Hey ${name}, you haven't practiced in 4 days! Consistency is the secret to fluency. Your progress is waiting! 🎯\n\nReply anytime to get back on track!`,
  day7: (name: string) => `Hi ${name}, we noticed you've been away for 6 days. Everything okay? We're here to help!\n\nReply 'PAUSE' if you need a break, or jump back in anytime! 🌟`
}

async function sendLineMessage(lineId: string, message: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: lineId,
      messages: [{ type: 'text', text: message }]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('LINE API error:', error)
    return false
  }
  return true
}

function calculateDaysMissed(sinceDate: string): number {
  const now = new Date()
  const since = new Date(sinceDate)
  const diffTime = now.getTime() - since.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
  return diffDays
}

function getReminderTier(daysMissed: number): 'day3' | 'day5' | 'day7' | null {
  if (daysMissed >= 2 && daysMissed < 4) return 'day3'
  if (daysMissed >= 4 && daysMissed < 6) return 'day5'
  if (daysMissed >= 6 && daysMissed < 14) return 'day7'
  return null
}

Deno.serve(async (req) => {
  // ============================================================
  // CRON AUTH — reject requests without valid secret
  // ============================================================
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    console.error('❌ Invalid or missing cron secret');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('🔍 Checking for non-responders...')

    const { data: students, error: studentsError } = await supabase
      .from('questionnaire_responses')
      .select('id, user_id, given_name_romaji, name, line_id, plan')
      .not('line_id', 'is', null)
      .in('plan', ['line', 'power_lite', 'power_pro'])
      .eq('subscription_status', 'active')

    if (studentsError) throw studentsError

    console.log(`📊 Found ${students.length} active students`)

    let remindersDay3 = 0
    let remindersDay5 = 0
    let remindersDay7 = 0
    let skipped = 0

    for (const student of students) {
      if (!student.user_id) continue

      const studentName = student.given_name_romaji || student.name

      // Step 1: Has this student ever received a prompt?
      const { data: firstPrompt, error: promptError } = await supabase
        .from('message_log')
        .select('created_at')
        .eq('user_id', student.user_id)
        .eq('message_type', 'prompt')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (promptError) {
        console.error(`❌ Error fetching prompts for ${studentName}:`, promptError)
        continue
      }

      if (!firstPrompt) {
        console.log(`⚠️ No prompts found for ${studentName} — skipping`)
        continue
      }

      // Step 2: Find their most recent response (ever)
      const { data: lastResponse, error: responseError } = await supabase
        .from('message_log')
        .select('created_at')
        .eq('user_id', student.user_id)
        .eq('message_type', 'student_response')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (responseError) {
        console.error(`❌ Error checking response for ${studentName}:`, responseError)
        continue
      }

      // Step 3: Check if they responded AFTER the latest prompt (still active)
      const { data: latestPrompt } = await supabase
        .from('message_log')
        .select('created_at')
        .eq('user_id', student.user_id)
        .eq('message_type', 'prompt')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastResponse && latestPrompt &&
          new Date(lastResponse.created_at) > new Date(latestPrompt.created_at)) {
        console.log(`✅ ${studentName} has responded to latest prompt — skipping`)
        skipped++
        continue
      }

      // Step 4: Measure silence from last response (or first prompt if never responded)
      const silentSince = lastResponse ? lastResponse.created_at : firstPrompt.created_at
      const daysMissed = calculateDaysMissed(silentSince)
      console.log(`⏰ ${studentName} — ${daysMissed.toFixed(1)} days since last response`)

      const tier = getReminderTier(daysMissed)
      if (!tier) {
        console.log(`🔇 ${studentName} — outside reminder window (${daysMissed.toFixed(1)} days)`)
        continue
      }

      // Step 5: Idempotency — skip if this tier was already sent since last response
      const { data: existingReminder } = await supabase
        .from('message_log')
        .select('id')
        .eq('user_id', student.user_id)
        .eq('message_type', 'reminder')
        .like('message_text', `${tier}:%`)
        .gte('created_at', silentSince)
        .maybeSingle()

      if (existingReminder) {
        console.log(`🔕 Already sent ${tier} reminder to ${studentName}`)
        continue
      }

      // Step 6: Send the reminder
      const reminderMessage = REMINDERS[tier](studentName)
      const sent = await sendLineMessage(student.line_id, reminderMessage)

      if (sent) {
        await supabase.from('message_log').insert({
          user_id: student.user_id,
          message_type: 'reminder',
          message_text: `${tier}: ${reminderMessage}`,
          line_message_id: `reminder_${tier}_${Date.now()}`
        })

        console.log(`📨 Sent ${tier} reminder to ${studentName}`)

        if (tier === 'day3') remindersDay3++
        if (tier === 'day5') remindersDay5++
        if (tier === 'day7') remindersDay7++
      }
    }

    const summary = {
      success: true,
      totalStudents: students.length,
      skippedResponded: skipped,
      reminders: {
        day3: remindersDay3,
        day5: remindersDay5,
        day7: remindersDay7,
        total: remindersDay3 + remindersDay5 + remindersDay7
      }
    }

    console.log('✅ Reminder check complete:', summary)

    return new Response(
      JSON.stringify(summary),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error checking non-responders:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})