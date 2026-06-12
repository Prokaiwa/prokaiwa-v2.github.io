// =============================================================================
// backfill-media — ONE-OFF Supabase Edge Function
//
// Purpose: Archive existing LINE media (audio/video/image) from message_log
//          into the 'student-media' Supabase Storage bucket.
//
// How to invoke:
//   curl -X POST https://<project>.supabase.co/functions/v1/backfill-media \
//     -H "x-cron-secret: <CRON_SECRET>" \
//     -H "Content-Type: application/json" \
//     -d '{"limit": 50}'
//
// Safe to delete after the backfill is complete.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!

// Service-role client — bypasses RLS for storage reads/writes
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Fallback MIME types when LINE omits a Content-Type header
const FALLBACK_CONTENT_TYPE: Record<string, string> = {
  audio: 'audio/mpeg',
  video: 'video/mp4',
  image: 'image/jpeg',
}

Deno.serve(async (req) => {
  // ============================================================
  // CRON AUTH — reject requests without valid secret
  // ============================================================
  const cronSecret = req.headers.get('x-cron-secret')
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    console.error('❌ Invalid or missing cron secret')
    return new Response('Unauthorized', { status: 401 })
  }

  const startMs = Date.now()

  try {
    // ============================================================
    // PARSE BODY — read optional `limit` (default 100, cap 200)
    // ============================================================
    let limit = 100
    try {
      const body = await req.json()
      if (typeof body?.limit === 'number') {
        limit = Math.min(Math.max(1, body.limit), 200)
      }
    } catch {
      // No body or invalid JSON — use default
    }

    console.log(`🚀 Starting backfill-media — limit: ${limit}`)

    // ============================================================
    // QUERY — fetch unarchived student media rows
    // ============================================================
    const { data: rows, error: queryError } = await supabase
      .from('message_log')
      .select('message_id, media_type, created_at')
      .eq('message_type', 'student_response')
      .in('media_type', ['audio', 'video', 'image'])
      .not('message_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (queryError) throw queryError

    const processed = rows?.length ?? 0
    console.log(`📋 Fetched ${processed} rows to process`)

    // ============================================================
    // COUNTERS
    // ============================================================
    const counters = {
      archived: 0,
      skipped:  0,
      expired:  0,
      failed:   0,
    }
    const expiredIds: string[] = []
    const failures:  string[]  = []

    // ============================================================
    // MAIN LOOP — process each row sequentially
    // ============================================================
    for (const row of rows ?? []) {
      try {
        const messageId  = row.message_id as string
        const mediaType  = row.media_type  as string

        // ----------------------------------------------------------
        // STEP 1: SKIP-IF-ARCHIVED — check storage before fetching
        // ----------------------------------------------------------
        const { data: existing } = await supabase.storage
          .from('student-media')
          .download(messageId)

        if (existing) {
          console.log(`⏭ skipped ${messageId} (already archived)`)
          counters.skipped++
          continue
        }

        // ----------------------------------------------------------
        // STEP 2: FETCH from LINE Content API
        // ----------------------------------------------------------
        const lineRes = await fetch(
          `https://api-data.line.me/v2/bot/message/${messageId}/content`,
          {
            headers: {
              Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
            },
          }
        )

        if (!lineRes.ok) {
          const { status } = lineRes

          if (status === 404 || status === 410) {
            console.log(`💀 expired ${messageId} (HTTP ${status})`)
            counters.expired++
            expiredIds.push(messageId)
            continue
          }

          // Other non-OK status
          console.error(`❌ fetch failed ${messageId}: HTTP ${status}`)
          counters.failed++
          failures.push(`${messageId}: HTTP ${status}`)
          continue
        }

        // ----------------------------------------------------------
        // STEP 3: RESOLVE CONTENT TYPE
        // ----------------------------------------------------------
        const contentType =
          lineRes.headers.get('content-type') ||
          FALLBACK_CONTENT_TYPE[mediaType] ||
          'application/octet-stream'

        // ----------------------------------------------------------
        // STEP 4: UPLOAD to Supabase Storage
        // ----------------------------------------------------------
        const arrayBuffer = await lineRes.arrayBuffer()

        const { error: uploadError } = await supabase.storage
          .from('student-media')
          .upload(messageId, arrayBuffer, { contentType, upsert: true })

        if (uploadError) {
          console.error(`❌ upload failed ${messageId}:`, uploadError.message)
          counters.failed++
          failures.push(`${messageId}: ${uploadError.message}`)
          continue
        }

        console.log(`📦 archived ${messageId} (${contentType})`)
        counters.archived++

      } catch (rowErr) {
        // Catch-all — one bad row must never abort the entire run
        const id = row.message_id ?? '(unknown)'
        console.error(`❌ unexpected error for ${id}:`, rowErr)
        counters.failed++
        failures.push(`${id}: ${(rowErr as Error).message ?? String(rowErr)}`)
      }
    }

    // ============================================================
    // RESPONSE
    // ============================================================
    const tookMs = Date.now() - startMs

    const summary = {
      success:    true,
      processed,
      archived:   counters.archived,
      skipped:    counters.skipped,
      expired:    counters.expired,
      failed:     counters.failed,
      expiredIds,
      failures,
      tookMs,
    }

    console.log('✅ backfill-media complete:', summary)

    return new Response(
      JSON.stringify(summary),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal error in backfill-media:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
