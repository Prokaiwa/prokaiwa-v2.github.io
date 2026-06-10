import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Admin-only "View as student": mints a one-time magic link so an admin can
// load a student's dashboard exactly as the student sees it. Every use is
// audited in impersonation_log.

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.prokaiwa.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const REDIRECT_TO = 'https://www.prokaiwa.com/dashboard.html'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) throw new Error('Server is not configured')

    const admin = createClient(supabaseUrl, serviceKey)

    // ── AuthN ─────────────────────────────────────────────────
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) throw new Error('Invalid authentication')

    // ── AuthZ: ADMIN teacher only ─────────────────────────────
    const { data: teacher, error: teacherErr } = await admin
      .from('teachers')
      .select('id, role, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (teacherErr) throw new Error('Database error: ' + teacherErr.message)
    if (!teacher || !teacher.is_active || teacher.role !== 'admin') {
      throw new Error('Not authorized — admin account required')
    }

    // ── Input ─────────────────────────────────────────────────
    const { student_id } = await req.json()
    if (!student_id) throw new Error('Missing student_id')

    const { data: student, error: studentErr } = await admin
      .from('questionnaire_responses')
      .select('id, user_id, email, name')
      .eq('id', student_id)
      .maybeSingle()
    if (studentErr) throw new Error('Database error: ' + studentErr.message)
    if (!student) throw new Error('Student not found')
    if (!student.email) throw new Error('Student has no email on file (cannot mint a login link)')

    // ── Mint a one-time magic link for the student ────────────
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: student.email,
      options: { redirectTo: REDIRECT_TO },
    })
    if (linkErr) throw new Error('Could not generate login link: ' + linkErr.message)

    const actionLink = linkData?.properties?.action_link
    if (!actionLink) throw new Error('No link returned by auth')

    // ── Audit (best-effort; never blocks) ─────────────────────
    try {
      await admin.from('impersonation_log').insert({
        admin_teacher_id: teacher.id,
        admin_user_id: user.id,
        student_id: student.id,
        student_user_id: student.user_id,
      })
    } catch (logErr) {
      console.error('⚠️ impersonation_log insert failed:', logErr)
    }

    console.log(`👁️ admin ${user.email} → view as student ${student.id} (${student.email})`)

    return new Response(
      JSON.stringify({ success: true, link: actionLink, student_name: student.name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('admin-impersonate error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
