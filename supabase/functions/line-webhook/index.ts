import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!;
const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================
// SIGNATURE VERIFICATION
// ============================================================
async function verifyLineSignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(LINE_CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return computed === signature;
}

// ============================================================
// SEND LINE MESSAGE
// ============================================================
async function sendLineMessage(userId: string, message: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LINE API error:', error);
    return false;
  }
  return true;
}

// ============================================================
// FIND ACTIVE PROMPT ID
// Links student responses to their most recent unanswered prompt
// ============================================================
async function findActivePromptId(userUuid: string): Promise<string | null> {
  try {
    const { data: lastPrompt, error: promptError } = await supabase
      .from('message_log')
      .select('prompt_id, created_at')
      .eq('user_id', userUuid)
      .eq('message_type', 'prompt')
      .not('prompt_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (promptError || !lastPrompt) {
      return null;
    }

    return lastPrompt.prompt_id;

  } catch (err) {
    console.error('Error in findActivePromptId:', err);
    return null;
  }
}

// ============================================================
// ACTIVATE STUDENT
// Shared logic for saving line_id and sending welcome message.
// Called by both the CONNECT token handler and the follow handler.
// ============================================================
async function activateStudent(
  lineUserId: string,
  studentUserId: string,
  givenNameRomaji: string
) {
  // Save the real LINE user ID to questionnaire_responses
  const { error: updateError } = await supabase
    .from('questionnaire_responses')
    .update({ line_id: lineUserId })
    .eq('user_id', studentUserId);

  if (updateError) {
    console.error('Failed to save line_id:', updateError);
    return false;
  }

  // Log the activation
  await supabase.from('message_log').insert({
    user_id: studentUserId,
    message_type: 'webhook_activation',
    message_text: `LINE User ID captured: ${lineUserId}`,
    line_message_id: `activation_${Date.now()}`
  });

  // Generate survey token for the needs survey link
  const { data: tokenRow, error: tokenError } = await supabase
    .from('survey_tokens')
    .insert({ user_id: studentUserId })
    .select('token')
    .single();

  const surveyLink = tokenRow && !tokenError
    ? `\n\n📋 レッスン開始前に、簡単なアンケートにお答えください：\nhttps://www.prokaiwa.com/needs-survey.html?token=${tokenRow.token}`
    : '';

  const welcomeMessage =
    `${givenNameRomaji}さん、ようこそProkaiwaへ！🎉\n\n` +
    `アカウントが有効になりました！最初の英会話プロンプトは明日の朝9時（日本時間）に届きます ☀️` +
    `${surveyLink}\n\n` +
    `ご質問があればいつでもメッセージしてください。一緒に英語力を伸ばしましょう！💪\n\n` +
    `Welcome, ${givenNameRomaji}! Your account is activated. Your first English prompt arrives tomorrow at 9 AM JST.`;

  await sendLineMessage(lineUserId, welcomeMessage);
  console.log(`✅ Activated ${givenNameRomaji}`);
  return true;
}

// ============================================================
// MAIN HANDLER
// ============================================================
Deno.serve(async (req) => {
  try {
    const body = await req.text();

    // Verify the request is genuinely from LINE
    const signature = req.headers.get('x-line-signature');
    const isValid = await verifyLineSignature(body, signature);

    if (!isValid) {
      return new Response('Invalid signature', { status: 403 });
    }

    const data = JSON.parse(body);
    const events = data.events || [];

    for (const event of events) {
      const lineUserId = event.source?.userId;

      if (!lineUserId) continue;

      // ======================================================
      // HANDLE FOLLOW EVENT
      // ======================================================
      if (event.type === 'follow') {
        console.log(`Follow event from LINE user: ${lineUserId}`);

        const { data: existing } = await supabase
          .from('questionnaire_responses')
          .select('user_id, given_name_romaji')
          .eq('line_id', lineUserId)
          .maybeSingle();

        if (existing) {
          console.log(`${existing.given_name_romaji} already linked — skipping follow`);
          continue;
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: pendingUser, error: findError } = await supabase
          .from('questionnaire_responses')
          .select('user_id, given_name_romaji, email, plan, payment_status')
          .is('line_id', null)
          .in('plan', ['line', 'power_lite', 'power_pro'])
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (findError || !pendingUser) {
          await sendLineMessage(
            lineUserId,
            'Prokaiwaを友だち追加していただきありがとうございます！😊\n\n' +
            'レッスンを始めるには、まずウェブサイトで登録を完了してください。\n' +
            '👉 www.prokaiwa.com\n\n' +
            'Thank you for adding Prokaiwa! To start your lessons, please complete your registration at www.prokaiwa.com'
          );
          continue;
        }

        if (pendingUser.payment_status !== 'paid') {
          await supabase
            .from('questionnaire_responses')
            .update({ line_id: lineUserId })
            .eq('user_id', pendingUser.user_id);

          await supabase.from('message_log').insert({
            user_id: pendingUser.user_id,
            message_type: 'webhook_activation',
            message_text: `LINE User ID captured (unpaid): ${lineUserId}`,
            line_message_id: `activation_unpaid_${Date.now()}`
          });

          await sendLineMessage(
            lineUserId,
            `${pendingUser.given_name_romaji}さん、友だち追加ありがとうございます！😊\n\n` +
            `お支払いが完了次第、レッスンを開始できます。\n` +
            `👉 www.prokaiwa.com\n\n` +
            `Thank you for adding us, ${pendingUser.given_name_romaji}! Once your payment is complete, your lessons will begin.`
          );
          continue;
        }

        await sendLineMessage(
          lineUserId,
          `${pendingUser.given_name_romaji}さん、友だち追加ありがとうございます！😊\n\n` +
          `アカウントを有効にするために、お申し込み完了ページに表示されている認証コード（CONNECT-から始まるコード）をこのLINEに送ってください。\n\n` +
          `Thank you, ${pendingUser.given_name_romaji}! Please send your connection code from your sign-up confirmation page to activate your account.`
        );
      }

      // ======================================================
      // HANDLE MESSAGE EVENT
      // ======================================================
      if (event.type === 'message') {
        const messageText: string = event.message?.text || '';

        // ── CONNECT token path ────────────────────────────────
        if (messageText.startsWith('CONNECT-')) {
          console.log(`CONNECT message received from LINE user: ${lineUserId}`);

          const token = messageText.replace('CONNECT-', '').trim().toLowerCase();

          if (!token) {
            await sendLineMessage(
              lineUserId,
              'コードが正しく読み取れませんでした。お申し込みページのコードをもう一度送ってください。\n\n' +
              'We couldn\'t read your code. Please resend the code from your sign-up confirmation page.'
            );
            continue;
          }

          const { data: student, error: findError } = await supabase
            .from('questionnaire_responses')
            .select('user_id, given_name_romaji, line_id, payment_status')
            .eq('line_connect_token', token)
            .maybeSingle();

          if (findError || !student) {
            console.log(`CONNECT token not found: ${token}`);
            await sendLineMessage(
              lineUserId,
              '認証コードが見つかりませんでした。もう一度お試しいただくか、prokaiwa.english@gmail.com までご連絡ください。\n\n' +
              'Connection code not found. Please try again or contact prokaiwa.english@gmail.com'
            );
            continue;
          }

          if (student.payment_status !== 'paid') {
            await sendLineMessage(
              lineUserId,
              `${student.given_name_romaji}さん、お支払いがまだ完了していないようです。\n` +
              `お支払い後にもう一度このコードを送ってください。\n\n` +
              `Payment not yet confirmed. Please complete payment and resend this code.`
            );
            continue;
          }

          if (student.line_id && student.line_id !== lineUserId) {
            await sendLineMessage(
              lineUserId,
              `${student.given_name_romaji}さんのアカウントはすでに別のLINEアカウントと連携されています。\n` +
              `ご不明な点は prokaiwa.english@gmail.com までご連絡ください。\n\n` +
              `This account is already linked to another LINE account. Contact prokaiwa.english@gmail.com for help.`
            );
            continue;
          }

          if (student.line_id === lineUserId) {
            console.log(`${student.given_name_romaji} already linked to this LINE ID — resending welcome`);
            await sendLineMessage(
              lineUserId,
              `${student.given_name_romaji}さん、アカウントはすでに有効です！✅\n\n` +
              `明日の朝9時（日本時間）に最初のプロンプトが届きます ☀️\n\n` +
              `Your account is already active! Your first prompt arrives tomorrow at 9 AM JST.`
            );
            continue;
          }

          await activateStudent(lineUserId, student.user_id, student.given_name_romaji);
          continue;
        }

        // ── Regular student response path ─────────────────────
        // Added `plan` to select so we can include it in push notification
        const { data: student, error: studentError } = await supabase
          .from('questionnaire_responses')
          .select('user_id, given_name_romaji, plan')
          .eq('line_id', lineUserId)
          .maybeSingle();

        if (studentError || !student) {
          console.log(`Message from unlinked LINE user: ${lineUserId}`);
          continue;
        }

        const messageType = event.message?.type;
        const messageId   = event.message?.id;

        let mediaType = 'text';
        if (messageType === 'audio' || messageType === 'voice') {
          mediaType = 'audio';
        } else if (messageType === 'video') {
          mediaType = 'video';
        } else if (messageType === 'image') {
          mediaType = 'image';
        }

        const activePromptId = await findActivePromptId(student.user_id);

        const { error: insertError } = await supabase
          .from('message_log')
          .insert({
            user_id: student.user_id,
            message_type: 'student_response',
            message_text: messageText || null,
            message_id: messageId,
            media_type: mediaType,
            line_message_id: messageId,
            prompt_id: activePromptId
          });

        if (insertError) {
          console.error('Failed to save response:', insertError);
        } else {
          const { error: progressError } = await supabase
            .rpc('increment_student_responses', { p_user_id: student.user_id });

          if (progressError) {
            console.error('Failed to increment total_responses_received:', progressError);
          }

          const mediaLabel = mediaType === 'audio' ? '🎤 Voice message'
                           : mediaType === 'video'  ? '🎥 Video'
                           : mediaType === 'image'  ? '🖼 Image'
                           : '💬 Text message';

          const responsePreview = mediaType === 'text' && messageText
            ? messageText.slice(0, 200)
            : null;

          // Notify teacher via email — fire and forget
          fetch(`${SUPABASE_URL}/functions/v1/notify-admin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({
              type: 'student_response',
              student_name: student.given_name_romaji || 'Unknown student',
              media_type: mediaLabel,
              response_preview: responsePreview
            })
          }).catch(e => console.error('notify-admin ping failed:', e));

          // ── PUSH NOTIFICATION ─────────────────────────────
          // Sends a phone notification to the teacher instantly.
          // Fire and forget — never block the webhook response.
          fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({
              studentName:     student.given_name_romaji || 'A student',
              messagePreview:  responsePreview || mediaLabel,
              plan:            student.plan
            })
          }).catch(e => console.error('send-push-notification failed:', e));
        }

        // Confirm receipt for audio and video responses
        if (mediaType === 'audio' || mediaType === 'video') {
          await sendLineMessage(
            lineUserId,
            '✅ Got it! Your teacher will review your response soon. Keep up the great work! 💪'
          );
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
});