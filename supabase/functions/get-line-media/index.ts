import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range'
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const url = new URL(req.url)
    const messageId = url.searchParams.get('messageId')
    const token = url.searchParams.get('token')

    if (!messageId) {
      return new Response('Missing messageId parameter', { status: 400, headers: corsHeaders })
    }

    // ── Auth: verify teacher token ──
    if (!token) {
      return new Response('Unauthorized: missing token', { status: 401, headers: corsHeaders })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized: invalid token', { status: 401, headers: corsHeaders })
    }

    // Confirm user is an active teacher
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (teacherError || !teacher) {
      return new Response('Unauthorized: not a teacher', { status: 403, headers: corsHeaders })
    }

    // ── Fetch media ──
    const { data: message, error: dbError } = await supabase
      .from('message_log')
      .select('media_type')
      .eq('message_id', messageId)
      .single()

    if (dbError || !message) {
      return new Response('Message not found', { status: 404, headers: corsHeaders })
    }

    const response = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    )

    if (!response.ok) {
      return new Response('Failed to fetch media from LINE', { status: response.status, headers: corsHeaders })
    }

    let contentType = response.headers.get('content-type')

    if (!contentType) {
      switch (message.media_type) {
        case 'image':
          contentType = 'image/jpeg'
          break
        case 'audio':
          contentType = 'audio/mpeg'
          break
        case 'video':
          contentType = 'video/mp4'
          break
        default:
          contentType = 'application/octet-stream'
      }
    }

    const mediaContent = await response.arrayBuffer()

    return new Response(mediaContent, {
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        ...corsHeaders
      }
    })

  } catch (error) {
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})