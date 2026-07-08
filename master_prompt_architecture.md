
==================================================
PROKAIWA — MASTER PROMPT SYSTEM ARCHITECTURE
All Levels · All Competencies · All Purposes
Content Standards & Development Guide
==================================================
 
Last updated: April 2026
Status: Super Beginner C1 complete (224 prompts, all 4 purposes). C2 Work and Hobby complete (112 prompts). C2 Travel and Casual pending. Total: 336 prompts uploaded.
 
--------------------------------------------------
CONTENTS
--------------------------------------------------
1.  System Overview
2.  Level Design & Placement
3.  The 6 Competencies
4.  Japanese Support Scaling
5.  The 7-Day Pedagogical Arc
6.  The 4 Purposes
7.  Evidence-Based Learning Enhancements (MANDATORY)
8.  Quiz Design Standard
9.  Pre-Recording Requirements
10. Prompt Token & Tag Reference
11. Database Quick Reference
12. Development Roadmap
 
 
==================================================
1. SYSTEM OVERVIEW
==================================================
 
Prokaiwa delivers daily English conversation prompts via LINE with human
teacher feedback. Three proficiency levels — Super Beginner, Beginner,
Intermediate — each follow the same 6-competency framework at increasing
complexity. Every student is assigned one of four purposes at onboarding
and receives content personalised to that context every day.
 
SCALE OF THE FULL SYSTEM
-------------------------
Levels:                     3
Competencies per level:     6
Weeks per competency:       8 (56 prompts)
Purposes:                   4
 
1 competency · 1 purpose  = 8 weeks × 7 days          =    56 prompts
1 competency · 4 purposes = 56 × 4                    =   224 prompts
1 level · 6 competencies  = 224 × 6                   = 1,344 prompts
Full system · 3 levels    = 1,344 × 3                 = 4,032 prompts
 
Current status: 336 prompts complete (Super Beginner C1 all 4 purposes + C2 Work and Hobby)
= approximately 8.3% of the full system.
 
 
==================================================
2. LEVEL DESIGN & PLACEMENT
==================================================
 
THE THREE LEVELS
----------------
 
Level:            Super Beginner     Beginner           Intermediate
CEFR:             Pre-A1 → A1        A2                 B1
Real ability:     Freezes when       Can introduce      Can hold a
                  spoken to. Knows   self and answer    conversation but
                  words but cannot   simple questions.  sounds unnatural.
                  connect them in    Struggles          Limited for
                  real time.         off-script.        opinions/stories.
Response length:  1–2 sentences      2–4 sentences      4–6+ structured
Japanese support: Full C1–C3,        Medium C1,         Occasional C1
                  tapering C4–C6     tapering to none   only
                                     by C5
Scenario type:    Predictable,       Semi-predictable,  Unpredictable,
                  scripted,          some surprises     native speed,
                  forgiving                             abstract topics
 
PLACEMENT RULES
---------------
- Students are placed at entry based on practical self-assessment in the
  onboarding questionnaire — not a formal test.
- ALWAYS place students slightly below their true level rather than above.
  A student who finds early weeks easy builds confidence. A student who
  is overwhelmed from day one quits.
- A genuine Intermediate-level student who joins early should be placed
  at Beginner level for this reason.
 
LEVEL PROGRESSION (UPGRADING)
------------------------------
- Level upgrades are NOT automatic.
- After completing all 6 competencies (~48 weeks), the teacher assesses
  response quality and offers an upgrade.
- On upgrade: student_progress resets to Week 1 Day 1 of the new level.
- The same 6-competency framework applies at higher complexity.
- Revisiting the same themes at a higher level is intentional and
  pedagogically sound — themes are universal, complexity is not.
- Students who prefer to stay at their level and maintain English rather
  than advance should never be forced to upgrade. The loop-back logic
  in the edge function supports this.
 
COMPETENCY COMPLETION BEHAVIOR (planned)
------------------------------------------
- When a student exhausts all available weeks for their level/purpose,
  the daily-prompt-sender loops back to Week 1 as review content.
- Student is flagged as completion_status = 'completed_awaiting_choice'
  in student_progress (column to be added).
- A congratulatory LINE message is sent explaining options:
  1. Retake the current competency track for reinforcement
  2. Switch purpose horizontally (e.g. Work → Travel)
  3. Advance to the next level (if teacher assesses readiness)
- Teacher is notified for personal follow-up.
- Prompts continue during the decision period so subscription value
  is never interrupted. Review content is clearly framed as review.
 
 
==================================================
3. THE 6 COMPETENCIES
==================================================
 
The same competency sequence applies at every level. What changes across
levels is complexity, vocabulary depth, scenario realism, scaffolding
amount, and Japanese support — not the fundamental skill being trained.
 
#   Competency                    Japanese              Months    Weeks
--  ----------------------------  --------------------  --------  ------
1   First Contact                 はじめの一歩          1–2       1–8
2   Keep It Alive                 会話をつなげよう      3–4       9–16
3   Tell Your Story               自分のことを話そう    5–6       17–24
4   Handle the Unexpected         とっさの対応          7–8       25–32
5   Say What You Think            自分の意見を言おう    9–10      33–40
6   Full Confidence               自信を持って話せる    11–12     41–48
 
Each competency = 56 prompts per purpose = 224 prompts across all 4 purposes.
 
CORE SKILLS PER COMPETENCY
---------------------------
C1 — First Contact:
  Starting a conversation naturally without freezing.
 
C2 — Keep It Alive:
  Reactions, backchanneling, and follow-up questions — the skills that
  prevent awkward silence and make the other person feel heard.
 
C3 — Tell Your Story:
  Talking about yourself naturally — not as a monologue or rehearsed
  script, but as a genuine conversational response.
 
C4 — Handle the Unexpected:
  Clarifying, buying time, surviving real conversations — what separates
  people who can have English conversations from those who can only have
  prepared ones.
 
C5 — Say What You Think:
  Expressing opinions, agreeing and disagreeing politely — where English
  stops being a skill and starts becoming a voice.
 
C6 — Full Confidence:
  All skills integrated, unscripted, spontaneous. The capstone competency.
 
COMPETENCY THEMES (2-week sub-topics, 4 per competency)
---------------------------------------------------------
 
C1 — First Contact:
  Wks 1–2: Natural greetings
  Wks 3–4: Real answers
  Wks 5–6: First questions back
  Wks 7–8: Mini conversations
 
C2 — Keep It Alive:
  Wks 1–2: Reactions
  Wks 3–4: Follow-up questions
  Wks 5–6: Showing genuine interest
  Wks 7–8: Full conversational flow
 
C3 — Tell Your Story:
  Wks 1–2: What you do
  Wks 3–4: What you like
  Wks 5–6: Experiences
  Wks 7–8: Longer answers
 
C4 — Handle the Unexpected:
  Wks 1–2: When you don't understand
  Wks 3–4: Buying time
  Wks 5–6: Making sure you're understood
  Wks 7–8: Staying calm under pressure
 
C5 — Say What You Think:
  Wks 1–2: Likes & dislikes with reasons
  Wks 3–4: Agreeing & disagreeing
  Wks 5–6: Sharing opinions
  Wks 7–8: Deeper conversations
 
C6 — Full Confidence:
  Wks 1–2: Telling short stories
  Wks 3–4: Managing topics
  Wks 5–6: Closing conversations
  Wks 7–8: Full integration
 
 
==================================================
4. JAPANESE SUPPORT SCALING
==================================================
 
Japanese support tapers across two axes: the student's level and their
competency within that level. The goal is gradual removal of scaffolding
as the student gains confidence.
 
The edge function handles null prompt_text_japanese gracefully — if the
field is null, the Japanese block simply does not appear in the LINE
message. This is entirely content-driven; no code changes are needed.
 
SCALING MATRIX
--------------
                C1          C2          C3          C4          C5          C6
Super Beg:      Full        High        Medium      Low         Minimal     None
Beginner:       Medium      Low         Minimal     Minimal     None        None
Intermediate:   Occasional  None        None        None        None        None
 
WHAT EACH LEVEL CONTAINS
-------------------------
Full (●●●●●):
  Vocabulary translations, grammar explanation, cultural context,
  pronunciation tip (odd-numbered Listening days), prior knowledge bridge
  (theme-change weeks), motivational note, competency goal summary.
 
High (●●●●○):
  Vocabulary translations, grammar explanation, cultural context.
  No pronunciation tip or goal summary.
 
Medium (●●●○○):
  Key vocabulary only + one-line grammar note. No cultural context.
 
Low (●●○○○):
  Translation of new or tricky vocabulary only. No grammar notes.
 
Minimal (●○○○○):
  One-line translation of the scenario setup only, if needed.
 
None (○○○○○):
  prompt_text_japanese is null. No Japanese support included.
 
 
==================================================
5. THE 7-DAY PEDAGOGICAL ARC
==================================================
 
Every week at every level follows the same 7-day sequence. Consistency
is intentional — students always know what kind of prompt is coming,
which reduces anxiety and builds daily habit. The depth and difficulty of
content changes across levels and competencies; the structure does not.
 
SPECIAL CASE — DAY 3 DUAL FUNCTION:
Day 3 is Vocabulary on Weeks 1–4, 6, 8.
Day 3 is Spaced Recall on Weeks 5 & 7.
The 7 structural day types remain constant.
 
Day  Type                Tag          Response     Est. Review
---  ------------------  -----------  -----------  -----------
1    Listening Practice  [Listen]     voice_short  2–3 min
2    Grammar Tip         [Tip]        text         1–2 min
3    Vocabulary/Recall   [Practice]   text         1–2 min
                         [Recall]*
4    Speaking Prompt     [Challenge]  voice_short  2–3 min
5    Quiz                [Quiz]       choice       ~15 sec
6    Real Talk           [Scenario]   voice_short  2–3 min
7    Free Speaking       [Challenge]  voice_free   4–5 min
 
* [Recall] replaces [Practice] on Weeks 5 & 7 only.
 
LEARNING GOAL & PSYCHOLOGICAL BASIS PER DAY
--------------------------------------------
Day 1 — Listening Practice:
  Modelled input — hear natural English, repeat both speaker lines.
  Builds phonological memory before production.
  Basis: Input Hypothesis (Krashen): comprehensible modelled input
  drives acquisition. Imitation activates phonological memory.
 
Day 2 — Grammar Tip:
  One grammar/phrase pattern + examples + >> insight note.
  One written practice sentence.
  Basis: Noticing Hypothesis (Schmidt): explicit attention to form
  accelerates implicit learning. The >> note creates "aha" moments.
 
Day 3 — Vocabulary / Recall:
  Weeks 1–4, 6, 8: Three related phrases in context with written practice.
  Weeks 5 & 7: Spaced Recall Day — retrieve prior-week phrases from
  memory without looking back.
  Basis: Spacing Effect (Ebbinghaus): recall at increasing intervals
  moves items from working memory to long-term memory.
 
Day 4 — Speaking Prompt:
  Guided scenario with scaffolding. Week 1 includes [Example] model.
  Student records and sends a short voice reply.
  Basis: Output Hypothesis (Swain): producing language forces deeper
  processing than input alone. Scaffolding reduces anxiety.
 
Day 5 — Quiz:
  A/B quiz with BBAABABA answer pattern across 8 weeks.
  Student sends: choice + reason + own natural version.
  Automated feedback sent after 10–30 min delay.
  Basis: Testing Effect (Roediger & Karpicke 2006): recognition plus
  immediate production converts shallow memory to deep recall.
 
Day 6 — Real Talk:
  Scenario-based prompt. Teacher responds personally within the day.
  Weeks 4 & 8 embed metacognitive reflection.
  Basis: Interactionist Theory (Long): negotiation of meaning with a
  real human is the most powerful driver of acquisition.
 
Day 7 — Free Speaking:
  No script or examples. Feedback loop reminder from Week 2 onward.
  Basis: Autonomy (Deci & Ryan): free production without scaffolding
  builds real confidence. Forces genuine retrieval — strongest practice.
 
PROMPT NUMBERING FORMULA
-------------------------
Prompt number = (week_number - 1) × 7 + day_number
Example: Week 3 Day 5 = (3-1) × 7 + 5 = 19
 
Prompts #1–56 repeat independently per purpose. A Work learner's #1
has different content from a Hobby learner's #1 but shares the same
structural template.
 
 
==================================================
6. THE 4 PURPOSES
==================================================
 
Every prompt set is produced in 4 purpose variants. The student's purpose
is captured at onboarding and stored in goals.purpose. The edge function
selects prompts matching the student's exact purpose.
 
BALANCE GUARANTEE: All 4 purposes deliver exactly 8 Real Talk + 8 Free
Speaking teacher interactions per competency. No learner path receives
more or less personal attention.
 
DEFAULT: If goals.purpose is missing or "Other", the system defaults to
Hobby.
 
PURPOSE PROFILES
----------------
 
WORK
  Setting:   Office, corridor, kitchen, meeting room
  Register:  Professional-casual
  Profile:   Professionals who need English for their job — meetings,
             emails, business travel.
  Note:      Avoid overly formal English that sounds stiff to native
             speakers. Business-appropriate vocabulary throughout.
 
HOBBY
  Setting:   Hobby classes, clubs, skill events, meetups
  Register:  Friendly-casual
  Profile:   Learners who want to connect with others around shared
             interests — events, clubs, online communities.
  Note:      Hobby spaces are low-pressure — ideal first English
             conversations. Warm and friendly tone throughout.
 
TRAVEL
  Setting:   Airports, hotels, tourist spots, restaurants
  Register:  Friendly-casual
  Profile:   Learners who travel or want to. Airport, hotel, tourist
             interactions.
  Note:      Mix of formal (hotel staff) and casual (fellow travellers).
             Practical focus. Travel creates natural common ground.
 
CASUAL
  Setting:   Language exchanges, cafes, social events, online meetups
  Register:  Informal-casual
  Profile:   Learners who want everyday English — social situations,
             making friends.
  Note:      Most casual register. Closest to natural native-speaker
             interaction. Learners motivated by connection, not performance.
 
PURPOSE CONTENT DIFFERENTIATION (C1 example)
---------------------------------------------
                Work                Hobby               Travel              Casual
Wks 1–2:       "Good morning!"     "Nice to meet you!" "Excuse me!"        "Hey!"
               "How are things?"   "Good to see you!"  "Small world!"      "You look familiar!"
Wks 3–4:       "I just..."         "Really enjoying    "Absolutely         "I'm really into..."
               "A little tired     it!"                loving it!"         "I've been..."
               but..."             "A bit challenging" "A bit exhausting"
Wks 5–6:       "How's your         "How long have you  "Have you tried     "Have you been to
               project going?"     been doing this?"   the local food?"    any good events?"
Wks 7–8:       "Talk later!"       "Have fun! Let's    "Safe travels!"     "Let's hang out!"
               "Have a good one!"  catch up after!"    "Let's compare      "So great meeting
                                                       notes!"             you!"
 
 
==================================================
7. EVIDENCE-BASED LEARNING ENHANCEMENTS (MANDATORY)
==================================================
 
CRITICAL: These 7 enhancements are MANDATORY standards for every
competency at every level. They were designed for C1 Super Beginner and
canonised here as non-negotiable requirements. When building any new
competency or level, ALL 7 must be implemented. Do not treat these as
optional improvements or skip them for speed.
 
--------------------------------------------------
Enhancement 1: SPACED REPETITION (Recall Days)
--------------------------------------------------
Where applied:  Day 3 of Weeks 5 & 7 (Prompts #31 & #45)
Tag:            [Recall]
 
What it does:
  Weeks 5 & 7 Day 3 are converted from Vocabulary days to Spaced Recall
  Days. Students retrieve phrases from Weeks 1–4 from memory without
  looking back. Covers all theme areas for that purpose. No new
  vocabulary is introduced on these days.
 
Why it works:
  Spacing Effect (Ebbinghaus 1885; Cepeda et al. 2006): retrieval at
  2–4 week intervals produces significantly stronger long-term retention
  than re-studying. Interleaving forces retrieval, strengthening neural
  encoding.
 
--------------------------------------------------
Enhancement 2: QUIZ UPGRADE — Recognition to Recall
--------------------------------------------------
Where applied:  Day 5 every week (Prompts #5, 12, 19, 26, 33, 40, 47, 54)
Pattern:        BBAABABA across 8 weeks
 
What it does:
  All 32 quizzes (per purpose per competency) use single-message format.
  Student sends one reply containing: answer choice + reason + own
  natural version in one sentence. Correct answers alternate in BBAABABA
  pattern to prevent guessing. Automated feedback sent after 10–30 min
  delay to mimic human response rhythm.
 
Why it works:
  Testing Effect (Roediger & Karpicke 2006): immediate production after
  recognition converts shallow memory to deep recall. Alternating answers
  prevents pattern-guessing without reading the prompt.
 
--------------------------------------------------
Enhancement 3: PRONUNCIATION GUIDANCE
--------------------------------------------------
Where applied:  Day 1 of Weeks 1, 3, 5, 7 (Prompts #1, 15, 29, 43)
Tag:            [Pronunciation] in Japanese support field
 
What it does:
  A targeted connected-speech pronunciation note is added to the Japanese
  support on odd-numbered Listening Practice days. Covers: stress
  patterns, vowel reduction, and common Japanese-speaker phonological
  challenges (L/R distinction, TH sounds, final consonants, word stress).
 
Why it works:
  Phonological Loop (Baddeley 1992): unaddressed pronunciation errors
  become fossilized. Early explicit attention prevents the most common
  Japanese-speaker issues from becoming permanent habits.
 
--------------------------------------------------
Enhancement 4: FEEDBACK LOOP CLOSURE
--------------------------------------------------
Where applied:  Day 7 of Weeks 2–8 (Prompts #14, 21, 28, 35, 42, 49, 56)
 
What it does:
  One line added to every Day 7 Free Speaking prompt from Week 2 onward:
  "If I gave you feedback last time — try to use it in this response!"
  Week 1 Day 7 does not include this line (no prior feedback exists yet).
 
Why it works:
  Feedback Processing (Hattie & Timperley 2007): feedback only drives
  learning when students are explicitly prompted to apply it. Without
  this instruction, feedback is received but rarely acted upon.
 
--------------------------------------------------
Enhancement 5: METACOGNITIVE REFLECTION
--------------------------------------------------
Where applied:  Day 7 of Weeks 4 & 8 (Prompts #28 & #56)
Tag:            [Reflection]
 
What it does:
  Two reflection questions in Japanese are embedded in the Day 7
  challenge prompt at the midpoint (Week 4) and end (Week 8) of each
  competency:
  "What felt easier compared to Week 1?"
  "What still feels challenging?"
 
Why it works:
  Metacognition (Flavell 1979; Hattie 2009): self-monitoring is one of
  the highest-effect-size interventions in education (d=0.67). Adult
  learners benefit especially — they can act on their own insights more
  deliberately than children.
 
--------------------------------------------------
Enhancement 6: PRIOR KNOWLEDGE ACTIVATION
--------------------------------------------------
Where applied:  Day 1 of Weeks 3, 5, 7 (Prompts #15, 29, 43)
                12 bridge sentences total (3 theme-change weeks × 4 purposes)
 
What it does:
  At each theme-change week (Weeks 3, 5, 7), the Day 1 Japanese support
  includes an explicit bridge sentence connecting the new theme to the
  previous one. Students are reminded of what they already know before
  encountering new material.
 
Why it works:
  Schema Theory (Ausubel 1968): new learning anchors more effectively
  when existing knowledge is consciously activated first. Explicitly
  naming the connection reduces cognitive load and improves retention.
 
--------------------------------------------------
Enhancement 7: VISIBLE SUCCESS CRITERIA
--------------------------------------------------
Where applied:  Prompt #1 (Week 1 Day 1) — competency goals introduction
                Prompt #56 (Week 8 Day 7) — achievement checklist
 
What it does:
  Week 1 Day 1 Japanese support includes: "By the end of 8 weeks you'll
  be able to..." followed by 4 specific, observable outcomes for that
  competency and purpose. Week 8 Day 7 includes an achievement checklist
  confirming all competency goals earned.
 
Why it works:
  Goal-Setting Theory (Locke & Latham 2002): learners who know their
  target allocate attention more effectively, persist longer, and feel
  motivated on completion. Closing the loop with a checklist reinforces
  progress and encourages continuation to the next competency.
 
 
==================================================
8. QUIZ DESIGN STANDARD
==================================================
 
All Day 5 quizzes across every competency and level follow this design.
It is a three-part production task, not a simple A/B choice.
 
STUDENT MESSAGE FORMAT
----------------------
The prompt instructs:
"Send me A or B — tell me why, and also write your own natural version
in one sentence!"
 
A typical student reply:
  B — "How are things?" sounds natural and casual. A is too formal!
  My version: "How's your morning going?"
 
ANSWER PATTERN — BBAABABA
--------------------------
Correct answers across the 8 weeks of each competency:
  Week:    1  2  3  4  5  6  7  8
  Answer:  B  B  A  A  B  A  B  A
 
This pattern is identical across all 4 purposes within a competency
(so Work, Hobby, Travel and Casual all share the same answer sequence
for a given competency). The pattern may vary between competencies.
 
The pattern prevents students from noticing a predictable sequence and
guessing without reading.
 
DATABASE COLUMNS FOR QUIZ PROMPTS
-----------------------------------
correct_answer (text):
  "A" or "B" — displayed in teacher portal next to student response so
  teacher can confirm correctness at a glance.
 
quiz_explanation (text):
  Natural-language explanation of why the correct answer is better.
  Used by teacher when giving feedback or validating the student's own
  written version.
 
IMPORTANT: These columns are for teacher portal reference, not
automated answer-checking. The teacher always reviews the student's
reasoning and own-version sentence — not just the letter choice.
 
 
==================================================
9. PRE-RECORDING REQUIREMENTS
==================================================
 
Every Day 1 Listening Practice requires one pre-recorded audio file per
week, delivered via LINE before the prompt text sends. Each recording
contains all dialogue lines in sequence — sent as a single voice message
so the student receives one notification, not multiple.
 
RECORDING COUNT
---------------
Per competency:
  Work:    8 recordings  (2–4 lines each)
  Hobby:   8 recordings  (2–4 lines each)
  Travel:  8 recordings  (3–5 lines each)
  Casual:  8 recordings  (3–5 lines each)
  Total:   32 recordings per competency
 
Full system:
  32 recordings × 6 competencies × 3 levels = 576 recordings total
 
RECORDING GUIDELINES
--------------------
Format:
  One voice message per week containing all dialogue lines in sequence.
  Single notification to the student — no notification flood.
 
Pace:
  80% of natural speed — clear but not robotic. Students must be able
  to understand before they repeat.
 
Tone:
  Warm, encouraging, energetic — especially Week 1 of each competency
  to set the emotional tone for the 8 weeks ahead.
 
File naming convention:
  c[competency]_[purpose]_w[week]_d1.m4a
  Example: c1_work_w1_d1.m4a
  Example: c2_hobby_w3_d1.m4a
 
Quality requirements:
  Quiet space. No background music. One natural breath between lines.
 
Priority order:
  Record Work Week 1 and Casual Week 1 first for each new competency —
  these set the first impression for those learner groups.
 
THEME ARC BY PURPOSE (C1 reference)
-------------------------------------
Work:    Workplace greetings → mini work conversations
Hobby:   Hobby introductions → mini class conversations
Travel:  Tourist spot greetings → mini travel conversations
Casual:  Event greetings → mini casual conversations
 
 
==================================================
10. PROMPT TOKEN & TAG REFERENCE
==================================================
 
SQUARE-BRACKET TOKENS
----------------------
These tokens appear in prompt_text in the database. The formatPromptText()
function in the daily-prompt-sender edge function converts ALL of them to
emoji before sending via LINE.
 
To add a new token: add one .replace() line to formatPromptText() and
add a row to this table.
 
Token         Emoji   Day(s)      Used For
------------  ------  ----------  ------------------------------------------
[Listen]      🎧      Day 1       Introduce the listening activity
[Voice]       🗣️      1, 4, 6, 7  Mark a spoken line or voice challenge
[*]           💡      Day 1       Teaching note (English only, never in
                                  prompt_text_japanese)
[Tip]         📘      Day 2       Grammar Tip header
[Practice]    ✏️      Days 2, 3   Written practice instruction
[Challenge]   🎯      Days 4, 7   Speaking challenge instruction
[Quiz]        ❓      Day 5       Quiz header
[Scenario]    🎭      Day 6       Real Talk scenario setup
 
INLINE CONTENT TAGS
-------------------
These tags appear in prompt content as markers for content writers. They
are NOT converted to emoji by the edge function — they are structural
signals used during content creation and for internal reference.
 
Tag             Location                  Prompt Numbers        Purpose
--------------  ------------------------  --------------------  ---------------------------
>>              Day 2 prompt_text         All Day 2 prompts     Marks the key "aha" insight
                                                                note on Grammar Tip days.
[Recall]        Day 3 prompt_text         #31, #45              Marks a Spaced Recall Day.
                                          (Weeks 5, 7)          No new vocabulary.
[Pronunciation] Day 1 Japanese support    #1, #15, #29, #43     Marks pronunciation note for
                                          (Weeks 1, 3, 5, 7)    Japanese-speaker challenges.
[Reflection]    Day 7 prompt_text         #28, #56              Marks metacognitive reflection
                                          (Weeks 4, 8)          questions in Day 7 challenge.
[Example]       Days 2–5, Week 1 only     Prompts #2–5          Model answer provided in
                                                                Week 1 only (Super Beginner).
                                                                Removed from Week 2 onward.
 
 
==================================================
11. DATABASE QUICK REFERENCE
==================================================
 
See supabase_schema.md for the full schema. This section covers only the
fields directly relevant to the prompt delivery system.
 
PROMPTS TABLE — KEY FIELDS
---------------------------
level               (text)      'Super Beginner' | 'Beginner' | 'Intermediate'
purpose             (text)      'Work' | 'Hobby' | 'Travel' | 'Casual'
week_number         (integer)   Continuous 1–48. Never resets per competency.
                                C1=Wks 1–8, C2=9–16, C3=17–24, C4=25–32,
                                C5=33–40, C6=41–48.
day_number          (integer)   1–7. Maps directly to prompt type.
competency_number   (integer)   1–6.
competency          (text)      Human-readable name. See Section 3.
theme               (text)      2-week sub-topic. 4 per competency, 24 total.
                                See Section 3.
type                (text)      Listening Practice | Grammar Tip | Vocabulary |
                                Speaking Prompt | Quiz | Real Talk | Free Speaking
response_type       (text)      'choice' | 'text' | 'voice_short' | 'voice_free'
                                Note: 'choice' triggers automated quiz response
                                after 10–30 min delay.
prompt_text         (text)      English content with [Token] placeholders. Required.
prompt_text_japanese(text)      Japanese support. Nullable. If null, no Japanese
                                block appears in the LINE message. See Section 4.
audio_url           (text)      Nullable. Supabase Storage URL for pre-recorded
                                M4A audio. Day 1 prompts only. See Section 9.
correct_answer      (text)      Quiz prompts only. 'A' or 'B'. Teacher portal
                                display. See Section 8.
quiz_explanation    (text)      Quiz prompts only. Explanation for teacher portal.
                                See Section 8.
 
STUDENT_PROGRESS TABLE — KEY FIELDS
-------------------------------------
user_id              (uuid)         Links to auth.users and questionnaire_responses.
                                    UNIQUE constraint — one row per student.
                                    FOREIGN KEY → auth.users(id).
current_week         (integer)      Active week (1–48). Used to look up correct prompt.
current_day          (integer)      Active day (1–7). Increments after each successful send.
last_prompt_sent_at  (timestamptz)  Idempotency guard — if today, skip send.
total_prompts_sent   (integer)      Determines first-time user instructions.
                                    Value of 0 triggers onboarding message.
 
Row creation: Automatic via database trigger trg_initialize_student_progress
on questionnaire_responses INSERT/UPDATE. Trigger function
initialize_student_progress() creates the row when plan is
'line', 'power_lite', or 'power_pro' AND line_id is not null.
ON CONFLICT DO NOTHING prevents duplicates.
 
CONTENT COMPLEXITY GUIDELINES BY LEVEL
----------------------------------------
These guardrails ensure consistent difficulty calibration when building
prompts across levels.
 
Dimension                   Super Beginner         Beginner               Intermediate
--------------------------  ---------------------  ---------------------  ----------------------
Sentence length (student)   1–2 sentences          2–4 sentences          4–6+ structured
Grammar target              Simple present/past,   All basic tenses +     Conditionals,
                            to be, have            modal verbs            subjunctive, complex
New vocab per week          3–5 words/phrases      5–8 words/phrases      8–12 + idioms welcome
Instruction style           Step-by-step,          Moderate guidance,     Minimal guidance,
                            highly explicit        some assumptions       implicit expectations
Quiz format                 A vs B binary          A vs B + explain why   Multiple options +
                                                                          open-ended follow-up
Real Talk realism           Slow, clear,           Natural pace,          Native speed, slang,
                            predictable            some surprises         topic changes
Free Speaking expectation   Any attempt warmly     2+ sentences,          Structured, opinion
                            accepted               some coherence         required
Cultural notes              Frequent, gentle,      Occasional,            Rarely needed
                            reassuring             integrated naturally
 
 
==================================================
12. DEVELOPMENT ROADMAP
==================================================
 
Recommended build order: depth before breadth. Complete one level fully
before opening the next. This ensures first students always have a full
year of content at their level and never hit a content wall.
 
Phase  Content Block                   Prompts   Running Total   Why This Order
-----  ------------------------------  --------  --------------  --------------------------------
1      Super Beginner C2 (4 purposes)  224       448             SB students finishing C1 need
       [Work ✅ Hobby ✅ Travel ⏳                                C2 immediately.
        Casual ⏳ — 112/224 done]
2      Super Beginner C3               224       672             6 months of content before any
                                                                 marketing push.
3      Super Beginner C4               224       896             Buffer — students cannot run
                                                                 out of content.
4      Super Beginner C5 + C6          448       1,344           Complete the full SB year.
                                                                 No SB student can ever run out.
5      Beginner C1–C3                  672       2,016           Open Beginner tier. Begin
                                                                 accepting higher-level students.
6      Beginner C4–C6                  672       2,688           Complete the Beginner year.
7      Intermediate C1–C6              1,344     4,032           Full system complete.
 
EXCEPTION TO PHASE ORDER:
If a specific real Beginner-level student (e.g. a beta tester) is ready
to subscribe before Phase 5, build Beginner C1 early to serve them.
Build for real people in front of you, not hypothetical ones. Always
place students one level below their assessed level at entry.
 
ARCHITECTURE DOCUMENTS TO MAINTAIN
------------------------------------
For each completed competency, create:
  prokaiwa_c[n]_[level]_architecture.txt
  (e.g. prokaiwa_c1_super_beginner_architecture.txt)
 
This master document covers system-wide standards.
Competency-level documents cover:
  - The specific 8-week theme arc for that competency
  - Purpose differentiation table for that competency
  - Specific content examples and scenario worlds
  - Any competency-specific content notes
 
==================================================
END OF DOCUMENT
==================================================
