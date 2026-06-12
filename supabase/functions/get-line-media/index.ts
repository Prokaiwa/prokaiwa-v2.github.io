import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const EdgeRuntime: any;

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range'
}

// Returns the canonical content-type for a given LINE media_type string.
function mediaTypeToContentType(mediaType: string | null): string {
  switch (mediaType) {
    case 'image': return 'image/jpeg'
    case 'audio': return 'audio/mpeg'
    case 'video': return 'video/mp4'
    default:      return 'application/octet-stream'
  }
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

    // Fallback content-type derived from the DB media_type (used when the
    // upstream source does not supply a Content-Type header).
    const fallbackContentType = mediaTypeToContentType(message.media_type)

    // ── Path 1: serve from Supabase Storage archive when available ──
    const { data: stored, error: storageError } = await supabase.storage
      .from('student-media')
      .download(messageId)

    if (stored) {
      const contentType =
        typeof stored.type === 'string' && stored.type.length > 0
          ? stored.type
          : fallbackContentType

      const mediaContent = await stored.arrayBuffer()

      console.log(`📦 Served ${messageId} from storage archive`)

      return new Response(mediaContent, {
        headers: {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
          ...corsHeaders
        }
      })
    }

    // storageError here means the object was not found — that is expected for
    // content that has not been archived yet.  Fall through to LINE.

    // ── Path 2: fetch from LINE API, then lazily archive ──
    const response = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    )

    if (!response.ok) {
      const expired = response.status === 404 || response.status === 410
      const message = expired
        ? 'Media no longer available (expired on LINE and not archived)'
        : 'Failed to fetch media from LINE'
      return new Response(message, { status: response.status, headers: corsHeaders })
    }

    const contentType = response.headers.get('content-type') ?? fallbackContentType

    const mediaContent = await response.arrayBuffer()

    // Lazy archive: upload a copy to storage in the background so it survives
    // LINE's content expiry window.
    const archivePromise = supabase.storage
      .from('student-media')
      .upload(messageId, mediaContent.slice(0), { contentType, upsert: true })
      .then(({ error }: { error: any }) => {
        if (error) console.error('Lazy archive failed:', error.message)
        else console.log(`📦 Lazily archived ${messageId}`)
      })
      .catch((e: unknown) => console.error('Lazy archive error:', e))

    if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any)?.waitUntil) {
      (EdgeRuntime as any).waitUntil(archivePromise)
    }

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
