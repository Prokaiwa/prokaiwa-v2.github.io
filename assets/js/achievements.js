// ============================================================
// Prokaiwa Achievements Page — Main Script
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

const PROKAIWA_DEBUG = false;
const debugLog = PROKAIWA_DEBUG ? console.log.bind(console) : () => {};

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

// =============================================
// i18n
// =============================================

const achievementsI18n = {
    ja: {
        loadingText: '読み込み中...',
        errorTitle: 'エラーが発生しました',
        errorMessage: 'ページを読み込めませんでした。',
        errorReload: '再読み込み',
        backToDashboard: 'ダッシュボードに戻る',
        pageTitle: '達成バッジ',
        pageSubtitle: '英語学習の成果を記録しましょう',
        badgesEarned: 'バッジ獲得',
        earnedLabel: '獲得済み！',
    },
    en: {
        loadingText: 'Loading...',
        errorTitle: 'Something went wrong',
        errorMessage: 'Could not load the page.',
        errorReload: 'Refresh',
        backToDashboard: 'Back to Dashboard',
        pageTitle: 'Achievements',
        pageSubtitle: 'Track your English learning milestones',
        badgesEarned: 'badges earned',
        earnedLabel: 'Earned!',
    }
};

function applyLanguage(lang) {
    const strings = achievementsI18n[lang];
    if (!strings) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (strings[key] !== undefined) {
            el.textContent = strings[key];
        }
    });
}

function getCurrentLang() {
    const stored = localStorage.getItem('prokaiwaLang');
    if (stored) return stored;
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('ja') ? 'ja' : 'en';
}

// =============================================
// ACHIEVEMENT DEFINITIONS
// =============================================


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
    { code: 'streak_7', category: 'core', icon: 'fas fa-calendar-check', tier: 'silver',
      name_ja: '7日連続', name_en: '7-Day Streak',
      desc_ja: '1週間毎日練習', desc_en: 'Keep a 7-day streak',
      condition: (s) => s.maxStreak >= 7,
      progress: (s) => ({ current: Math.min(s.current, 7), target: 7 }) },
    { code: 'streak_14', category: 'core', icon: 'fas fa-calendar-days', tier: 'silver',
      name_ja: '14日連続', name_en: '14-Day Streak',
      desc_ja: '2週間毎日練習', desc_en: 'Keep a 14-day streak',
      condition: (s) => s.maxStreak >= 14,
      progress: (s) => ({ current: Math.min(s.current, 14), target: 14 }) },
    { code: 'sessions_50', category: 'core', icon: 'fas fa-award', tier: 'silver',
      name_ja: '50回達成', name_en: '50 Sessions',
      desc_ja: '合計50回の練習を達成', desc_en: 'Reach 50 total sessions',
      condition: (s) => s.total >= 50,
      progress: (s) => ({ current: Math.min(s.total, 50), target: 50 }) },
    { code: 'streak_30', category: 'core', icon: 'fas fa-medal', tier: 'gold',
      name_ja: '30日連続', name_en: '30-Day Streak',
      desc_ja: '1ヶ月間毎日練習', desc_en: 'Maintain a 30-day streak',
      condition: (s) => s.maxStreak >= 30,
      progress: (s) => ({ current: Math.min(s.current, 30), target: 30 }) },
    { code: 'streak_60', category: 'core', icon: 'fas fa-shield-halved', tier: 'gold',
      name_ja: '60日連続', name_en: '60-Day Streak',
      desc_ja: '2ヶ月間毎日練習', desc_en: 'Maintain a 60-day streak',
      condition: (s) => s.maxStreak >= 60,
      progress: (s) => ({ current: Math.min(s.current, 60), target: 60 }) },
    { code: 'streak_90', category: 'core', icon: 'fas fa-crown', tier: 'gold',
      name_ja: '90日連続', name_en: '90-Day Streak',
      desc_ja: '3ヶ月間毎日練習', desc_en: 'Maintain a 90-day streak',
      condition: (s) => s.maxStreak >= 90,
      progress: (s) => ({ current: Math.min(s.current, 90), target: 90 }) },
    { code: 'sessions_100', category: 'core', icon: 'fas fa-certificate', tier: 'gold',
      name_ja: '100回達成', name_en: '100 Sessions',
      desc_ja: '合計100回の練習を達成', desc_en: 'Complete 100 sessions',
      condition: (s) => s.total >= 100,
      progress: (s) => ({ current: Math.min(s.total, 100), target: 100 }) },
    { code: 'sessions_250', category: 'core', icon: 'fas fa-ranking-star', tier: 'gold',
      name_ja: '250回達成', name_en: '250 Sessions',
      desc_ja: '合計250回の練習を達成', desc_en: 'Complete 250 sessions',
      condition: (s) => s.total >= 250,
      progress: (s) => ({ current: Math.min(s.total, 250), target: 250 }) },
    { code: 'sessions_500', category: 'core', icon: 'fas fa-gem', tier: 'gold',
      name_ja: '500回達成', name_en: '500 Sessions',
      desc_ja: '合計500回の練習を達成', desc_en: 'Complete 500 sessions',
      condition: (s) => s.total >= 500,
      progress: (s) => ({ current: Math.min(s.total, 500), target: 500 }) },
    { code: 'streak_365', category: 'core', icon: 'fas fa-infinity', tier: 'gold',
      name_ja: '365日連続', name_en: '365-Day Streak',
      desc_ja: '1年間毎日練習', desc_en: 'Practice every day for a year',
      condition: (s) => s.maxStreak >= 365,
      progress: (s) => ({ current: Math.min(s.current, 365), target: 365 }) },

    // ── SPEED & STYLE ──
    { code: 'weekend_warrior', category: 'style', icon: 'fas fa-calendar-week', tier: 'bronze',
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
    { code: 'blitz', category: 'style', icon: 'fas fa-bolt', tier: 'silver',
      name_ja: 'ブリッツ', name_en: 'Blitz',
      desc_ja: 'プロンプト送信後10分以内に回答', desc_en: 'Respond within 10 minutes of the 9am prompt',
      condition: (s) => countTimesInRange(s.practiceTimestamps || [], 9, 0, 9, 10) >= 1,
      progress: (s) => ({ current: Math.min(countTimesInRange(s.practiceTimestamps || [], 9, 0, 9, 10), 1), target: 1 }) },
    { code: 'morning_person', category: 'style', icon: 'fas fa-sun', tier: 'bronze',
      name_ja: 'モーニングパーソン', name_en: 'Morning Person',
      desc_ja: '午前10時前に3回練習', desc_en: 'Practice before 10am three times',
      condition: (s) => countTimesInRange(s.practiceTimestamps || [], 0, 0, 10, 0) >= 3,
      progress: (s) => ({ current: Math.min(countTimesInRange(s.practiceTimestamps || [], 0, 0, 10, 0), 3), target: 3 }) },
    { code: 'lunch_learner', category: 'style', icon: 'fas fa-utensils', tier: 'bronze',
      name_ja: 'ランチ学習者', name_en: 'Lunch Learner',
      desc_ja: '12時〜14時に3回練習', desc_en: 'Practice between 12-2pm three times',
      condition: (s) => countTimesInRange(s.practiceTimestamps || [], 12, 0, 14, 0) >= 3,
      progress: (s) => ({ current: Math.min(countTimesInRange(s.practiceTimestamps || [], 12, 0, 14, 0), 3), target: 3 }) },
    { code: 'commuter_crunch', category: 'style', icon: 'fas fa-train-subway', tier: 'bronze',
      name_ja: '通勤タイム', name_en: 'Commuter Crunch',
      desc_ja: '17:30〜19:00に3回練習', desc_en: 'Practice between 5:30-7pm three times',
      condition: (s) => countTimesInRange(s.practiceTimestamps || [], 17, 30, 19, 0) >= 3,
      progress: (s) => ({ current: Math.min(countTimesInRange(s.practiceTimestamps || [], 17, 30, 19, 0), 3), target: 3 }) },
    { code: 'consistency_champion', category: 'style', icon: 'fas fa-trophy', tier: 'gold',
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
    { code: 'perfect_month', category: 'style', icon: 'fas fa-check-double', tier: 'gold',
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
    { code: 'jan_2026', category: 'seasonal', icon: 'fas fa-snowflake', tier: 'silver',
      name_ja: '2026年1月', name_en: 'January 2026',
      desc_ja: '1月に15日以上練習', desc_en: '15+ practice days in January',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 1) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 1), 15), target: 15 }) },
    { code: 'feb_2026', category: 'seasonal', icon: 'fas fa-spa', tier: 'silver',
      name_ja: '2026年2月', name_en: 'February 2026',
      desc_ja: '2月に15日以上練習', desc_en: '15+ practice days in February',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 2) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 2), 15), target: 15 }) },
    { code: 'mar_2026', category: 'seasonal', icon: 'fas fa-seedling', tier: 'silver',
      name_ja: '2026年3月', name_en: 'March 2026',
      desc_ja: '3月に15日以上練習', desc_en: '15+ practice days in March',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 3) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 3), 15), target: 15 }) },
    { code: 'apr_2026', category: 'seasonal', icon: 'fas fa-fan', tier: 'silver',
      name_ja: '2026年4月', name_en: 'April 2026',
      desc_ja: '4月に15日以上練習', desc_en: '15+ practice days in April',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 4) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 4), 15), target: 15 }) },
    { code: 'may_2026', category: 'seasonal', icon: 'fas fa-leaf', tier: 'silver',
      name_ja: '2026年5月', name_en: 'May 2026',
      desc_ja: '5月に15日以上練習', desc_en: '15+ practice days in May',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 5) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 5), 15), target: 15 }) },
    { code: 'jun_2026', category: 'seasonal', icon: 'fas fa-cloud-rain', tier: 'silver',
      name_ja: '2026年6月', name_en: 'June 2026',
      desc_ja: '6月に15日以上練習', desc_en: '15+ practice days in June',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 6) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 6), 15), target: 15 }) },
    { code: 'jul_2026', category: 'seasonal', icon: 'fas fa-umbrella-beach', tier: 'silver',
      name_ja: '2026年7月', name_en: 'July 2026',
      desc_ja: '7月に15日以上練習', desc_en: '15+ practice days in July',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 7) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 7), 15), target: 15 }) },
    { code: 'aug_2026', category: 'seasonal', icon: 'fas fa-temperature-high', tier: 'silver',
      name_ja: '2026年8月', name_en: 'August 2026',
      desc_ja: '8月に15日以上練習', desc_en: '15+ practice days in August',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 8) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 8), 15), target: 15 }) },
    { code: 'sep_2026', category: 'seasonal', icon: 'fas fa-wind', tier: 'silver',
      name_ja: '2026年9月', name_en: 'September 2026',
      desc_ja: '9月に15日以上練習', desc_en: '15+ practice days in September',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 9) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 9), 15), target: 15 }) },
    { code: 'oct_2026', category: 'seasonal', icon: 'fas fa-mask', tier: 'silver',
      name_ja: '2026年10月', name_en: 'October 2026',
      desc_ja: '10月に15日以上練習', desc_en: '15+ practice days in October',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 10) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 10), 15), target: 15 }) },
    { code: 'nov_2026', category: 'seasonal', icon: 'fas fa-feather', tier: 'silver',
      name_ja: '2026年11月', name_en: 'November 2026',
      desc_ja: '11月に15日以上練習', desc_en: '15+ practice days in November',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 11) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 11), 15), target: 15 }) },
    { code: 'dec_2026', category: 'seasonal', icon: 'fas fa-gifts', tier: 'silver',
      name_ja: '2026年12月', name_en: 'December 2026',
      desc_ja: '12月に15日以上練習', desc_en: '15+ practice days in December',
      condition: (s) => countDaysInMonth(s.practiceDates || [], 2026, 12) >= 15,
      progress: (s) => ({ current: Math.min(countDaysInMonth(s.practiceDates || [], 2026, 12), 15), target: 15 }) },

    // ── HOLIDAY COLLECTION ──
    { code: 'new_years_day', category: 'holiday', icon: 'fas fa-champagne-glasses', tier: 'gold',
      name_ja: '元日', name_en: "New Year's Day",
      desc_ja: '1月1日に練習', desc_en: 'Practice on January 1st',
      condition: (s) => practicedOnDate(s.practiceDates || [], 1, 1),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 1, 1) ? 1 : 0, target: 1 }) },
    { code: 'coming_of_age', category: 'holiday', icon: 'fas fa-graduation-cap', tier: 'silver',
      name_ja: '成人の日', name_en: 'Coming of Age Day',
      desc_ja: '1月12日に練習（2026年）', desc_en: 'Practice on Coming of Age Day (Jan 12, 2026)',
      condition: (s) => practicedOnDate(s.practiceDates || [], 1, 12),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 1, 12) ? 1 : 0, target: 1 }) },
    { code: 'setsubun', category: 'holiday', icon: 'fas fa-hand-fist', tier: 'silver',
      name_ja: '節分', name_en: 'Setsubun',
      desc_ja: '2月3日に練習', desc_en: 'Practice on Setsubun (Feb 3)',
      condition: (s) => practicedOnDate(s.practiceDates || [], 2, 3),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 2, 3) ? 1 : 0, target: 1 }) },
    { code: 'valentines_day', category: 'holiday', icon: 'fas fa-heart', tier: 'silver',
      name_ja: 'バレンタインデー', name_en: "Valentine's Day",
      desc_ja: '2月14日に練習', desc_en: 'Practice on February 14th',
      condition: (s) => practicedOnDate(s.practiceDates || [], 2, 14),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 2, 14) ? 1 : 0, target: 1 }) },
    { code: 'hinamatsuri', category: 'holiday', icon: 'fas fa-chess-queen', tier: 'silver',
      name_ja: 'ひな祭り', name_en: 'Hinamatsuri',
      desc_ja: '3月3日に練習', desc_en: 'Practice on Hinamatsuri (Mar 3)',
      condition: (s) => practicedOnDate(s.practiceDates || [], 3, 3),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 3, 3) ? 1 : 0, target: 1 }) },
    { code: 'golden_week', category: 'holiday', icon: 'fas fa-coins', tier: 'gold',
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
    { code: 'cinco_de_mayo', category: 'holiday', icon: 'fas fa-pepper-hot', tier: 'silver',
      name_ja: 'シンコ・デ・マヨ', name_en: 'Cinco de Mayo',
      desc_ja: '5月5日に練習', desc_en: 'Practice on May 5th',
      condition: (s) => practicedOnDate(s.practiceDates || [], 5, 5),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 5, 5) ? 1 : 0, target: 1 }) },
    { code: 'tanabata', category: 'holiday', icon: 'fas fa-wand-magic-sparkles', tier: 'silver',
      name_ja: '七夕', name_en: 'Tanabata',
      desc_ja: '7月7日に練習', desc_en: 'Practice on Tanabata (Jul 7)',
      condition: (s) => practicedOnDate(s.practiceDates || [], 7, 7),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 7, 7) ? 1 : 0, target: 1 }) },
    { code: 'obon', category: 'holiday', icon: 'fas fa-dove', tier: 'silver',
      name_ja: 'お盆', name_en: 'Obon',
      desc_ja: '8月13〜15日に練習', desc_en: 'Practice during Obon (Aug 13-15)',
      condition: (s) => practicedOnDate(s.practiceDates || [], 8, 13) || practicedOnDate(s.practiceDates || [], 8, 14) || practicedOnDate(s.practiceDates || [], 8, 15),
      progress: (s) => ({ current: (practicedOnDate(s.practiceDates||[],8,13)||practicedOnDate(s.practiceDates||[],8,14)||practicedOnDate(s.practiceDates||[],8,15)) ? 1 : 0, target: 1 }) },
    { code: 'sports_day', category: 'holiday', icon: 'fas fa-dumbbell', tier: 'silver',
      name_ja: 'スポーツの日', name_en: 'Sports Day',
      desc_ja: '10月12日に練習（2026年）', desc_en: 'Practice on Sports Day (Oct 12, 2026)',
      condition: (s) => practicedOnDate(s.practiceDates || [], 10, 12),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 10, 12) ? 1 : 0, target: 1 }) },
    { code: 'halloween', category: 'holiday', icon: 'fas fa-ghost', tier: 'silver',
      name_ja: 'ハロウィン', name_en: 'Halloween',
      desc_ja: '10月31日に練習', desc_en: 'Practice on October 31st',
      condition: (s) => practicedOnDate(s.practiceDates || [], 10, 31),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 10, 31) ? 1 : 0, target: 1 }) },
    { code: 'culture_day', category: 'holiday', icon: 'fas fa-palette', tier: 'silver',
      name_ja: '文化の日', name_en: 'Culture Day',
      desc_ja: '11月3日に練習', desc_en: 'Practice on Culture Day (Nov 3)',
      condition: (s) => practicedOnDate(s.practiceDates || [], 11, 3),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 11, 3) ? 1 : 0, target: 1 }) },
    { code: 'labor_thanksgiving', category: 'holiday', icon: 'fas fa-handshake', tier: 'silver',
      name_ja: '勤労感謝の日', name_en: 'Labor Thanksgiving Day',
      desc_ja: '11月23日に練習', desc_en: 'Practice on November 23rd',
      condition: (s) => practicedOnDate(s.practiceDates || [], 11, 23),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 11, 23) ? 1 : 0, target: 1 }) },
    { code: 'christmas_eve', category: 'holiday', icon: 'fas fa-holly-berry', tier: 'silver',
      name_ja: 'クリスマスイブ', name_en: 'Christmas Eve',
      desc_ja: '12月24日に練習', desc_en: 'Practice on December 24th',
      condition: (s) => practicedOnDate(s.practiceDates || [], 12, 24),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 12, 24) ? 1 : 0, target: 1 }) },
    { code: 'christmas_day', category: 'holiday', icon: 'fas fa-gift', tier: 'gold',
      name_ja: 'クリスマス', name_en: 'Christmas Day',
      desc_ja: '12月25日に練習', desc_en: 'Practice on December 25th',
      condition: (s) => practicedOnDate(s.practiceDates || [], 12, 25),
      progress: (s) => ({ current: practicedOnDate(s.practiceDates || [], 12, 25) ? 1 : 0, target: 1 }) },
];


// =============================================
// STREAK CALCULATION (same as dashboard)
// =============================================

function calculateStreak(practiceDates) {
    if (!practiceDates || practiceDates.length === 0) return { current: 0, max: 0 };

    const sortedDates = [...practiceDates].sort((a, b) => new Date(b) - new Date(a));
    const today = new Date().toISOString().split('T')[0];
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
                if (diffDays === 1) { currentStreak++; lastDate = date; }
                else break;
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
            if (diffDays === 1) { tempStreak++; lastDate = date; }
            else { maxStreak = Math.max(maxStreak, tempStreak); tempStreak = 1; lastDate = date; }
        }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    return { current: currentStreak, max: maxStreak };
}

// =============================================
// RENDER
// =============================================

function renderBadges(stats, lang) {
    const grid = document.getElementById('badge-grid');
    if (!grid) return;

    let earnedCount = 0;
    let html = '';

    // Group by category
    for (const cat of achievementCategories) {
        const catBadges = achievements.filter(b => b.category === cat.id);
        if (catBadges.length === 0) continue;

        const catName = lang === 'ja' ? cat.name_ja : cat.name_en;
        const catEarned = catBadges.filter(b => b.condition(stats)).length;

        html += `
            <div class="badge-category-header">
                <div class="badge-category-title">
                    <i class="${cat.icon}"></i> ${catName}
                </div>
                <span class="badge-category-count">${catEarned}/${catBadges.length}</span>
            </div>
        `;

        for (const badge of catBadges) {
            const earned = badge.condition(stats);
            if (earned) earnedCount++;
            const prog = badge.progress(stats);
            const progressPct = earned ? 100 : Math.round((prog.current / prog.target) * 100);

            const name = lang === 'ja' ? badge.name_ja : badge.name_en;
            const desc = lang === 'ja' ? badge.desc_ja : badge.desc_en;
            const earnedLabel = achievementsI18n[lang].earnedLabel;
            const tierClass = earned ? `tier-${badge.tier}` : 'tier-locked';
            const fillClass = earned ? `fill-${badge.tier}` : 'fill-locked';

            html += `
                <div class="badge-card ${earned ? 'earned' : 'locked'}">
                    <div class="badge-icon ${tierClass}">
                        <i class="${badge.icon}"></i>
                    </div>
                    <div class="badge-info">
                        <div class="badge-name">${name}</div>
                        <div class="badge-description">${desc}</div>
                        <div class="badge-progress">
                            <div class="badge-progress-bar">
                                <div class="badge-progress-fill ${fillClass}" style="width: ${progressPct}%"></div>
                            </div>
                            ${earned
                                ? `<span class="badge-earned-label"><i class="fas fa-check"></i> ${earnedLabel}</span>`
                                : `<span class="badge-progress-text">${prog.current} / ${prog.target}</span>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }
    }

    grid.innerHTML = html;

    // Update summary
    document.getElementById('earned-count').textContent = earnedCount;
    document.getElementById('total-count').textContent = achievements.length;
    document.getElementById('overall-progress').style.width =
        `${Math.round((earnedCount / achievements.length) * 100)}%`;
}

// =============================================
// MAIN LOADER
// =============================================

async function loadAchievements() {
    const lang = getCurrentLang();
    applyLanguage(lang);

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            window.location.href = '/login.html';
            return;
        }

        const userId = session.user.id;

        // Fetch practice history
        const { data: messages, error } = await supabase
            .from('message_log')
            .select('created_at')
            .eq('user_id', userId)
            .eq('message_type', 'student_response')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading messages:', error);
        }

        const practiceDates = messages
            ? [...new Set(messages.map(m => m.created_at.split('T')[0]))]
            : [];

        const streakData = calculateStreak(practiceDates);

        const stats = {
            current: streakData.current,
            maxStreak: streakData.max,
            total: practiceDates.length,
            practiceDates: practiceDates,
            practiceTimestamps: messages ? messages.map(m => m.created_at) : []
        };

        renderBadges(stats, lang);

        // Show content
        document.getElementById('achievements-loading').style.display = 'none';
        document.getElementById('achievements-content').style.display = 'block';

    } catch (err) {
        console.error('Achievements load error:', err);
        document.getElementById('achievements-loading').style.display = 'none';
        document.getElementById('achievements-error').style.display = 'block';
    }
}

// =============================================
// LANGUAGE TOGGLE
// =============================================

document.querySelectorAll('.nav-lang-toggle button').forEach(button => {
    button.addEventListener('click', () => {
        const lang = button.dataset.lang;
        localStorage.setItem('prokaiwaLang', lang);
        applyLanguage(lang);

        // Re-render badges if data is loaded
        const content = document.getElementById('achievements-content');
        if (content && content.style.display !== 'none') {
            // Need to reload to re-render with new language
            loadAchievements();
        }

        document.querySelectorAll('.nav-lang-toggle button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.lang === lang) btn.classList.add('active');
        });
    });
});

// Set initial language
const initialLang = getCurrentLang();
document.querySelectorAll('.nav-lang-toggle button').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.lang === initialLang) btn.classList.add('active');
});

// Auth state change
supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.href = '/login.html';
});

// Load
loadAchievements();

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Burger menu (mobile nav)
const burgerMenu = document.querySelector('.burger-menu');
const mainNav = document.querySelector('.main-nav');
if (burgerMenu && mainNav) {
    burgerMenu.addEventListener('click', () => {
        mainNav.classList.toggle('open');
    });
}