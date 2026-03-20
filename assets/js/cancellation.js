// =====================================================
// ENHANCED CANCELLATION RETENTION SYSTEM
// =====================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';

const supabase = createClient(
    'https://luyzyzefgintksydmwoh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1eXp5emVmZ2ludGtzeWRtd29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NzYyMDUsImV4cCI6MjA2ODU1MjIwNX0.he5_j99ZtAj4K_zzgm11NEEv7TrbRJYndJXot25s_Kg',
    {
        auth: {
            persistSession: true,
            storageKey: 'prokaiwa-supabase-auth',
            storage: window.localStorage,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

// =====================================================
// CANCELLATION REASONS
// =====================================================

const cancellationReasons = {
    ja: [
        {
            id: 'expensive',
            icon: '💰',
            title: '料金が高すぎる',
            subtitle: '予算に合わない'
        },
        {
            id: 'not_using',
            icon: '📅',
            title: 'あまり利用していない',
            subtitle: '時間がない・忘れてしまう'
        },
        {
            id: 'too_difficult',
            icon: '😓',
            title: '内容が難しすぎる',
            subtitle: 'レベルが合わない'
        },
        {
            id: 'too_easy',
            icon: '😴',
            title: '内容が簡単すぎる',
            subtitle: '物足りない・退屈'
        },
        {
            id: 'scheduling',
            icon: '⏰',
            title: 'スケジュールが合わない',
            subtitle: 'レッスン時間が取れない'
        },
        {
            id: 'technical',
            icon: '🐛',
            title: '技術的な問題',
            subtitle: 'バグや不具合がある'
        },
        {
            id: 'goals_met',
            icon: '🎯',
            title: '目標を達成した',
            subtitle: 'もう必要ない'
        },
        {
            id: 'switching',
            icon: '🔄',
            title: '他のサービスに切り替える',
            subtitle: '別の選択肢を試したい'
        },
        {
            id: 'circumstances',
            icon: '👤',
            title: '個人的な事情',
            subtitle: '生活状況が変わった'
        },
        {
            id: 'other',
            icon: '📝',
            title: 'その他の理由',
            subtitle: '詳細を教えてください'
        }
    ],
    en: [
        {
            id: 'expensive',
            icon: '💰',
            title: "It's too expensive",
            subtitle: "Doesn't fit my budget"
        },
        {
            id: 'not_using',
            icon: '📅',
            title: "I'm not using it enough",
            subtitle: "Don't have time / Keep forgetting"
        },
        {
            id: 'too_difficult',
            icon: '😓',
            title: 'Content is too difficult',
            subtitle: "Level doesn't match"
        },
        {
            id: 'too_easy',
            icon: '😴',
            title: 'Content is too easy',
            subtitle: 'Not challenging enough'
        },
        {
            id: 'scheduling',
            icon: '⏰',
            title: "Schedule doesn't work",
            subtitle: "Can't find time for lessons"
        },
        {
            id: 'technical',
            icon: '🐛',
            title: 'Technical problems',
            subtitle: 'Bugs or issues with the service'
        },
        {
            id: 'goals_met',
            icon: '🎯',
            title: 'Achieved my goals',
            subtitle: "Don't need it anymore"
        },
        {
            id: 'switching',
            icon: '🔄',
            title: 'Switching to another service',
            subtitle: 'Want to try something different'
        },
        {
            id: 'circumstances',
            icon: '👤',
            title: 'Personal circumstances',
            subtitle: 'Life situation changed'
        },
        {
            id: 'other',
            icon: '📝',
            title: 'Other reason',
            subtitle: 'Please tell us more'
        }
    ]
};

// =====================================================
// REASON-SPECIFIC QUESTIONS
// =====================================================

const reasonQuestions = {
    expensive: {
        ja: [
            {
                id: 'value_aspect',
                type: 'radio',
                question: 'どの機能が一番価値があると感じますか？',
                required: true,
                options: [
                    { value: 'line_practice', label: '毎日のLINE練習' },
                    { value: 'video_lessons', label: '講師とのビデオレッスン' },
                    { value: 'feedback', label: 'パーソナライズされたフィードバック' },
                    { value: 'progress', label: '進捗トラッキング' },
                    { value: 'combination', label: 'すべての組み合わせ' }
                ]
            },
            {
                id: 'reasonable_price',
                type: 'radio',
                question: '得られる価値に対して、適正だと思う月額料金は？',
                required: true,
                options: [
                    { value: 'under_3000', label: '¥3,000未満' },
                    { value: '3000_4000', label: '¥3,000-4,000' },
                    { value: '4000_5000', label: '¥4,000-5,000' },
                    { value: '5000_6000', label: '¥5,000-6,000' },
                    { value: '6000_8000', label: '¥6,000-8,000' }
                ]
            },
            {
                id: 'price_perception',
                type: 'radio',
                question: '料金について、どのように感じていますか？',
                required: true,
                options: [
                    { value: 'much_higher', label: '予想よりかなり高い' },
                    { value: 'slightly_higher', label: '予想より少し高い' },
                    { value: 'fair_but_cant_afford', label: '適正だが、今は払えない' },
                    { value: 'found_cheaper', label: 'より安いサービスを見つけた' }
                ]
            },
            {
                id: 'stay_if_affordable',
                type: 'radio',
                question: 'より手頃なプランがあれば継続しますか？',
                required: true,
                options: [
                    { value: 'yes_definitely', label: 'はい、ぜひ継続したい' },
                    { value: 'yes_depending', label: 'はい、内容次第' },
                    { value: 'maybe', label: 'たぶん、詳細を見たい' },
                    { value: 'no', label: 'いいえ、価格だけが問題ではない' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: '料金について、その他のご意見があればお聞かせください',
                required: true,
                minLength: 20,
                placeholder: '例：もう少し安ければ続けたいです...'
            }
        ],
        en: [
            {
                id: 'value_aspect',
                type: 'radio',
                question: 'Which aspect provides the most value to you?',
                required: true,
                options: [
                    { value: 'line_practice', label: 'Daily LINE practice' },
                    { value: 'video_lessons', label: 'Video lessons with teachers' },
                    { value: 'feedback', label: 'Personalized feedback' },
                    { value: 'progress', label: 'Progress tracking' },
                    { value: 'combination', label: 'Combination of everything' }
                ]
            },
            {
                id: 'reasonable_price',
                type: 'radio',
                question: 'What monthly price would feel reasonable for the value?',
                required: true,
                options: [
                    { value: 'under_3000', label: 'Under ¥3,000' },
                    { value: '3000_4000', label: '¥3,000-4,000' },
                    { value: '4000_5000', label: '¥4,000-5,000' },
                    { value: '5000_6000', label: '¥5,000-6,000' },
                    { value: '6000_8000', label: '¥6,000-8,000' }
                ]
            },
            {
                id: 'price_perception',
                type: 'radio',
                question: 'How does our pricing compare to your expectations?',
                required: true,
                options: [
                    { value: 'much_higher', label: 'Much higher than expected' },
                    { value: 'slightly_higher', label: 'Slightly higher than expected' },
                    { value: 'fair_but_cant_afford', label: "Fair, but I can't afford it right now" },
                    { value: 'found_cheaper', label: 'I found a cheaper alternative' }
                ]
            },
            {
                id: 'stay_if_affordable',
                type: 'radio',
                question: 'Would you stay if we offered a more affordable plan?',
                required: true,
                options: [
                    { value: 'yes_definitely', label: 'Yes, definitely' },
                    { value: 'yes_depending', label: "Yes, depending on what's included" },
                    { value: 'maybe', label: "Maybe, I'd need to see the details" },
                    { value: 'no', label: "No, price isn't the only issue" }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Any other thoughts about pricing?',
                required: true,
                minLength: 20,
                placeholder: 'e.g., I would continue if it were more affordable...'
            }
        ]
    },

    not_using: {
        ja: [
            {
                id: 'usage_frequency',
                type: 'radio',
                question: '先月、実際にどのくらい利用しましたか？',
                required: true,
                options: [
                    { value: 'daily', label: '毎日（週5-7日）' },
                    { value: 'regularly', label: '定期的（週3-4日）' },
                    { value: 'occasionally', label: 'たまに（週1-2日）' },
                    { value: 'rarely', label: 'ほとんど使わなかった' },
                    { value: 'not_at_all', label: '全く使わなかった' }
                ]
            },
            {
                id: 'reason_not_using',
                type: 'radio',
                question: 'あまり使わなかった主な理由は？',
                required: true,
                options: [
                    { value: 'too_busy', label: '仕事や生活が忙しすぎる' },
                    { value: 'keep_forgetting', label: '忘れてしまう' },
                    { value: 'lost_motivation', label: 'やる気がなくなった' },
                    { value: 'harder_than_expected', label: '思ったより難しい' },
                    { value: 'not_seeing_progress', label: '上達を実感できない' },
                    { value: 'other', label: 'その他' }
                ]
            },
            {
                id: 'feeling_when_using',
                type: 'radio',
                question: '実際に使ったとき、どう感じますか？',
                required: true,
                options: [
                    { value: 'enjoy_and_learn', label: '楽しく学べている' },
                    { value: 'okay_not_exciting', label: '悪くないが、あまり刺激的ではない' },
                    { value: 'feels_like_chore', label: '義務のように感じる' },
                    { value: 'not_improving', label: '上達している気がしない' }
                ]
            },
            {
                id: 'what_would_help',
                type: 'radio',
                question: 'どうすれば継続的に使えるようになりますか？',
                required: true,
                options: [
                    { value: 'shorter_sessions', label: 'もっと短いレッスン' },
                    { value: 'more_engaging', label: 'もっと楽しいコンテンツ' },
                    { value: 'reminders', label: 'リマインダーと励まし' },
                    { value: 'faster_results', label: 'より早く結果が見える' },
                    { value: 'flexible_schedule', label: 'より柔軟なスケジュール' },
                    { value: 'nothing_helps', label: '今は何も役に立たない' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: '利用頻度について、その他のご意見があればお聞かせください',
                required: true,
                minLength: 20,
                placeholder: '例：時間を作りたいのですが...'
            }
        ],
        en: [
            {
                id: 'usage_frequency',
                type: 'radio',
                question: 'How often did you actually use Prokaiwa in the past month?',
                required: true,
                options: [
                    { value: 'daily', label: 'Daily (5-7 days/week)' },
                    { value: 'regularly', label: 'Regularly (3-4 days/week)' },
                    { value: 'occasionally', label: 'Occasionally (1-2 days/week)' },
                    { value: 'rarely', label: 'Rarely (few times in the month)' },
                    { value: 'not_at_all', label: 'Not at all' }
                ]
            },
            {
                id: 'reason_not_using',
                type: 'radio',
                question: "What's the main reason you're not using it more?",
                required: true,
                options: [
                    { value: 'too_busy', label: 'Too busy with work/life' },
                    { value: 'keep_forgetting', label: 'I keep forgetting' },
                    { value: 'lost_motivation', label: 'Lost motivation/interest' },
                    { value: 'harder_than_expected', label: "It's harder than I expected" },
                    { value: 'not_seeing_progress', label: "I don't see progress fast enough" },
                    { value: 'other', label: 'Other' }
                ]
            },
            {
                id: 'feeling_when_using',
                type: 'radio',
                question: 'When you DO use Prokaiwa, how do you feel about it?',
                required: true,
                options: [
                    { value: 'enjoy_and_learn', label: 'I enjoy it and learn from it' },
                    { value: 'okay_not_exciting', label: "It's okay, but not exciting" },
                    { value: 'feels_like_chore', label: 'It feels like a chore' },
                    { value: 'not_improving', label: "I don't feel like I'm improving" }
                ]
            },
            {
                id: 'what_would_help',
                type: 'radio',
                question: 'What would make you use it more consistently?',
                required: true,
                options: [
                    { value: 'shorter_sessions', label: 'Shorter, quicker sessions' },
                    { value: 'more_engaging', label: 'More engaging/fun content' },
                    { value: 'reminders', label: 'Reminders and accountability' },
                    { value: 'faster_results', label: 'Seeing faster results' },
                    { value: 'flexible_schedule', label: 'More flexible schedule' },
                    { value: 'nothing_helps', label: 'Nothing would help right now' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Any other thoughts about your usage?',
                required: true,
                minLength: 20,
                placeholder: 'e.g., I want to use it more but...'
            }
        ]
    },

    too_difficult: {
        ja: [
            {
                id: 'struggle_areas',
                type: 'checkbox',
                question: '最も苦戦している分野は？（複数選択可）',
                required: true,
                options: [
                    { value: 'grammar', label: '文法の説明が理解できない' },
                    { value: 'vocabulary', label: '語彙が難しすぎる' },
                    { value: 'speaking', label: '話す・発音の練習' },
                    { value: 'comprehension', label: 'ネイティブスピードの理解' },
                    { value: 'knowing_what_to_say', label: '何を言えばいいかわからない' },
                    { value: 'remembering', label: '学んだことを覚えられない' }
                ]
            },
            {
                id: 'feeling_during_practice',
                type: 'radio',
                question: 'レッスンや練習中、どう感じますか？',
                required: true,
                options: [
                    { value: 'completely_lost', label: '完全に理解できず圧倒される' },
                    { value: 'struggling_but_learning', label: '苦戦しているが、少しずつ学べている' },
                    { value: 'mostly_okay', label: 'ほとんど大丈夫だが、時々混乱する' },
                    { value: 'pace_too_fast', label: 'ペースが速すぎる' }
                ]
            },
            {
                id: 'reached_out_for_help',
                type: 'radio',
                question: '難しい内容について、助けを求めましたか？',
                required: true,
                options: [
                    { value: 'yes_still_struggled', label: 'はい、でもまだ苦戦している' },
                    { value: 'no_didnt_know', label: 'いいえ、サポートがあることを知らなかった' },
                    { value: 'no_embarrassed', label: 'いいえ、恥ずかしくて聞けなかった' },
                    { value: 'no_no_time', label: 'いいえ、時間がなかった' }
                ]
            },
            {
                id: 'what_would_help',
                type: 'radio',
                question: 'どうすれば、あなたのレベルで成功できますか？',
                required: true,
                options: [
                    { value: 'slower_progression', label: 'ゆっくりとした進度と復習' },
                    { value: 'japanese_explanations', label: '日本語でのシンプルな説明' },
                    { value: 'beginner_content', label: 'より初心者向けのコンテンツ' },
                    { value: 'one_on_one', label: '講師とのマンツーマンサポート' },
                    { value: 'lower_level', label: 'もっと低いレベルから始める' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: '難易度について、その他のご意見があればお聞かせください',
                required: true,
                minLength: 20,
                placeholder: '例：もっと基礎から学びたいです...'
            }
        ],
        en: [
            {
                id: 'struggle_areas',
                type: 'checkbox',
                question: 'Which areas do you struggle with most? (Select all that apply)',
                required: true,
                options: [
                    { value: 'grammar', label: 'Understanding grammar explanations' },
                    { value: 'vocabulary', label: 'Vocabulary is too advanced' },
                    { value: 'speaking', label: 'Speaking/pronunciation practice' },
                    { value: 'comprehension', label: 'Understanding native speed speech' },
                    { value: 'knowing_what_to_say', label: 'Knowing what to say in conversations' },
                    { value: 'remembering', label: 'Remembering what I learned' }
                ]
            },
            {
                id: 'feeling_during_practice',
                type: 'radio',
                question: 'How do you feel during lessons/practice?',
                required: true,
                options: [
                    { value: 'completely_lost', label: 'Completely lost and overwhelmed' },
                    { value: 'struggling_but_learning', label: 'Struggling but learning some things' },
                    { value: 'mostly_okay', label: 'Mostly okay with occasional confusion' },
                    { value: 'pace_too_fast', label: 'The pace is just too fast for me' }
                ]
            },
            {
                id: 'reached_out_for_help',
                type: 'radio',
                question: 'Did you reach out for help with difficult content?',
                required: true,
                options: [
                    { value: 'yes_still_struggled', label: 'Yes, but I still struggled' },
                    { value: 'no_didnt_know', label: "No, I didn't know help was available" },
                    { value: 'no_embarrassed', label: 'No, I felt embarrassed to ask' },
                    { value: 'no_no_time', label: "No, I didn't have time" }
                ]
            },
            {
                id: 'what_would_help',
                type: 'radio',
                question: 'What would help you succeed at your level?',
                required: true,
                options: [
                    { value: 'slower_progression', label: 'Slower progression with more review' },
                    { value: 'japanese_explanations', label: 'Simpler explanations in Japanese' },
                    { value: 'beginner_content', label: 'More beginner-friendly content' },
                    { value: 'one_on_one', label: 'One-on-one help from a teacher' },
                    { value: 'lower_level', label: 'Starting at a lower level' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Any other thoughts about the difficulty level?',
                required: true,
                minLength: 20,
                placeholder: 'e.g., I wish there was more foundational content...'
            }
        ]
    },

    too_easy: {
        ja: [
            {
                id: 'current_level',
                type: 'radio',
                question: 'あなたの現在の英語レベルは？',
                required: true,
                options: [
                    { value: 'advanced', label: '上級（C1-C2）：ネイティブに近い流暢さ' },
                    { value: 'upper_intermediate', label: '準上級（B2）：自信を持って会話できる' },
                    { value: 'intermediate', label: '中級（B1）：日常的な状況に対応できる' },
                    { value: 'not_advanced', label: '内容は簡単だが、そこまで上級ではない' }
                ]
            },
            {
                id: 'want_to_improve',
                type: 'checkbox',
                question: 'まだ伸ばしたい分野は？（複数選択可）',
                required: true,
                options: [
                    { value: 'advanced_vocab', label: '高度な語彙・表現' },
                    { value: 'business', label: 'ビジネス・専門英語' },
                    { value: 'pronunciation', label: '自然な発音とイントネーション' },
                    { value: 'complex_grammar', label: '複雑な文法（仮定法など）' },
                    { value: 'cultural_nuances', label: '文化的なニュアンスと慣用句' },
                    { value: 'fluency_speed', label: '流暢さとスピード' },
                    { value: 'none', label: 'なし、目標を達成した' }
                ]
            },
            {
                id: 'challenging_content',
                type: 'radio',
                question: 'どんなコンテンツなら挑戦的ですか？',
                required: true,
                options: [
                    { value: 'news', label: 'リアルなニュースと時事問題' },
                    { value: 'business', label: 'ビジネスシナリオとプレゼン' },
                    { value: 'academic', label: 'アカデミック・技術英語' },
                    { value: 'debate', label: 'ディベートと議論' },
                    { value: 'creative', label: 'クリエイティブライティング' },
                    { value: 'no_need', label: 'もう英語の練習は必要ない' }
                ]
            },
            {
                id: 'stay_for_advanced',
                type: 'radio',
                question: 'より高度なコンテンツがあれば継続しますか？',
                required: true,
                options: [
                    { value: 'yes_if_challenging', label: 'はい、本当に挑戦的なら' },
                    { value: 'maybe_depending', label: 'たぶん、トピック次第' },
                    { value: 'no_satisfied', label: 'いいえ、今のレベルで満足' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'コンテンツのレベルについて、その他のご意見があればお聞かせください',
                required: true,
                minLength: 20,
                placeholder: '例：もっと難しい内容が欲しいです...'
            }
        ],
        en: [
            {
                id: 'current_level',
                type: 'radio',
                question: 'How would you rate your current English level?',
                required: true,
                options: [
                    { value: 'advanced', label: 'Advanced (C1-C2): Near-native fluency' },
                    { value: 'upper_intermediate', label: 'Upper-Intermediate (B2): Confident conversations' },
                    { value: 'intermediate', label: 'Intermediate (B1): Can handle most daily situations' },
                    { value: 'not_advanced', label: "The content is easy but I'm not that advanced" }
                ]
            },
            {
                id: 'want_to_improve',
                type: 'checkbox',
                question: 'Which areas do you still want to improve? (Select all that apply)',
                required: true,
                options: [
                    { value: 'advanced_vocab', label: 'Advanced vocabulary/expressions' },
                    { value: 'business', label: 'Business/professional English' },
                    { value: 'pronunciation', label: 'Natural pronunciation and intonation' },
                    { value: 'complex_grammar', label: 'Complex grammar (conditionals, subjunctive, etc.)' },
                    { value: 'cultural_nuances', label: 'Cultural nuances and idioms' },
                    { value: 'fluency_speed', label: 'Fluency and speed' },
                    { value: 'none', label: "None, I've achieved my goals" }
                ]
            },
            {
                id: 'challenging_content',
                type: 'radio',
                question: 'What type of content would challenge you?',
                required: true,
                options: [
                    { value: 'news', label: 'Real-world news and current events' },
                    { value: 'business', label: 'Business scenarios and presentations' },
                    { value: 'academic', label: 'Academic/technical English' },
                    { value: 'debate', label: 'Debate and argumentation' },
                    { value: 'creative', label: 'Creative writing and storytelling' },
                    { value: 'no_need', label: "I don't need more English practice" }
                ]
            },
            {
                id: 'stay_for_advanced',
                type: 'radio',
                question: 'Would you stay for more advanced content?',
                required: true,
                options: [
                    { value: 'yes_if_challenging', label: 'Yes, if it was truly challenging' },
                    { value: 'maybe_depending', label: 'Maybe, depending on the topics' },
                    { value: 'no_satisfied', label: "No, I'm satisfied with my level now" }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Any other thoughts about the content level?',
                required: true,
                minLength: 20,
                placeholder: 'e.g., I need more challenging materials...'
            }
        ]
    },

    scheduling: {
        ja: [
            {
                id: 'scheduling_issue',
                type: 'radio',
                question: '具体的なスケジュールの問題は？',
                required: true,
                options: [
                    { value: 'work_conflicts', label: '仕事の時間と重なる' },
                    { value: 'irregular_schedule', label: '不規則な予定' },
                    { value: 'timezone', label: '時差の問題' },
                    { value: 'family', label: '家族・個人的な都合' },
                    { value: 'need_flexibility', label: 'もっと柔軟な予約が必要' }
                ]
            },
            {
                id: 'issue_with',
                type: 'radio',
                question: 'スケジュールの問題は：',
                required: true,
                options: [
                    { value: 'video_only', label: 'ビデオレッスンのみ' },
                    { value: 'line_practice', label: '毎日のLINE練習' },
                    { value: 'both', label: 'レッスンと練習の両方' },
                    { value: 'life_hectic', label: '全体的に生活が忙しすぎる' }
                ]
            },
            {
                id: 'what_would_solve',
                type: 'radio',
                question: 'どうすればスケジュールの問題が解決しますか？',
                required: true,
                options: [
                    { value: 'more_times', label: '早朝・深夜の枠を増やす' },
                    { value: 'recorded', label: 'いつでも見られる録画レッスン' },
                    { value: 'shorter', label: 'より短いレッスン（15-20分）' },
                    { value: 'pause', label: '忙しいときに一時停止できる' },
                    { value: 'nothing', label: '今は何も役に立たない' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'スケジュールについて、その他のご意見があればお聞かせください',
                required: true,
                minLength: 20,
                placeholder: '例：もっと柔軟な時間帯があれば...'
            }
        ],
        en: [
            {
                id: 'scheduling_issue',
                type: 'radio',
                question: 'What specific scheduling issue are you facing?',
                required: true,
                options: [
                    { value: 'work_conflicts', label: 'Work hours conflict with available lesson times' },
                    { value: 'irregular_schedule', label: 'Irregular/unpredictable schedule' },
                    { value: 'timezone', label: 'Time zone differences' },
                    { value: 'family', label: 'Family/personal commitments' },
                    { value: 'need_flexibility', label: 'I need more flexibility in booking' }
                ]
            },
            {
                id: 'issue_with',
                type: 'radio',
                question: 'Is the scheduling issue with:',
                required: true,
                options: [
                    { value: 'video_only', label: 'Video lessons only' },
                    { value: 'line_practice', label: 'Daily LINE practice' },
                    { value: 'both', label: 'Both lessons and practice' },
                    { value: 'life_hectic', label: 'My overall life is too hectic right now' }
                ]
            },
            {
                id: 'what_would_solve',
                type: 'radio',
                question: 'What would solve your scheduling problem?',
                required: true,
                options: [
                    { value: 'more_times', label: 'More early/late time slots' },
                    { value: 'recorded', label: 'Recorded lessons I can watch anytime' },
                    { value: 'shorter', label: 'Shorter lessons (15-20 min)' },
                    { value: 'pause', label: 'Ability to pause when life gets busy' },
                    { value: 'nothing', label: 'Nothing right now, life is just too busy' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Any other thoughts about scheduling?',
                required: true,
                minLength: 20,
                placeholder: 'e.g., I need more flexible timing...'
            }
        ]
    },

    technical: {
        ja: [
            {
                id: 'problems_experienced',
                type: 'checkbox',
                question: 'どんな技術的問題がありましたか？（複数選択可）',
                required: true,
                options: [
                    { value: 'line_not_delivering', label: 'LINEメッセージが届かない' },
                    { value: 'website_not_loading', label: 'ウェブサイト・ダッシュボードが読み込めない' },
                    { value: 'video_quality', label: 'ビデオ通話の品質問題' },
                    { value: 'login_issues', label: 'ログイン・認証の問題' },
                    { value: 'payment_errors', label: '支払い・請求のエラー' }
                ]
            },
            {
                id: 'problem_frequency',
                type: 'radio',
                question: 'どのくらいの頻度で問題が発生しましたか？',
                required: true,
                options: [
                    { value: 'constantly', label: '常に（毎日）' },
                    { value: 'frequently', label: '頻繁に（週に数回）' },
                    { value: 'occasionally', label: 'たまに（週に1回）' },
                    { value: 'rarely', label: 'ほとんどない（数回だけ）' }
                ]
            },
            {
                id: 'reported_to_support',
                type: 'radio',
                question: 'サポートに問題を報告しましたか？',
                required: true,
                options: [
                    { value: 'yes_resolved', label: 'はい、解決された' },
                    { value: 'yes_not_resolved', label: 'はい、でも解決しなかった' },
                    { value: 'yes_no_response', label: 'はい、でも返答がなかった' },
                    { value: 'no', label: 'いいえ、報告しなかった' }
                ]
            },
            {
                id: 'impact_on_experience',
                type: 'radio',
                question: 'これらの問題は、どのくらい影響しましたか？',
                required: true,
                options: [
                    { value: 'unusable', label: '完全に使えなくなった' },
                    { value: 'very_frustrating', label: '非常にイライラする、大きな支障' },
                    { value: 'annoying', label: 'イライラするが、何とか使えた' },
                    { value: 'minor', label: 'わずかな不便' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: '技術的な問題について、詳しく教えてください',
                required: true,
                minLength: 20,
                placeholder: '例：LINEでメッセージが届かないことが多く...'
            }
        ],
        en: [
            {
                id: 'problems_experienced',
                type: 'checkbox',
                question: 'What technical problems did you experience? (Select all that apply)',
                required: true,
                options: [
                    { value: 'line_not_delivering', label: 'LINE messages not delivering' },
                    { value: 'website_not_loading', label: 'Website/dashboard not loading' },
                    { value: 'video_quality', label: 'Video call quality issues' },
                    { value: 'login_issues', label: 'Login/authentication problems' },
                    { value: 'payment_errors', label: 'Payment/billing errors' }
                ]
            },
            {
                id: 'problem_frequency',
                type: 'radio',
                question: 'How often did you encounter these problems?',
                required: true,
                options: [
                    { value: 'constantly', label: 'Constantly (daily)' },
                    { value: 'frequently', label: 'Frequently (few times per week)' },
                    { value: 'occasionally', label: 'Occasionally (once per week)' },
                    { value: 'rarely', label: 'Rarely (few times total)' }
                ]
            },
            {
                id: 'reported_to_support',
                type: 'radio',
                question: 'Did you report the issue to support?',
                required: true,
                options: [
                    { value: 'yes_resolved', label: 'Yes, and it was resolved' },
                    { value: 'yes_not_resolved', label: "Yes, but the solution didn't work" },
                    { value: 'yes_no_response', label: 'Yes, but I never heard back' },
                    { value: 'no', label: "No, I didn't report it" }
                ]
            },
            {
                id: 'impact_on_experience',
                type: 'radio',
                question: 'How much did these issues impact your experience?',
                required: true,
                options: [
                    { value: 'unusable', label: 'Made it completely unusable' },
                    { value: 'very_frustrating', label: 'Very frustrating, major disruption' },
                    { value: 'annoying', label: 'Annoying but I could work around it' },
                    { value: 'minor', label: 'Minor inconvenience' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Please describe the technical problems in detail',
                required: true,
                minLength: 20,
                placeholder: 'e.g., LINE messages often failed to deliver...'
            }
        ]
    },

    goals_met: {
        ja: [
            {
                id: 'original_goal',
                type: 'radio',
                question: 'おめでとうございます！当初の目標は何でしたか？',
                required: true,
                options: [
                    { value: 'exam', label: '特定の試験に合格する（TOEIC、IELTSなど）' },
                    { value: 'conversation', label: '日常会話ができるようになる' },
                    { value: 'travel', label: '旅行・海外生活の準備' },
                    { value: 'work', label: '仕事・キャリアのため' },
                    { value: 'personal', label: '自己啓発' },
                    { value: 'other', label: 'その他' }
                ]
            },
            {
                id: 'time_to_achieve',
                type: 'radio',
                question: '目標達成にどのくらいかかりましたか？',
                required: true,
                options: [
                    { value: 'under_3', label: '3ヶ月未満' },
                    { value: '3_6', label: '3-6ヶ月' },
                    { value: '6_12', label: '6-12ヶ月' },
                    { value: 'over_year', label: '1年以上' }
                ]
            },
            {
                id: 'ongoing_needs',
                type: 'radio',
                question: '今後も英語を使う必要はありますか？',
                required: true,
                options: [
                    { value: 'maintain', label: 'はい、レベルを維持したい' },
                    { value: 'keep_improving', label: 'はい、さらに上達したい' },
                    { value: 'occasional', label: 'たぶん、たまに使う程度' },
                    { value: 'no', label: 'いいえ、今のレベルで満足' }
                ]
            },
            {
                id: 'use_maintenance',
                type: 'radio',
                question: '軽めの「維持プラン」を利用しますか？',
                required: true,
                options: [
                    { value: 'yes_avoid_losing', label: 'はい、学んだことを忘れないために' },
                    { value: 'maybe_if_affordable', label: 'たぶん、手頃な価格なら' },
                    { value: 'no_confident', label: 'いいえ、自分で維持できる自信がある' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Prokaiwaでの学習体験について、感想をお聞かせください',
                required: true,
                minLength: 20,
                placeholder: '例：目標を達成できて嬉しいです...'
            }
        ],
        en: [
            {
                id: 'original_goal',
                type: 'radio',
                question: 'Congratulations! What was your original goal?',
                required: true,
                options: [
                    { value: 'exam', label: 'Pass a specific exam (TOEIC, IELTS, etc.)' },
                    { value: 'conversation', label: 'Get comfortable with daily conversation' },
                    { value: 'travel', label: 'Prepare for travel/living abroad' },
                    { value: 'work', label: 'Improve for work/career' },
                    { value: 'personal', label: 'Personal enrichment' },
                    { value: 'other', label: 'Other' }
                ]
            },
            {
                id: 'time_to_achieve',
                type: 'radio',
                question: 'How long did it take to achieve your goal?',
                required: true,
                options: [
                    { value: 'under_3', label: 'Less than 3 months' },
                    { value: '3_6', label: '3-6 months' },
                    { value: '6_12', label: '6-12 months' },
                    { value: 'over_year', label: 'Over a year' }
                ]
            },
            {
                id: 'ongoing_needs',
                type: 'radio',
                question: 'Do you have any ongoing English needs?',
                required: true,
                options: [
                    { value: 'maintain', label: 'Yes, I need to maintain my level' },
                    { value: 'keep_improving', label: 'Yes, I want to keep improving' },
                    { value: 'occasional', label: 'Maybe, for occasional use' },
                    { value: 'no', label: "No, I'm satisfied where I am" }
                ]
            },
            {
                id: 'use_maintenance',
                type: 'radio',
                question: 'Would you use a light "maintenance plan"?',
                required: true,
                options: [
                    { value: 'yes_avoid_losing', label: 'Yes, to avoid losing what I learned' },
                    { value: 'maybe_if_affordable', label: 'Maybe, if it\'s very affordable' },
                    { value: 'no_confident', label: "No, I'm confident I'll maintain on my own" }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Please share your thoughts about your learning experience with Prokaiwa',
                required: true,
                minLength: 20,
                placeholder: 'e.g., I\'m happy I achieved my goal...'
            }
        ]
    },

    switching: {
        ja: [
            {
                id: 'service_name',
                type: 'text',
                question: 'どのサービスに切り替えますか？',
                required: true,
                minLength: 2,
                placeholder: 'サービス名を入力してください'
            },
            {
                id: 'what_attracted',
                type: 'radio',
                question: 'そのサービスの何が魅力的でしたか？',
                required: true,
                options: [
                    { value: 'lower_price', label: 'より安い' },
                    { value: 'features', label: 'Prokaiwaにない機能がある' },
                    { value: 'schedule', label: 'より良いスケジュール・形式' },
                    { value: 'recommended', label: '友人に勧められた' },
                    { value: 'marketing', label: 'マーケティング・試用版が良かった' }
                ]
            },
            {
                id: 'wish_we_had',
                type: 'textarea',
                question: 'そのサービスにあって、Prokaiwaに欲しい機能は？',
                required: true,
                minLength: 20,
                placeholder: '例：グループレッスンやネイティブとの交流など...'
            },
            {
                id: 'if_matched',
                type: 'radio',
                question: '同等以上の提案があれば、継続しますか？',
                required: true,
                options: [
                    { value: 'yes_prefer', label: 'はい、同等なら Prokaiwa の方が好きです' },
                    { value: 'maybe', label: 'たぶん、詳細を見たい' },
                    { value: 'no', label: 'いいえ、別のサービスを試したい' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: '他サービスとの比較について、その他のご意見があればお聞かせください',
                required: true,
                minLength: 20,
                placeholder: '例：新しいサービスを試してみたいです...'
            }
        ],
        en: [
            {
                id: 'service_name',
                type: 'text',
                question: 'Which service are you switching to?',
                required: true,
                minLength: 2,
                placeholder: 'Enter the service name'
            },
            {
                id: 'what_attracted',
                type: 'radio',
                question: 'What attracted you to that service?',
                required: true,
                options: [
                    { value: 'lower_price', label: 'Lower price' },
                    { value: 'features', label: "Features we don't have" },
                    { value: 'schedule', label: 'Better schedule/format' },
                    { value: 'recommended', label: 'Recommended by friend' },
                    { value: 'marketing', label: 'Better marketing/trial experience' }
                ]
            },
            {
                id: 'wish_we_had',
                type: 'textarea',
                question: 'What do they offer that you wish we had?',
                required: true,
                minLength: 20,
                placeholder: 'e.g., Group lessons, native speaker exchange, etc...'
            },
            {
                id: 'if_matched',
                type: 'radio',
                question: 'If we matched or exceeded their offer, would you stay?',
                required: true,
                options: [
                    { value: 'yes_prefer', label: 'Yes, I prefer Prokaiwa if pricing/features match' },
                    { value: 'maybe', label: "Maybe, I'd need to see the details" },
                    { value: 'no', label: 'No, I want to try something different' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Any other thoughts about switching services?',
                required: true,
                minLength: 20,
                placeholder: 'e.g., I want to try something new...'
            }
        ]
    },

    circumstances: {
        ja: [
            {
                id: 'what_changed',
                type: 'radio',
                question: '生活状況で何が変わりましたか？',
                required: true,
                options: [
                    { value: 'lost_job', label: '仕事を失った・経済的困難' },
                    { value: 'new_job', label: '新しい仕事・忙しすぎる' },
                    { value: 'family', label: '家族の状況（出産、介護など）' },
                    { value: 'health', label: '健康上の問題' },
                    { value: 'moving', label: '引っ越し・転勤' },
                    { value: 'prefer_not_say', label: '答えたくない' }
                ]
            },
            {
                id: 'temporary_or_longterm',
                type: 'radio',
                question: 'この変化は一時的ですか？長期的ですか？',
                required: true,
                options: [
                    { value: 'temporary', label: '一時的（数週間〜数ヶ月）' },
                    { value: 'uncertain', label: 'わからない' },
                    { value: 'permanent', label: '永続的・長期的' }
                ]
            },
            {
                id: 'plan_to_continue',
                type: 'radio',
                question: 'いずれは英語学習を再開する予定ですか？',
                required: true,
                options: [
                    { value: 'yes', label: 'はい、状況が改善したら' },
                    { value: 'maybe', label: 'たぶん、わからない' },
                    { value: 'no', label: 'いいえ、今は人生のタイミングが合わない' }
                ]
            },
            {
                id: 'pause_instead',
                type: 'radio',
                question: 'キャンセルではなく、一時停止の方がいいですか？',
                required: true,
                options: [
                    { value: 'yes_1_3', label: 'はい、1〜3ヶ月停止したい' },
                    { value: 'maybe', label: 'たぶん、再開時期がわからない' },
                    { value: 'no', label: 'いいえ、完全にキャンセルする必要がある' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: '状況について、その他のご意見があればお聞かせください',
                required: true,
                minLength: 20,
                placeholder: '例：今は難しい時期ですが...'
            }
        ],
        en: [
            {
                id: 'what_changed',
                type: 'radio',
                question: 'What changed in your life?',
                required: true,
                options: [
                    { value: 'lost_job', label: 'Lost job / Financial hardship' },
                    { value: 'new_job', label: 'New job / Too busy with work' },
                    { value: 'family', label: 'Family situation (new baby, caring for family, etc.)' },
                    { value: 'health', label: 'Health issues' },
                    { value: 'moving', label: 'Moving/relocating' },
                    { value: 'prefer_not_say', label: 'Prefer not to say' }
                ]
            },
            {
                id: 'temporary_or_longterm',
                type: 'radio',
                question: 'Is this change temporary or long-term?',
                required: true,
                options: [
                    { value: 'temporary', label: 'Temporary (few weeks to few months)' },
                    { value: 'uncertain', label: 'Uncertain' },
                    { value: 'permanent', label: 'Permanent/long-term' }
                ]
            },
            {
                id: 'plan_to_continue',
                type: 'radio',
                question: 'Do you plan to continue English learning eventually?',
                required: true,
                options: [
                    { value: 'yes', label: 'Yes, when circumstances improve' },
                    { value: 'maybe', label: 'Maybe, not sure' },
                    { value: 'no', label: "No, this isn't the right time in my life" }
                ]
            },
            {
                id: 'pause_instead',
                type: 'radio',
                question: 'Would a pause option help instead of canceling?',
                required: true,
                options: [
                    { value: 'yes_1_3', label: 'Yes, I\'d like to pause for 1-3 months' },
                    { value: 'maybe', label: "Maybe, but I'm not sure when I'll resume" },
                    { value: 'no', label: 'No, I need to fully cancel right now' }
                ]
            },
            {
                id: 'additional_comments',
                type: 'textarea',
                question: 'Any other thoughts about your situation?',
                required: true,
                minLength: 20,
                placeholder: "e.g., It's a difficult time right now but..."
            }
        ]
    },

    other: {
        ja: [
            {
                id: 'reason_text',
                type: 'textarea',
                question: 'キャンセルする理由を教えてください',
                required: true,
                minLength: 20,
                placeholder: 'できるだけ詳しく教えてください...'
            },
            {
                id: 'overall_rating',
                type: 'radio',
                question: '全体的な体験を評価してください',
                required: true,
                options: [
                    { value: '5', label: '⭐⭐⭐⭐⭐ 素晴らしい' },
                    { value: '4', label: '⭐⭐⭐⭐ 良い' },
                    { value: '3', label: '⭐⭐⭐ 普通' },
                    { value: '2', label: '⭐⭐ いまいち' },
                    { value: '1', label: '⭐ 悪い' }
                ]
            },
            {
                id: 'could_have_done',
                type: 'textarea',
                question: '私たちができたことはありましたか？',
                required: false,
                minLength: 0,
                placeholder: 'サービス改善のため、率直なご意見をお聞かせください...'
            },
            {
                id: 'would_recommend',
                type: 'radio',
                question: 'Prokaiwaを他の人に勧めますか？',
                required: true,
                options: [
                    { value: 'yes_definitely', label: 'はい、絶対に' },
                    { value: 'yes_with_reservations', label: 'はい、条件付きで' },
                    { value: 'neutral', label: 'どちらでもない' },
                    { value: 'no', label: 'いいえ、たぶん勧めない' }
                ]
            }
        ],
        en: [
            {
                id: 'reason_text',
                type: 'textarea',
                question: 'Please tell us why you\'re canceling',
                required: true,
                minLength: 20,
                placeholder: 'Please be as detailed as possible...'
            },
            {
                id: 'overall_rating',
                type: 'radio',
                question: 'How would you rate your overall experience?',
                required: true,
                options: [
                    { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
                    { value: '4', label: '⭐⭐⭐⭐ Good' },
                    { value: '3', label: '⭐⭐⭐ Average' },
                    { value: '2', label: '⭐⭐ Below Average' },
                    { value: '1', label: '⭐ Poor' }
                ]
            },
            {
                id: 'could_have_done',
                type: 'textarea',
                question: 'Is there anything we could have done differently?',
                required: false,
                minLength: 0,
                placeholder: 'Your honest feedback helps us improve...'
            },
            {
                id: 'would_recommend',
                type: 'radio',
                question: 'Would you recommend Prokaiwa to others?',
                required: true,
                options: [
                    { value: 'yes_definitely', label: 'Yes, definitely' },
                    { value: 'yes_with_reservations', label: 'Yes, with reservations' },
                    { value: 'neutral', label: 'Neutral' },
                    { value: 'no', label: 'No, probably not' }
                ]
            }
        ]
    }
};

// =====================================================
// UNIVERSAL QUESTIONS (Asked to Everyone)
// =====================================================

const universalQuestions = {
    ja: [
        {
            id: 'satisfaction_rating',
            type: 'rating',
            question: 'Prokaiwaでの体験を5段階で評価してください',
            required: true
        },
        {
            id: 'would_recommend',
            type: 'radio',
            question: '友人にProkaiwaを勧めますか？',
            required: true,
            options: [
                { value: 'yes_definitely', label: 'はい、絶対に' },
                { value: 'yes_maybe', label: 'はい、たぶん' },
                { value: 'neutral', label: 'どちらでもない' },
                { value: 'no', label: 'いいえ' }
            ]
        },
        {
            id: 'what_could_improve',
            type: 'textarea',
            question: 'サービス改善のため、率直なご意見をお聞かせください',
            required: false,
            minLength: 0,
            placeholder: 'より良いサービスにするため、あなたのご意見をお聞かせください...'
        }
    ],
    en: [
        {
            id: 'satisfaction_rating',
            type: 'rating',
            question: 'How would you rate your experience with Prokaiwa?',
            required: true
        },
        {
            id: 'would_recommend',
            type: 'radio',
            question: 'Would you recommend Prokaiwa to a friend?',
            required: true,
            options: [
                { value: 'yes_definitely', label: 'Yes, definitely' },
                { value: 'yes_maybe', label: 'Yes, probably' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'no', label: 'No' }
            ]
        },
        {
            id: 'what_could_improve',
            type: 'textarea',
            question: 'What could we do better?',
            required: false,
            minLength: 0,
            placeholder: 'Your honest feedback helps us improve...'
        }
    ]
};

// =====================================================
// RETENTION OFFERS (Based on Reason + Answers)
// =====================================================

const retentionOffers = {
    expensive: {
    ja: {
        downgrade: {
            title: '💡 お待ちください！',
            subtitle: 'より手頃なプランをご用意しました',
            description: 'パワーパック・ライトからLINE練習プランにダウングレードしませんか？毎日の練習は維持しながら、料金を抑えられます。',
            features: [
                '毎日のLINE練習（変わらず）',
                '週1回の総合フィードバック',
                '月額¥6,000（¥4,000お得）'
            ],
            primaryAction: {
                text: 'LINE練習プランにダウングレード',
                type: 'downgrade',
                data: { newPlan: 'LINE' }
            },
            secondaryAction: {
                text: 'いいえ、キャンセルします',
                type: 'decline'
            }
        },
        discount: {
            title: '✨ 特別オファー',
            subtitle: '3ヶ月間20%割引',
            description: '継続していただくため、今後3ヶ月間20%割引を適用させていただきます。',
            features: [
                '現在のプランそのまま',
                '今後3ヶ月間20%オフ',
                'LINE練習プラン: 月額¥4,800（通常¥6,000）',
                'パワーパック・ライト: 月額¥8,000（通常¥10,000）',
                'パワーパック・プロ: 月額¥12,800（通常¥16,000）'
            ],
            primaryAction: {
                text: '割引を利用する',
                type: 'discount',
                data: { couponCode: 'RETAIN_20PCT_3MO' }
            },
            secondaryAction: {
                text: 'いいえ、キャンセルします',
                type: 'decline'
            }
        }
    },
    en: {
        downgrade: {
            title: '💡 Wait! We Have a Solution',
            subtitle: "A more affordable plan that still helps you improve",
            description: "Keep your daily practice but save money with the LINE Practice Plan - all the core features at a lower price.",
            features: [
                'Daily LINE practice (unchanged)',
                'Weekly comprehensive feedback',
                '¥6,000/month (Save ¥4,000)'
            ],
            primaryAction: {
                text: 'Switch to LINE Practice Plan',
                type: 'downgrade',
                data: { newPlan: 'LINE' }
            },
            secondaryAction: {
                text: 'No, cancel my subscription',
                type: 'decline'
            }
        },
        discount: {
            title: '✨ Special Offer for You',
            subtitle: '20% off for 3 months',
            description: "We'd love to keep you as a student. Accept this 20% discount for the next 3 months.",
            features: [
                'Keep your current plan',
                '20% off for 3 months',
                'LINE Practice: ¥4,800/month (normally ¥6,000)',
                'Power Pack Lite: ¥8,000/month (normally ¥10,000)',
                'Power Pack Pro: ¥12,800/month (normally ¥16,000)'
            ],
            primaryAction: {
                text: 'Accept Discount',
                type: 'discount',
                data: { couponCode: 'RETAIN_20PCT_3MO' }
            },
            secondaryAction: {
                text: 'No, cancel my subscription',
                type: 'decline'
            }
        }
    }
},
    
    not_using: {
        ja: {
            pause: {
                title: '⏸️ 一時停止はいかがですか？',
                subtitle: '今は休んで、準備ができたら再開',
                description: 'キャンセルではなく、1〜3ヶ月間サブスクリプションを一時停止しませんか？',
                features: [
                    '料金は一時停止中かかりません',
                    '進捗とクレジットは保存されます',
                    '準備ができたらいつでも再開可能'
                ],
                primaryAction: {
                    text: '一時停止する',
                    type: 'pause',
                    data: { pauseMonths: 2 }
                },
                secondaryAction: {
                    text: 'いいえ、キャンセルします',
                    type: 'decline'
                }
            }
        },
        en: {
            pause: {
                title: '⏸️ How About a Pause Instead?',
                subtitle: 'Take a break now, resume when ready',
                description: "Instead of canceling, why not pause your subscription for 1-3 months? No charges while paused.",
                features: [
                    'No charges while paused',
                    'Your progress and credits are saved',
                    'Resume anytime when ready'
                ],
                primaryAction: {
                    text: 'Pause Subscription',
                    type: 'pause',
                    data: { pauseMonths: 2 }
                },
                secondaryAction: {
                    text: 'No, cancel my subscription',
                    type: 'decline'
                }
            }
        }
    },
    
    too_difficult: {
        ja: {
            consultation: {
                title: '🎯 無料相談をご利用ください',
                subtitle: 'あなたに最適な学習プランを作りましょう',
                description: '講師との無料30分相談で、あなたのレベルに合った学習プランをカスタマイズします。',
                features: [
                    '30分の無料マンツーマン相談',
                    'パーソナライズされた学習プラン',
                    'より簡単なコンテンツへのアクセス'
                ],
                primaryAction: {
                    text: '相談を予約する',
                    type: 'consultation',
                    data: { freeConsultation: true }
                },
                secondaryAction: {
                    text: 'いいえ、キャンセルします',
                    type: 'decline'
                }
            }
        },
        en: {
            consultation: {
                title: '🎯 Let Us Help You Succeed',
                subtitle: "Free consultation to create your perfect learning plan",
                description: "Book a free 30-minute session with a teacher to customize content for your level.",
                features: [
                    'Free 30-minute one-on-one consultation',
                    'Personalized learning plan',
                    'Access to beginner-friendly content'
                ],
                primaryAction: {
                    text: 'Book Free Consultation',
                    type: 'consultation',
                    data: { freeConsultation: true }
                },
                secondaryAction: {
                    text: 'No, cancel my subscription',
                    type: 'decline'
                }
            }
        }
    },
    
    too_easy: {
        ja: {
            waitlist: {
                title: '🚀 上級者向けコンテンツ開発中',
                subtitle: 'あなたのような学習者のために準備中です',
                description: 'より高度なコンテンツを開発中です。ウェイトリストに参加して、準備ができたらすぐにお知らせします。',
                features: [
                    'ニュース・時事問題の議論',
                    'ビジネス英語シナリオ',
                    '高度な文法と語彙',
                    'ウェイトリスト参加者限定50%割引'
                ],
                primaryAction: {
                    text: 'ウェイトリストに参加',
                    type: 'waitlist',
                    data: { waitlistType: 'advanced_content' }
                },
                secondaryAction: {
                    text: 'いいえ、キャンセルします',
                    type: 'decline'
                }
            }
        },
        en: {
            waitlist: {
                title: '🚀 Advanced Content Coming Soon',
                subtitle: "We're building it for learners like you",
                description: "We're developing more challenging content. Join our waitlist and we'll notify you as soon as it's ready.",
                features: [
                    'Real-world news discussions',
                    'Business English scenarios',
                    'Advanced grammar & vocabulary',
                    '50% discount for waitlist members'
                ],
                primaryAction: {
                    text: 'Join Waitlist',
                    type: 'waitlist',
                    data: { waitlistType: 'advanced_content' }
                },
                secondaryAction: {
                    text: 'No, cancel my subscription',
                    type: 'decline'
                }
            }
        }
    },
    
    scheduling: {
        ja: {
            pause: {
                title: '⏸️ スケジュールが落ち着くまで一時停止',
                subtitle: '今は休んで、時間ができたら再開',
                description: '忙しい時期は一時停止して、スケジュールが落ち着いたら再開しませんか？',
                features: [
                    '一時停止中は料金なし',
                    '進捗は保存されます',
                    'いつでも再開可能'
                ],
                primaryAction: {
                    text: '一時停止する',
                    type: 'pause',
                    data: { pauseMonths: 2 }
                },
                secondaryAction: {
                    text: 'いいえ、キャンセルします',
                    type: 'decline'
                }
            }
        },
        en: {
            pause: {
                title: '⏸️ Pause Until Your Schedule Clears',
                subtitle: 'Take a break now, resume when you have time',
                description: "Pause during this busy period and resume when your schedule allows.",
                features: [
                    'No charges while paused',
                    'Your progress is saved',
                    'Resume anytime'
                ],
                primaryAction: {
                    text: 'Pause Subscription',
                    type: 'pause',
                    data: { pauseMonths: 2 }
                },
                secondaryAction: {
                    text: 'No, cancel my subscription',
                    type: 'decline'
                }
            }
        }
    },
    
    technical: {
        ja: {
            support: {
                title: '🔧 技術サポートにお任せください',
                subtitle: '問題を解決するまで無料で延長',
                description: '技術的な問題は私たちの責任です。問題を解決するまで、1ヶ月無料で延長させていただきます。',
                features: [
                    '優先技術サポート',
                    '問題解決まで1ヶ月無料',
                    '専任サポート担当者'
                ],
                primaryAction: {
                    text: 'サポートを受ける',
                    type: 'technical_support',
                    data: { freeMonth: true, prioritySupport: true }
                },
                secondaryAction: {
                    text: 'いいえ、キャンセルします',
                    type: 'decline'
                }
            }
        },
        en: {
            support: {
                title: '🔧 Let Our Support Team Fix This',
                subtitle: 'Free month while we resolve your issues',
                description: "Technical problems are on us. We'll give you a free month while we fix everything.",
                features: [
                    'Priority technical support',
                    '1 month free while we fix issues',
                    'Dedicated support representative'
                ],
                primaryAction: {
                    text: 'Get Support',
                    type: 'technical_support',
                    data: { freeMonth: true, prioritySupport: true }
                },
                secondaryAction: {
                    text: 'No, cancel my subscription',
                    type: 'decline'
                }
            }
        }
    },
    
    goals_met: {
        ja: {
            alumni: {
                title: '🎓 おめでとうございます！アルムナイになりませんか',
                subtitle: '今後いつでも50%割引で戻れます',
                description: '目標達成、素晴らしいです！アルムナイになると、いつでも50%割引で戻ってこられます。',
                features: [
                    '生涯有効の50%割引コード',
                    'いつでも再開可能',
                    'アルムナイ限定の新コンテンツへの早期アクセス'
                ],
                primaryAction: {
                    text: 'アルムナイになる',
                    type: 'alumni',
                    data: { alumniDiscount: 50 }
                },
                secondaryAction: {
                    text: 'いいえ、キャンセルします',
                    type: 'decline'
                }
            }
        },
        en: {
            alumni: {
                title: '🎓 Congratulations! Become an Alumni',
                subtitle: 'Come back anytime with 50% off',
                description: "You achieved your goals - amazing! Become an alumni and get 50% off whenever you return.",
                features: [
                    'Lifetime 50% discount code',
                    'Return anytime',
                    'Early access to new alumni-exclusive content'
                ],
                primaryAction: {
                    text: 'Become Alumni',
                    type: 'alumni',
                    data: { alumniDiscount: 50 }
                },
                secondaryAction: {
                    text: 'No, cancel my subscription',
                    type: 'decline'
                }
            }
        }
    },
    
    switching: {
        ja: {
            match: {
                title: '🤝 競合他社のオファーに対抗します',
                subtitle: '同等以上の条件をご提案',
                description: '他社の条件を教えていただければ、それに見合うか上回るプランをご提案します。',
                features: [
                    '価格マッチング',
                    '追加機能の提供',
                    'Prokaiwaならではのパーソナルサポート'
                ],
                primaryAction: {
                    text: '条件を相談する',
                    type: 'consultation',
                    data: { matchCompetitor: true }
                },
                secondaryAction: {
                    text: 'いいえ、キャンセルします',
                    type: 'decline'
                }
            }
        },
        en: {
            match: {
                title: "🤝 We'll Match Their Offer",
                subtitle: 'Get equivalent or better terms',
                description: "Tell us about their offer and we'll match or beat it with added Prokaiwa benefits.",
                features: [
                    'Price matching',
                    'Additional features included',
                    'Personalized support only Prokaiwa offers'
                ],
                primaryAction: {
                    text: 'Discuss Terms',
                    type: 'consultation',
                    data: { matchCompetitor: true }
                },
                secondaryAction: {
                    text: 'No, cancel my subscription',
                    type: 'decline'
                }
            }
        }
    },
    
    circumstances: {
        ja: {
            pause: {
                title: '🤗 無理せず一時停止してください',
                subtitle: '準備ができたら、いつでも戻ってきてください',
                description: '今は大変な時期ですね。一時停止して、落ち着いたら再開しませんか？',
                features: [
                    '最大6ヶ月間の一時停止',
                    '一時停止中は料金なし',
                    '進捗とクレジットは保存',
                    '準備ができたらいつでも再開'
                ],
                primaryAction: {
                    text: '一時停止する',
                    type: 'pause',
                    data: { pauseMonths: 3 }
                },
                secondaryAction: {
                    text: 'いいえ、キャンセルします',
                    type: 'decline'
                }
            }
        },
        en: {
            pause: {
                title: "🤗 Take Care of Yourself - We'll Be Here",
                subtitle: 'Come back when you\'re ready',
                description: "Life happens. Pause your subscription and resume when things settle down.",
                features: [
                    'Pause for up to 6 months',
                    'No charges while paused',
                    'Progress and credits saved',
                    'Resume anytime when ready'
                ],
                primaryAction: {
                    text: 'Pause Subscription',
                    type: 'pause',
                    data: { pauseMonths: 3 }
                },
                secondaryAction: {
                    text: 'No, cancel my subscription',
                    type: 'decline'
                }
            }
        }
    }
};

// =====================================================
// STATE MANAGEMENT
// =====================================================

const cancellationState = {
    currentLang: 'ja',
    currentStep: 'reason',
    selectedReason: null,
    questionAnswers: {},
    universalAnswers: {},
    offerShown: null,
    offerType: null,
    offerDecision: null,
    offerAccepted: false,
    cancellationCompleted: false,
    userData: {
        userId: null,
        studentId: null,
        currentPlan: null,
        subscriptionId: null
    }
};

// =====================================================
// OFFER DECISION LOGIC
// =====================================================

function determineOffer(reason, answers, lang) {
    // console.log('🎯 Determining offer for:', { reason, answers });
    
    switch(reason) {
        case 'expensive':
    // If they said they'd stay for affordable option
    if (answers.stay_if_affordable === 'yes_definitely' || 
        answers.stay_if_affordable === 'yes_depending') {
        
        const currentPlan = cancellationState.userData.currentPlan;
        const reasonablePrice = answers.reasonable_price;
        
        // Only offer downgrade if they're on a higher-tier plan
        if ((currentPlan === 'Power Pack Lite' || currentPlan === 'Power Pack Pro' || 
             currentPlan === 'power_lite' || currentPlan === 'power_pro') && 
            (reasonablePrice === 'under_3000' || reasonablePrice === '3000_4000' || 
             reasonablePrice === '4000_5000')) {
            return { type: 'downgrade', offer: retentionOffers.expensive[lang].downgrade };
        } else {
            // For LINE plan users or those willing to pay more, offer discount
            return { type: 'discount', offer: retentionOffers.expensive[lang].discount };
        }
    }
    return null;
            
        case 'not_using':
            // If they would use it more with changes OR reason is "too busy"
            if (answers.what_would_help !== 'nothing_helps' || 
                answers.reason_not_using === 'too_busy') {
                return { type: 'pause', offer: retentionOffers.not_using[lang].pause };
            }
            return null;
            
        case 'too_difficult':
            // If they haven't reached out for help or would benefit from support
            if (answers.what_would_help === 'one_on_one' || 
                answers.reached_out_for_help === 'no_didnt_know' ||
                answers.reached_out_for_help === 'yes_still_struggled') {
                return { type: 'consultation', offer: retentionOffers.too_difficult[lang].consultation };
            }
            return null;
            
        case 'too_easy':
            // If they still want to improve in some areas
            if (answers.stay_for_advanced === 'yes_if_challenging' ||
                answers.stay_for_advanced === 'maybe_depending') {
                return { type: 'waitlist', offer: retentionOffers.too_easy[lang].waitlist };
            }
            return null;
            
        case 'scheduling':
            // If it's work conflicts or temporary
            if (answers.what_would_solve === 'pause' ||
                answers.scheduling_issue === 'work_conflicts' ||
                answers.scheduling_issue === 'irregular_schedule') {
                return { type: 'pause', offer: retentionOffers.scheduling[lang].pause };
            }
            return null;
            
        case 'technical':
            // If problems were frequent and impactful
            if (answers.problem_frequency === 'constantly' || 
                answers.problem_frequency === 'frequently' ||
                answers.impact_on_experience === 'unusable' ||
                answers.impact_on_experience === 'very_frustrating') {
                return { type: 'technical_support', offer: retentionOffers.technical[lang].support };
            }
            return null;
            
        case 'goals_met':
            // If they might need to maintain or have ongoing needs
            if (answers.use_maintenance === 'yes_avoid_losing' ||
                answers.use_maintenance === 'maybe_if_affordable' ||
                answers.ongoing_needs === 'maintain') {
                return { type: 'alumni', offer: retentionOffers.goals_met[lang].alumni };
            }
            return null;
            
        case 'switching':
            // If they would stay if we matched
            if (answers.if_matched === 'yes_prefer' || answers.if_matched === 'maybe') {
                return { type: 'consultation', offer: retentionOffers.switching[lang].match };
            }
            return null;
            
        case 'circumstances':
            // If it's temporary
            if (answers.temporary_or_longterm === 'temporary' ||
                answers.temporary_or_longterm === 'uncertain' ||
                answers.pause_instead === 'yes_1_3' ||
                answers.pause_instead === 'maybe') {
                return { type: 'pause', offer: retentionOffers.circumstances[lang].pause };
            }
            return null;
            
        default:
            return null;
    }
}

// =====================================================
// INITIALIZATION
// =====================================================

async function initCancellationFlow() {
    // console.log('🎯 Initializing cancellation flow...');
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('❌ Not authenticated');
        window.location.href = 'login.html';
        return;
    }
    
    cancellationState.userData.userId = user.id;
    
    // Get user's subscription data
    try {
        const { data: userData, error } = await supabase
            .from('questionnaire_responses')
            .select('id, plan, stripe_subscription_id, subscription_status, cancelled_at')  // ← Added fields
            .eq('user_id', user.id)
            .single();
            
        if (error) throw error;
        
        // ⭐ NEW: Check if already cancelled
        if (userData.subscription_status === 'cancelled' || userData.cancelled_at) {
            alert('Your subscription has already been cancelled.');
            window.location.href = 'dashboard.html';
            return;
        }
        
        // ⭐ NEW: Check if subscription exists
        if (!userData.stripe_subscription_id) {
            alert('No active subscription found.');
            window.location.href = 'dashboard.html';
            return;
        }
        
        cancellationState.userData.studentId = userData.id;
        cancellationState.userData.currentPlan = userData.plan;
        cancellationState.userData.subscriptionId = userData.stripe_subscription_id;
        
        // console.log('✅ User data loaded:', cancellationState.userData);
        
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        alert('Error loading your subscription data. Please try again.');
        return;
    }
    
    // Get language preference
    const savedLang = localStorage.getItem('prokaiwaLang') || 'ja';
    cancellationState.currentLang = savedLang;
    
    // Render initial state
    renderCurrentStep();
// Language display is handled by script.js
}
        
// =====================================================
// MAKE FUNCTIONS GLOBALLY ACCESSIBLE FOR ONCLICK HANDLERS
// =====================================================

window.selectReason = selectReason;
window.proceedToDetails = proceedToDetails;
window.goBack = goBack;
window.proceedToOfferOrConfirm = proceedToOfferOrConfirm;
window.selectRadio = selectRadio;
window.toggleCheckbox = toggleCheckbox;
window.handleTextInput = handleTextInput;
window.setRating = setRating;
window.acceptOffer = acceptOffer;
window.declineOffer = declineOffer;
window.confirmCancellation = confirmCancellation;
        
// =====================================================
// RENDER FUNCTIONS
// =====================================================

function renderCurrentStep() {
    const lang = cancellationState.currentLang;
    const step = cancellationState.currentStep;
    
    // console.log('🎨 Rendering step:', step, 'lang:', lang);
    
    // Update step indicators
    updateStepIndicators(lang, step);
    
    // Render appropriate content
    switch(step) {
    case 'reason':
        renderReasonSelection(lang);
        break;
    case 'details':
        renderQuestionForm(lang);
        break;
    case 'offer':
        renderOffer(lang, cancellationState.offerDecision);
        break;
    case 'confirm':
        renderConfirmation(lang);
        break;
}
}

function updateStepIndicators(lang, currentStep) {
    const steps = ['reason', 'details', 'confirm'];
    const stepMap = { reason: 1, details: 2, offer: 2.5, confirm: 3 };
    const currentStepNum = stepMap[currentStep];
    
    steps.forEach((step, index) => {
        const stepNum = index + 1;
        const stepEl = document.getElementById(`${lang}-step${stepNum}`);
        
        if (!stepEl) return;
        
        stepEl.classList.remove('active', 'completed');
        
        if (stepNum < currentStepNum) {
            stepEl.classList.add('completed');
        } else if (stepNum === Math.floor(currentStepNum)) {
            stepEl.classList.add('active');
        }
    });
}

function renderReasonSelection(lang) {
    const gridEl = document.getElementById(`${lang}-reason-grid`);
    if (!gridEl) return;
    
    const reasons = cancellationReasons[lang];
    
    gridEl.innerHTML = reasons.map(reason => `
        <div class="reason-option" data-reason="${reason.id}" onclick="selectReason('${lang}', '${reason.id}')">
            <div class="reason-icon">${reason.icon}</div>
            <div class="reason-content">
                <div class="reason-title">${reason.title}</div>
                <div class="reason-subtitle">${reason.subtitle}</div>
            </div>
        </div>
    `).join('');
    
    // Show reason section, hide others
    document.getElementById(`${lang}-section-reason`).classList.add('active');
    document.getElementById(`${lang}-section-details`).classList.remove('active');
    document.getElementById(`${lang}-section-offer`).classList.remove('active');
    document.getElementById(`${lang}-section-confirm`).classList.remove('active');
}

function renderQuestionForm(lang) {
    const reason = cancellationState.selectedReason;
    const formEl = document.getElementById(`${lang}-question-form`);
    const titleEl = document.getElementById(`${lang}-details-title`);
    
    if (!formEl || !titleEl) return;
    
    // Get reason-specific questions
    const questions = reasonQuestions[reason]?.[lang] || [];
    
    // Update title
    titleEl.textContent = lang === 'ja' ? '詳しく教えてください' : 'Tell us more';
    
    // Render questions
    formEl.innerHTML = questions.map(q => renderQuestion(q, lang)).join('');
    
    // Add universal questions at the end
    const universalQs = universalQuestions[lang];
    formEl.innerHTML += '<div style="border-top: 2px solid var(--color-border); margin: 2rem 0; padding-top: 2rem;"></div>';
    formEl.innerHTML += universalQs.map(q => renderQuestion(q, lang)).join('');
    
    // Show details section
    document.getElementById(`${lang}-section-reason`).classList.remove('active');
    document.getElementById(`${lang}-section-details`).classList.add('active');
    document.getElementById(`${lang}-section-offer`).classList.remove('active');
    document.getElementById(`${lang}-section-confirm`).classList.remove('active');
}

function renderQuestion(question, lang) {
    const qId = question.id;
    const currentAnswer = cancellationState.questionAnswers[qId] || 
                         cancellationState.universalAnswers[qId];
    
    switch(question.type) {
        case 'radio':
            return `
                <div class="question-group">
                    <div class="question-label">${question.question}${question.required ? ' *' : ''}</div>
                    <div class="question-options">
                        ${question.options.map(opt => `
                            <div class="radio-option ${currentAnswer === opt.value ? 'selected' : ''}" 
                                 onclick="selectRadio('${qId}', '${opt.value}')">
                                <input type="radio" name="${qId}" value="${opt.value}" 
                                       ${currentAnswer === opt.value ? 'checked' : ''}>
                                <label>${opt.label}</label>
                            </div>
                        `).join('')}
                    </div>
                    ${question.required ? '<div class="validation-message" id="val-' + qId + '">Please select an option</div>' : ''}
                </div>
            `;
            
        case 'checkbox':
            const checkedValues = currentAnswer || [];
            return `
                <div class="question-group">
                    <div class="question-label">${question.question}${question.required ? ' *' : ''}</div>
                    <div class="question-options">
                        ${question.options.map(opt => `
                            <div class="checkbox-option ${checkedValues.includes(opt.value) ? 'selected' : ''}"
                                 onclick="toggleCheckbox('${qId}', '${opt.value}')">
                                <input type="checkbox" value="${opt.value}" 
                                       ${checkedValues.includes(opt.value) ? 'checked' : ''}>
                                <label>${opt.label}</label>
                            </div>
                        `).join('')}
                    </div>
                    ${question.required ? '<div class="validation-message" id="val-' + qId + '">Please select at least one option</div>' : ''}
                </div>
            `;
            
        case 'text':
            return `
                <div class="question-group">
                    <div class="question-label">${question.question}${question.required ? ' *' : ''}</div>
                    <input type="text" 
                           class="text-input" 
                           id="input-${qId}"
                           placeholder="${question.placeholder || ''}"
                           value="${currentAnswer || ''}"
                           oninput="handleTextInput('${qId}', this.value, ${question.minLength || 0})"
                           ${question.required ? 'required' : ''}>
                    ${question.minLength ? `<div class="char-counter" id="counter-${qId}">0 / ${question.minLength} characters minimum</div>` : ''}
                    ${question.required ? '<div class="validation-message" id="val-' + qId + '">This field is required</div>' : ''}
                </div>
            `;
            
        case 'textarea':
            return `
                <div class="question-group">
                    <div class="question-label">${question.question}${question.required ? ' *' : ''}</div>
                    <textarea class="textarea-input" 
                              id="input-${qId}"
                              placeholder="${question.placeholder || ''}"
                              oninput="handleTextInput('${qId}', this.value, ${question.minLength || 0})"
                              ${question.required ? 'required' : ''}>${currentAnswer || ''}</textarea>
                    ${question.minLength ? `<div class="char-counter" id="counter-${qId}">0 / ${question.minLength} characters minimum</div>` : ''}
                    ${question.required ? '<div class="validation-message" id="val-' + qId + '">This field is required (min ' + question.minLength + ' chars)</div>' : ''}
                </div>
            `;
            
        case 'rating':
            const rating = currentAnswer || 0;
            return `
                <div class="question-group">
                    <div class="question-label">${question.question}${question.required ? ' *' : ''}</div>
                    <div class="rating-stars" id="rating-${qId}">
                        ${[1,2,3,4,5].map(star => `
                            <i class="fas fa-star ${star <= rating ? 'active' : ''}" 
                               onclick="setRating('${qId}', ${star})"
                               style="font-size: 2rem; cursor: pointer; color: ${star <= rating ? '#ffc107' : '#ddd'}; margin: 0 0.25rem;"></i>
                        `).join('')}
                    </div>
                    ${question.required ? '<div class="validation-message" id="val-' + qId + '">Please select a rating</div>' : ''}
                </div>
            `;
            
        default:
            return '';
    }
}

// CONTINUED IN NEXT MESSAGE...
// console.log('✅ Part 2A loaded: Universal questions, offers, state, render functions');
// =====================================================
// PART 2B: INPUT HANDLERS, NAVIGATION, VALIDATION, API
// =====================================================

// =====================================================
// INPUT HANDLERS
// =====================================================

function selectReason(lang, reasonId) {
    // console.log('📝 Reason selected:', reasonId);
    
    // Remove selection from all reasons
    document.querySelectorAll(`#${lang}-reason-grid .reason-option`).forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selection to clicked reason
    const selectedEl = document.querySelector(`#${lang}-reason-grid .reason-option[data-reason="${reasonId}"]`);
    if (selectedEl) {
        selectedEl.classList.add('selected');
    }
    
    // Update state
    cancellationState.selectedReason = reasonId;
    
    // Enable continue button
    const continueBtn = document.getElementById(`${lang}-btn-continue-step1`);
    if (continueBtn) {
        continueBtn.disabled = false;
    }
}

function selectRadio(questionId, value) {
    // console.log('📝 Radio selected:', questionId, value);
    
    // Store in appropriate state object
    if (universalQuestions.ja.some(q => q.id === questionId) || 
        universalQuestions.en.some(q => q.id === questionId)) {
        cancellationState.universalAnswers[questionId] = value;
    } else {
        cancellationState.questionAnswers[questionId] = value;
    }
    
    // Update UI - remove all selections, add to clicked
    const name = questionId;
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
        const parent = input.closest('.radio-option');
        if (parent) {
            parent.classList.remove('selected');
        }
    });
    
    const clickedInput = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (clickedInput) {
        clickedInput.checked = true;
        const parent = clickedInput.closest('.radio-option');
        if (parent) {
            parent.classList.add('selected');
        }
    }
    
    // Hide validation message
    const valMsg = document.getElementById(`val-${questionId}`);
    if (valMsg) {
        valMsg.classList.remove('show');
    }
}

function toggleCheckbox(questionId, value) {
    // console.log('📝 Checkbox toggled:', questionId, value);
    
    // Get current values
    let currentValues = cancellationState.questionAnswers[questionId] || [];
    
    // Toggle value
    if (currentValues.includes(value)) {
        currentValues = currentValues.filter(v => v !== value);
    } else {
        currentValues.push(value);
    }
    
    // Store updated values
    cancellationState.questionAnswers[questionId] = currentValues;
    
    // Update UI
    const checkbox = document.querySelector(`input[type="checkbox"][value="${value}"]`);
    if (checkbox) {
        checkbox.checked = currentValues.includes(value);
        const parent = checkbox.closest('.checkbox-option');
        if (parent) {
            if (currentValues.includes(value)) {
                parent.classList.add('selected');
            } else {
                parent.classList.remove('selected');
            }
        }
    }
    
    // Hide validation message if at least one selected
    if (currentValues.length > 0) {
        const valMsg = document.getElementById(`val-${questionId}`);
        if (valMsg) {
            valMsg.classList.remove('show');
        }
    }
}

function handleTextInput(questionId, value, minLength) {
    // Store in appropriate state object
    if (universalQuestions.ja.some(q => q.id === questionId) || 
        universalQuestions.en.some(q => q.id === questionId)) {
        cancellationState.universalAnswers[questionId] = value;
    } else {
        cancellationState.questionAnswers[questionId] = value;
    }
    
    // Update character counter
    const counter = document.getElementById(`counter-${questionId}`);
    if (counter && minLength > 0) {
        const currentLength = value.length;
        counter.textContent = `${currentLength} / ${minLength} characters minimum`;
        
        if (currentLength >= minLength) {
            counter.classList.add('valid');
            counter.classList.remove('invalid');
        } else if (currentLength > 0) {
            counter.classList.remove('valid');
            counter.classList.add('invalid');
        } else {
            counter.classList.remove('valid', 'invalid');
        }
    }
    
    // Hide validation message if valid
    if (value.length >= minLength) {
        const valMsg = document.getElementById(`val-${questionId}`);
        if (valMsg) {
            valMsg.classList.remove('show');
        }
    }
}

function setRating(questionId, stars) {
    // console.log('⭐ Rating set:', questionId, stars);
    
    cancellationState.universalAnswers[questionId] = stars;
    
    // Update star display
    const ratingEl = document.getElementById(`rating-${questionId}`);
    if (ratingEl) {
        const starEls = ratingEl.querySelectorAll('.fa-star');
        starEls.forEach((star, index) => {
            if (index < stars) {
                star.classList.add('active');
                star.style.color = '#ffc107';
            } else {
                star.classList.remove('active');
                star.style.color = '#ddd';
            }
        });
    }
    
    // Hide validation message
    const valMsg = document.getElementById(`val-${questionId}`);
    if (valMsg) {
        valMsg.classList.remove('show');
    }
}

// =====================================================
// VALIDATION
// =====================================================

function validateStep(step, lang) {
    // console.log('✓ Validating step:', step);
    
    switch(step) {
        case 'reason':
            if (!cancellationState.selectedReason) {
                alert(lang === 'ja' ? 'キャンセル理由を選択してください' : 'Please select a cancellation reason');
                return false;
            }
            return true;
            
        case 'details':
            return validateQuestions(lang);
            
        default:
            return true;
    }
}

function validateQuestions(lang) {
    const reason = cancellationState.selectedReason;
    
    // Get all questions for this reason + universal
    const reasonQs = reasonQuestions[reason]?.[lang] || [];
    const universalQs = universalQuestions[lang];
    const allQuestions = [...reasonQs, ...universalQs];
    
    let isValid = true;
    let firstInvalidId = null;
    
    allQuestions.forEach(q => {
        const answer = cancellationState.questionAnswers[q.id] || 
                      cancellationState.universalAnswers[q.id];
        const valMsg = document.getElementById(`val-${q.id}`);
        
        // Check if required field is empty
        if (q.required) {
            let fieldValid = false;
            
            if (q.type === 'checkbox') {
                fieldValid = answer && Array.isArray(answer) && answer.length > 0;
            } else if (q.type === 'text' || q.type === 'textarea') {
                const minLen = q.minLength || 0;
                fieldValid = answer && answer.length >= minLen;
            } else if (q.type === 'rating') {
                fieldValid = answer && answer > 0;
            } else {
                fieldValid = !!answer;
            }
            
            if (!fieldValid) {
                isValid = false;
                if (valMsg) {
                    valMsg.classList.add('show');
                }
                if (!firstInvalidId) {
                    firstInvalidId = q.id;
                }
            } else {
                if (valMsg) {
                    valMsg.classList.remove('show');
                }
            }
        }
    });
    
    // Scroll to first invalid field
    if (!isValid && firstInvalidId) {
        const firstInvalid = document.getElementById(`val-${firstInvalidId}`);
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        alert(lang === 'ja' ? 
            '必須項目をすべて入力してください' : 
            'Please complete all required fields');
    }
    
    return isValid;
}

// =====================================================
// NAVIGATION
// =====================================================

function proceedToDetails(lang) {
    // console.log('➡️ Proceeding to details...');
    
    if (!validateStep('reason', lang)) return;
    
    // Track analytics
    trackEvent('cancellation_step1_completed', {
        reason: cancellationState.selectedReason
    });
    
    // Update state
    cancellationState.currentStep = 'details';
    
    // Render questions
    renderCurrentStep();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function proceedToOfferOrConfirm(lang) {
    // console.log('➡️ Proceeding to offer or confirm...');
    
    if (!validateStep('details', lang)) return;
    
    // Track analytics
    trackEvent('cancellation_step2_completed', {
        reason: cancellationState.selectedReason,
        answers: cancellationState.questionAnswers
    });
    
    // Determine if we should show an offer
    const offerDecision = determineOffer(
        cancellationState.selectedReason,
        cancellationState.questionAnswers,
        lang
    );
    
    if (offerDecision) {
    // console.log('✨ Showing retention offer:', offerDecision.type);
    
    cancellationState.currentStep = 'offer';
    cancellationState.offerShown = offerDecision.type;
    cancellationState.offerType = offerDecision.type;
    cancellationState.offerDecision = offerDecision;
    
    renderOffer(lang, offerDecision);
        
        // Track offer shown
        trackEvent('retention_offer_shown', {
            offer_type: offerDecision.type,
            reason: cancellationState.selectedReason
        });
    } else {
        // console.log('↪️ No offer, proceeding to confirmation');
        
        cancellationState.currentStep = 'confirm';
        renderCurrentStep();
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack(lang, from) {
    // console.log('⬅️ Going back from:', from);
    
    if (from === 'details') {
        cancellationState.currentStep = 'reason';
    } else if (from === 'offer') {
        cancellationState.currentStep = 'details';
    } else if (from === 'confirm') {
        if (cancellationState.offerShown) {
            cancellationState.currentStep = 'offer';
        } else {
            cancellationState.currentStep = 'details';
        }
    }
    
    renderCurrentStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =====================================================
// OFFER RENDERING
// =====================================================

function renderOffer(lang, offerDecision) {
    const offer = offerDecision.offer;
    const offerSectionEl = document.getElementById(`${lang}-section-offer`);
    
    if (!offerSectionEl) return;
    
    offerSectionEl.innerHTML = `
        <div class="retention-offer">
            <h3>${offer.title}</h3>
            <p style="font-size: 1.1rem; margin-bottom: 1rem;">${offer.subtitle}</p>
            <p>${offer.description}</p>
            
            <ul class="offer-features">
                ${offer.features.map(feature => `
                    <li><i class="fas fa-check-circle"></i> ${feature}</li>
                `).join('')}
            </ul>
            
            <div class="offer-actions">
                <button class="btn-primary-action" onclick="acceptOffer('${lang}')">
                    ${offer.primaryAction.text}
                </button>
                <button class="btn-secondary-action" onclick="declineOffer('${lang}')">
                    ${offer.secondaryAction.text}
                </button>
            </div>
        </div>
    `;
    
    // Show offer section
    document.getElementById(`${lang}-section-reason`).classList.remove('active');
    document.getElementById(`${lang}-section-details`).classList.remove('active');
    offerSectionEl.classList.add('active');
    document.getElementById(`${lang}-section-confirm`).classList.remove('active');
}

async function acceptOffer(lang) {
    // console.log('✅ Offer accepted');
    
    const offerType = cancellationState.offerType;
    
    // Track analytics
    trackEvent('retention_offer_accepted', {
        offer_type: offerType,
        reason: cancellationState.selectedReason
    });
    
    // Show processing overlay
    showProcessing(lang === 'ja' ? '処理中...' : 'Processing...');
    
    try {
        // Determine offer data based on type
        let offerData = {};
        switch(offerType) {
            case 'downgrade':
    offerData = { newPlan: 'LINE Practice Plan' };
    break;
            case 'discount':
                offerData = { couponCode: 'RETAIN_20PCT_3MO' };
                break;
            case 'pause':
                offerData = { pauseMonths: 2 };
                break;
            case 'consultation':
                offerData = { freeConsultation: true };
                break;
            case 'waitlist':
                offerData = { waitlistType: 'advanced_content' };
                break;
            case 'technical_support':
                offerData = { freeMonth: true, prioritySupport: true };
                break;
            case 'alumni':
                offerData = { alumniDiscount: 50 };
                break;
        }
        
        // Call edge function
        const result = await handleRetentionOffer(offerType, offerData);
        
        hideProcessing();
        
        if (result.success) {
    // Mark offer as accepted to prevent "unsaved changes" warning
    cancellationState.offerAccepted = true;
    
    // Show success message
    alert(lang === 'ja' ? 
        'ありがとうございます！変更が適用されました。' :
        'Thank you! Your changes have been applied.');
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
} else {
            throw new Error(result.error || 'Unknown error');
        }
        
    } catch (error) {
        console.error('❌ Error accepting offer:', error);
        hideProcessing();
        
        alert(lang === 'ja' ?
            'エラーが発生しました。もう一度お試しいただくか、サポートにお問い合わせください。' :
            'An error occurred. Please try again or contact support.');
    }
}

function declineOffer(lang) {
    // console.log('❌ Offer declined');
    
    // Track analytics
    trackEvent('retention_offer_declined', {
        offer_type: cancellationState.offerType,
        reason: cancellationState.selectedReason
    });
    
    // Proceed to final confirmation
    cancellationState.currentStep = 'confirm';
    renderCurrentStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =====================================================
// CONFIRMATION RENDERING
// =====================================================

function renderConfirmation(lang) {
    const reason = cancellationState.selectedReason;
    const reasonObj = cancellationReasons[lang].find(r => r.id === reason);
    const plan = cancellationState.userData.currentPlan || 'Standard';
    
    // Update confirmation details
    const planEl = document.getElementById(`${lang}-confirm-plan`);
    const endDateEl = document.getElementById(`${lang}-confirm-end-date`);
    const reasonEl = document.getElementById(`${lang}-confirm-reason`);
    
    if (planEl) planEl.textContent = `Plan ${plan}`;
    if (endDateEl) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        endDateEl.textContent = endDate.toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US');
    }
    if (reasonEl && reasonObj) reasonEl.textContent = reasonObj.title;
    
    // Update loss list based on plan
    const lossListEl = document.getElementById(`${lang}-loss-list`);
    if (lossListEl) {
        const losses = lang === 'ja' ? [
            '毎日のLINE練習',
            'ネイティブスピーカーからのフィードバック',
            'ビデオレッスン',
            '進捗トラッキング',
            '学習クレジット'
        ] : [
            'Daily LINE practice',
            'Feedback from native speakers',
            'Video lessons',
            'Progress tracking',
            'Your lesson credits'
        ];
        
        lossListEl.innerHTML = losses.map(loss => `<li>${loss}</li>`).join('');
    }
    
    // Show confirmation section
    document.getElementById(`${lang}-section-reason`).classList.remove('active');
    document.getElementById(`${lang}-section-details`).classList.remove('active');
    document.getElementById(`${lang}-section-offer`).classList.remove('active');
    document.getElementById(`${lang}-section-confirm`).classList.add('active');
}

async function confirmCancellation(lang) {
    // console.log('🚨 Confirming cancellation...');
    
    // Double-check confirmation
    const confirmText = lang === 'ja' ?
        '本当にキャンセルしますか？この操作は取り消せません。' :
        'Are you sure you want to cancel? This action cannot be undone.';
    
    if (!confirm(confirmText)) {
        return;
    }
    
    // Show processing
    showProcessing(lang === 'ja' ? 'キャンセル処理中...' : 'Processing cancellation...');
    
    try {
        // Prepare cancellation data
        const cancellationData = {
            reason_category: cancellationState.selectedReason,
            reason_details: cancellationState.questionAnswers,
            satisfaction_rating: cancellationState.universalAnswers.satisfaction_rating || 0,
            would_recommend: cancellationState.universalAnswers.would_recommend || '',
            additional_comments: cancellationState.universalAnswers.what_could_improve || '',
            retention_offer_shown: cancellationState.offerShown,
            retention_offer_result: cancellationState.offerShown ? 'declined' : 'not_shown',
            is_alumni: cancellationState.selectedReason === 'goals_met'
        };
        
        // Call cancellation edge function
        const result = await cancelSubscription(cancellationData);
        
        hideProcessing();
        
        if (result.success) {
            // Track final cancellation
            trackEvent('cancellation_completed', {
                reason: cancellationState.selectedReason,
                had_offer: !!cancellationState.offerShown,
                accepted_offer: false,
                satisfaction: cancellationData.satisfaction_rating,
                would_recommend: cancellationData.would_recommend
            });
            
            // Show success message
            alert(lang === 'ja' ?
                'サブスクリプションがキャンセルされました。ご利用ありがとうございました。' :
                'Your subscription has been cancelled. Thank you for being a student.');
            
            // Mark cancellation as completed to prevent "unsaved changes" warning
cancellationState.cancellationCompleted = true;

// Redirect to dashboard
window.location.href = 'dashboard.html';
        } else {
            throw new Error(result.error || 'Cancellation failed');
        }
        
    } catch (error) {
        console.error('❌ Error cancelling subscription:', error);
        hideProcessing();
        
        alert(lang === 'ja' ?
            'エラーが発生しました。サポートにお問い合わせください。' :
            'An error occurred. Please contact support.');
    }
}

// =====================================================
// API/EDGE FUNCTION CALLS
// =====================================================

async function handleRetentionOffer(offerType, offerData) {
    // console.log('📡 Calling handle-retention-offer...', { offerType, offerData });
    
    try {
        const { data, error } = await supabase.functions.invoke('handle-retention-offer', {
            body: {
                action: 'accept-offer',
                offerType,
                offerDetails: offerData,
                cancellationData: {
                    reason: cancellationState.selectedReason,
                    details: cancellationState.questionAnswers
                }
            }
        });
        
        if (error) throw error;
        
        return { success: true, data };
        
    } catch (error) {
        console.error('❌ Edge function error:', error);
        return { success: false, error: 'An error occurred. Please try again.' };
    }
}

async function cancelSubscription(cancellationData) {
    // console.log('📡 Calling cancel-subscription...', cancellationData);
    
    try {
        const { data, error } = await supabase.functions.invoke('cancel-subscription', {
            body: cancellationData
        });
        
        // Log the response
        // console.log('📦 Response:', { data, error });
        
        if (error) {
            console.error('❌ Edge function error:', error);
            throw error;
        }
        
        if (!data) {
            throw new Error('No response from server');
        }
        
        // Check if the edge function itself returned an error
        if (data.success === false) {
            throw new Error(data.error || 'Cancellation failed');
        }
        
        // console.log('✅ Cancellation successful:', data);
        return { success: true, data };
        
    } catch (error) {
        console.error('❌ Cancellation error:', error);
        return { 
            success: false, 
            error: 'An error occurred during cancellation. Please try again.'
        };
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function showProcessing(text) {
    const overlay = document.getElementById('processing-overlay');
    const textEl = document.getElementById('processing-text');
    
    if (overlay) overlay.classList.add('show');
    if (textEl) textEl.textContent = text;
}

function hideProcessing() {
    const overlay = document.getElementById('processing-overlay');
    if (overlay) overlay.classList.remove('show');
}

function trackEvent(eventName, eventData) {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Console log for debugging
    // console.log('📊 Analytics:', eventName, eventData);
}

// =====================================================
// WINDOW LOAD
// =====================================================

window.addEventListener('DOMContentLoaded', () => {
    // console.log('🚀 Cancellation page loaded');
    initCancellationFlow();
});

// Warn before leaving
window.addEventListener('beforeunload', (e) => {
    if (cancellationState.currentStep !== 'reason' && 
        !cancellationState.offerAccepted && 
        !cancellationState.cancellationCompleted) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// console.log('✅ Part 2B loaded: Input handlers, navigation, validation, API calls');
