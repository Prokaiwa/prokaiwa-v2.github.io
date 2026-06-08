import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCOPES = ['https://www.googleapis.com/auth/calendar']

interface ServiceAccount {
  client_email: string
  private_key: string
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function createJWT(sa: ServiceAccount): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)

  const payload = {
    iss: sa.client_email,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  const unsigned = `${encode(header)}.${encode(payload)}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  )

  const encodedSig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${unsigned}.${encodedSig}`
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = await createJWT(sa)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('❌ Failed to get access token:', errorText)
    throw new Error(`Token request failed: ${errorText}`)
  }

  const json = await res.json()
  console.log('✅ Got access token')
  return json.access_token
}

serve(async (req) => {
  console.log('📝 Google Calendar function invoked')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID')
    
    console.log('🔍 Checking environment variables...')
    console.log('  SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
    console.log('  SERVICE_ROLE_KEY:', serviceRoleKey ? '✅' : '❌')
    console.log('  SERVICE_ACCOUNT_JSON:', serviceAccountJson ? '✅' : '❌')
    console.log('  CALENDAR_ID:', calendarId ? '✅' : '❌')
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials')
    }
    if (!serviceAccountJson) {
      throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON')
    }
    if (!calendarId) {
      throw new Error('Missing GOOGLE_CALENDAR_ID')
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    console.log('📦 Request body:', JSON.stringify(body, null, 2))
    
    const { action, ...params } = body

    const sa = JSON.parse(serviceAccountJson) as ServiceAccount
    console.log('🔑 Service account email:', sa.client_email)

    console.log('🎫 Getting access token...')
    const accessToken = await getAccessToken(sa)
    console.log('✅ Access token obtained')

    if (action === 'create') {
      console.log('📅 Creating calendar event for booking:', params.booking_id)
      
      const { booking_id } = params

      console.log('🔍 Fetching booking from database...')
      const { data: booking, error: bookingError } = await supabase
        .from('lesson_bookings')
        .select(`
          id,
          scheduled_at,
          duration_minutes,
          lesson_type,
          student_id,
          questionnaire_responses!student_id (
            given_name_romaji,
            name,
            email
          )
        `)
        .eq('id', booking_id)
        .single()

      if (bookingError) {
        console.error('❌ Database error:', bookingError)
        throw new Error(`Database error: ${bookingError.message}`)
      }
      
      if (!booking) {
        console.error('❌ Booking not found')
        throw new Error('Booking not found')
      }
      
      console.log('✅ Booking fetched:', {
        id: booking.id,
        scheduled_at: booking.scheduled_at,
        duration: booking.duration_minutes
      })

      const student = booking.questionnaire_responses
      const studentName = student?.given_name_romaji || student?.name || 'Student'
      const studentEmail = student?.email
      
      console.log('👤 Student info:', { name: studentName, email: studentEmail })

      const start = new Date(booking.scheduled_at)
      const end = new Date(start.getTime() + booking.duration_minutes * 60000)
      
      const startTime = start.toISOString()
      const endTime = end.toISOString()
      
      console.log('🕐 Event times:', {
        start: startTime,
        end: endTime,
        timezone: 'Asia/Tokyo'
      })

      // Create event WITHOUT Meet link - you'll add it manually
      const event = {
        summary: `Prokaiwa Lesson - ${studentName}`,
        description: `${booking.duration_minutes}-minute English lesson with Prokaiwa.\n\nStudent: ${studentName}\nEmail: ${studentEmail}\n\n⚠️ REMINDER: Add Google Meet link to this event!`,
        start: { dateTime: startTime, timeZone: 'Asia/Tokyo' },
        end: { dateTime: endTime, timeZone: 'Asia/Tokyo' }
      }

      console.log('📤 Creating Google Calendar event (no Meet link)...')
      console.log('  Calendar ID:', calendarId)
      console.log('  Event summary:', event.summary)

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      )

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ Google Calendar API error:', {
          status: res.status,
          statusText: res.statusText,
          body: errorText
        })
        throw new Error(`Calendar API error (${res.status}): ${errorText}`)
      }

      const created = await res.json()
      console.log('✅ Calendar event created:', {
        id: created.id,
        htmlLink: created.htmlLink
      })

      console.log('💾 Updating booking in database...')
      const { error: updateError } = await supabase
        .from('lesson_bookings')
        .update({
          google_calendar_event_id: created.id,
          google_meet_link: null, // Will be updated when you add it manually
        })
        .eq('id', booking.id)
        
      if (updateError) {
        console.error('❌ Failed to update booking:', updateError)
        throw new Error(`Update error: ${updateError.message}`)
      }
      
      console.log('✅ Booking updated successfully')

      return new Response(
        JSON.stringify({
          success: true,
          event_id: created.id,
          meet_link: null,
          message: 'Event created - add Meet link manually in Google Calendar'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'getEvent') {
      console.log('🔍 Fetching event details:', params.event_id)
      
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${params.event_id}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ Failed to fetch event:', errorText)
        throw new Error(`Get event failed: ${errorText}`)
      }

      const event = await res.json()
      console.log('✅ Event fetched:', {
        id: event.id,
        hangoutLink: event.hangoutLink
      })

      // Update booking with Meet link if it exists
      if (event.hangoutLink && params.booking_id) {
        console.log('💾 Updating Meet link in database...')
        const { error: updateError } = await supabase
          .from('lesson_bookings')
          .update({ google_meet_link: event.hangoutLink })
          .eq('id', params.booking_id)
        
        if (updateError) {
          console.warn('⚠️ Failed to update Meet link:', updateError)
        } else {
          console.log('✅ Meet link updated in database')
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          meet_link: event.hangoutLink || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      console.log('🗑️ Deleting calendar event:', params.event_id)
      
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${params.event_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )
      
      if (!res.ok && res.status !== 404) {
        const errorText = await res.text()
        console.error('❌ Delete failed:', errorText)
        throw new Error(`Delete failed: ${errorText}`)
      }
      
      console.log('✅ Event deleted')

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update') {
      console.log('✏️ Updating calendar event:', params.event_id)
      
      const { event_id, new_scheduled_at, duration } = params

      const start = new Date(new_scheduled_at)
      const end = new Date(start.getTime() + (duration || 50) * 60000)

      const update = {
        start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
        end: { dateTime: end.toISOString(), timeZone: 'Asia/Tokyo' },
      }

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${event_id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
        }
      )

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ Update failed:', errorText)
        throw new Error(`Update failed: ${errorText}`)
      }

      const updated = await res.json()
      console.log('✅ Event updated:', updated.id)

      return new Response(
        JSON.stringify({
          success: true,
          event_id: updated.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Invalid action: ${action}`)

  } catch (error) {
    console.error('💥 ERROR:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})