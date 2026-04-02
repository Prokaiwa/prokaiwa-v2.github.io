// ============================================================
// Prokaiwa Dashboard — Main Script
// Contains: dashboard logic, booking widget, meet link refresh
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';
        const PROKAIWA_DEBUG = false;
        const LOTTIE_FIRE_ENABLED = true;
        const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};
              debugLog('🚀 DASHBOARD SCRIPT STARTING...');

        // =============================================
        // CONFIGURATION
        // =============================================
        const SUPABASE_URL = 'https://luyzyzefgintksydmwoh.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1eXp5emVmZ2ludGtzeWRtd29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NzYyMDUsImV4cCI6MjA2ODU1MjIwNX0.he5_j99ZtAj4K_zzgm11NEEv7TrbRJYndJXot25s_Kg';

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                storageKey: 'prokaiwa-supabase-auth',
                storage: window.localStorage,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });

        debugLog('✅ Supabase client created successfully');

        const MONTHLY_GOAL = 20;

        // Daily phrases
        const dailyPhrases = [
            { phrase: '"I\'m looking forward to..."', example_en: 'I\'m looking forward to our next lesson!', example_ja: '次のレッスンが楽しみです！' },
            { phrase: '"Could you please..."', example_en: 'Could you please repeat that?', example_ja: 'もう一度言っていただけますか？' },
            { phrase: '"I\'d like to..."', example_en: 'I\'d like to practice speaking more.', example_ja: 'もっとスピーキングを練習したいです。' },
            { phrase: '"What do you think about..."', example_en: 'What do you think about this idea?', example_ja: 'このアイデアについてどう思いますか？' },
            { phrase: '"It depends on..."', example_en: 'It depends on the situation.', example_ja: '状況によります。' },
            { phrase: '"I\'m not sure, but..."', example_en: 'I\'m not sure, but I think so.', example_ja: '確かではないですが、そう思います。' },
            { phrase: '"Let me think about it."', example_en: 'Let me think about it and get back to you.', example_ja: '考えて後で連絡しますね。' },
        ];

        // Learning Archetype definitions
        const learningArchetypes = [
            {
                code: 'perfect_master',
                icon: 'fas fa-gem',
                name_ja: 'パーフェクトマスター',
                name_en: 'Perfect Master',
                description_ja: '全スキル完璧！あなたは英語学習の頂点に立っています。素晴らしい努力の結晶です！',
                description_en: 'Perfect across all skills! You\'ve reached the pinnacle of English mastery. Exceptional work!',
                condition: (skills) => {
                    return skills.fluency === 10 && skills.grammar === 10 && skills.comprehension === 10 && 
                           skills.vocabulary === 10 && skills.pronunciation === 10;
                }
            },
            {
                code: 'advanced_achiever',
                icon: 'fas fa-trophy',
                name_ja: '上級達成者',
                name_en: 'Advanced Achiever',
                description_ja: '高いレベルまで到達しています！この実力を維持しながら、さらなる高みを目指しましょう！',
                description_en: 'You\'ve reached an advanced level! Maintain this excellence while aiming even higher!',
                condition: (skills) => {
                    const values = [skills.fluency, skills.grammar, skills.comprehension, skills.vocabulary, skills.pronunciation];
                    const advancedCount = values.filter(v => v >= 7).length;
                    return advancedCount >= 3;
                }
            },
            {
                code: 'natural_speaker',
                icon: 'fas fa-comments',
                name_ja: '天性のスピーカー',
                name_en: 'Natural Speaker',
                description_ja: '流暢さと発音が特に優れています。あなたは生まれながらのコミュニケーターですね！',
                description_en: 'Your fluency and pronunciation stand out. You\'re a natural communicator!',
                condition: (skills) => {
                    const speakingAvg = (skills.fluency + skills.pronunciation) / 2;
                    const otherAvg = (skills.grammar + skills.comprehension + skills.vocabulary) / 3;
                    return speakingAvg >= 6 && speakingAvg > otherAvg + 1.5;
                }
            },
            {
                code: 'grammar_guru',
                icon: 'fas fa-book',
                name_ja: '文法マスター',
                name_en: 'Grammar Guru',
                description_ja: '文法と語彙力が強みです。分析的な学習スタイルが英語の構造理解を深めています！',
                description_en: 'Grammar and vocabulary are your strengths. Your analytical approach builds strong language foundations!',
                condition: (skills) => {
                    const structureAvg = (skills.grammar + skills.vocabulary) / 2;
                    const otherAvg = (skills.fluency + skills.comprehension + skills.pronunciation) / 3;
                    return structureAvg >= 6 && structureAvg > otherAvg + 1.5;
                }
            },
            {
                code: 'comprehension_champion',
                icon: 'fas fa-headphones',
                name_ja: '理解力の達人',
                name_en: 'Comprehension Champion',
                description_ja: '理解力が抜群です。聞き取りと文脈把握の才能が際立っています！',
                description_en: 'Your comprehension excels. You have a gift for understanding context and nuance!',
                condition: (skills) => {
                    return skills.comprehension >= 7 && skills.comprehension >= Math.max(skills.fluency, skills.grammar, skills.vocabulary, skills.pronunciation) + 1;
                }
            },
            {
                code: 'rising_star',
                icon: 'fas fa-star',
                name_ja: 'ライジングスター',
                name_en: 'Rising Star',
                description_ja: 'すべてのスキルが着実に成長中！この調子で頑張れば、必ず目標に到達できます！',
                description_en: 'All your skills are steadily improving! Keep up this momentum and you\'ll reach your goals!',
                condition: (skills) => {
                    const values = [skills.fluency, skills.grammar, skills.comprehension, skills.vocabulary, skills.pronunciation];
                    return values.every(v => v >= 4 && v <= 7);
                }
            },
            {
                code: 'foundation_builder',
                icon: 'fas fa-cubes',
                name_ja: '基礎固め中',
                name_en: 'Foundation Builder',
                description_ja: '基礎をしっかり築いている段階です。この土台が将来の成長を支えます。着実に進みましょう！',
                description_en: 'You\'re building a solid foundation. This groundwork will support all your future growth. Keep going!',
                condition: (skills) => {
                    const values = [skills.fluency, skills.grammar, skills.comprehension, skills.vocabulary, skills.pronunciation];
                    const beginnerCount = values.filter(v => v <= 4).length;
                    return beginnerCount >= 3;
                }
            },
            {
                code: 'balanced_learner',
                icon: 'fas fa-bullseye',
                name_ja: 'バランス型学習者',
                name_en: 'Balanced Learner',
                description_ja: 'すべてのスキルがバランスよく成長しています。この万能さは実践的なコミュニケーション力の証です！',
                description_en: 'All your skills are developing evenly. This versatility shows strong practical communication ability!',
                condition: (skills) => {
                    const values = [skills.fluency, skills.grammar, skills.comprehension, skills.vocabulary, skills.pronunciation];
                    const max = Math.max(...values);
                    const min = Math.min(...values);
                    return (max - min) <= 2;
                }
            }
        ];


        // =============================================
        // BADGE HELPER FUNCTIONS
        // =============================================

        function countTimesInRange(timestamps, startHour, startMin, endHour, endMin) {
            let count = 0;
            for (const ts of timestamps) {
                const d = new Date(ts);
                const h = d.getHours();
                const m = d.getMinutes();
                const total = h * 60 + m;
                if (total >= startHour * 60 + startMin && total < endHour * 60 + endMin) count++;
            }
            return count;
        }

        function practicedOnDate(practiceDates, month, day) {
            const dateStr = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return practiceDates.includes(dateStr);
        }

        function countDaysInMonth(practiceDates, year, month) {
            const prefix = `${year}-${String(month).padStart(2, '0')}`;
            return practiceDates.filter(d => d.startsWith(prefix)).length;
        }


        // =============================================
        // ACHIEVEMENT DEFINITIONS (46 badges)
        // =============================================

        const achievementCategories = [
            { id: 'core', name_ja: 'コアマイルストーン', name_en: 'Core Milestones', icon: 'fas fa-flag-checkered' },
            { id: 'style', name_ja: 'スピード＆スタイル', name_en: 'Speed & Style', icon: 'fas fa-bolt' },
            { id: 'seasonal', name_ja: '2026シーズン', name_en: '2026 Seasonal', icon: 'fas fa-calendar' },
            { id: 'holiday', name_ja: 'ホリデーコレクション', name_en: 'Holiday Collection', icon: 'fas fa-gift' },
        ];

        const achievements = [
            // ── CORE MILESTONES ──
            { code: 'first_session', category: 'core', icon: 'fas fa-play', tier: 'bronze',
              name_ja: '初回完了', name_en: 'First Session',
              desc_ja: '初めての練習を完了', desc_en: 'Complete your first session',
              condition: (s) => s.total >= 1,
              progress: (s) => ({ current: Math.min(s.total, 1), target: 1 }) },
            { code: 'streak_3', category: 'core', icon: 'fas fa-fire', tier: 'bronze',
              name_ja: '3日連続', name_en: '3-Day Streak',
              desc_ja: '3日間連続で練習', desc_en: 'Practice 3 days in a row',
              condition: (s) => s.maxStreak >= 3,
              progress: (s) => ({ current: Math.min(s.current, 3), target: 3 }) },
            { code: 'sessions_10', category: 'core', icon: 'fas fa-star', tier: 'bronze',
              name_ja: '10回達成', name_en: '10 Sessions',
              desc_ja: '合計10回の練習を完了', desc_en: 'Complete 10 practice sessions',
              condition: (s) => s.total >= 10,
              progress: (s) => ({ current: Math.min(s.total, 10), target: 10 }) },
            { code: 'streak_7', category: 'core', icon: 'fas fa-calendar-check', tier: 'bronze',
              name_ja: '7日連続', name_en: '7-Day Streak',
              desc_ja: '1週間毎日練習', desc_en: 'Keep a 7-day streak',
              condition: (s) => s.maxStreak >= 7,
              progress: (s) => ({ current: Math.min(s.current, 7), target: 7 }) },
            { code: 'streak_14', category: 'core', icon: 'fas fa-calendar-days', tier: 'bronze',
              name_ja: '14日連続', name_en: '14-Day Streak',
              desc_ja: '2週間毎日練習', desc_en: 'Keep a 14-day streak',
              condition: (s) => s.maxStreak >= 14,
              progress: (s) => ({ current: Math.min(s.current, 14), target: 14 }) },
            { code: 'sessions_50', category: 'core', icon: 'fas fa-award', tier: 'silver',
              name_ja: '50回達成', name_en: '50 Sessions',
              desc_ja: '合計50回の練習を達成', desc_en: 'Reach 50 total sessions',
              condition: (s) => s.total >= 50,
              progress: (s) => ({ current: Math.min(s.total, 50), target: 50 }) },
            { code: 'streak_30', category: 'core', icon: 'fas fa-medal', tier: 'silver',
              name_ja: '30日連続', name_en: '30-Day Streak',
              desc_ja: '1ヶ月間毎日練習', desc_en: 'Maintain a 30-day streak',
              condition: (s) => s.maxStreak >= 30,
              progress: (s) => ({ current: Math.min(s.current, 30), target: 30 }) },
            { code: 'streak_60', category: 'core', icon: 'fas fa-shield-halved', tier: 'silver',
              name_ja: '60日連続', name_en: '60-Day Streak',
              desc_ja: '2ヶ月間毎日練習', desc_en: 'Maintain a 60-day streak',
              condition: (s) => s.maxStreak >= 60,
              progress: (s) => ({ current: Math.min(s.current, 60), target: 60 }) },
            { code: 'streak_90', category: 'core', icon: 'fas fa-crown', tier: 'gold',
              name_ja: '90日連続', name_en: '90-Day Streak',
              desc_ja: '3ヶ月間毎日練習', desc_en: 'Maintain a 90-day streak',
              condition: (s) => s.maxStreak >= 90,
              progress: (s) => ({ current: Math.min(s.current, 90), target: 90 }) },
            { code: 'streak_120', category: 'core', icon: 'fas fa-fire-flame-curved', tier: 'gold',
              name_ja: '120日連続', name_en: '120-Day Streak',
              desc_ja: '4ヶ月間毎日練習', desc_en: 'Maintain a 120-day streak',
              condition: (s) => s.maxStreak >= 120,
              progress: (s) => ({ current: Math.min(s.current, 120), target: 120 }) },
            { code: 'streak_240', category: 'core', icon: 'fas fa-meteor', tier: 'platinum',
              name_ja: '240日連続', name_en: '240-Day Streak',
              desc_ja: '8ヶ月間毎日練習', desc_en: 'Maintain a 240-day streak',
              condition: (s) => s.maxStreak >= 240,
              progress: (s) => ({ current: Math.min(s.current, 240), target: 240 }) },
            { code: 'sessions_100', category: 'core', icon: 'fas fa-certificate', tier: 'gold',
              name_ja: '100回達成', name_en: '100 Sessions',
              desc_ja: '合計100回の練習を達成', desc_en: 'Complete 100 sessions',
              condition: (s) => s.total >= 100,
              progress: (s) => ({ current: Math.min(s.total, 100), target: 100 }) },
            { code: 'sessions_250', category: 'core', icon: 'fas fa-ranking-star', tier: 'platinum',
              name_ja: '250回達成', name_en: '250 Sessions',
              desc_ja: '合計250回の練習を達成', desc_en: 'Complete 250 sessions',
              condition: (s) => s.total >= 250,
              progress: (s) => ({ current: Math.min(s.total, 250), target: 250 }) },
            { code: 'sessions_500', category: 'core', icon: 'fas fa-gem', tier: 'legendary',
              name_ja: '500回達成', name_en: '500 Sessions',
              desc_ja: '合計500回の練習を達成', desc_en: 'Complete 500 sessions',
              condition: (s) => s.total >= 500,
              progress: (s) => ({ current: Math.min(s.total, 500), target: 500 }) },
            { code: 'streak_365', category: 'core', icon: 'fas fa-infinity', tier: 'legendary',
              name_ja: '365日連続', name_en: '365-Day Streak',
              desc_ja: '1年間毎日練習', desc_en: 'Practice every day for a year',
              condition: (s) => s.maxStreak >= 365,
              progress: (s) => ({ current: Math.min(s.current, 365), target: 365 }) },

            // ── SPEED & STYLE ──
            { code: 'weekend_warrior', category: 'style', icon: 'fas fa-calendar-week', tier: 'themed',
              colors: { bg: '#27AE60', fg: '#FFFFFF' },
              name_ja: '週末戦士', name_en: 'Weekend Warrior',
              desc_ja: '土日両方で練習', desc_en: 'Practice on both Saturday and Sunday',
              condition: (s) => {
                  const dates = s.practiceDates || [];
                  let sat = false, sun = false;
                  for (const d of dates) { const day = new Date(d).getDay(); if (day === 6) sat = true; if (day === 0) sun = true; }
                  return sat && sun;
              },
              progress: (s) => {
                  const dates = s.practiceDates || [];
                  let sat = false, sun = false;
                  for (const d of dates) { const day = new Date(d).getDay(); if (day === 6) sat = true; if (day === 0) sun = true; }
                  return { current: (sat ? 1 : 0) + (sun ? 1 : 0), target: 2 };
              } },
            { code: 'blitz', category: 'style', icon: 'fas fa-bolt', tier: 'themed',
              colors: { bg: '#1565C0', fg: '#FFD700' },
              name_ja: 'ブリッツ', name_en: 'Blitz',
              desc_ja: 'プロンプト送信後10分以内に回答', desc_en: 'Respond within 10 minutes of the 9am prompt',
              condition: (s) => countTimesInRange(s.practiceTimestamps || [], 9, 0, 9, 10) >= 1,
              progress: (s) => ({ current: Math.min(countTimesInRange(s.practiceTimestamps || [], 9, 0, 9, 10), 1), target: 1 }) },
            { code: 'morning_person', category: 'style', icon: 'fas fa-sun', tier: 'themed',
              colors: { bg: '#B3E5FC', fg: '#E65100' },
              name_ja: 'モーニングパーソン', name_en: 'Morning Person',
              desc_ja: '午前10時前に3回練習', desc_en: 'Practice before 10am three times',
              condition: (s) => countTimesInRange(s.practiceTimestamps || [], 0, 0, 10, 0) >= 3,
              progress: (s) => ({ current: Math.min(countTimesInRange(s.practiceTimestamps || [], 0, 0, 10, 0), 3), target: 3 }) },
            { code: 'lunch_learner', category: 'style', icon: 'fas fa-utensils', tier: 'themed',
              colors: { bg: '#00897B', fg: '#FFFFFF' },
              name_ja: 'ランチ学習者', name_en: 'Lunch Learner',
              desc_ja: '12時〜14時に3回練習', desc_en: 'Practice between 12-2pm three times',
              condition: (s) => countTimesInRange(s.practiceTimestamps || [], 12, 0, 14, 0) >= 3,
              progress: (s) => ({ current: Math.min(countTimesInRange(s.practiceTimestamps || [], 12, 0, 14, 0), 3), target: 3 }) },
            { code: 'commuter_crunch', category: 'style', icon: 'fas fa-train-subway', tier: 'themed',
              colors: { bg: '#424242', fg: '#8BC34A' },
              name_ja: '通勤タイム', name_en: 'Commuter Crunch',
              desc_ja: '17:30〜19:00に3回練習', desc_en: 'Practice between 5:30-7pm three times',
              condition: (s) => countTimesInRange(s.practiceTimestamps || [], 17, 30, 19, 0) >= 3,
              progress: (s) => ({ current: Math.min(countTimesInRange(s.practiceTimestamps || [], 17, 30, 19, 0), 3), target: 3 }) },
            { code: 'consistency_champion', category: 'style', icon: 'fas fa-trophy', tier: 'themed',
              colors: { bg: '#6A1B9A', fg: '#FFD700' },
              name_ja: '継続王', name_en: 'Consistency Champion',
              desc_ja: '1ヶ月に20日以上練習', desc_en: 'Practice 20+ days in a single month',
              condition: (s) => {
                  const dates = s.practiceDates || [];
                  const months = {};
                  for (const d of dates) { const ym = d.substring(0, 7); months[ym] = (months[ym] || 0) + 1; }
                  return Object.values(months).some(c => c >= 20);
              },
              progress: (s) => {
                  const dates = s.practiceDates || [];
                  const months = {};
                  for (const d of dates) { const ym = d.substring(0, 7); months[ym] = (months[ym] || 0) + 1; }
                  const best = Math.max(0, ...Object.values(months));
                  return { current: Math.min(best, 20), target: 20 };
              } },
            { code: 'perfect_month', category: 'style', icon: 'fas fa-check-double', tier: 'themed',
              colors: { bg: '#00695C', fg: '#FFD700' },
              name_ja: 'パーフェクトマンス', name_en: 'Perfect Month',
              desc_ja: '1ヶ月に25日以上練習', desc_en: 'Practice 25+ days in a single month',
              condition: (s) => {
                  const dates = s.practiceDates || [];
                  const months = {};
                  for (const d of dates) { const ym = d.substring(0, 7); months[ym] = (months[ym] || 0) + 1; }
                  return Object.values(months).some(c => c >= 25);
              },
              progress: (s) => {
                  const dates = s.practiceDates || [];
                  const months = {};
                  for (const d of dates) { const ym = d.substring(0, 7); months[ym] = (months[ym] || 0) + 1; }
                  const best = Math.max(0, ...Object.values(months));
                  return { current: Math.min(best, 25), target: 25 };
              } },

            // ── 2026 SEASONAL ──
            { code: 'jan_2026', category: 'seasonal', icon: 'fas fa-snowflake', tier: 'themed',
              colors: { bg: '#F5F5F5', fg: '#0277BD' },
              name_ja: '2026年1月', name_en: 'January 2026',
              desc_ja: '1月に15日以上練習', desc_en: '15+ practice days in January',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 1) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 1), 15), target: 15 }) },
            { code: 'feb_2026', category: 'seasonal', icon: 'fas fa-spa', tier: 'themed',
              colors: { bg: '#AD1457', fg: '#FFB6C1' },
              name_ja: '2026年2月', name_en: 'February 2026',
              desc_ja: '2月に15日以上練習', desc_en: '15+ practice days in February',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 2) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 2), 15), target: 15 }) },
            { code: 'mar_2026', category: 'seasonal', icon: 'fas fa-seedling', tier: 'themed',
              colors: { bg: '#2E7D32', fg: '#81C784' },
              name_ja: '2026年3月', name_en: 'March 2026',
              desc_ja: '3月に15日以上練習', desc_en: '15+ practice days in March',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 3) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 3), 15), target: 15 }) },
            { code: 'apr_2026', category: 'seasonal', icon: 'fas fa-fan', tier: 'themed',
              colors: { bg: '#BBDEFB', fg: '#C2185B' },
              name_ja: '2026年4月', name_en: 'April 2026',
              desc_ja: '4月に15日以上練習', desc_en: '15+ practice days in April',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 4) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 4), 15), target: 15 }) },
            { code: 'may_2026', category: 'seasonal', icon: 'fas fa-leaf', tier: 'themed',
              colors: { bg: '#558B2F', fg: '#1B5E20' },
              name_ja: '2026年5月', name_en: 'May 2026',
              desc_ja: '5月に15日以上練習', desc_en: '15+ practice days in May',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 5) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 5), 15), target: 15 }) },
            { code: 'jun_2026', category: 'seasonal', icon: 'fas fa-cloud-rain', tier: 'themed',
              colors: { bg: '#757575', fg: '#FFFFFF' },
              name_ja: '2026年6月', name_en: 'June 2026',
              desc_ja: '6月に15日以上練習', desc_en: '15+ practice days in June',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 6) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 6), 15), target: 15 }) },
            { code: 'jul_2026', category: 'seasonal', icon: 'fas fa-umbrella-beach', tier: 'themed',
              colors: { bg: '#00838F', fg: '#FFFFFF' },
              name_ja: '2026年7月', name_en: 'July 2026',
              desc_ja: '7月に15日以上練習', desc_en: '15+ practice days in July',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 7) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 7), 15), target: 15 }) },
            { code: 'aug_2026', category: 'seasonal', icon: 'fas fa-temperature-high', tier: 'themed',
              colors: { bg: '#FDD835', fg: '#D84315' },
              name_ja: '2026年8月', name_en: 'August 2026',
              desc_ja: '8月に15日以上練習', desc_en: '15+ practice days in August',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 8) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 8), 15), target: 15 }) },
            { code: 'sep_2026', category: 'seasonal', icon: 'fas fa-wind', tier: 'themed',
              colors: { bg: '#1565C0', fg: '#FFFFFF' },
              name_ja: '2026年9月', name_en: 'September 2026',
              desc_ja: '9月に15日以上練習', desc_en: '15+ practice days in September',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 9) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 9), 15), target: 15 }) },
            { code: 'oct_2026', category: 'seasonal', icon: 'fas fa-mask', tier: 'themed',
              colors: { bg: '#FF9800', fg: '#212121' },
              name_ja: '2026年10月', name_en: 'October 2026',
              desc_ja: '10月に15日以上練習', desc_en: '15+ practice days in October',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 10) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 10), 15), target: 15 }) },
            { code: 'nov_2026', category: 'seasonal', icon: 'fas fa-feather', tier: 'themed',
              colors: { bg: '#4E342E', fg: '#A1887F' },
              name_ja: '2026年11月', name_en: 'November 2026',
              desc_ja: '11月に15日以上練習', desc_en: '15+ practice days in November',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 11) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 11), 15), target: 15 }) },
            { code: 'dec_2026', category: 'seasonal', icon: 'fas fa-gifts', tier: 'themed',
              colors: { bg: '#1B5E20', fg: '#C62828' },
              name_ja: '2026年12月', name_en: 'December 2026',
              desc_ja: '12月に15日以上練習', desc_en: '15+ practice days in December',
              condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 12) >= 15,
              progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 12), 15), target: 15 }) },

            // ── HOLIDAY COLLECTION ──
            { code: 'new_years_day', category: 'holiday', icon: 'fas fa-champagne-glasses', tier: 'themed',
              colors: { bg: '#1A1A1A', fg: '#FFD700' },
              name_ja: '元日', name_en: "New Year's Day",
              desc_ja: '1月1日に練習', desc_en: 'Practice on January 1st',
              condition: (s) => practicedOnDate(s.practiceDates || [], 1, 1),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 1, 1) ? 1 : 0, target: 1 }) },
            { code: 'coming_of_age', category: 'holiday', icon: 'fas fa-graduation-cap', tier: 'themed',
              colors: { bg: '#C62828', fg: '#90CAF9' },
              name_ja: '成人の日', name_en: 'Coming of Age Day',
              desc_ja: '1月12日に練習（2026年）', desc_en: 'Practice on Coming of Age Day (Jan 12, 2026)',
              condition: (s) => practicedOnDate(s.practiceDates || [], 1, 12),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 1, 12) ? 1 : 0, target: 1 }) },
            { code: 'setsubun', category: 'holiday', icon: 'fas fa-hand-fist', tier: 'themed',
              colors: { bg: '#388E3C', fg: '#FFFFFF' },
              name_ja: '節分', name_en: 'Setsubun',
              desc_ja: '2月3日に練習', desc_en: 'Practice on Setsubun (Feb 3)',
              condition: (s) => practicedOnDate(s.practiceDates || [], 2, 3),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 2, 3) ? 1 : 0, target: 1 }) },
            { code: 'valentines_day', category: 'holiday', icon: 'fas fa-heart', tier: 'themed',
              colors: { bg: '#D81B60', fg: '#FFFFFF' },
              name_ja: 'バレンタインデー', name_en: "Valentine's Day",
              desc_ja: '2月14日に練習', desc_en: 'Practice on February 14th',
              condition: (s) => practicedOnDate(s.practiceDates || [], 2, 14),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 2, 14) ? 1 : 0, target: 1 }) },
            { code: 'hinamatsuri', category: 'holiday', icon: 'fas fa-chess-queen', tier: 'themed',
              colors: { bg: '#F8BBD0', fg: '#C62828' },
              name_ja: 'ひな祭り', name_en: 'Hinamatsuri',
              desc_ja: '3月3日に練習', desc_en: 'Practice on Hinamatsuri (Mar 3)',
              condition: (s) => practicedOnDate(s.practiceDates || [], 3, 3),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 3, 3) ? 1 : 0, target: 1 }) },
            { code: 'golden_week', category: 'holiday', icon: 'fas fa-coins', tier: 'themed',
              colors: { bg: '#F9A825', fg: '#FFD700' },
              name_ja: 'ゴールデンウィーク', name_en: 'Golden Week',
              desc_ja: '4/29〜5/5に5日以上練習', desc_en: 'Practice 5+ days during Golden Week (Apr 29-May 5)',
              condition: (s) => {
                  const gw = ['2026-04-29','2026-04-30','2026-05-01','2026-05-02','2026-05-03','2026-05-04','2026-05-05'];
                  return gw.filter(d => (s.practiceDates || []).includes(d)).length >= 5;
              },
              progress: (s) => {
                  const gw = ['2026-04-29','2026-04-30','2026-05-01','2026-05-02','2026-05-03','2026-05-04','2026-05-05'];
                  return { current: Math.min(gw.filter(d => (s.practiceDates || []).includes(d)).length, 5), target: 5 };
              } },
            { code: 'cinco_de_mayo', category: 'holiday', icon: 'fas fa-pepper-hot', tier: 'themed',
              colors: { bg: '#2E7D32', fg: '#C62828' },
              name_ja: 'シンコ・デ・マヨ', name_en: 'Cinco de Mayo',
              desc_ja: '5月5日に練習', desc_en: 'Practice on May 5th',
              condition: (s) => practicedOnDate(s.practiceDates || [], 5, 5),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 5, 5) ? 1 : 0, target: 1 }) },
            { code: 'tanabata', category: 'holiday', icon: 'fas fa-wand-magic-sparkles', tier: 'themed',
              colors: { bg: '#5E35B1', fg: '#FFEB3B' },
              name_ja: '七夕', name_en: 'Tanabata',
              desc_ja: '7月7日に練習', desc_en: 'Practice on Tanabata (Jul 7)',
              condition: (s) => practicedOnDate(s.practiceDates || [], 7, 7),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 7, 7) ? 1 : 0, target: 1 }) },
            { code: 'obon', category: 'holiday', icon: 'fas fa-dove', tier: 'themed',
              colors: { bg: '#BF360C', fg: '#FFE0B2' },
              name_ja: 'お盆', name_en: 'Obon',
              desc_ja: '8月13〜15日に練習', desc_en: 'Practice during Obon (Aug 13-15)',
              condition: (s) => practicedOnDate(s.practiceDates || [], 8, 13) || practicedOnDate(s.practiceDates || [], 8, 14) || practicedOnDate(s.practiceDates || [], 8, 15),
              progress: (s) => ({ current: (practicedOnDate(s.practiceDates||[],8,13)||practicedOnDate(s.practiceDates||[],8,14)||practicedOnDate(s.practiceDates||[],8,15)) ? 1 : 0, target: 1 }) },
            { code: 'sports_day', category: 'holiday', icon: 'fas fa-dumbbell', tier: 'themed',
              colors: { bg: '#1565C0', fg: '#9E9E9E' },
              name_ja: 'スポーツの日', name_en: 'Sports Day',
              desc_ja: '10月12日に練習（2026年）', desc_en: 'Practice on Sports Day (Oct 12, 2026)',
              condition: (s) => practicedOnDate(s.practiceDates || [], 10, 12),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 10, 12) ? 1 : 0, target: 1 }) },
            { code: 'halloween', category: 'holiday', icon: 'fas fa-ghost', tier: 'themed',
              colors: { bg: '#4A148C', fg: '#FF9800' },
              name_ja: 'ハロウィン', name_en: 'Halloween',
              desc_ja: '10月31日に練習', desc_en: 'Practice on October 31st',
              condition: (s) => practicedOnDate(s.practiceDates || [], 10, 31),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 10, 31) ? 1 : 0, target: 1 }) },
            { code: 'culture_day', category: 'holiday', icon: 'fas fa-palette', tier: 'themed',
              colors: { bg: '#303F9F', fg: '#FFFFFF' },
              name_ja: '文化の日', name_en: 'Culture Day',
              desc_ja: '11月3日に練習', desc_en: 'Practice on Culture Day (Nov 3)',
              condition: (s) => practicedOnDate(s.practiceDates || [], 11, 3),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 11, 3) ? 1 : 0, target: 1 }) },
            { code: 'labor_thanksgiving', category: 'holiday', icon: 'fas fa-handshake', tier: 'themed',
              colors: { bg: '#5D4037', fg: '#FFD700' },
              name_ja: '勤労感謝の日', name_en: 'Labor Thanksgiving Day',
              desc_ja: '11月23日に練習', desc_en: 'Practice on November 23rd',
              condition: (s) => practicedOnDate(s.practiceDates || [], 11, 23),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 11, 23) ? 1 : 0, target: 1 }) },
            { code: 'christmas_eve', category: 'holiday', icon: 'fas fa-holly-berry', tier: 'themed',
              colors: { bg: '#1B5E20', fg: '#FFD700' },
              name_ja: 'クリスマスイブ', name_en: 'Christmas Eve',
              desc_ja: '12月24日に練習', desc_en: 'Practice on December 24th',
              condition: (s) => practicedOnDate(s.practiceDates || [], 12, 24),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 12, 24) ? 1 : 0, target: 1 }) },
            { code: 'christmas_day', category: 'holiday', icon: 'fas fa-gift', tier: 'themed',
              colors: { bg: '#B71C1C', fg: '#FFD700' },
              name_ja: 'クリスマス', name_en: 'Christmas Day',
              desc_ja: '12月25日に練習', desc_en: 'Practice on December 25th',
              condition: (s) => practicedOnDate(s.practiceDates || [], 12, 25),
              progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 12, 25) ? 1 : 0, target: 1 }) },
        ];


        // =============================================
        // HELPER FUNCTIONS
        // =============================================

        function getCurrentLang() {
    const stored = localStorage.getItem('prokaiwaLang');
    if (stored) return stored;

    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('ja') ? 'ja' : 'en';
}

        function getTodayString() {
            return new Date().toISOString().split('T')[0];
        }

        function getMonthStart() {
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        }

        const planNames = {
    ja: { 
        'line': 'LINEプラクティスプラン', 
        'video': 'ビデオレッスン（50分）',
        'power_lite': 'パワーパック・ライト', 
        'power_pro': 'パワーパック・プロ' 
    },
    en: { 
        'line': 'LINE Practice Plan', 
        'video': 'Video Lesson (50min)',
        'power_lite': 'Power Pack Lite', 
        'power_pro': 'Power Pack Pro' 
    }
};

        const statusNames = {
            ja: { paid: '有効', pending: '支払い待ち' },
            en: { paid: 'Active', pending: 'Payment Pending' }
        };

        const levelNames = {
            ja: { 'Super Beginner': '超初級', 'Beginner': '初級', 'Intermediate': '中級', 'Advanced': '上級' },
            en: { 'Super Beginner': 'Super Beginner', 'Beginner': 'Beginner', 'Intermediate': 'Intermediate', 'Advanced': 'Advanced' }
        };


        // =============================================
        // i18n DICTIONARY (Static HTML text)
        // Matches data-i18n attributes in dashboard.html
        // =============================================

        const dashboardI18n = {
            ja: {
                // Loading
                loadingText: '読み込み中...',
                // Error
                errorTitle: 'エラーが発生しました',
                errorMessage: 'ページを読み込めませんでした。',
                errorReload: '再読み込み',
                errorLogin: 'ログインページへ',
                // Welcome banner
                statStreakLabel: '日連続',
                statTotalLabel: '練習回数',
                statMonthLabel: '今月',
                // Practice status (defaults before JS overwrites)
                // Quick actions
                actionBook: 'レッスン予約',
                actionResources: '学習教材',
                actionContact: 'お問い合わせ',
                // Cancellation banner
                cancelTitle: 'サブスクリプションがキャンセルされました',
                cancelMessage: 'アクセスは継続されます',
                cancelDaysPrefix: '残り ',
                cancelDaysSuffix: ' 日',
                cancelReactivate: 'サブスクリプションを再開',
                cancelContact: 'サポートに連絡',
                // Card headings
                headingSkills: 'スキル評価',
                headingProgress: '今月の進捗',
                headingStreak: '練習継続記録',
                headingAchievements: '達成バッジ',
                headingLessons: '予定レッスン',
                headingUpgrade: 'ビデオレッスンを追加',
                // Phrase of the Day card
                // Progress card
                progressDefault: '頑張りましょう！',
                progressSub: '今月の目標に向かって',
                progressPrefix: '今月 ',
                progressSuffix: ' 回完了',
                // Streak card
                streakSuffix: '日連続！',
                // Account card labels
                // Booking rules card
                // Resources card
                // Upgrade card
                upgradeDesc: '講師と直接話して、さらに上達しませんか？',
                upgradeCasual: 'カジュアルレッスン ¥3,000',
                upgradeBusiness: 'ビジネスレッスン ¥5,000',
                addonVideo: '+ ビデオ',
            },
            en: {
                // Loading
                loadingText: 'Loading your dashboard...',
                // Error
                errorTitle: 'Something went wrong',
                errorMessage: 'Could not load the page.',
                errorReload: 'Refresh',
                errorLogin: 'Go to Login',
                // Welcome banner
                statStreakLabel: 'Day Streak',
                statTotalLabel: 'Total Sessions',
                statMonthLabel: 'This Month',
                // Practice status (defaults before JS overwrites)
                // Quick actions
                actionBook: 'Book Lesson',
                actionResources: 'Resources',
                actionContact: 'Contact Us',
                // Cancellation banner
                cancelTitle: 'Subscription Cancelled',
                cancelMessage: 'Your access continues',
                cancelDaysPrefix: '',
                cancelDaysSuffix: ' days remaining',
                cancelReactivate: 'Reactivate Subscription',
                cancelContact: 'Contact Support',
                // Card headings
                headingSkills: 'Skills Assessment',
                headingProgress: 'Monthly Progress',
                headingStreak: 'Practice Streak',
                headingAchievements: 'Achievements',
                headingLessons: 'Upcoming Lessons',
                headingUpgrade: 'Add Video Lessons',
                // Phrase of the Day card
                // Progress card
                progressDefault: "Let's go!",
                progressSub: 'Working toward your goal',
                progressPrefix: '',
                progressSuffix: ' sessions this month',
                // Streak card
                streakSuffix: 'day streak!',
                // Account card labels
                // Booking rules card
                // Resources card
                // Upgrade card
                upgradeDesc: 'Want to practice speaking with a teacher directly?',
                upgradeCasual: 'Casual Lesson ¥3,000',
                upgradeBusiness: 'Business Lesson ¥5,000',
                addonVideo: '+ Video',
            }
        };

        function applyDashboardLanguage(lang) {
            const strings = dashboardI18n[lang];
            if (!strings) return;

            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (strings[key] !== undefined) {
                    el.textContent = strings[key];
                }
            });
        }

        // =============================================
        // DASHBOARD STATE (stored for language refresh)
        // =============================================

        const dashboardState = {
            loaded: false,
            animationsReady: true,
            profile: null,
            stats: null,
            assessment: null,
            practiceDates: [],
            progressPercent: 0,
            hasVideoAccess: false,
            hasVideoAddon: false,
            userId: null
        };

        // =============================================
        // DYNAMIC TEXT REFRESH (called on language toggle)
        // =============================================

        function refreshDynamicText(lang) {
            if (!dashboardState.loaded) return;
            const { profile, stats, assessment, practiceDates, practiceTimestamps, progressPercent, hasVideoAccess, hasVideoAddon } = dashboardState;

            // Welcome text (contextual greeting)
            const heroName = profile.given_name_romaji || profile.name;
            const greetingData = getContextualGreeting(heroName, lang);
            document.getElementById('welcome-name').textContent = greetingData.greeting;
            document.getElementById('welcome-subtitle').textContent = greetingData.subtitle;


            // Plan badge
            const planBadge = document.getElementById('plan-badge');
            planBadge.textContent = planNames[lang][profile.plan] || profile.plan;

            // Addon badge
            if (hasVideoAddon) {
                document.getElementById('addon-badge').style.display = 'inline-block';
            }

            // Subscription state (for cancellation banner)
            const isCancelled = profile.subscription_status === 'cancelled';
            const dashboardExpiresAt = profile.dashboard_access_expires_at ? new Date(profile.dashboard_access_expires_at) : null;
            const now = new Date();
            const isExpired = dashboardExpiresAt && dashboardExpiresAt < now;

            // Cancellation banner text
            if (isCancelled && !isExpired && dashboardExpiresAt) {
                const banner = document.getElementById('cancellation-banner');
                const titleEl = document.getElementById('cancellation-title');
                const messageEl = document.getElementById('cancellation-message');
                const daysEl = document.getElementById('days-remaining');
                const timerEl = document.getElementById('countdown-timer');
                if (banner) {
                    const daysRemaining = Math.ceil((dashboardExpiresAt - now) / (1000 * 60 * 60 * 24));
                    titleEl.textContent = lang === 'ja' ? 'サブスクリプションがキャンセルされました' : 'Subscription Cancelled';
                    messageEl.textContent = lang === 'ja'
                        ? `${dashboardExpiresAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}までアクセス可能です`
                        : `Your access continues until ${dashboardExpiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
                    daysEl.textContent = daysRemaining;
                    timerEl.style.display = daysRemaining <= 0 ? 'none' : 'inline-flex';
                }
            } else if (isExpired) {
                const titleEl = document.getElementById('cancellation-title');
                const messageEl = document.getElementById('cancellation-message');
                if (titleEl) {
                    titleEl.textContent = lang === 'ja' ? 'アクセス期限が切れました' : 'Access Expired';
                    messageEl.textContent = lang === 'ja'
                        ? '再度サブスクリプションを開始するには、下のボタンをクリックしてください'
                        : 'Reactivate your subscription to continue learning';
                }
            }

            // Progress ring (skip during initial load — scroll observer handles it)
            if (dashboardState.animationsReady) {
                updateProgressRing(lang, progressPercent);
            }


            // Streak calendar
            renderStreakCard(stats, practiceDates, lang);

            // Achievements
            renderAchievements('achievements', stats, lang);

            // Skills chart
            renderSkillsChart('skills-assessment', assessment, lang);

            // Practice status
            checkTodaysPractice(dashboardState.userId, lang);

            // Hero phrase
            renderHeroPhrase(lang);

            // Upcoming lessons
            renderUpcomingLessonsCard(bookingState.userBookings || [], lang);
        }



        function showError(lang, message) {
            document.getElementById('dashboard-loading').style.display = 'none';
            document.getElementById('dashboard-content').style.display = 'none';
            document.getElementById('dashboard-error').style.display = 'block';
            document.getElementById('error-message').textContent = message;
        }

        // =============================================
        // LEARNING ARCHETYPE DETERMINATION
        // =============================================

        function getLearningArchetype(skillsData) {
            debugLog('🎯 Determining learning archetype for:', skillsData);
            for (const archetype of learningArchetypes) {
                if (archetype.condition(skillsData)) {
                    debugLog('✅ Matched archetype:', archetype.code);
                    return archetype;
                }
            }
            debugLog('⚠️ No match, using fallback: balanced_learner');
            return learningArchetypes[learningArchetypes.length - 1];
        }

        // =============================================
        // PENTAGON RADAR CHART
        // =============================================

        function renderSkillsChart(containerId, assessment, lang) {
            const container = document.getElementById(containerId);

            if (!assessment) {
                container.innerHTML = `
                    <div class="no-assessment-message">
                        <i class="fas fa-clipboard-list"></i>
                        <p><strong>${lang === 'ja' ? 'まだ評価がありません' : 'No assessment yet'}</strong></p>
                        <p>${lang === 'ja' 
                            ? '講師があなたのスキルを評価すると、ここに結果が表示されます。楽しみにしていてくださいね！' 
                            : 'Your teacher will evaluate your skills soon and your results will appear here. Stay tuned!'}</p>
                    </div>
                `;
                return;
            }

            const allPerfect = assessment.fluency === 10 && 
                                assessment.grammar === 10 && 
                                assessment.comprehension === 10 && 
                                assessment.vocabulary === 10 && 
                                assessment.pronunciation === 10;

            const skillsData = {
                fluency: assessment.fluency || 0,
                grammar: assessment.grammar || 0,
                comprehension: assessment.comprehension || 0,
                vocabulary: assessment.vocabulary || 0,
                pronunciation: assessment.pronunciation || 0
            };

            debugLog('Rendering skills chart:', skillsData, 'All perfect:', allPerfect);

            const skillColors = {
                fluency: '#4A90E2',
                grammar: '#9B59B6',
                comprehension: '#E67E22',
                vocabulary: '#27AE60',
                pronunciation: '#E74C3C'
            };

            const skillLabels = lang === 'ja'
                ? ['流暢さ', '文法', '理解力', '語彙', '発音']
                : ['Fluency', 'Grammar', 'Comprehension', 'Vocabulary', 'Pronunciation'];

            const skillValues = [
                skillsData.fluency,
                skillsData.grammar,
                skillsData.comprehension,
                skillsData.vocabulary,
                skillsData.pronunciation
            ];

            const pointColors = [
                skillColors.fluency,
                skillColors.grammar,
                skillColors.comprehension,
                skillColors.vocabulary,
                skillColors.pronunciation
            ];

            const borderColor = allPerfect ? '#008080' : 'rgba(74, 144, 226, 0.6)';
            const backgroundColor = allPerfect ? 'rgba(0, 128, 128, 0.3)' : 'rgba(74, 144, 226, 0.1)';

            const archetype = getLearningArchetype(skillsData);

            container.innerHTML = `
                <div class="skills-chart-container">
                    <canvas id="${containerId}-canvas"></canvas>
                </div>
                <div class="assessment-info">
                    <span class="assessment-date">
                        ${lang === 'ja' ? '評価日：' : 'Assessed: '}
                        ${new Date(assessment.assessed_at).toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US')}
                    </span>
                    <span class="assessment-band">${assessment.band_level || '-'}</span>
                </div>
                <div class="learning-archetype">
                    <div class="archetype-icon"><i class="${archetype.icon}"></i></div>
                    <div class="archetype-content">
                        <div class="archetype-name">${lang === 'ja' ? archetype.name_ja : archetype.name_en}</div>
                        <div class="archetype-description">${lang === 'ja' ? archetype.description_ja : archetype.description_en}</div>
                    </div>
                </div>
            `;

            const ctx = document.getElementById(`${containerId}-canvas`).getContext('2d');

            // Use zeros on initial load so chart animates when card becomes visible
            const chartData = dashboardState.animationsReady ? skillValues : [0, 0, 0, 0, 0];
            dashboardState.skillsChartRealData = skillValues;

            dashboardState.skillsChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: skillLabels,
                    datasets: [{
                        label: lang === 'ja' ? 'スキルレベル' : 'Skill Level',
                        data: chartData,
                        borderColor: borderColor,
                        backgroundColor: backgroundColor,
                        borderWidth: allPerfect ? 3 : 2,
                        pointBackgroundColor: pointColors,
                        pointBorderColor: pointColors,
                        pointBorderWidth: 2,
                        pointRadius: 8,
                        pointHoverRadius: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: 10
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 10,
                            min: 0,
                            ticks: {
                                stepSize: 2,
                                display: true,
                                backdropColor: 'transparent',
                                callback: function(value) {
                                    if (value === 0) return '0';
                                    if (value === 2) return '2';
                                    if (value === 5) return '5';
                                    if (value === 8) return '8';
                                    if (value === 10) return '10';
                                    return '';
                                },
                                font: { size: 12, weight: 'bold' },
                                color: '#666'
                            },
                            pointLabels: {
                                display: false
                            },
                            grid: {
    color: window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'rgba(255, 255, 255, 0.15)'  // Light grey in dark mode
        : 'rgba(0, 0, 0, 0.1)',         // Dark grey in light mode
    lineWidth: 1
}
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 },
                            callbacks: {
                                title: function(context) {
                                    return context[0].label;
                                },
                                label: function(context) {
                                    const score = context.parsed.r;
                                    let level = '';
                                    if (score === 0) level = lang === 'ja' ? '未評価' : 'Not Rated';
                                    else if (score <= 2) level = lang === 'ja' ? '超初級' : 'Super Beginner';
                                    else if (score <= 4) level = lang === 'ja' ? '初級' : 'Beginner';
                                    else if (score <= 6) level = lang === 'ja' ? '中級' : 'Intermediate';
                                    else if (score <= 8) level = lang === 'ja' ? '上級' : 'Advanced';
                                    else if (score < 10) level = lang === 'ja' ? '上級+' : 'Advanced+';
                                    else level = lang === 'ja' ? '完璧！' : 'Perfect!';

                                    return `${score}/10 (${level})`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // =============================================
        // AUTO-DETECT TODAY'S PRACTICE
        // =============================================

        async function checkTodaysPractice(userId, lang) {
            const statusCard = document.getElementById('practice-status');
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            debugLog(`[${lang}] Checking today's practice for user:`, userId);
            debugLog(`[${lang}] Today start:`, todayStart.toISOString());

            try {
                const { data: todayResponse, error } = await supabase
                    .from('message_log')
                    .select('id, created_at')
                    .eq('user_id', userId)
                    .eq('message_type', 'student_response')
                    .gte('created_at', todayStart.toISOString())
                    .limit(1)
                    .maybeSingle();

                debugLog(`[${lang}] Today's response query result:`, { data: todayResponse, error });

                if (error && error.code !== 'PGRST116') {
                    console.error('Error checking today\'s practice:', error);
                    return false;
                }

                const practicedToday = !!todayResponse;
                debugLog(`[${lang}] Practiced today:`, practicedToday);

                if (practicedToday) {
                    statusCard.classList.add('completed');
                    statusCard.innerHTML = `
                        <span class="hero-practice-icon"><i class="fas fa-check-circle"></i></span>
                        <span>${lang === 'ja' ? '今日の練習完了！素晴らしい！' : "Today's practice complete! Great job!"}</span>
                    `;
                } else {
                    statusCard.classList.remove('completed');
                    statusCard.innerHTML = `
                        <a href="https://line.me/R/ti/p/@845irjbc" target="_blank" rel="noopener noreferrer" class="hero-line-cta">
                            <i class="fab fa-line"></i>
                            <span>${lang === 'ja' ? 'LINEで今日のプロンプトに答えましょう！' : "Head to LINE for today's prompt!"}</span>
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    `;
                }

                return practicedToday;

            } catch (err) {
                console.error('Error checking practice:', err);
                return false;
            }
        }

        // =============================================
        // REAL PROGRESS FROM DATABASE
        // =============================================

        async function loadRealProgress(userId, lang) {
            debugLog('=== loadRealProgress START ===');
            debugLog('User ID:', userId);

            try {
                debugLog('Fetching student_progress...');
                const { data: progress, error } = await supabase
                    .from('student_progress')
                    .select('current_day, current_week, total_prompts_sent')

                    .single();

                debugLog('student_progress result:', { data: progress, error });

                if (error) {
                    console.error('❌ Error loading progress:', error);
                    return null;
                }

                debugLog('Fetching message_log...');
                const { data: messages, error: msgError } = await supabase
                    .from('message_log')
                    .select('created_at')
                    .eq('user_id', userId)
                    .eq('message_type', 'student_response')
                    .order('created_at', { ascending: false });

                debugLog('message_log result:', { 
                    count: messages?.length || 0, 
                    error: msgError,
                    sample: messages?.slice(0, 3)
                });

                if (msgError) {
                    console.error('❌ Error loading messages:', msgError);
                }

                const practiceDates = messages 
                    ? [...new Set(messages.map(m => m.created_at.split('T')[0]))]
                    : [];

                debugLog('Practice dates extracted:', practiceDates.length, 'unique dates');
                debugLog('Sample dates:', practiceDates.slice(0, 5));

                const monthStart = getMonthStart();
                debugLog('Month start:', monthStart);

                const thisMonthDates = practiceDates.filter(d => d >= monthStart);
                const thisMonthCount = thisMonthDates.length;

                debugLog('This month count:', thisMonthCount, 'days');

                const streakData = calculateStreak(practiceDates);
                debugLog('Streak calculated:', streakData);

                const result = {
                    current_day: progress.current_day,
                    current_week: progress.current_week,
                    total_prompts_sent: progress.total_prompts_sent,
                    thisMonthCount: thisMonthCount,
                    currentStreak: streakData.current,
                    maxStreak: streakData.max,
                    practiceDates: practiceDates,
                    practiceTimestamps: messages ? messages.map(m => m.created_at) : []
                };

                debugLog('✅ Final result:', result);
                debugLog('=== loadRealProgress END ===');

                return result;

            } catch (err) {
                console.error('❌ ERROR in loadRealProgress:', err);
                return null;
            }
        }

        // =============================================
        // LOAD LATEST ASSESSMENT
        // =============================================

        async function loadLatestAssessment(userId) {
            debugLog('=== loadLatestAssessment START ===');
            debugLog('User ID:', userId);

            try {
                const { data: assessment, error } = await supabase
                    .from('student_assessments')
                    .select('*')
                    .eq('user_id', userId)
                    .order('assessed_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                debugLog('student_assessments result:', { data: assessment, error });

                if (error && error.code !== 'PGRST116') {
                    console.error('❌ Error loading assessment:', error);
                    return null;
                }

                if (assessment) {
                    debugLog('✅ Assessment found:', {
                        assessed_at: assessment.assessed_at,
                        band_level: assessment.band_level,
                        total_score: assessment.total_score
                    });
                } else {
                    debugLog('ℹ️ No assessment found yet');
                }

                debugLog('=== loadLatestAssessment END ===');
                return assessment;

            } catch (err) {
                console.error('❌ ERROR in loadLatestAssessment:', err);
                return null;
            }
        }

        // =============================================
        // STREAK CALCULATION
        // =============================================

        function calculateStreak(practiceDates) {
            if (!practiceDates || practiceDates.length === 0) return { current: 0, max: 0 };

            const sortedDates = [...practiceDates].sort((a, b) => new Date(b) - new Date(a));
            const today = getTodayString();
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            let currentStreak = 0;
            let maxStreak = 0;
            let tempStreak = 0;
            let lastDate = null;

            const streakActive = sortedDates.includes(today) || sortedDates.includes(yesterday);

            if (streakActive) {
                for (const dateStr of sortedDates) {
                    const date = new Date(dateStr);
                    if (lastDate === null) {
                        currentStreak = 1;
                        lastDate = date;
                    } else {
                        const diffDays = (lastDate - date) / (1000 * 60 * 60 * 24);
                        if (diffDays === 1) {
                            currentStreak++;
                            lastDate = date;
                        } else {
                            break;
                        }
                    }
                }
            }

            lastDate = null;
            for (const dateStr of sortedDates) {
                const date = new Date(dateStr);
                if (lastDate === null) {
                    tempStreak = 1;
                    lastDate = date;
                } else {
                    const diffDays = (lastDate - date) / (1000 * 60 * 60 * 24);
                    if (diffDays === 1) {
                        tempStreak++;
                        lastDate = date;
                    } else {
                        maxStreak = Math.max(maxStreak, tempStreak);
                        tempStreak = 1;
                        lastDate = date;
                    }
                }
            }
            maxStreak = Math.max(maxStreak, tempStreak);

            return { current: currentStreak, max: maxStreak };
        }

        // =============================================
        // UI RENDERING
        // =============================================

        function daysSinceLastPractice(practiceDates) {
            if (!practiceDates || practiceDates.length === 0) return 999;
            const sorted = [...practiceDates].sort((a, b) => b.localeCompare(a));
            const last = new Date(sorted[0]);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            last.setHours(0, 0, 0, 0);
            return Math.floor((now - last) / (1000 * 60 * 60 * 24));
        }

        function buildStreakMap(practiceDates) {
            if (!practiceDates || practiceDates.length === 0) return {};
            const sorted = [...practiceDates].sort();
            const map = {};
            let streakStart = 0;

            for (let i = 0; i <= sorted.length; i++) {
                const isEnd = i === sorted.length;
                let endStreak = isEnd;

                if (!isEnd && i > 0) {
                    const cur = new Date(sorted[i]);
                    const prev = new Date(sorted[i - 1]);
                    const gap = (cur - prev) / (1000 * 60 * 60 * 24);
                    if (gap > 1) {
                        // End previous streak first
                        const len = i - streakStart;
                        for (let j = streakStart; j < i; j++) map[sorted[j]] = len;
                        streakStart = i;
                    }
                }

                if (isEnd) {
                    const len = i - streakStart;
                    for (let j = streakStart; j < i; j++) map[sorted[j]] = len;
                }
            }
            return map;
        }

        function getStreakHeatClass(dateStr, streakMap) {
            const len = streakMap[dateStr] || 1;
            if (len >= 7) return 'fire';
            if (len >= 3) return 'hot';
            return 'active';
        }

        function renderStreakCard(stats, practiceDates, lang) {
            const container = document.getElementById('streak-card-content');
            const card = document.getElementById('streak-card');
            if (!container || !card) return;

            const current = stats.current;
            const best = stats.maxStreak;
            const inactive = daysSinceLastPractice(practiceDates);
            const streakMap = buildStreakMap(practiceDates);

            // Fire/ice card state
            card.classList.remove('streak-state-warm', 'streak-state-fire', 'streak-state-blaze', 'streak-state-frozen');
            if (inactive >= 5) {
                card.classList.add('streak-state-frozen');
            } else if (current >= 14) {
                card.classList.add('streak-state-blaze');
            } else if (current >= 7) {
                card.classList.add('streak-state-fire');
            } else if (current >= 3) {
                card.classList.add('streak-state-warm');
            }

            // Streak icon
            let iconClass = 'fas fa-fist-raised';
            let iconColor = 'var(--color-primary)';
            if (inactive >= 5) { iconClass = 'fas fa-snowflake'; iconColor = '#64B5F6'; }
            else if (current >= 7) { iconClass = 'fas fa-fire'; iconColor = '#E74C3C'; }
            else if (current >= 3) { iconClass = 'fas fa-fire'; iconColor = '#E67E22'; }

            const streakLabel = lang === 'ja' ? '日連続' : 'day streak';
            const bestLabel = lang === 'ja' ? '最高' : 'Best';

            // Lottie fire (only when on active streak AND file is uploaded)
            const lottieHTML = LOTTIE_FIRE_ENABLED && current >= 1 && inactive < 5
                ? '<div class="streak-lottie-wrap"><dotlottie-player src="assets/lottie/fire.lottie" background="transparent" speed="1" loop autoplay></dotlottie-player></div>'
                : '';

            // Build last 7 days
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const dayLabelsJa = ['日', '月', '火', '水', '木', '金', '土'];
            const dayLabelsEn = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

            let weekHTML = '';
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayNum = d.getDate();
                const dayOfWeek = d.getDay();
                const label = lang === 'ja' ? dayLabelsJa[dayOfWeek] : dayLabelsEn[dayOfWeek];

                let dotClass = 'streak-week-dot';
                if (dateStr === today) dotClass += ' today';
                if (dateStr > today) dotClass += ' future';
                if (practiceDates.includes(dateStr)) {
                    dotClass += ' ' + getStreakHeatClass(dateStr, streakMap);
                }

                weekHTML += `<div class="streak-week-day">
                    <span class="streak-week-label">${label}</span>
                    <span class="${dotClass}">${dayNum}</span>
                </div>`;
            }

            container.innerHTML = `
                <div class="streak-stats">
                    ${lottieHTML}
                    <div class="streak-current">
                        <span class="streak-current-icon"><i class="${iconClass}" style="color: ${iconColor};"></i></span>
                        <div>
                            <span class="streak-current-number" id="streak-count">${current}</span>
                            <span class="streak-current-label">${streakLabel}</span>
                        </div>
                    </div>
                    <div class="streak-best">
                        <span class="streak-best-number">${best}</span>
                        <span class="streak-best-label">${bestLabel}</span>
                    </div>
                </div>
                <div class="streak-week">${weekHTML}</div>
            `;
        }

        // ── STREAK MODAL ──
        window.openStreakModal = function(lang) {
            document.getElementById('streak-modal-title').textContent =
                lang === 'ja' ? '練習カレンダー' : 'Practice Calendar';

            // Always start at current month
            const now = new Date();
            streakModalMonth = { year: now.getFullYear(), month: now.getMonth() };
            renderStreakModalCalendar(lang);

            document.getElementById('streak-modal-overlay').classList.add('show');
            document.getElementById('streak-modal').classList.add('show');
            document.body.style.overflow = 'hidden';

            const body = document.querySelector('.streak-modal-body');
            if (body) body.scrollTop = 0;
        };

        window.closeStreakModal = function() {
            document.getElementById('streak-modal-overlay').classList.remove('show');
            document.getElementById('streak-modal').classList.remove('show');
            document.body.style.overflow = '';
        };

        var streakModalMonth = null; // { year, month } for current modal view

        function getEarliestPracticeMonth(practiceDates) {
            if (!practiceDates || practiceDates.length === 0) return null;
            const earliest = [...practiceDates].sort()[0];
            const d = new Date(earliest);
            return { year: d.getFullYear(), month: d.getMonth() };
        }

        function renderStreakModalCalendar(lang) {
            const content = document.getElementById('streak-modal-content');
            if (!content) return;

            const stats = dashboardState.stats;
            const practiceDates = dashboardState.practiceDates || [];
            const streakMap = buildStreakMap(practiceDates);
            const current = stats ? stats.current : 0;
            const best = stats ? stats.maxStreak : 0;
            const total = stats ? stats.total : 0;

            const now = new Date();
            if (!streakModalMonth) {
                streakModalMonth = { year: now.getFullYear(), month: now.getMonth() };
            }

            const currentLabel = lang === 'ja' ? '現在の連続' : 'Current';
            const bestLabel = lang === 'ja' ? '最高記録' : 'Best';
            const totalLabel = lang === 'ja' ? '合計日数' : 'Total Days';

            // Summary bar
            const summaryHTML = `
                <div class="modal-streak-summary">
                    <div class="modal-streak-stat">
                        <span class="modal-streak-stat-value">${current}</span>
                        <span class="modal-streak-stat-label">${currentLabel}</span>
                    </div>
                    <div class="modal-streak-stat">
                        <span class="modal-streak-stat-value">${best}</span>
                        <span class="modal-streak-stat-label">${bestLabel}</span>
                    </div>
                    <div class="modal-streak-stat">
                        <span class="modal-streak-stat-value">${total}</span>
                        <span class="modal-streak-stat-label">${totalLabel}</span>
                    </div>
                </div>`;

            content.innerHTML = summaryHTML + '<div id="streak-modal-calendar-area"></div>';
            renderStreakModalMonth(lang, streakMap);
        }

        function renderStreakModalMonth(lang, streakMap) {
            const area = document.getElementById('streak-modal-calendar-area');
            if (!area) return;

            const practiceDates = dashboardState.practiceDates || [];
            if (!streakMap) streakMap = buildStreakMap(practiceDates);
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const { year, month } = streakModalMonth;

            const earliest = getEarliestPracticeMonth(practiceDates);
            const isAtEarliest = earliest && year === earliest.year && month === earliest.month;
            const isAtCurrent = year === now.getFullYear() && month === now.getMonth();

            const monthDate = new Date(year, month, 1);
            const monthName = monthDate.toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US',
                { year: 'numeric', month: 'long' });

            const dayHeaders = lang === 'ja'
                ? ['日', '月', '火', '水', '木', '金', '土']
                : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

            const lastDay = new Date(year, month + 1, 0).getDate();
            const firstDayOfWeek = monthDate.getDay();

            let gridHTML = dayHeaders.map(d => `<div class="modal-day-header">${d}</div>`).join('');
            for (let i = 0; i < firstDayOfWeek; i++) {
                gridHTML += '<div class="modal-day empty"></div>';
            }
            for (let d = 1; d <= lastDay; d++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                let cls = 'modal-day';
                if (dateStr === today) cls += ' is-today';
                if (dateStr > today) cls += ' future';
                if (practiceDates.includes(dateStr)) {
                    cls += ' practiced ' + getStreakHeatClass(dateStr, streakMap);
                }
                gridHTML += `<div class="${cls}">${d}</div>`;
            }

            area.innerHTML = `
                <div class="modal-month-nav">
                    <button class="modal-nav-btn" id="streak-nav-prev" ${isAtEarliest || !earliest ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="modal-month-nav-title">${monthName}</span>
                    <button class="modal-nav-btn" id="streak-nav-next" ${isAtCurrent ? 'disabled' : ''}>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="modal-calendar-grid">${gridHTML}</div>
            `;

            // Attach nav listeners
            const prevBtn = document.getElementById('streak-nav-prev');
            const nextBtn = document.getElementById('streak-nav-next');
            if (prevBtn) prevBtn.addEventListener('click', () => {
                streakModalMonth.month--;
                if (streakModalMonth.month < 0) { streakModalMonth.month = 11; streakModalMonth.year--; }
                renderStreakModalMonth(lang, streakMap);
            });
            if (nextBtn) nextBtn.addEventListener('click', () => {
                streakModalMonth.month++;
                if (streakModalMonth.month > 11) { streakModalMonth.month = 0; streakModalMonth.year++; }
                renderStreakModalMonth(lang, streakMap);
            });

            // Touch swipe support for mobile
            let touchStartX = 0;
            let touchStartY = 0;
            area.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            area.addEventListener('touchend', (e) => {
                const deltaX = e.changedTouches[0].clientX - touchStartX;
                const deltaY = e.changedTouches[0].clientY - touchStartY;

                // Only trigger if horizontal swipe > 50px and more horizontal than vertical
                if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

                const pDates = dashboardState.practiceDates || [];
                const earliest = getEarliestPracticeMonth(pDates);
                const isEarliest = earliest && streakModalMonth.year === earliest.year && streakModalMonth.month === earliest.month;
                const now = new Date();
                const isCurrent = streakModalMonth.year === now.getFullYear() && streakModalMonth.month === now.getMonth();

                if (deltaX < 0 && !isCurrent) {
                    // Swipe left → next month
                    streakModalMonth.month++;
                    if (streakModalMonth.month > 11) { streakModalMonth.month = 0; streakModalMonth.year++; }
                    renderStreakModalMonth(lang, streakMap);
                } else if (deltaX > 0 && !isEarliest && earliest) {
                    // Swipe right → previous month
                    streakModalMonth.month--;
                    if (streakModalMonth.month < 0) { streakModalMonth.month = 11; streakModalMonth.year--; }
                    renderStreakModalMonth(lang, streakMap);
                }
            }, { passive: true });
        }

        function getAchievementProgress(achievement, stats) {
            if (achievement.condition(stats)) return { earned: true, progress: 1, current: 0, target: 0 };
            const prog = achievement.progress(stats);
            return { earned: false, progress: prog.target > 0 ? prog.current / prog.target : 0, current: prog.current, target: prog.target };
        }

        function renderAchievements(containerId, stats, lang) {
            const container = document.getElementById(containerId);
            if (!container) return;

            let earnedCount = 0;
            let nextBadge = null;
            let nextProgress = null;

            for (const achievement of achievements) {
                const prog = getAchievementProgress(achievement, stats);
                if (prog.earned) {
                    earnedCount++;
                } else if (!nextBadge) {
                    nextBadge = achievement;
                    nextProgress = prog;
                }
            }

            const totalBadges = achievements.length;
            const earnedLabel = lang === 'ja' ? '獲得済み' : 'earned';

            let nextHTML = '';
            if (nextBadge) {
                const badgeName = lang === 'ja' ? nextBadge.name_ja : nextBadge.name_en;
                const progressPct = Math.round(nextProgress.progress * 100);
                const nextLabel = lang === 'ja' ? '次のバッジ' : 'Next';
                nextHTML = `
                    <div class="teaser-next">
                        <div class="teaser-next-header">
                            <span class="teaser-next-label">${nextLabel}:</span>
                            <span class="teaser-next-name">
                                <i class="fas ${nextBadge.icon}"></i> ${badgeName}
                            </span>
                            <span class="teaser-next-count">${nextProgress.current}/${nextProgress.target}</span>
                        </div>
                        <div class="teaser-progress-bar">
                            <div class="teaser-progress-fill" style="width: ${progressPct}%"></div>
                        </div>
                    </div>
                `;
            } else {
                const allDone = lang === 'ja' ? '全バッジ獲得済み！🎉' : 'All badges earned! 🎉';
                nextHTML = `<div class="teaser-all-done">${allDone}</div>`;
            }

            const viewAllText = lang === 'ja' ? 'すべてのバッジを見る' : 'View All Badges';

            container.innerHTML = `
                <div class="achievement-teaser">
                    <div class="teaser-earned">
                        <div class="teaser-earned-icon"><i class="fas fa-trophy"></i></div>
                        <div class="teaser-earned-count">${earnedCount}<span class="teaser-earned-total">/${totalBadges}</span></div>
                        <div class="teaser-earned-label">${earnedLabel}</div>
                    </div>
                    ${nextHTML}
                    <a href="achievements/" class="teaser-view-all">
                        ${viewAllText} <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            `;
        }

        function updateProgressRing(lang, percentage) {
            const ring = document.getElementById('progress-ring');
            const text = document.getElementById('progress-percent');
            const message = document.getElementById('progress-message');

            const circumference = 201;
            const offset = circumference - (percentage / 100) * circumference;

            ring.style.strokeDashoffset = offset;
            text.textContent = `${Math.round(percentage)}%`;

            if (lang === 'ja') {
                if (percentage >= 100) message.textContent = '目標達成！🎉';
                else if (percentage >= 75) message.textContent = 'あと少し！';
                else if (percentage >= 50) message.textContent = '順調です！';
                else if (percentage >= 25) message.textContent = 'いい調子！';
                else message.textContent = '頑張りましょう！';
            } else {
                if (percentage >= 100) message.textContent = 'Goal reached! 🎉';
                else if (percentage >= 75) message.textContent = 'Almost there!';
                else if (percentage >= 50) message.textContent = 'Great progress!';
                else if (percentage >= 25) message.textContent = 'Good start!';
                else message.textContent = "Let's go!";
            }
        }

        function getDailyPhrase() {
            const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
            return dailyPhrases[dayOfYear % dailyPhrases.length];
        }

        // =============================================
        // CONTEXTUAL GREETING SYSTEM
        // =============================================

        const heroGreetings = {
            morning: {
                ja: [
                    'おはようございます、{name}さん！',
                    '{name}さん、おはよう！',
                    '{name}さん、おはようございます！',
                ],
                en: [
                    'Good morning, {name}!',
                    'Morning, {name}!',
                    'Rise and shine, {name}!',
                ]
            },
            afternoon: {
                ja: [
                    'こんにちは、{name}さん！',
                    '{name}さん、こんにちは！',
                    'お疲れさまです、{name}さん！',
                ],
                en: [
                    'Good afternoon, {name}!',
                    'Hey there, {name}!',
                    'Hi, {name}!',
                ]
            },
            evening: {
                ja: [
                    'こんばんは、{name}さん！',
                    '{name}さん、こんばんは！',
                    'お疲れさまです、{name}さん！',
                ],
                en: [
                    'Good evening, {name}!',
                    'Evening, {name}!',
                    'Welcome back, {name}!',
                ]
            }
        };

        const warmPhrases = {
            ja: [
                '今日も英語学習、頑張りましょう！',
                '一緒に練習しましょう！',
                '今日も英語を楽しみましょう！',
                'この調子で頑張りましょう！',
                '今日はどんな練習をしましょうか？',
                '毎日の積み重ねが大切です！',
            ],
            en: [
                "Let's keep the momentum going!",
                'Ready to practice?',
                'Nice to see you again!',
                "Let's make today count!",
                'Every day counts — keep it up!',
                "Let's continue your journey!",
            ]
        };

        function getContextualGreeting(name, lang) {
            const now = new Date();
            const hour = now.getHours();
            let timeKey;
            if (hour >= 5 && hour < 12) timeKey = 'morning';
            else if (hour >= 12 && hour < 18) timeKey = 'afternoon';
            else timeKey = 'evening';

            // Day-based seed so greeting stays stable for the whole day
            const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

            const greetingList = heroGreetings[timeKey][lang];
            const greeting = greetingList[dayOfYear % greetingList.length];

            const phraseList = warmPhrases[lang];
            const warmPhrase = phraseList[dayOfYear % phraseList.length];

            return {
                greeting: greeting.replace('{name}', name),
                subtitle: warmPhrase
            };
        }

        function renderHeroPhrase(lang) {
            const phrase = getDailyPhrase();
            const container = document.getElementById('hero-phrase');
            if (!container) return;
            const label = lang === 'ja' ? '今日のフレーズ' : "Today's phrase";
            const example = lang === 'ja'
                ? `${phrase.example_en}（${phrase.example_ja}）`
                : phrase.example_en;
            container.innerHTML = `
                <div class="hero-phrase-top">
                    <i class="fas fa-lightbulb hero-phrase-icon"></i>
                    <span class="hero-phrase-label">${label}:</span>
                    <strong>${phrase.phrase}</strong>
                </div>
                <div class="hero-phrase-example">${example}</div>
            `;
        }





        // =============================================
        // COUNT-UP ANIMATION
        // =============================================

        function animateCountUp(elementId, target, durationMs) {
            const el = document.getElementById(elementId);
            if (!el || target <= 0) { if (el) el.textContent = target; return; }

            const startTime = performance.now();
            const startVal = 0;

            function tick(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / durationMs, 1);
                // Expo-out easing: fast start, gentle finish
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(startVal + (target - startVal) * eased);
                el.textContent = current;

                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    el.textContent = target;
                }
            }

            requestAnimationFrame(tick);
        }

        // =============================================
        // CARD ENTRANCE ANIMATIONS
        // =============================================

        function initCardAnimations(contentDiv) {
            const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReduced) return;

            // Select visible animatable sections
            const animatables = [...contentDiv.querySelectorAll(
                '.dashboard-hero, .quick-actions, .dashboard-card, .cancellation-banner'
            )].filter(el => el.style.display !== 'none');

            // Apply initial hidden state
            animatables.forEach(el => el.classList.add('card-animate'));

            // Double rAF ensures browser paints opacity:0 before triggering transitions
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const observer = new IntersectionObserver((entries) => {
                        // Stagger each batch of newly-visible elements
                        const visible = entries.filter(e => e.isIntersecting);
                        visible.forEach((entry, i) => {
                            setTimeout(() => {
                                entry.target.classList.add('card-revealed');
                            }, i * 250);
                            observer.unobserve(entry.target);
                        });
                    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

                    animatables.forEach(el => observer.observe(el));
                });
            });
        }


        // =============================================
        // MAIN DASHBOARD LOADER
        // =============================================

        async function loadDashboard() {
            const lang = getCurrentLang();
            const loadingDiv = document.getElementById('dashboard-loading');
            const contentDiv = document.getElementById('dashboard-content');

            debugLog('Loading dashboard with Phase 1 features...');

            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                }

                if (!session) {
                    debugLog('No session found, redirecting to login');
                    window.location.href = 'login.html';
                    return;
                }

                const user = session.user;
                debugLog('User authenticated:', user.email);

                const { data: profile, error: profileError } = await supabase
                    .from('questionnaire_responses')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (profileError) {
                    console.error('Profile error:', profileError);

                    if (profileError.code === 'PGRST116') {
                        debugLog('No profile found, redirecting to questionnaire');
                        window.location.href = 'questionnaire.html';
                        return;
                    }

                    showError(lang, lang === 'ja' 
                        ? 'プロフィールの読み込みに失敗しました。' 
                        : 'Failed to load profile.');
                    return;
                }

                const realProgress = await loadRealProgress(user.id, lang);
                const assessment = await loadLatestAssessment(user.id);

                await checkTodaysPractice(user.id, lang);

                let stats = {
                    current: 0,
                    maxStreak: 0,
                    total: 0,
                    thisMonth: 0,
                    practiceDates: []
                };

                let practiceDates = [];

                if (realProgress) {
                    stats = {
                        current: realProgress.currentStreak,
                        maxStreak: realProgress.maxStreak,
                        total: realProgress.practiceDates.length,
                        thisMonth: realProgress.thisMonthCount,
                        practiceDates: realProgress.practiceDates,
                        practiceTimestamps: realProgress.practiceTimestamps || []
                    };
                    practiceDates = realProgress.practiceDates;
                }

                const progressPercent = Math.min((stats.thisMonth / MONTHLY_GOAL) * 100, 100);

                const hasVideoAddon = profile.addons?.includes('video') || false;
                const hasVideoAccess = profile.had_video_access || hasVideoAddon;

                // Store data for language refresh
                dashboardState.loaded = true;
                dashboardState.profile = profile;
                dashboardState.stats = stats;
                dashboardState.assessment = assessment;
                dashboardState.practiceDates = practiceDates;
                dashboardState.practiceTimestamps = stats.practiceTimestamps || [];
                dashboardState.progressPercent = progressPercent;
                dashboardState.hasVideoAccess = hasVideoAccess;
                dashboardState.hasVideoAddon = hasVideoAddon;
                dashboardState.userId = user.id;

                // Single-pass population (i18n handles language toggle)
    const isCancelled = profile.subscription_status === 'cancelled';
    const cancelledAt = profile.cancelled_at ? new Date(profile.cancelled_at) : null;
    const dashboardExpiresAt = profile.dashboard_access_expires_at ? new Date(profile.dashboard_access_expires_at) : null;
    const now = new Date();
    const isExpired = dashboardExpiresAt && dashboardExpiresAt < now;
                    const heroName = profile.given_name_romaji || profile.name;
                    const greetingData = getContextualGreeting(heroName, lang);
                    document.getElementById('welcome-name').textContent = greetingData.greeting;
                    document.getElementById('welcome-subtitle').textContent = greetingData.subtitle;

                    // Hero stats start at 0 — animated after content is visible
                    document.getElementById('stat-streak').textContent = '0';
                    document.getElementById('stat-total').textContent = '0';
                    document.getElementById('stat-month').textContent = '0';



                    if (hasVideoAddon) {
                        document.getElementById('addon-badge').style.display = 'inline-block';
                    }

                    // Render daily phrase in hero
                    renderHeroPhrase(lang);

                    const bookLessonBtn = document.getElementById('book-lesson-btn');
const upcomingCard = document.getElementById('upcoming-lessons-card');
const upgradeCard = document.getElementById('upgrade-card');

if (hasVideoAccess) {
    if (upcomingCard) {
        upcomingCard.style.display = 'block';
    }
    if (upgradeCard) {
        upgradeCard.style.display = 'none';
    }
} else {
    if (bookLessonBtn) {
        bookLessonBtn.style.display = 'none';
    }
    if (upcomingCard) {
        upcomingCard.style.display = 'none';
    }
    if (upgradeCard) {
        upgradeCard.style.display = 'block';
    }
}

                    document.getElementById('sessions-completed').textContent = '0';
                    document.getElementById('sessions-total').textContent = MONTHLY_GOAL;
                    // Progress ring and counts animated after content visible

                    renderStreakCard(stats, practiceDates, lang);

                    renderAchievements('achievements', stats, lang);


                    renderSkillsChart('skills-assessment', assessment, lang);

                // ── Animation pipeline ──
                const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

                // Step 1: Apply card-animate WHILE content is still hidden
                // (transitions don't fire on display:none elements, so no flash)
                if (!prefersReduced) {
                    [...contentDiv.querySelectorAll(
                        '.dashboard-hero, .quick-actions, .dashboard-card, .cancellation-banner'
                    )].filter(el => el.style.display !== 'none')
                      .forEach(el => el.classList.add('card-animate'));
                }

                // Step 2: Crossfade loading → content
                // Cards are already at opacity:0 so no visible flash
                loadingDiv.classList.add('fade-out');
                await new Promise(r => setTimeout(r, 300));
                loadingDiv.style.display = 'none';
                contentDiv.style.display = 'block';

                // Step 3: Apply language text
                // animationsReady=false prevents refreshDynamicText from filling the ring
                dashboardState.animationsReady = false;
                applyDashboardLanguage(lang);
                refreshDynamicText(lang);

                // Step 4: Reveal cards with staggered entrance
                if (!prefersReduced) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const animatables = [...contentDiv.querySelectorAll('.card-animate')];
                            const observer = new IntersectionObserver((entries) => {
                                const visible = entries.filter(e => e.isIntersecting);
                                visible.forEach((entry, i) => {
                                    setTimeout(() => {
                                        entry.target.classList.add('card-revealed');
                                    }, i * 180);
                                    observer.unobserve(entry.target);
                                });
                            }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
                            animatables.forEach(el => observer.observe(el));
                        });
                    });

                    // Step 5a: Hero stats — always above fold, animate after hero reveals
                    setTimeout(() => {
                        animateCountUp('stat-streak', stats.current, 700);
                        animateCountUp('stat-total', stats.total, 700);
                        animateCountUp('stat-month', stats.thisMonth, 700);
                    }, 600);

                    // Step 5b: Below-fold stats — scroll-triggered after card entrances finish
                    setTimeout(() => {
                        dashboardState.animationsReady = true;
                        const scrollObserver = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (!entry.isIntersecting) return;
                                const card = entry.target;

                                if (card.classList.contains('card-skills') && dashboardState.skillsChart) {
                                    dashboardState.skillsChart.data.datasets[0].data = dashboardState.skillsChartRealData;
                                    dashboardState.skillsChart.update();
                                }
                                if (card.classList.contains('card-progress')) {
                                    animateCountUp('sessions-completed', stats.thisMonth, 700);
                                    updateProgressRing(lang, progressPercent);
                                }
                                if (card.classList.contains('card-streak')) {
                                    animateCountUp('streak-count', stats.current, 700);
                                }

                                scrollObserver.unobserve(card);
                            });
                        }, { threshold: 0.2 });

                        const skillsCard = contentDiv.querySelector('.card-skills');
                        const progressCard = contentDiv.querySelector('.card-progress');
                        const streakCard = contentDiv.querySelector('.card-streak');
                        if (skillsCard) scrollObserver.observe(skillsCard);
                        if (progressCard) scrollObserver.observe(progressCard);
                        if (streakCard) scrollObserver.observe(streakCard);
                    }, 1800);
                } else {
                    // Reduced motion: everything instant
                    dashboardState.animationsReady = true;
                    document.getElementById('stat-streak').textContent = stats.current;
                    document.getElementById('stat-total').textContent = stats.total;
                    document.getElementById('stat-month').textContent = stats.thisMonth;
                    document.getElementById('streak-count').textContent = stats.current;
                    document.getElementById('sessions-completed').textContent = stats.thisMonth;
                    updateProgressRing(lang, progressPercent);
                }

                // Initialize booking widget
                await initializeBookingWidget(profile.id, user.id);

                debugLog('✅ Dashboard loaded!');

            } catch (error) {
                console.error('Dashboard load error:', error);
                showError(lang, lang === 'ja' 
                    ? '予期しないエラーが発生しました。' 
                    : 'An unexpected error occurred.');
            }
        }

        // =============================================
        // LANGUAGE TOGGLE SYSTEM
        // =============================================

        function setLanguage(lang) {
            localStorage.setItem('prokaiwaLang', lang);

            // Update static text via i18n
            applyDashboardLanguage(lang);

            // Refresh dynamic content if dashboard is loaded
            if (dashboardState.loaded) {
                refreshDynamicText(lang);
            }

            // Update nav toggle buttons
            document.querySelectorAll('.nav-lang-toggle button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.lang === lang) {
                    btn.classList.add('active');
                }
            });
        }

        document.querySelectorAll('.nav-lang-toggle button').forEach(button => {
            button.addEventListener('click', () => {
                setLanguage(button.dataset.lang);
            });
        });

        window.getCurrentLang = getCurrentLang;
        const initialLang = getCurrentLang();
        setLanguage(initialLang);

        // =============================================
        // EVENT LISTENERS & INITIALIZATION
        // =============================================

        async function handleLogout() {
            debugLog('Logging out...');
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        }

        const logoutNavBtn = document.getElementById('logout-button-nav');
        if (logoutNavBtn) logoutNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
        const dashLogoutBtn = document.getElementById('logout-btn');
        if (dashLogoutBtn) dashLogoutBtn.addEventListener('click', handleLogout);

        supabase.auth.onAuthStateChange((event, session) => {
            debugLog('Auth state changed:', event);

            if (event === 'SIGNED_OUT') {
                window.location.href = 'login.html';
            } else if (event === 'TOKEN_REFRESHED') {
                debugLog('Token refreshed successfully');
            }
        });



        // =============================================
        // CONSOLE HELPERS (testing card states)
        // =============================================
        window.testIceState = function() {
            const card = document.getElementById('streak-card');
            card.classList.remove('streak-state-warm', 'streak-state-fire', 'streak-state-blaze');
            card.classList.add('streak-state-frozen');
            console.log('❄️ Ice state applied. Run testFireState() or reload to reset.');
        };
        window.testFireState = function(level) {
            const card = document.getElementById('streak-card');
            card.classList.remove('streak-state-warm', 'streak-state-fire', 'streak-state-blaze', 'streak-state-frozen');
            if (level === 'blaze') card.classList.add('streak-state-blaze');
            else if (level === 'fire') card.classList.add('streak-state-fire');
            else card.classList.add('streak-state-warm');
            console.log('🔥 Fire state applied: ' + (level || 'warm') + '. Reload to reset.');
        };
        loadDashboard();

        const yearEl = document.getElementById('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

        const burgerMenu = document.querySelector('.burger-menu');
        const mainNav = document.querySelector('.main-nav');
        if (burgerMenu && mainNav) {
            burgerMenu.addEventListener('click', () => {
                mainNav.classList.toggle('open');
            });
        }

        // =============================================
        // BOOKING WIDGET - MODAL VERSION
        // =============================================

        var bookingState = {
            selectedDate: null,
            selectedTime: null,
            selectedLessonType: 'standard',
            availableSlots: [],
            userBookings: [],
            availableCredits: 0,
            eligibleForConsultation: false,
            currentMonth: new Date(),
            studentId: null,
            userId: null,
            currentLang: 'ja'
        };

        // MODAL FUNCTIONS
        window.openBookingModal = async function(lang) {
    debugLog('📖 Opening booking modal for lang:', lang);
    bookingState.currentLang = lang;

    // Update modal title
    document.getElementById('modal-title').textContent = lang === 'ja' ? 'レッスン予約' : 'Book a Lesson';

    // Render booking widget content
    const modalContent = document.getElementById('modal-booking-content');
    modalContent.innerHTML = getBookingWidgetHTML(lang);

    // Show modal
    document.getElementById('booking-modal-overlay').classList.add('show');
    document.getElementById('booking-modal').classList.add('show');

    // Scroll modal body to top
    const modalBody = document.querySelector('.booking-modal-body');
    if (modalBody) {
        modalBody.scrollTop = 0;
    }

    // 🆕 REFRESH CREDITS AFTER MODAL HTML EXISTS
    await fetchBookingEligibility(bookingState.studentId, lang);

    // Initialize widget
    renderCalendar(lang);
    setupBookingEventListeners(lang);
};

        window.closeBookingModal = function() {
            debugLog('📕 Closing booking modal');
            document.getElementById('booking-modal-overlay').classList.remove('show');
            document.getElementById('booking-modal').classList.remove('show');
        };

        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeBookingModal();
            }
        });

        function getBookingWidgetHTML(lang) {
    return `
        <div class="booking-widget">
            <div class="booking-header">
                <div class="booking-credits">
                    <div class="credit-badge">
                        <i class="fas fa-ticket-alt"></i>
                        <span>${lang === 'ja' ? '利用可能' : 'Available'}: <span class="credit-number" id="${lang}-credits-count">0</span></span>
                    </div>
                    <div class="consultation-badge" id="${lang}-consultation-badge" style="display: none;">
                        <i class="fas fa-gift"></i>
                        <span>${lang === 'ja' ? '無料相談' : 'Free Consultation'}</span>
                    </div>
                </div>
            </div>

            <div class="calendar-container">
                <div class="calendar-picker">
                    <div class="calendar-month-nav">
                        <button class="calendar-nav-btn" id="${lang}-calendar-prev">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <h3 id="${lang}-calendar-month">2026年 1月</h3>
                        <button class="calendar-nav-btn" id="${lang}-calendar-next">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="calendar-grid" id="${lang}-calendar-grid"></div>
                </div>

                <div class="time-slots-container">
                    <div class="selected-date-display" id="${lang}-selected-date">
                        ${lang === 'ja' ? '日付を選択してください' : 'Select a date'}
                    </div>
                    <div id="${lang}-time-slots"></div>
                </div>
            </div>

            <div class="booking-actions">
                <div class="lesson-type-selector">
                    <label for="${lang}-lesson-type">${lang === 'ja' ? 'レッスンタイプ:' : 'Lesson Type:'}</label>
                    <select id="${lang}-lesson-type">
                        <option value="standard">${lang === 'ja' ? '50分 スタンダードレッスン' : '50-min Standard Lesson'}</option>
                        <option value="consultation">${lang === 'ja' ? '20分 無料相談（初回のみ）' : '20-min Free Consultation (First-time)'}</option>
                    </select>
                </div>

                <div class="booking-summary" id="${lang}-booking-summary"></div>

                <!-- 🆕 MOVED POLICY NOTICE HERE -->
                <div class="booking-policy-notice">
                    <i class="fas fa-info-circle"></i>
                    <div>
                        <strong>${lang === 'ja' ? '予約ポリシー：' : 'Booking Policy:'}</strong>
                        <ul>
                            <li>✅ <strong>${lang === 'ja' ? 'レッスンの24時間前まで' : '>24 hours before'}</strong>${lang === 'ja' ? 'なら無料でキャンセル・変更可能' : ': Free cancellation/reschedule'}</li>
                            <li>❌ <strong>${lang === 'ja' ? '24時間前を切ると' : '<24 hours before'}</strong>${lang === 'ja' ? 'クレジットの返金なし' : ': No credit refund'}</li>
                            <li>❌ <strong>${lang === 'ja' ? '無断欠席の場合' : 'No-shows'}</strong>${lang === 'ja' ? 'もクレジットは消費されます' : ': Credit is not refunded'}</li>
                            <li>⏰ <strong>${lang === 'ja' ? '準備：' : 'Preparation:'}</strong>${lang === 'ja' ? 'レッスン5分前までに準備し、カメラ・マイクをテストしてください' : ' Please be ready 5 minutes early and test your camera/microphone'}</li>
                            <li>📹 <strong>${lang === 'ja' ? 'Meetリンク：' : 'Meet link:'}</strong>${lang === 'ja' ? ' レッスン24時間前から終了1時間後まで表示されます' : ' Available from 24h before until 1h after your lesson'}</li>
                        </ul>
                    </div>
                </div>

                <button class="book-lesson-btn" id="${lang}-book-btn" disabled>
                    <i class="fas fa-calendar-check"></i> ${lang === 'ja' ? 'レッスンを予約' : 'Book Lesson'}
                </button>
            </div>
        </div>
    `;
}

        async function initializeBookingWidget(studentId, userId) {
    debugLog('🎯 Initializing booking widget...', { studentId, userId });

    bookingState.studentId = studentId;
    bookingState.userId = userId;

    const currentLang = getCurrentLang();
    await fetchBookingEligibility(studentId, currentLang);
    await fetchUserBookings(userId, currentLang);

    // 🆕 Initialize lessons card on dashboard load
    initializeEnhancedLessonsCard();

    debugLog('✅ Booking widget initialized');
}

        async function fetchBookingEligibility(studentId, lang) {
    try {
        const { data, error } = await supabase
            .rpc('check_booking_eligibility', {
                p_student_id: studentId,
                p_lesson_type: 'standard'
            });

        if (error) throw error;

        bookingState.availableCredits = data.availableCredits || 0;
        bookingState.eligibleForConsultation = data.eligibleForConsultation || false;

        debugLog('Credits:', bookingState.availableCredits);
        debugLog('Consultation eligible:', bookingState.eligibleForConsultation);

        // 🆕 UPDATE UI ELEMENTS
        const creditsElement = document.getElementById(`${lang}-credits-count`);
        if (creditsElement) {
            creditsElement.textContent = bookingState.availableCredits;
        }

        const consultBadge = document.getElementById(`${lang}-consultation-badge`);
        if (consultBadge) {
            consultBadge.style.display = bookingState.eligibleForConsultation ? 'flex' : 'none';
        }

    } catch (err) {
        console.error('Error fetching eligibility:', err);
    }
}

        async function fetchUserBookings(userId, lang) {
    debugLog(`📚 Fetching bookings for user: ${userId}`);

    try {
        const { data: bookings, error } = await supabase
            .from('lesson_bookings')
            .select(`
                id,
                scheduled_at,
                duration_minutes,
                lesson_type,
                google_meet_link,
                google_calendar_event_id,
                status
            `)
            .eq('user_id', userId)
            .eq('status', 'scheduled')
            .order('scheduled_at', { ascending: true });

        if (error) throw error;

        bookingState.userBookings = bookings || [];

        debugLog(`✅ Fetched ${bookingState.userBookings.length} bookings`);
        debugLog('📋 Bookings:', bookingState.userBookings);

        renderUserBookings(lang);

    } catch (err) {
        console.error('❌ Error fetching bookings:', err);
    }
}



        function renderCalendar(lang) {
            const month = bookingState.currentMonth;
            const year = month.getFullYear();
            const monthIndex = month.getMonth();

            const monthNames = lang === 'ja' 
                ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
                : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            const monthLabel = document.getElementById(`${lang}-calendar-month`);
if (!monthLabel) {
    console.warn(`Missing calendar month label: ${lang}-calendar-month`);
    return;
}

monthLabel.textContent =
    lang === 'ja'
        ? `${year}年 ${monthNames[monthIndex]}`
        : `${monthNames[monthIndex]} ${year}`;


            const calendarGrid = document.getElementById(`${lang}-calendar-grid`);
            if (!calendarGrid) return;

            calendarGrid.innerHTML = '';

            const dayHeaders = lang === 'ja' 
                ? ['日', '月', '火', '水', '木', '金', '土']
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            dayHeaders.forEach(day => {
                const header = document.createElement('div');
                header.className = 'calendar-day-header';
                header.textContent = day;
                calendarGrid.appendChild(header);
            });

            const firstDay = new Date(year, monthIndex, 1).getDay();
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
            const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

            // TIMEZONE FIX: Get today in local timezone
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = firstDay - 1; i >= 0; i--) {
                const day = document.createElement('div');
                day.className = 'calendar-day other-month';
                day.textContent = daysInPrevMonth - i;
                calendarGrid.appendChild(day);
            }

            for (let date = 1; date <= daysInMonth; date++) {
                const dayDate = new Date(year, monthIndex, date);
                dayDate.setHours(0, 0, 0, 0);

                const day = document.createElement('div');
                day.className = 'calendar-day';
                day.textContent = date;

                // TIMEZONE FIX: Store date as YYYY-MM-DD (no time component)
                day.dataset.date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

                if (dayDate.getTime() === today.getTime()) {
                    day.classList.add('today');
                }

                if (bookingState.selectedDate && day.dataset.date === bookingState.selectedDate) {
                    day.classList.add('selected');
                }

                if (dayDate < today) {
                    day.classList.add('disabled');
                }

                const dayOfWeek = dayDate.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    day.classList.add('disabled');
                }

                const hasBooking = bookingState.userBookings.some(booking => {
                    const bookingDate = new Date(booking.scheduled_at);
                    return bookingDate.toISOString().split('T')[0] === day.dataset.date;
                });

                if (hasBooking) {
                    day.classList.add('has-booking');
                }

if (!day.classList.contains('disabled')) {
                day.addEventListener('click', () => selectDate(day.dataset.date, lang));
            }

            calendarGrid.appendChild(day);
        } 

        // SHOW NEXT MONTH'S DATES (fill to complete the last row only)
        const totalCells = calendarGrid.children.length - 7; // subtract header row
const remainingCells = (7 - (totalCells % 7)) % 7; // only fill to end of current row

for (let date = 1; date <= remainingCells; date++) {
    const nextMonthDate = new Date(year, monthIndex + 1, date);
    nextMonthDate.setHours(0, 0, 0, 0);

    const day = document.createElement('div');
    day.className = 'calendar-day other-month';
    day.textContent = date;

    // Format date as YYYY-MM-DD (FIX: correct month calculation)
    const nextMonthIndex = monthIndex + 1; // 0-indexed JS month
    const yearFormatted = nextMonthIndex > 11 ? year + 1 : year;
    const monthForDate = (nextMonthIndex > 11 ? 0 : nextMonthIndex) + 1; // convert to 1-indexed
    day.dataset.date = `${yearFormatted}-${String(monthForDate).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

    // Check if it's a weekend (Fri=5, Sat=6, Sun=0)
    const dayOfWeek = nextMonthDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Check if it's in the future
    const isFuture = nextMonthDate >= today;

    // Only make it clickable if it's a weekend AND in the future
    if (isWeekend && isFuture) {
        day.classList.remove('other-month'); // Remove grey styling
        day.classList.add('available');
        day.style.color = 'var(--color-primary)';
        day.style.opacity = '0.7';
        day.style.fontWeight = '500';

        // Check if this date has a booking
        const hasBooking = bookingState.userBookings.some(booking => {
            const bookingDate = new Date(booking.scheduled_at);
            return bookingDate.toISOString().split('T')[0] === day.dataset.date;
        });

        if (hasBooking) {
            day.classList.add('has-booking');
        }

        day.addEventListener('click', () => selectDate(day.dataset.date, lang));
    } else {
        day.classList.add('disabled');
    }

    calendarGrid.appendChild(day);
}          
            const prevBtn = document.getElementById(`${lang}-calendar-prev`);
            if (prevBtn) {
                const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                prevBtn.disabled = month.getTime() <= currentMonth.getTime();
            }
        }

        async function selectDate(dateStr, lang) {
    debugLog('📅 Selected date:', dateStr);

    bookingState.selectedDate = dateStr;
    bookingState.selectedTime = null;

    // Auto-navigate if clicked date is in a different month
    const [clickedYear, clickedMonth] = dateStr.split('-').map(Number);
    const viewMonth = bookingState.currentMonth.getMonth() + 1;
    const viewYear = bookingState.currentMonth.getFullYear();
    if (clickedMonth !== viewMonth || clickedYear !== viewYear) {
        bookingState.currentMonth = new Date(clickedYear, clickedMonth - 1, 1);
    }

    renderCalendar(lang);

    // TIMEZONE FIX: Parse date as local date
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    const dateDisplay = lang === 'ja'
        ? `${year}年${month}月${day}日 (${['日', '月', '火', '水', '木', '金', '土'][date.getDay()]})`
        : date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const displayElement = document.getElementById(`${lang}-selected-date`);
    if (displayElement) {
        displayElement.textContent = dateDisplay;
    }

    await fetchAvailableSlots(dateStr, lang);

    // 🆕 AUTO-SCROLL TO TIME SLOTS
    setTimeout(() => {
        const timeSlotsContainer = document.getElementById(`${lang}-time-slots`);
        if (timeSlotsContainer) {
            timeSlotsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 300);
}

        async function fetchAvailableSlots(dateStr, lang) {
            const slotsContainer = document.getElementById(`${lang}-time-slots`);
            if (!slotsContainer) return;

            slotsContainer.innerHTML = '<div class="time-slots-loading"><i class="fas fa-spinner fa-spin"></i><p>読み込み中...</p></div>';

            try {
                debugLog('🔍 Fetching available slots for:', dateStr);

                const response = await fetch('https://luyzyzefgintksydmwoh.supabase.co/functions/v1/lesson-booking', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
                    },
                    body: JSON.stringify({
                        action: 'getAvailableSlots',
                        bookingData: {
                            date: dateStr
                        }
                    })
                });

                const result = await response.json();
                debugLog('📥 Slots response:', result);

                if (!result.success) {
                    throw new Error(result.error || 'Failed to fetch slots');
                }

                bookingState.availableSlots = result.slots || [];

                renderTimeSlots(lang);

            } catch (err) {
                console.error('❌ Error fetching slots:', err);
                slotsContainer.innerHTML = `
                    <div class="no-slots-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>${lang === 'ja' ? 'スロットの読み込みに失敗しました' : 'Failed to load time slots'}</p>
                        <p style="font-size: 0.85rem; color: var(--color-text-muted);">${lang === "ja" ? "エラーが発生しました。ページを再読み込みしてください。" : "An error occurred. Please reload the page."}</p>
                    </div>
                `;
            }
        }

        function renderTimeSlots(lang) {
            const slotsContainer = document.getElementById(`${lang}-time-slots`);
            if (!slotsContainer) return;

            if (bookingState.availableSlots.length === 0) {
                slotsContainer.innerHTML = `
                    <div class="no-slots-message">
                        <i class="fas fa-calendar-times"></i>
                        <p>${lang === 'ja' ? 'この日は空き時間がありません' : 'No available slots for this date'}</p>
                    </div>
                `;
                return;
            }

            const morning = bookingState.availableSlots.filter(s => {
                const hour = parseInt(s.display.split(':')[0]);
                return hour < 12;
            });

            const afternoon = bookingState.availableSlots.filter(s => {
                const hour = parseInt(s.display.split(':')[0]);
                return hour >= 12 && hour < 18;
            });

            const evening = bookingState.availableSlots.filter(s => {
                const hour = parseInt(s.display.split(':')[0]);
                return hour >= 18;
            });

            let html = '<div class="time-slots">';

            if (morning.length > 0) {
                html += `
                    <div class="time-period">
                        <h4>${lang === 'ja' ? '午前' : 'Morning'}</h4>
                        <div class="time-slots-grid">
                            ${morning.map(slot => `
                                <div class="time-slot" data-time="${slot.time}" onclick="selectTimeSlot('${slot.time}', '${lang}')">
                                    ${slot.display}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            if (afternoon.length > 0) {
                html += `
                    <div class="time-period">
                        <h4>${lang === 'ja' ? '午後' : 'Afternoon'}</h4>
                        <div class="time-slots-grid">
                            ${afternoon.map(slot => `
                                <div class="time-slot" data-time="${slot.time}" onclick="selectTimeSlot('${slot.time}', '${lang}')">
                                    ${slot.display}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            if (evening.length > 0) {
                html += `
                    <div class="time-period">
                        <h4>${lang === 'ja' ? '夜' : 'Evening'}</h4>
                        <div class="time-slots-grid">
                            ${evening.map(slot => `
                                <div class="time-slot" data-time="${slot.time}" onclick="selectTimeSlot('${slot.time}', '${lang}')">
                                    ${slot.display}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            html += '</div>';
            slotsContainer.innerHTML = html;
        }

        window.selectTimeSlot = function(timeStr, lang) {
            debugLog('⏰ Selected time:', timeStr);

            bookingState.selectedTime = timeStr;

            document.querySelectorAll(`#${lang}-time-slots .time-slot`).forEach(slot => {
                slot.classList.remove('selected');
            });

            const selectedSlot = document.querySelector(`#${lang}-time-slots .time-slot[data-time="${timeStr}"]`);
            if (selectedSlot) {
                selectedSlot.classList.add('selected');
            }

            updateBookingSummary(lang);

            const bookBtn = document.getElementById(`${lang}-book-btn`);
            if (bookBtn) {
                bookBtn.disabled = false;
            }
        };

        function updateBookingSummary(lang) {
    const lessonType = bookingState.selectedLessonType;
    const summaryContainer = document.getElementById(`${lang}-booking-summary`);
    if (!summaryContainer) return;

    let duration, price, useCredit;

    if (lessonType === 'consultation') {
        duration = 20;
        price = 0;
        useCredit = false;
    } else {
        duration = 50;
        if (bookingState.availableCredits > 0) {
            price = 0;
            useCredit = true;
        } else {
            price = 4000;
            useCredit = false;
        }
    }

    const dateTime = new Date(bookingState.selectedTime);

    const html = `
        <div class="booking-summary-item">
            <span class="booking-summary-label">${lang === 'ja' ? '日時' : 'Date & Time'}:</span>
            <span class="booking-summary-value">${dateTime.toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')}</span>
        </div>
        <div class="booking-summary-item">
            <span class="booking-summary-label">${lang === 'ja' ? '時間' : 'Duration'}:</span>
            <span class="booking-summary-value">${duration} ${lang === 'ja' ? '分' : 'minutes'}</span>
        </div>
        <div class="booking-summary-item">
            <span class="booking-summary-label">${lang === 'ja' ? '料金' : 'Price'}:</span>
            <span class="booking-summary-value ${price === 0 ? 'free' : 'paid'}">
                ${price === 0 
                    ? (lang === 'ja' ? '無料' : 'FREE') + (useCredit ? ` (${lang === 'ja' ? 'クレジット使用' : 'Using Credit'})` : '') 
                    : `¥${price.toLocaleString()}`}
            </span>
        </div>
    `;

    summaryContainer.innerHTML = html;

    // 🆕 AUTO-SCROLL TO LESSON TYPE SECTION
    setTimeout(() => {
        const bookingActions = document.querySelector('.booking-actions');
        if (bookingActions) {
            bookingActions.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 200);
}

        async function bookLesson(lang) {
            const btn = document.getElementById(`${lang}-book-btn`);
            if (!btn) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (lang === 'ja' ? '予約中...' : 'Booking...');

            try {
                const lessonType = bookingState.selectedLessonType === 'consultation' ? 'first_time_free' : 'standard';

                debugLog('📤 Booking lesson:', {
                    studentId: bookingState.studentId,
                    scheduledAt: bookingState.selectedTime,
                    lessonType: lessonType,
                    duration: bookingState.selectedLessonType === 'consultation' ? 20 : 50
                });

                const response = await fetch('https://luyzyzefgintksydmwoh.supabase.co/functions/v1/lesson-booking', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
                    },
                    body: JSON.stringify({
                        action: 'create',
                        bookingData: {
                            studentId: bookingState.studentId,
                            scheduledAt: bookingState.selectedTime,
                            lessonType: lessonType,
                            duration: bookingState.selectedLessonType === 'consultation' ? 20 : 50
                        }
                    })
                });

                const result = await response.json();
                debugLog('📥 Booking response:', result);

                if (!result.success) {
                    throw new Error(result.error || 'Booking failed');
                }

                alert(lang === 'ja' 
    ? '予約が完了しました！レッスンカードで詳細を確認できます。' 
    : 'Booking confirmed! Your lesson appears in the Upcoming Lessons card below.');
                // Start auto-refresh for Meet link
if (result.booking && result.booking.google_calendar_event_id) {
    debugLog('🔄 Starting auto-refresh for Meet link...');
    meetLinkRefresh.start(
        result.booking.id,
        result.booking.google_calendar_event_id
    );
}
                bookingState.selectedDate = null;
                bookingState.selectedTime = null;

                await fetchBookingEligibility(bookingState.studentId, lang);
await fetchUserBookings(bookingState.userId, lang);

// 🆕 UPDATE DASHBOARD CARD
initializeEnhancedLessonsCard();

closeBookingModal();

            } catch (err) {
                console.error('❌ Booking error:', err);
                alert(lang === 'ja' ? '予約中にエラーが発生しました。もう一度お試しください。' : 'A booking error occurred. Please try again.');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-calendar-check"></i> ' + (lang === 'ja' ? 'レッスンを予約' : 'Book Lesson');
            }
        }

        function renderUserBookings(lang) {
    const container = document.getElementById(`${lang}-bookings-list`);
    if (!container) return;

    if (bookingState.userBookings.length === 0) {
        container.innerHTML = `
            <div class="no-bookings">
                <i class="fas fa-calendar-alt"></i>
                <p>${lang === 'ja' ? '予約がありません' : 'No upcoming bookings'}</p>
            </div>
        `;
        return;
    }

    const html = bookingState.userBookings.map(booking => {
        const date = new Date(booking.scheduled_at);

        const dateStr = date.toLocaleDateString(
            lang === 'ja' ? 'ja-JP' : 'en-US',
            { weekday: 'short', month: 'short', day: 'numeric' }
        );

        const timeStr = date.toLocaleTimeString(
            lang === 'ja' ? 'ja-JP' : 'en-US',
            { hour: '2-digit', minute: '2-digit' }
        );

        const typeLabel =
            booking.lesson_type === 'first_time_free'
                ? (lang === 'ja' ? '無料相談' : 'Free Consultation')
                : (lang === 'ja' ? 'レッスン' : 'Lesson');

        return `
            <div class="booking-item">
                <div class="booking-info">
                    <div class="booking-date">${dateStr}</div>
                    <div class="booking-time">
                        ${timeStr} (${booking.duration_minutes} ${lang === 'ja' ? '分' : 'min'})
                    </div>
                    <span class="booking-type">${typeLabel}</span>
                </div>

                <div class="booking-actions-btns">
                    ${
                        booking.google_meet_link
                            ? `
                                <a
                                    href="${booking.google_meet_link}"
                                    target="_blank" rel="noopener noreferrer"
                                    class="booking-action-btn meet-btn"
                                >
                                    ${lang === 'ja' ? 'Google Meet に参加' : 'Join Google Meet'}
                                </a>
                              `
                            : ''
                    }

                    <button
                        class="booking-action-btn cancel-btn"
                        onclick="cancelBooking('${booking.id}', '${lang}')"
                    >
                        ${lang === 'ja' ? 'キャンセル' : 'Cancel'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}





        window.cancelBooking = async function(bookingId, lang) {
            const confirmMsg = lang === 'ja'
                ? 'この予約をキャンセルしてもよろしいですか？'
                : 'Are you sure you want to cancel this booking?';

            if (!confirm(confirmMsg)) return;

            const reasonMsg = lang === 'ja'
                ? 'キャンセル理由を入力してください（任意）：'
                : 'Cancellation reason (optional):';

            const reason = prompt(reasonMsg) || 'No reason provided';

            try {
                const response = await fetch('https://luyzyzefgintksydmwoh.supabase.co/functions/v1/lesson-booking', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
                    },
                    body: JSON.stringify({
                        action: 'cancel',
                        bookingData: {
                            bookingId: bookingId,
                            reason: reason
                        }
                    })
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Cancellation failed');
                }

                alert(lang === 'ja' ? 'キャンセルしました。' + (result.refund || '') : 'Booking cancelled. ' + (result.refund || ''));

                await fetchBookingEligibility(bookingState.studentId, lang);
                await fetchUserBookings(bookingState.userId, lang);
                renderCalendar(lang);

            } catch (err) {
                console.error('Cancellation error:', err);
                alert(lang === 'ja' ? 'キャンセル中にエラーが発生しました。もう一度お試しください。' : 'A cancellation error occurred. Please try again.');
            }
        };

        function setupBookingEventListeners(lang) {
            const prevBtn = document.getElementById(`${lang}-calendar-prev`);
            const nextBtn = document.getElementById(`${lang}-calendar-next`);
            const lessonTypeSelect = document.getElementById(`${lang}-lesson-type`);
            const bookBtn = document.getElementById(`${lang}-book-btn`);

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    bookingState.currentMonth.setMonth(bookingState.currentMonth.getMonth() - 1);
                    renderCalendar(lang);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    bookingState.currentMonth.setMonth(bookingState.currentMonth.getMonth() + 1);
                    renderCalendar(lang);
                });
            }

            if (lessonTypeSelect) {
                lessonTypeSelect.addEventListener('change', (e) => {
                    bookingState.selectedLessonType = e.target.value;
                    if (bookingState.selectedTime) {
                        updateBookingSummary(lang);
                    }
                 });
            }

            if (bookBtn) {
                bookBtn.addEventListener('click', () => bookLesson(lang));
            }
        }

        debugLog('🎉 Phase 1 Dashboard Ready!');
      // ================================
// ENHANCED UPCOMING LESSONS CARD
// Features: Google Meet button, countdown timer, expand/collapse, cancel/reschedule
// ================================

// State management
const lessonsCardState = {
    expanded: false,
    updateInterval: null
};

// Format date/time (bilingual)
function formatLessonDateTime(scheduledAt, lang = 'en') {
    const date = new Date(scheduledAt);
    const options = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: lang === 'en'
    };
    return date.toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US', options);
}

// Calculate time until lesson (bilingual)
function getTimeUntilLesson(scheduledAt, lang = 'en') {
    const now = new Date();
    const lessonTime = new Date(scheduledAt);
    const diff = lessonTime - now;

    if (diff < 0) return lang === 'ja' ? '過去' : 'Past';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (lang === 'ja') {
        if (days > 1) return `${days}日後`;
        if (days === 1) return '明日';
        if (hours === 0) return `${minutes}分後`;
        return `${hours}時間${minutes}分後`;
    } else {
        if (days > 1) return `In ${days} days`;
        if (days === 1) return 'Tomorrow';
        if (hours === 0) return `In ${minutes}m`;
        return `In ${hours}h ${minutes}m`;
    }
}

// Check if lesson is within 24 hours
function isWithin24Hours(scheduledAt) {
    const now = new Date();
    const lessonTime = new Date(scheduledAt);
    const diff = lessonTime - now;
    const hours = diff / (1000 * 60 * 60);
    return hours > 0 && hours <= 24;
}

// Check if lesson is within 1 hour
function isWithin1Hour(scheduledAt) {
    const now = new Date();
    const lessonTime = new Date(scheduledAt);
    const diff = lessonTime - now;
    const hours = diff / (1000 * 60 * 60);
    return hours > 0 && hours <= 1;
}

// Render upcoming lessons card
function renderUpcomingLessonsCard(lessons, lang) {  // ← ADD lang parameter
    const card = document.getElementById('upcoming-lessons-card');  // ← Use lang
    if (!card) return;

    const container = document.getElementById('upcoming-lessons');  // ← Use lang
    if (!container) return;

    // 🆕 FILTER: Hide lessons that ended >60 min ago
    const now = new Date();
    const visibleLessons = (lessons || []).filter(lesson => {
        const lessonEnd = new Date(lesson.scheduled_at);
        lessonEnd.setMinutes(lessonEnd.getMinutes() + lesson.duration_minutes + 60); // +60 min buffer
        return lessonEnd > now;
    });

    if (visibleLessons.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    const nextLesson = visibleLessons[0];
    const hasMoreLessons = visibleLessons.length > 1;

    container.innerHTML = `
        <div class="lessons-container">
            ${renderLessonCard(nextLesson, true, lang)}

            ${hasMoreLessons ? `
                <div class="lessons-more ${lessonsCardState.expanded ? 'expanded' : ''}">
                    ${visibleLessons.slice(1).map(lesson => renderLessonCard(lesson, false, lang)).join('')}
                </div>

                <button class="toggle-lessons-btn" onclick="toggleLessonsExpanded()">
                    <i class="fas fa-chevron-${lessonsCardState.expanded ? 'up' : 'down'}"></i>
                    ${lessonsCardState.expanded 
                        ? (lang === 'ja' ? '少なく表示' : 'Show Less')
                        : (lang === 'ja' ? `すべて表示 (${visibleLessons.length})` : `View All Lessons (${visibleLessons.length})`)}
                </button>
            ` : ''}

            <div class="book-another-divider"></div>

            <button onclick="openBookingModal('${lang}')" class="book-another-btn">
                <i class="fas fa-plus-circle"></i> ${visibleLessons.length > 0 
                    ? (lang === 'ja' ? '別のレッスンを予約' : 'Book Another Lesson')
                    : (lang === 'ja' ? '最初のレッスンを予約' : 'Book Your First Lesson')}
            </button>
        </div>
    `;
}

// Toggle expand/collapse
function toggleLessonsExpanded() {
    lessonsCardState.expanded = !lessonsCardState.expanded;

    // Get current language
    const lang = getCurrentLang();

    // Toggle both language versions
    const moreSection = document.querySelector('#upcoming-lessons .lessons-more');
    if (moreSection) {
        if (lessonsCardState.expanded) {
            moreSection.classList.add('expanded');
        } else {
            moreSection.classList.remove('expanded');
        }
    }

    // Update button text
    const toggleBtn = document.querySelector('.toggle-lessons-btn');
    if (toggleBtn) {
        const totalLessons = bookingState.userBookings.length;
        const lang = getCurrentLang();
        toggleBtn.innerHTML = lessonsCardState.expanded 
            ? `<i class="fas fa-chevron-up"></i> ${lang === 'ja' ? '少なく表示' : 'Show Less'}`
            : `<i class="fas fa-chevron-down"></i> ${lang === 'ja' ? `すべて表示 (${totalLessons})` : `View All Lessons (${totalLessons})`}`;
    }
}

// Cancel lesson
async function cancelLesson(lessonId, lang = 'en') {  // ← ADD lang parameter with default
    // Find the lesson
    const lesson = bookingState.userBookings.find(b => b.id === lessonId);
    if (!lesson) return;

    const now = new Date();
    const lessonStart = new Date(lesson.scheduled_at);
    const hoursUntilStart = (lessonStart - now) / (1000 * 60 * 60);

    // Check if it's too late to cancel with refund
    let confirmMsg = lang === 'ja' 
        ? 'このレッスンをキャンセルしてもよろしいですか？' 
        : 'Are you sure you want to cancel this lesson?';

    if (hoursUntilStart < 24) {
        confirmMsg = lang === 'ja'
            ? '⚠️ 24時間前を切っているため、クレジットは返金されません。\n\nキャンセルしてもよろしいですか？'
            : '⚠️ Cancelling less than 24 hours before the lesson means NO REFUND.\n\nYour credit will NOT be restored. Are you sure you want to cancel?';
    } else {
        confirmMsg = lang === 'ja'
            ? 'このレッスンをキャンセルしますか？\n\n✅ クレジットは返金されます（24時間前まで）'
            : 'Cancel this lesson?\n\n✅ Your credit will be refunded.';
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const response = await fetch('https://luyzyzefgintksydmwoh.supabase.co/functions/v1/lesson-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
            },
            body: JSON.stringify({
                action: 'cancel',
                bookingData: {
                    bookingId: lessonId,
                    reason: lang === 'ja' ? 'ダッシュボードからキャンセル' : 'Cancelled from dashboard'
                }
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || (lang === 'ja' ? 'キャンセルに失敗しました' : 'Cancellation failed'));
        }

        // Show appropriate message based on refund status
        if (result.refundMessage) {
            alert('✅ ' + result.refundMessage);
        } else if (hoursUntilStart < 24) {
            alert(lang === 'ja' 
                ? 'レッスンをキャンセルしました。返金はありません（24時間前以降）。'
                : 'Lesson cancelled. No refund issued (<24h notice).');
        } else {
            alert(lang === 'ja'
                ? 'レッスンをキャンセルしました。クレジットは返金されました。'
                : 'Lesson cancelled successfully. Your credit has been refunded.');
        }

        // Refresh everything
        await fetchBookingEligibility(bookingState.studentId, lang);
        await fetchUserBookings(bookingState.userId, lang);
        initializeEnhancedLessonsCard();

    } catch (err) {
        console.error('Error cancelling lesson:', err);
        alert(lang === 'ja' 
            ? 'キャンセル中にエラーが発生しました。もう一度お試しください。'
            : 'Failed to cancel lesson. Please try again.');
    }
}

// Reschedule lesson
async function rescheduleLesson(lessonId, lang = 'en') {  // ← ADD lang parameter with default
    // Find the lesson
    const lesson = bookingState.userBookings.find(b => b.id === lessonId);
    if (!lesson) return;

    const now = new Date();
    const lessonStart = new Date(lesson.scheduled_at);
    const hoursUntilStart = (lessonStart - now) / (1000 * 60 * 60);

    let confirmMsg = lang === 'ja' ? 'このレッスンを変更しますか？' : 'Reschedule this lesson?';

    if (hoursUntilStart < 24) {
        confirmMsg = lang === 'ja'
            ? '⚠️ 24時間前を切っているため、クレジットは返金されません。\n\nこのレッスンのクレジットは消費されます。よろしいですか？'
            : '⚠️ Rescheduling less than 24 hours before means NO CREDIT REFUND.\n\nYou\'ll lose this lesson credit. Are you sure?';
    } else {
        confirmMsg = lang === 'ja'
            ? 'このレッスンを変更しますか？\n\n✅ クレジットは返金され、新しい時間を予約できます。'
            : 'Reschedule this lesson?\n\n✅ Your credit will be restored and you can book a new time.';
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const response = await fetch('https://luyzyzefgintksydmwoh.supabase.co/functions/v1/lesson-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
            },
            body: JSON.stringify({
                action: 'cancel',
                bookingData: {
                    bookingId: lessonId,
                    reason: lang === 'ja' ? 'レッスン変更' : 'Rescheduling lesson'
                }
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || (lang === 'ja' ? '変更に失敗しました' : 'Cancellation failed'));
        }

        if (hoursUntilStart >= 24) {
            alert(lang === 'ja' 
                ? '✅ レッスンをキャンセルしました。クレジットは返金されました。新しい時間を選択してください。'
                : '✅ Lesson cancelled. Your credit has been restored. Please select a new time.');
        } else {
            alert(lang === 'ja'
                ? '⚠️ レッスンをキャンセルしました。クレジットは返金されません（24時間前以降）。必要に応じてサポートにお問い合わせください。'
                : '⚠️ Lesson cancelled. No credit refund (<24h notice). Contact support if you need assistance.');
        }

        // Refresh data
        await fetchBookingEligibility(bookingState.studentId, lang);
        await fetchUserBookings(bookingState.userId, lang);
        initializeEnhancedLessonsCard();

        // Open booking modal only if they got refund
        if (hoursUntilStart >= 24) {
            openBookingModal(lang);
        }

    } catch (err) {
        console.error('Error rescheduling lesson:', err);
        alert(lang === 'ja'
            ? '変更中にエラーが発生しました。もう一度お試しください。'
            : 'Failed to reschedule lesson. Please try again.');
    }
}

// Start countdown update interval
function startCountdownUpdates() {
    if (lessonsCardState.updateInterval) {
        clearInterval(lessonsCardState.updateInterval);
    }

    lessonsCardState.updateInterval = setInterval(() => {
        const countdowns = document.querySelectorAll('.lesson-countdown');
        if (countdowns.length === 0) {
            clearInterval(lessonsCardState.updateInterval);
            lessonsCardState.updateInterval = null;
            return;
        }

        // Re-render to update countdowns
        if (bookingState.userBookings && bookingState.userBookings.length > 0) {
            renderUpcomingLessonsCard(bookingState.userBookings);
        }
    }, 60000); // Update every minute
}

// Initialize - call this after fetching bookings
function initializeEnhancedLessonsCard() {
    // 🆕 Render for BOTH languages
    renderUpcomingLessonsCard(bookingState.userBookings || [], getCurrentLang());

    // Only start countdown if there are bookings
    if (bookingState.userBookings && bookingState.userBookings.length > 0) {
        startCountdownUpdates();
    }

    // Start auto-refresh for bookings without Meet links
    if (bookingState.userBookings) {
        bookingState.userBookings.forEach(booking => {
            if (!booking.google_meet_link && booking.google_calendar_event_id) {
                debugLog(`🔄 Starting auto-refresh for existing booking ${booking.id}`);
                meetLinkRefresh.start(booking.id, booking.google_calendar_event_id);
            }
        });
    }
}

// Make functions globally available
window.toggleLessonsExpanded = toggleLessonsExpanded;
window.cancelLesson = cancelLesson;
window.rescheduleLesson = rescheduleLesson;
window.initializeEnhancedLessonsCard = initializeEnhancedLessonsCard;
      // ================================
// AUTO-REFRESH MEET LINKS SYSTEM
// Polls Google Calendar every 30 seconds to check for manually added Meet links
// ================================

const meetLinkRefresh = {
    intervals: new Map(),
    maxAttempts: 10,

    start(bookingId, eventId) {
        debugLog(`🔄 Starting Meet link refresh for booking ${bookingId}`);

        if (this.intervals.has(bookingId)) {
            debugLog(`⚠️ Already polling for booking ${bookingId}`);
            return;
        }

        let attempts = 0;

        const checkAndUpdate = async () => {
            attempts++;
            debugLog(`🔍 Checking for Meet link (attempt ${attempts}/${this.maxAttempts})...`);

            try {
                const hasLink = await this.checkForMeetLink(bookingId, eventId);

                if (hasLink) {
                    debugLog('✅ Meet link found! Stopping refresh.');
                    this.stop(bookingId);

                    debugLog('🔄 Refreshing UI...');
                    await fetchUserBookings(bookingState.userId, 'en');
                    debugLog('📊 Bookings refreshed:', bookingState.userBookings.length);
                    initializeEnhancedLessonsCard();
                    debugLog('✅ UI updated!');
                } else if (attempts >= this.maxAttempts) {
                    debugLog('⏱️ Max attempts reached. Stopping refresh.');
                    this.stop(bookingId);
                }
            } catch (err) {
                console.error('❌ Error checking Meet link:', err);
            }
        };

        const intervalId = setInterval(checkAndUpdate, 30000);
        this.intervals.set(bookingId, intervalId);

        debugLog('⚡ Running immediate check...');
        checkAndUpdate();
    },

    stop(bookingId) {
        const intervalId = this.intervals.get(bookingId);
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete(bookingId);
            debugLog(`🛑 Stopped polling for booking ${bookingId}`);
        }
    },

    stopAll() {
        for (const [bookingId, intervalId] of this.intervals.entries()) {
            clearInterval(intervalId);
            debugLog(`🛑 Stopped polling for booking ${bookingId}`);
        }
        this.intervals.clear();
    },

    async checkForMeetLink(bookingId, eventId) {
        debugLog(`📡 Fetching event ${eventId} for booking ${bookingId}...`);

        try {
            const response = await fetch('https://luyzyzefgintksydmwoh.supabase.co/functions/v1/google-calendar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
                },
                body: JSON.stringify({
                    action: 'getEvent',
                    event_id: eventId,
                    booking_id: bookingId
                })
            });

            const result = await response.json();
            debugLog('📥 Event fetch result:', result);

            if (result.success && result.meet_link) {
                debugLog('📍 Meet link found:', result.meet_link);
                return true;
            }

            debugLog('⚠️ No Meet link yet');
            return false;

        } catch (err) {
            console.error('❌ Error fetching event:', err);
            return false;
        }
    }
};

// Update renderLessonCard to show "Meeting link loading" status

function renderLessonCard(lesson, isFirst = false, lang = 'en') { 
    const now = new Date();
    const lessonStart = new Date(lesson.scheduled_at);
    const lessonEnd = new Date(lessonStart.getTime() + lesson.duration_minutes * 60000);

    // Calculate time differences in minutes
    const minutesUntilStart = (lessonStart - now) / 60000;
    const minutesSinceEnd = (now - lessonEnd) / 60000;
    const hoursUntilStart = minutesUntilStart / 60;

    // Determine what to show
    const showMeetLink = minutesUntilStart <= 1440 && minutesSinceEnd <= 60 && lesson.google_meet_link;
    const showWaitingMessage = minutesUntilStart <= 1440 && !lesson.google_meet_link && lesson.google_calendar_event_id;
    const showReschedule = hoursUntilStart > 24; // >24h before
    const showCancel = minutesUntilStart > 60; // >1h before

    const within1h = minutesUntilStart > 0 && minutesUntilStart <= 60;

    // Status messages (bilingual)
    let statusBanner = '';
    if (minutesUntilStart < 0 && minutesSinceEnd < 0) {
        statusBanner = `<div class="lesson-status-banner in-progress"><i class="fas fa-circle"></i> ${
            lang === 'ja' ? 'レッスン進行中' : 'Lesson in progress'
        }</div>`;
    } else if (minutesSinceEnd > 0 && minutesSinceEnd <= 60) {
        statusBanner = `<div class="lesson-status-banner recently-ended"><i class="fas fa-info-circle"></i> ${
            lang === 'ja' ? 'レッスン終了 - Meetリンクはまだ利用可能' : 'Lesson ended recently - Meet link still available'
        }</div>`;
    } else if (!showCancel && !showReschedule) {
        statusBanner = `<div class="lesson-status-banner locked"><i class="fas fa-lock"></i> ${
            lang === 'ja' ? '変更不可 - サポートにお問い合わせください' : 'Too close to modify - contact support if needed'
        }</div>`;
    }

    const timeUntil = getTimeUntilLesson(lesson.scheduled_at, lang);
    const dateTime = formatLessonDateTime(lesson.scheduled_at, lang);

    return `
        <div class="lesson-item ${isFirst ? 'lesson-next' : ''}" data-lesson-id="${lesson.id}">
            ${statusBanner}

            <div class="lesson-info">
                <div class="lesson-datetime">
                    <i class="fas fa-calendar-alt"></i> ${dateTime}
                </div>
                <div class="lesson-countdown">
                    <i class="fas fa-clock"></i> ${timeUntil}
                </div>
            </div>

            <div class="lesson-actions">
                ${showMeetLink ? `
                    <button class="google-meet-btn ${within1h ? 'pulse' : ''}" 
                            onclick="window.open('${lesson.google_meet_link}', '_blank')"
                            title="${lang === 'ja' ? 'Google Meetに参加' : 'Join Google Meet'}">
                        <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                            <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                            <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                        </svg>
                        ${lang === 'ja' ? 'Google Meetに参加' : 'Join with Google Meet'}
                    </button>
                ` : showWaitingMessage ? `
                    <div class="meet-link-status">
                        <i class="fas fa-spinner fa-spin"></i>
                        ${lang === 'ja' ? 'Meetリンクは間もなく表示されます（自動更新中）' : 'Meet link will appear shortly (refreshing automatically)'}
                    </div>
                ` : ''}

                ${(showReschedule || showCancel) ? `
                    <div class="lesson-secondary-actions">
                        ${showReschedule ? `
                            <button class="lesson-action-btn reschedule-btn" 
        onclick="rescheduleLesson('${lesson.id}', '${lang}')"
                                    title="${lang === 'ja' ? 'レッスンを変更（24時間前まで無料）' : 'Reschedule lesson (free if >24h before)'}">
                                <i class="fas fa-calendar-edit"></i> ${lang === 'ja' ? '変更' : 'Reschedule'}
                            </button>
                        ` : ''}

                        ${showCancel ? `
                            <button class="lesson-action-btn cancel-btn" 
        onclick="cancelLesson('${lesson.id}', '${lang}')"
                                    title="${lang === 'ja' ? 'レッスンをキャンセル（24時間前まで返金）' : 'Cancel lesson (refund if >24h before)'}">
                                <i class="fas fa-times-circle"></i> ${lang === 'ja' ? 'キャンセル' : 'Cancel'}
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Clean up intervals when user leaves page
window.addEventListener('beforeunload', () => {
    meetLinkRefresh.stopAll();
});

debugLog('✅ Auto-refresh Meet link system loaded');
