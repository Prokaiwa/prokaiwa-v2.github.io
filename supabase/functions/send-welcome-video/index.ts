import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const WELCOME_VIDEO_URL = 'https://luyzyzefgintksydmwoh.supabase.co/storage/v1/object/public/welcome-assets/welcome-video.mp4'
const WELCOME_PREVIEW_URL = 'https://luyzyzefgintksydmwoh.supabase.co/storage/v1/object/public/welcome-assets/welcome-preview.jpg'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Headers': 'content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify token exists and was just used (survey completed)
    const { data: tokenData, error: tokenError } = await supabase
      .from('survey_tokens')
      .select('user_id, used_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData || !tokenData.used_at) {
      return new Response(
        JSON.stringify({ error: 'Invalid or unused token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get student's LINE ID
    const { data: student, error: studentError } = await supabase
      .from('questionnaire_responses')
      .select('line_id, given_name_romaji')
      .eq('user_id', tokenData.user_id)
      .single()

    if (studentError || !student || !student.line_id) {
      return new Response(
        JSON.stringify({ error: 'Student LINE ID not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send video + follow-up text via LINE (both in one push)
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: student.line_id,
        messages: [
          {
            type: 'video',
            originalContentUrl: WELCOME_VIDEO_URL,
            previewImageUrl: WELCOME_PREVIEW_URL
          },
          {
            type: 'text',
            text: `自己紹介をぜひ聞かせてください！🎤\n\nボイスメッセージまたはビデオで、お名前・お仕事・英語を学びたい理由を教えてください。\n\n30秒でも大丈夫です！完璧でなくてOK 😊`
          }
        ]
      })
    })

    if (!lineResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to send LINE message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Log welcome video send to message_log for teacher paper trail ──
    // Fire and forget — a logging failure must never block the success response.
    supabase.from('message_log').insert({
      user_id:      tokenData.user_id,
      message_type: 'welcome_video',
      message_text: 'Welcome video + self-introduction request sent via LINE.',
    }).then(({ error }) => {
      if (error) console.error('Failed to log welcome_video to message_log:', error.message);
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})