// notify-admin
// ================================================================
// Receives alert payloads and sends formatted emails to
// prokaiwa.english@gmail.com via Resend.
//
// Triggered by:
//   - Automatic JS errors caught by prokaiwa-monitor.js
//   - Manual "困っていますか？" problem reports from students
//   - Stripe payment failures via stripe-webhook
//   - Student LINE responses via line-webhook (student_response type)
//
// JWT Verification: OFF
// CORS: prokaiwa.com
// Auth: none (one-way alert sender, writes no sensitive data)
// ================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ALERT_EMAIL      = 'prokaiwa.english@gmail.com'
const FROM_EMAIL       = 'alerts@prokaiwa.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return ''
  return `
    <tr>
      <td style="padding:8px 12px;font-weight:600;color:#555;white-space:nowrap;
                 width:160px;vertical-align:top;border-bottom:1px solid #f0f0f0;">
        ${label}
      </td>
      <td style="padding:8px 12px;color:#1a1a1a;word-break:break-word;
                 border-bottom:1px solid #f0f0f0;">
        ${value}
      </td>
    </tr>`
}

function buildEmailHtml(payload: Record<string, unknown>): { subject: string; html: string } {
  const type = String(payload.type || 'unknown')

  let subject = '⚠️ Prokaiwa Alert'
  let badgeColor = '#e67e22'
  let badgeLabel = 'ALERT'
  let intro = 'An error was automatically detected on Prokaiwa.'

  if (type === 'student_response') {
    const name = String(payload.student_name || 'A student')
    subject = `📬 New Response — ${name}`
    badgeColor = '#27ae60'
    badgeLabel = 'STUDENT RESPONSE'
    intro = `${name} has sent a new response via LINE. Open the Teacher Portal to review it.`
  } else if (type === 'manual_report') {
    const issueLabel = String(payload.issue_label || payload.issue_category || '')
    subject = `🆘 Student Problem Report — ${issueLabel}`
    badgeColor = '#c0392b'
    badgeLabel = 'STUDENT REPORT'
    intro = 'A student manually reported a problem using the 困っていますか？button.'
  } else if (type === 'js_error') {
    subject = `🔴 JS Error — ${String(payload.page_path || payload.page_url || '')}`
    badgeColor = '#c0392b'
    badgeLabel = 'JS ERROR'
    intro = 'An uncaught JavaScript error was detected on a Prokaiwa page.'
  } else if (type === 'promise_rejection') {
    subject = `🟠 Promise Rejection — ${String(payload.page_path || '')}`
    badgeColor = '#e67e22'
    badgeLabel = 'PROMISE ERROR'
    intro = 'An unhandled Promise rejection was detected. This is often a failed Supabase or network call.'
  } else if (type === 'console_error') {
    subject = `🟡 Console Error — ${String(payload.page_path || '')}`
    badgeColor = '#f39c12'
    badgeLabel = 'CONSOLE ERROR'
    intro = 'A console.error was captured on a Prokaiwa page.'
  } else if (type === 'stripe_failure') {
    subject = `💳 Payment Failed — ${String(payload.user_email || 'unknown student')}`
    badgeColor = '#8e44ad'
    badgeLabel = 'PAYMENT FAILURE'
    intro = 'A Stripe payment event failed or was abandoned.'
  }

  const detailRows = [
    row('Student',          payload.student_name     ? String(payload.student_name)                    : null),
    row('Response Type',    payload.media_type       ? String(payload.media_type)                      : null),
    row('Message',          payload.response_preview ? String(payload.response_preview).slice(0, 300)  : null),
    row('Student Email',    payload.user_email       ? String(payload.user_email)                      : null),
    row('Issue',            payload.issue_label      ? String(payload.issue_label)                     : null),
    row('Note',             payload.note             ? String(payload.note)                            : null),
    row('Error',            payload.error_message    ? String(payload.error_message).slice(0, 400)     : null),
    row('Page',             payload.page_url         ? String(payload.page_url)                        : null),
    row('Browser',          payload.browser          ? String(payload.browser)                         : null),
    row('Device',           payload.device           ? String(payload.device)                          : null),
    row('Breadcrumbs saved',payload.breadcrumb_count !== undefined
                              ? `${payload.breadcrumb_count} events recorded`
                              : null),
    row('Session ID',       payload.session_id         ? String(payload.session_id)   : null),
    row('Stripe Event',     payload.stripe_event_type  ? String(payload.stripe_event_type) : null),
    row('Stripe Customer',  payload.stripe_customer_id ? String(payload.stripe_customer_id) : null),
  ].filter(Boolean).join('')

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <tr>
            <td style="background:#008080;padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Prokaiwa</span>
                    <span style="color:#b2dfdf;font-size:14px;margin-left:8px;">System Alert</span>
                  </td>
                  <td align="right">
                    <span style="background:${badgeColor};color:#fff;font-size:11px;font-weight:700;
                                 padding:4px 10px;border-radius:20px;letter-spacing:0.5px;">
                      ${badgeLabel}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px;font-size:14px;color:#444;line-height:1.6;">
              ${intro}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;font-size:13px;">
                ${detailRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f9f9f9;padding:16px 28px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">
                This alert was sent automatically by Prokaiwa's monitoring system.<br>
                <a href="https://www.prokaiwa.com/teacher-portal.html"
                   style="color:#008080;font-weight:600;">Open Teacher Portal →</a>
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`

  return { subject, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    let payload: Record<string, unknown> = {}
    try {
      payload = await req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
    }

    if (!payload.type) {
      return new Response('Missing type field', { status: 400, headers: corsHeaders })
    }

    const { subject, html } = buildEmailHtml(payload)

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ALERT_EMAIL],
        subject,
        html
      })
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      console.error('Resend API error:', errText)
      return new Response('Email send failed', { status: 502, headers: corsHeaders })
    }

    if (payload.session_id) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)
      await supabase
        .from('error_log')
        .update({ alert_sent: true, alert_sent_at: new Date().toISOString() })
        .eq('session_id', String(payload.session_id))
        .eq('alert_sent', false)
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('notify-admin error:', err)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})