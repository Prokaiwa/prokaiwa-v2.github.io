import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ============================================================
    // AUTHENTICATION — NEW
    // Verify the caller is a logged-in, active teacher
    // ============================================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Confirm this user is an active teacher
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, is_active, role')
      .eq('auth_user_id', user.id)
      .single()

    if (teacherError || !teacher || !teacher.is_active) {
      return new Response(
        JSON.stringify({ error: 'Not authorized — active teacher required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Teacher authenticated: ${user.email} (${teacher.role})`)
    // ============================================================
    // END AUTHENTICATION
    // ============================================================

    const { studentId, feedbackText, audioUrl, audioDuration } = await req.json()
    // NOTE: teacherId removed from destructuring — we use the authenticated teacher.id instead

    // Must have either feedbackText or audioUrl
    if (!feedbackText && !audioUrl) {
      throw new Error('Either feedbackText or audioUrl is required')
    }

    // ============================================================
    // VALIDATE AUDIO URL DOMAIN — NEW (Task 2.4)
    // Only allow URLs from our own Supabase storage
    // ============================================================
    if (audioUrl) {
      try {
        const url = new URL(audioUrl)
        if (!url.hostname.endsWith('.supabase.co')) {
          throw new Error('Invalid audio URL — must be from Supabase storage')
        }
      } catch (urlError) {
        if (urlError.message.includes('Invalid audio URL')) throw urlError
        throw new Error('Invalid audio URL format')
      }
    }

    // Get student's LINE ID
    const { data: student, error: studentError } = await supabase
      .from('questionnaire_responses')
      .select('line_id, given_name_romaji, name, user_id')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      throw new Error('Student not found')
    }

    if (!student.line_id) {
      throw new Error('Student has no LINE ID connected')
    }

    // Get student progress for prompt_day
    const { data: progress } = await supabase
      .from('student_progress')
      .select('current_day')
      .eq('user_id', student.user_id)
      .maybeSingle()

    // ── Build the LINE message payload ────────────────────────────────────
    // Two branches: audio message or text message
    let lineMessagePayload: object

    if (audioUrl) {
      // LINE audio message requires:
      // - originalContentUrl: public HTTPS URL to the audio file (M4A)
      // - duration: length in milliseconds
      // Docs: https://developers.line.biz/en/reference/messaging-api/#audio-message
      lineMessagePayload = {
        to: student.line_id,
        messages: [{
          type: 'audio',
          originalContentUrl: audioUrl,
          duration: audioDuration || 10000  // Default 10s if not provided
        }]
      }
      console.log(`🎙 Sending audio message to ${student.given_name_romaji}, URL: ${audioUrl}`)
    } else {
      // Standard text feedback
      lineMessagePayload = {
        to: student.line_id,
        messages: [{
          type: 'text',
          text: `📝 Feedback from your teacher:\n\n${feedbackText}`
        }]
      }
      console.log(`💬 Sending text feedback to ${student.given_name_romaji}`)
    }

    // Send via LINE push API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')}`
      },
      body: JSON.stringify(lineMessagePayload)
    })

    if (!lineResponse.ok) {
      const error = await lineResponse.text()
      throw new Error(`LINE API error: ${error}`)
    }

    // Log feedback to database
    // For audio messages, store the URL in feedback_text for the history view
    const logText = audioUrl
      ? `[Voice message] ${audioUrl}`
      : feedbackText

    const { data: feedbackLog, error: insertError } = await supabase
      .from('feedback_log')
      .insert({
        student_id:    studentId,
        teacher_id:    teacher.id,  // ← CHANGED: use authenticated teacher ID, not client-sent
        feedback_type: 'teacher-portal',
        prompt_day:    progress?.current_day || null,
        feedback_text: logText
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw new Error(`Failed to log feedback: ${insertError.message}`)
    }

    console.log('✅ Feedback logged:', feedbackLog.id)

    return new Response(
      JSON.stringify({ success: true, message: 'Feedback sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
