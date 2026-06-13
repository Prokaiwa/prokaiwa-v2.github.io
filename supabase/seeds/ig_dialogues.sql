-- ig_dialogues — Friday carousel scripts (Mimi = boke with ears, Ten = tsukkomi with arms)
-- lines: array of {speaker, en, ja, pose}. Lines 1-3 = setup (slides 2-4),
-- last 2 lines = punchline exchange (slide 5). Keep en ≤ ~30 chars (no wrapping).

CREATE TABLE IF NOT EXISTS public.ig_dialogues (
  id serial PRIMARY KEY,
  title_en text NOT NULL,
  title_ja text NOT NULL,
  location_ja text NOT NULL,
  lines jsonb NOT NULL
);
ALTER TABLE public.ig_dialogues ENABLE ROW LEVEL SECURITY;
-- service-role-only table (read by edge function); no policies needed.

INSERT INTO public.ig_dialogues (title_en, title_ja, location_ja, lines) VALUES

('Long time no see!', 'ひさしぶり！', 'カフェにて ', '[
 {"speaker":"ten",  "en":"Long time no see!",            "ja":"ひさしぶり！",               "pose":"(„ᵔ ֊ ᵔ„)"},
 {"speaker":"mimi", "en":"Yes!! So long!",                "ja":"うん！！すっごく久しぶり！",  "pose":"૮₍˶ ᵔ ᵕ ᵔ ⑅₎ა"},
 {"speaker":"ten",  "en":"...We met yesterday.",          "ja":"…昨日会ったよね。",          "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"It felt like years. I was hungry.", "ja":"何年にも感じた。お腹すいてたから。", "pose":"૮₍˶ ˘ ³˘ ⑅₎ა"},
 {"speaker":"ten",  "en":"That changes time?!",           "ja":"それで時間変わる！？",        "pose":"(„⊙ ֊ ⊙„)!!"}
]'::jsonb),

('I''m full.', 'お腹いっぱい。', 'レストランにて ', '[
 {"speaker":"ten",  "en":"How was the pasta?",            "ja":"パスタどうだった？",          "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"I''m full. So full.",           "ja":"お腹いっぱい。ほんとに。",     "pose":"૮₍˶ ×. × ⑅₎ა"},
 {"speaker":"ten",  "en":"Then let''s get the check.",    "ja":"じゃあお会計しよう。",        "pose":"(„ᵔ ֊ ᵔ„)"},
 {"speaker":"mimi", "en":"Wait. One cake. Cake is different.", "ja":"待って。ケーキひとつ。ケーキは別。", "pose":"૮₍˶ ˘ ³˘ ⑅₎ა"},
 {"speaker":"ten",  "en":"Different HOW?!",               "ja":"何が別なの！？",             "pose":"(„⊙ ֊ ⊙„)!!"}
]'::jsonb),

('I''m on my way!', '今向かってる！', '電話にて ', '[
 {"speaker":"ten",  "en":"Where are you?",                "ja":"今どこ？",                  "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"I''m on my way!",               "ja":"今向かってる！",             "pose":"૮₍˶ ᵔ ᵕ ᵔ ⑅₎ა"},
 {"speaker":"ten",  "en":"Great! See you soon!",          "ja":"よかった！もうすぐだね！",    "pose":"(„ᵔ ֊ ᵔ„)"},
 {"speaker":"mimi", "en":"...My way starts from my bed.", "ja":"…ベッドから向かい始めるところ。", "pose":"૮₍˶ -. - ⑅₎ა"},
 {"speaker":"ten",  "en":"You haven''t LEFT?!",           "ja":"まだ出てないの！？",          "pose":"(„⊙ ֊ ⊙„)!!"}
]'::jsonb),

('Let''s split the bill.', '割り勘にしよう。', 'レジの前で ', '[
 {"speaker":"ten",  "en":"Let''s split the bill.",        "ja":"割り勘にしよう。",           "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"Good idea. Half and half.",     "ja":"いいね。半分こ。",           "pose":"૮₍˶ ᵔ ᵕ ᵔ ⑅₎ა"},
 {"speaker":"ten",  "en":"You ate nine plates...",        "ja":"9皿食べたよね…",            "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"Friendship has no calories.",   "ja":"友情にカロリーはないの。",     "pose":"૮₍˶ ˘ ³˘ ⑅₎ა"},
 {"speaker":"ten",  "en":"That''s not the POINT!",        "ja":"そういう話じゃない！",        "pose":"(„x ֊ x„)"}
]'::jsonb),

('I slept like a log.', 'ぐっすり眠った。', '朝の公園で ', '[
 {"speaker":"ten",  "en":"You look happy today!",         "ja":"今日うれしそうだね！",        "pose":"(„ᵔ ֊ ᵔ„)"},
 {"speaker":"mimi", "en":"I slept like a log!",           "ja":"丸太みたいにぐっすり寝た！",   "pose":"૮₍˶ ᵔ ᵕ ᵔ ⑅₎ა"},
 {"speaker":"ten",  "en":"Nice! How many hours?",         "ja":"いいね！何時間？",           "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"Fourteen. I was a forest.",     "ja":"14時間。もはや森だった。",    "pose":"૮₍˶ -. - ⑅₎ა"},
 {"speaker":"ten",  "en":"A FOREST?!",                    "ja":"森！？",                    "pose":"(„⊙ ֊ ⊙„)!!"}
]'::jsonb),

('Can I get a refill?', 'おかわりください。', 'ファミレスにて ', '[
 {"speaker":"mimi", "en":"Can I get a refill?",           "ja":"おかわりもらえますか？",      "pose":"૮₍˶ •. • ⑅₎ა"},
 {"speaker":"ten",  "en":"Sure! Coffee?",                 "ja":"もちろん！コーヒー？",        "pose":"(„ᵔ ֊ ᵔ„)"},
 {"speaker":"mimi", "en":"No. Miso soup.",                "ja":"ううん。お味噌汁。",          "pose":"૮₍˶ •. • ⑅₎ა"},
 {"speaker":"mimi", "en":"...This is my eighth bowl.",    "ja":"…これで8杯目。",             "pose":"૮₍˶ ˘ ³˘ ⑅₎ა"},
 {"speaker":"ten",  "en":"EIGHTH?!",                      "ja":"8杯！？",                   "pose":"(„⊙ ֊ ⊙„)!!"}
]'::jsonb),

('I''m just looking, thanks.', '見てるだけです。', 'パン屋にて ', '[
 {"speaker":"ten",  "en":"Welcome! Need any help?",       "ja":"いらっしゃいませ！お探しですか？", "pose":"(„ᵔ ֊ ᵔ„)"},
 {"speaker":"mimi", "en":"I''m just looking, thanks.",    "ja":"見てるだけです、ありがとう。",  "pose":"૮₍˶ •. • ⑅₎ა"},
 {"speaker":"ten",  "en":"...You''re holding five trays.", "ja":"…トレー5枚持ってますよ。",    "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"Looking with my hands.",        "ja":"手で見てるの。",             "pose":"૮₍˶ ˘ ³˘ ⑅₎ა"},
 {"speaker":"ten",  "en":"That''s called SHOPPING!",      "ja":"それは買い物って言うの！",     "pose":"(„⊙ ֊ ⊙„)!!"}
]'::jsonb),

('I can''t wait!', '楽しみ！', '前の日の夜 ', '[
 {"speaker":"ten",  "en":"Picnic tomorrow at ten!",       "ja":"明日10時にピクニックね！",     "pose":"(„ᵔ ֊ ᵔ„)"},
 {"speaker":"mimi", "en":"I can''t wait!!",               "ja":"待ちきれない！！",            "pose":"૮₍˶ ᵔ ᵕ ᵔ ⑅₎ა"},
 {"speaker":"ten",  "en":"Did you pack the bento?",       "ja":"お弁当は準備した？",          "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"I couldn''t wait. I ate it.",   "ja":"待ちきれなくて。食べちゃった。", "pose":"૮₍˶ ˘ ³˘ ⑅₎ა"},
 {"speaker":"ten",  "en":"It''s for TOMORROW!",           "ja":"明日の分でしょ！？",          "pose":"(„x ֊ x„)"}
]'::jsonb),

('Could you say that again?', 'もう一度言ってもらえますか？', '道ばたで ', '[
 {"speaker":"ten",  "en":"The station is that way.",      "ja":"駅はあっちだよ。",            "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"Could you say that again?",     "ja":"もう一度言ってもらえる？",     "pose":"૮₍˶ •. • ⑅₎ა"},
 {"speaker":"ten",  "en":"The station is THAT way.",      "ja":"駅は「あっち」だよ。",        "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"One more. Your voice is nice.", "ja":"もう一回。いい声だから。",     "pose":"૮₍˶ ᵔ ᵕ ᵔ ⑅₎ა"},
 {"speaker":"ten",  "en":"That''s not LISTENING practice!", "ja":"それリスニング練習じゃない！", "pose":"(„⊙ ֊ ⊙„)!!"}
]'::jsonb),

('What do you do?', 'お仕事は何ですか？', '初対面の会話 ', '[
 {"speaker":"ten",  "en":"So, what do you do?",           "ja":"お仕事は何してるの？",        "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"I''m a professional.",          "ja":"プロです。",                 "pose":"૮₍˶ ˘ ³˘ ⑅₎ა"},
 {"speaker":"ten",  "en":"A professional... what?",       "ja":"プロの…何？",               "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"Napper. Three naps a day.",     "ja":"お昼寝のプロ。1日3回。",      "pose":"૮₍˶ -. - ⑅₎ა"},
 {"speaker":"ten",  "en":"That''s a HOBBY!",              "ja":"それは趣味！",               "pose":"(„⊙ ֊ ⊙„)!!"}
]'::jsonb),

('It''s on me.', 'ここは私のおごり。', 'カフェのレジで ', '[
 {"speaker":"mimi", "en":"It''s on me today!",            "ja":"今日は私のおごり！",          "pose":"૮₍˶ ᵔ ᵕ ᵔ ⑅₎ა"},
 {"speaker":"ten",  "en":"Wow, really? Thank you!",       "ja":"えっ、ほんと？ありがとう！",   "pose":"(„ᵔ ֊ ᵔ„)"},
 {"speaker":"mimi", "en":"Of course! I have a coupon.",   "ja":"もちろん！クーポンあるし。",   "pose":"૮₍˶ ˘ ³˘ ⑅₎ა"},
 {"speaker":"mimi", "en":"...It expired in 2019.",        "ja":"…2019年に切れてた。",        "pose":"૮₍˶ ⊙ o ⊙ ⑅₎ა"},
 {"speaker":"ten",  "en":"So it''s on ME!",               "ja":"結局私のおごり！？",          "pose":"(„x ֊ x„)"}
]'::jsonb),

('Take it easy.', '無理しないでね。', '仕事終わりに ', '[
 {"speaker":"ten",  "en":"You worked hard. Take it easy!", "ja":"お疲れさま。無理しないでね！", "pose":"(„ᵔ ֊ ᵔ„)"},
 {"speaker":"mimi", "en":"Okay! Taking it easy now.",     "ja":"わかった！今から無理しない。",  "pose":"૮₍˶ ᵔ ᵕ ᵔ ⑅₎ა"},
 {"speaker":"ten",  "en":"...Why are you lying down here?", "ja":"…なんでここで横になるの？",   "pose":"(„• ֊ •„)"},
 {"speaker":"mimi", "en":"You said take it easy. This is easy.", "ja":"無理しないでって言ったから。これが一番楽。", "pose":"૮₍˶ -. - ⑅₎ა"},
 {"speaker":"ten",  "en":"Not on the SIDEWALK!",          "ja":"歩道ではダメ！",             "pose":"(„⊙ ֊ ⊙„)!!"}
]'::jsonb);

-- 12 dialogues = 12 Fridays (~3 months). Top up before the pool runs dry —
-- the generator emails an alert when it exhausts.
