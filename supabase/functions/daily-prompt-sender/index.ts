import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function formatPromptText(text: string): string {
  return text
    .replace(/\[Listen\]/g, '🎧')
    .replace(/\[Voice\]/g, '🗣️')
    .replace(/\[\*\]/g, '💡')
    .replace(/\[Tip\]/g, '📘')
    .replace(/\[Practice\]/g, '✏️')
    .replace(/\[Challenge\]/g, '🎯')
    .replace(/\[Quiz\]/g, '❓')
    .replace(/\[Scenario\]/g, '🎭');
}

async function sendLineMessage(lineId: string, message: string) {
  console.log(`Sending text to LINE ID: ${lineId}`);

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
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LINE API error (text):', error);
    return null;
  }

  return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function sendLineAudio(lineId: string, audioUrl: string, durationMs: number) {
  console.log(`Sending audio to LINE ID: ${lineId}, url: ${audioUrl}`);

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      to: lineId,
      messages: [{
        type: 'audio',
        originalContentUrl: audioUrl,
        duration: durationMs
      }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LINE API error (audio):', error);
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    console.error('❌ Invalid or missing cron secret');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('🚀 Starting daily prompt delivery...');

    const { data: responses, error: studentsError } = await supabase
      .from('questionnaire_responses')
      .select('user_id, line_id, level, goals, given_name_romaji, plan')
      .in('plan', ['line', 'power_lite', 'power_pro'])
      .eq('subscription_status', 'active')
      .not('line_id', 'is', null);

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return new Response(JSON.stringify({ error: studentsError.message }), { status: 500 });
    }

    if (!responses || responses.length === 0) {
      console.log('No students to message today');
      return new Response(JSON.stringify({ message: 'No students found' }), { status: 200 });
    }

    const userIds = responses.map(r => r.user_id);
    const { data: progressRecords, error: progressError } = await supabase
      .from('student_progress')
      .select('*')
      .in('user_id', userIds);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return new Response(JSON.stringify({ error: progressError.message }), { status: 500 });
    }

    const studentsWithProgress = responses.map(student => {
      const progress = progressRecords?.find(p => p.user_id === student.user_id);
      return {
        ...student,
        student_progress: progress ? [progress] : []
      };
    }).filter(s => s.student_progress.length > 0);

    console.log(`Found ${studentsWithProgress.length} students with progress records`);
    const results = [];
    const today = new Date().toDateString();

    for (const student of studentsWithProgress) {
      const progress = student.student_progress[0];

      if (progress?.last_prompt_sent_at) {
        const lastSent = new Date(progress.last_prompt_sent_at).toDateString();
        if (lastSent === today) {
          console.log(`✓ Already sent to ${student.given_name_romaji} today`);
          continue;
        }
      }

      const purpose = student.goals?.purpose || 'Hobby';

      console.log(`Processing ${student.given_name_romaji}: Level=${student.level}, Purpose=${purpose}, Week=${progress.current_week}, Day=${progress.current_day}`);

      const { data: prompt, error: promptError } = await supabase
        .from('prompts')
        .select('*')
        .eq('level', student.level)
        .eq('purpose', purpose)
        .eq('week_number', progress.current_week)
        .eq('day_number', progress.current_day)
        .single();

      if (promptError || !prompt) {
        console.log(`❌ No prompt found for ${student.given_name_romaji}`);
        results.push({ student: student.given_name_romaji, status: 'no_prompt' });
        continue;
      }

      // ── Audio message (Day 1 Listening Practice) ──────────────
      if (prompt.audio_url) {
        const durationMs = prompt.audio_duration ?? 10000;
        const audioSent = await sendLineAudio(student.line_id, prompt.audio_url, durationMs);

        if (audioSent) {
          console.log(`🎵 Audio sent to ${student.given_name_romaji}`);
          // ── Log audio send for teacher paper trail ──
          // Stored separately from the text prompt so it appears
          // as its own entry in the conversation history.
          await supabase.from('message_log').insert({
            user_id:      student.user_id,
            prompt_id:    prompt.id,
            message_type: 'audio_prompt',
            message_text: prompt.audio_url,
          });
        } else {
          console.error(`⚠️ Audio failed for ${student.given_name_romaji} — continuing with text`);
        }
      }

      // ── Text message ──────────────────────────────────────────
      const formattedPrompt = formatPromptText(prompt.prompt_text);

      let message = `Good morning ${student.given_name_romaji}! ☀️\n\n${formattedPrompt}\n`;

      if (prompt.prompt_text_japanese) {
        message += `\n〜〜〜〜〜〜〜〜〜〜\n🇯🇵 日本語サポート\n${prompt.prompt_text_japanese}\n`;
      }

      if (progress.total_prompts_sent === 0) {
        message += `\n📱 返信方法：\n・ボイスメッセージがおすすめ！\n・テキストでも大丈夫です\n・自分のペースでどうぞ\n・24時間以内にフィードバックをお送りします\n`;
      }

      message += `\nTake your time and reply whenever you're ready! 😊`;

      const lineMessageId = await sendLineMessage(student.line_id, message);

      if (lineMessageId) {
        await supabase.from('message_log').insert({
          user_id:         student.user_id,
          prompt_id:       prompt.id,
          message_type:    'prompt',
          message_text:    message,
          line_message_id: lineMessageId
        });

        let nextDay  = progress.current_day + 1;
        let nextWeek = progress.current_week;

        if (nextDay > 7) {
          nextDay  = 1;
          nextWeek = progress.current_week + 1;

          const { data: weekCheck } = await supabase
            .from('prompts')
            .select('week_number')
            .eq('level', student.level)
            .eq('purpose', purpose)
            .eq('week_number', nextWeek)
            .limit(1);

          if (!weekCheck || weekCheck.length === 0) {
            console.log(`📚 Week ${nextWeek} doesn't exist for ${student.given_name_romaji}. Looping back to Week 1.`);
            nextWeek = 1;
          }
        }

        await supabase
          .from('student_progress')
          .update({
            current_week:        nextWeek,
            current_day:         nextDay,
            last_prompt_sent_at: new Date().toISOString(),
            total_prompts_sent:  (progress.total_prompts_sent || 0) + 1
          })
          .eq('user_id', student.user_id);

        results.push({ student: student.given_name_romaji, status: 'sent' });
        console.log(`✅ Sent prompt to ${student.given_name_romaji}`);
      } else {
        results.push({ student: student.given_name_romaji, status: 'failed' });
        console.log(`❌ Failed to send to ${student.given_name_romaji}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total_sent: results.filter(r => r.status === 'sent').length,
        timestamp:  new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});