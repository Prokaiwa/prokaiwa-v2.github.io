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

const achievements = [
    {
        code: 'first_session',
        icon: 'fas fa-play',
        name_ja: '初回完了',
        name_en: 'First Session',
        desc_ja: '初めての練習を完了しましょう',
        desc_en: 'Complete your first practice session',
        tier: 'bronze',
        condition: (stats) => stats.total >= 1,
        progress: (stats) => ({ current: Math.min(stats.total, 1), target: 1 })
    },
    {
        code: 'streak_3',
        icon: 'fas fa-fire',
        name_ja: '3日連続',
        name_en: '3-Day Streak',
        desc_ja: '3日間連続で練習しましょう',
        desc_en: 'Practice for 3 consecutive days',
        tier: 'bronze',
        condition: (stats) => stats.maxStreak >= 3,
        progress: (stats) => ({ current: Math.min(stats.current, 3), target: 3 })
    },
    {
        code: 'weekend_warrior',
        icon: 'fas fa-calendar-week',
        name_ja: '週末戦士',
        name_en: 'Weekend Warrior',
        desc_ja: '土曜日と日曜日の両方で練習しましょう',
        desc_en: 'Practice on both Saturday and Sunday',
        tier: 'bronze',
        condition: (stats) => {
            const dates = stats.practiceDates || [];
            let sat = false, sun = false;
            for (const d of dates) {
                const day = new Date(d).getDay();
                if (day === 6) sat = true;
                if (day === 0) sun = true;
                if (sat && sun) return true;
            }
            return false;
        },
        progress: (stats) => {
            const dates = stats.practiceDates || [];
            let sat = false, sun = false;
            for (const d of dates) {
                const day = new Date(d).getDay();
                if (day === 6) sat = true;
                if (day === 0) sun = true;
            }
            return { current: (sat ? 1 : 0) + (sun ? 1 : 0), target: 2 };
        }
    },
    {
        code: 'streak_7',
        icon: 'fas fa-calendar-check',
        name_ja: '7日連続',
        name_en: '7-Day Streak',
        desc_ja: '1週間毎日練習を続けましょう',
        desc_en: 'Keep a 7-day practice streak',
        tier: 'silver',
        condition: (stats) => stats.maxStreak >= 7,
        progress: (stats) => ({ current: Math.min(stats.current, 7), target: 7 })
    },
    {
        code: 'sessions_10',
        icon: 'fas fa-star',
        name_ja: '10回達成',
        name_en: '10 Sessions',
        desc_ja: '合計10回の練習を完了しましょう',
        desc_en: 'Complete 10 total practice sessions',
        tier: 'silver',
        condition: (stats) => stats.total >= 10,
        progress: (stats) => ({ current: Math.min(stats.total, 10), target: 10 })
    },
    {
        code: 'consistency_champion',
        icon: 'fas fa-trophy',
        name_ja: '継続王',
        name_en: 'Consistency Champion',
        desc_ja: '1ヶ月に20日以上練習しましょう',
        desc_en: 'Practice 20+ days in a single month',
        tier: 'gold',
        condition: (stats) => {
            const dates = stats.practiceDates || [];
            const months = {};
            for (const d of dates) {
                const ym = d.substring(0, 7);
                months[ym] = (months[ym] || 0) + 1;
            }
            return Object.values(months).some(c => c >= 20);
        },
        progress: (stats) => {
            const dates = stats.practiceDates || [];
            const months = {};
            for (const d of dates) {
                const ym = d.substring(0, 7);
                months[ym] = (months[ym] || 0) + 1;
            }
            const best = Math.max(0, ...Object.values(months));
            return { current: Math.min(best, 20), target: 20 };
        }
    },
    {
        code: 'streak_30',
        icon: 'fas fa-medal',
        name_ja: '30日連続',
        name_en: '30-Day Streak',
        desc_ja: '30日間連続で練習しましょう',
        desc_en: 'Maintain a 30-day practice streak',
        tier: 'gold',
        condition: (stats) => stats.maxStreak >= 30,
        progress: (stats) => ({ current: Math.min(stats.current, 30), target: 30 })
    },
    {
        code: 'golden_milestone',
        icon: 'fas fa-award',
        name_ja: 'ゴールデン達成',
        name_en: 'Golden Milestone',
        desc_ja: '合計50回の練習を達成しましょう',
        desc_en: 'Reach 50 total practice sessions',
        tier: 'gold',
        condition: (stats) => stats.total >= 50,
        progress: (stats) => ({ current: Math.min(stats.total, 50), target: 50 })
    },
    {
        code: 'sessions_100',
        icon: 'fas fa-crown',
        name_ja: '100回達成',
        name_en: '100 Sessions',
        desc_ja: '合計100回の練習を達成しましょう',
        desc_en: 'Complete 100 total practice sessions',
        tier: 'gold',
        condition: (stats) => stats.total >= 100,
        progress: (stats) => ({ current: Math.min(stats.total, 100), target: 100 })
    },
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

    grid.innerHTML = achievements.map(badge => {
        const earned = badge.condition(stats);
        if (earned) earnedCount++;
        const prog = badge.progress(stats);
        const progressPct = earned ? 100 : Math.round((prog.current / prog.target) * 100);

        const name = lang === 'ja' ? badge.name_ja : badge.name_en;
        const desc = lang === 'ja' ? badge.desc_ja : badge.desc_en;
        const earnedLabel = achievementsI18n[lang].earnedLabel;
        const tierClass = earned ? `tier-${badge.tier}` : 'tier-locked';
        const fillClass = earned ? `fill-${badge.tier}` : 'fill-locked';

        return `
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
    }).join('');

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
            practiceDates: practiceDates
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