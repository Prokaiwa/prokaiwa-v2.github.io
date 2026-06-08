-- ============================================================================
-- Prokaiwa Website — public schema snapshot
-- Project ref: luyzyzefgintksydmwoh (Prokaiwa Website, ap-northeast-1)
-- Generated 2026-06-09 via read-only introspection (pg_get_*def / pg_catalog).
--
-- This is an AUTHORITATIVE REFERENCE BASELINE, not a CLI-tracked migration.
-- It documents the live schema exactly as the database describes itself.
-- Do NOT `supabase db push` this against the live project — the objects
-- already exist there. When Docker / `supabase db pull` becomes available,
-- use that to seed supabase/migrations/ for real migration tracking.
--
-- Notes / observations baked in during capture:
--   * message_log CHECK forbids 'stripe_webhook' — the stripe-webhook fn's
--     retry markers silently fail this constraint (see audit).
--   * calculate_dashboard_expiration is DUPLICATED (overloaded) with swapped
--     arg order; one copy is IMMUTABLE + search_path-pinned, the other is not.
--   * auto_assign_student_to_teacher hardcodes teacher 'prokaiwa.english@gmail.com'.
--   * Extensions live in the `extensions` schema (Supabase-managed): uuid-ossp,
--     pgcrypto, pg_net, pg_stat_statements, pg_cron, supabase_vault.
--   * FKs to auth.users(...) assume the Supabase-managed auth schema exists.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- SEQUENCES (standalone / serial — identity sequences are created with tables)
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.advanced_waitlist_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.phrases_id_seq;


-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE public.advanced_waitlist (
    id integer DEFAULT nextval('advanced_waitlist_id_seq'::regclass) NOT NULL,
    user_id uuid,
    email text NOT NULL,
    current_level text,
    interests text[],
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.booking_reminders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    booking_id uuid NOT NULL,
    student_id integer NOT NULL,
    reminder_type text NOT NULL,
    sent_at timestamp with time zone,
    sent_via text,
    delivery_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.breadcrumb_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    sequence_number integer NOT NULL,
    event_type text NOT NULL,
    element_tag text,
    element_id text,
    element_text text,
    element_href text,
    page_url text,
    event_timestamp timestamp with time zone DEFAULT now()
);

CREATE TABLE public.cancellation_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    student_id integer,
    cancelled_at timestamp with time zone DEFAULT now() NOT NULL,
    plan_at_cancellation text NOT NULL,
    months_subscribed integer,
    total_revenue numeric(10,2),
    reason_category text NOT NULL,
    reason_details text,
    reason_other_text text,
    retention_offer_shown text,
    retention_offer_result text,
    immediately_cancelled boolean DEFAULT false,
    resubscribed_at timestamp with time zone,
    resubscribed_within_days integer,
    created_at timestamp with time zone DEFAULT now(),
    satisfaction_rating integer,
    would_recommend text,
    additional_comments text
);

CREATE TABLE public.error_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text,
    error_message text NOT NULL,
    error_stack text,
    error_type text,
    page_url text,
    page_path text,
    browser text,
    browser_version text,
    os text,
    device_type text,
    screen_resolution text,
    session_id text,
    alert_sent boolean DEFAULT false,
    alert_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.feedback_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    student_id bigint,
    teacher_id uuid,
    feedback_type text,
    prompt_day integer,
    feedback_text text,
    sent_at timestamp with time zone DEFAULT now(),
    sent_via text DEFAULT 'teacher-portal'::text
);

CREATE TABLE public.first_time_consultations (
    student_id integer NOT NULL,
    user_id uuid NOT NULL,
    signup_date date NOT NULL,
    eligible_at date NOT NULL,
    claimed boolean DEFAULT false,
    claimed_at timestamp with time zone,
    booking_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.google_calendar_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    calendar_id text NOT NULL,
    service_account_email text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.lesson_bookings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    student_id integer NOT NULL,
    user_id uuid NOT NULL,
    lesson_type text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 50 NOT NULL,
    price integer DEFAULT 4000 NOT NULL,
    payment_status text DEFAULT 'pending'::text,
    stripe_payment_intent_id text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    google_meet_link text,
    google_calendar_event_id text,
    booking_source text DEFAULT 'dashboard'::text NOT NULL,
    cancellation_reason text,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    refund_status text,
    refunded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    teacher_id uuid NOT NULL
);

CREATE TABLE public.lesson_credits (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    student_id integer NOT NULL,
    user_id uuid NOT NULL,
    month date NOT NULL,
    plan text NOT NULL,
    total_credits integer NOT NULL,
    used_credits integer DEFAULT 0,
    rolled_from_previous integer DEFAULT 0,
    expires_at date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.message_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_id uuid,
    message_type text NOT NULL,
    message_text text,
    line_message_id text,
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    message_id text,
    media_type text DEFAULT 'text'::text
);

CREATE TABLE public.phrases (
    id integer DEFAULT nextval('phrases_id_seq'::regclass) NOT NULL,
    phrase_en text NOT NULL,
    phrase_ja text NOT NULL,
    example_en text NOT NULL,
    example_ja text NOT NULL,
    category text DEFAULT 'daily'::text,
    created_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.practice_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    practice_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level text NOT NULL,
    purpose text NOT NULL,
    prompt_text text NOT NULL,
    prompt_text_japanese text,
    sample_response text,
    week_number integer NOT NULL,
    day_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    competency_number integer,
    competency text,
    theme text,
    type text,
    day_of_week text,
    response_type text,
    audio_url text,
    correct_answer text,
    quiz_explanation text,
    audio_duration integer
);

CREATE TABLE public.push_subscriptions (
    id bigint GENERATED ALWAYS AS IDENTITY,
    teacher_id uuid,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.questionnaire_responses (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    email text,
    plan text,
    level text,
    goals jsonb,
    given_name_romaji text,
    payment_status text DEFAULT 'pending'::text,
    updated_at timestamp with time zone,
    user_id uuid,
    line_id text,
    last_phrase_id integer DEFAULT 0,
    last_phrase_date date,
    last_holiday_phrase_id integer DEFAULT 0,
    stripe_subscription_id text,
    stripe_customer_id text,
    subscription_status text DEFAULT 'none'::text,
    subscription_period_start timestamp with time zone,
    subscription_period_end timestamp with time zone,
    next_billing_date timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_effective_date timestamp with time zone,
    cancellation_reason_category text,
    cancellation_reason_details text,
    had_video_access boolean DEFAULT false,
    dashboard_access_expires_at timestamp with time zone,
    grace_period_warnings_sent integer DEFAULT 0,
    retention_offer_shown text,
    retention_offer_accepted boolean,
    retention_offer_timestamp timestamp with time zone,
    alumni_code text,
    alumni_created_at timestamp without time zone,
    alumni_discount_percent integer DEFAULT 50,
    teacher_contacted boolean DEFAULT false,
    teacher_contacted_at timestamp with time zone,
    family_name text,
    given_name text,
    line_connect_token text
);

CREATE TABLE public.stripe_event_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stripe_event_id text,
    stripe_event_type text NOT NULL,
    user_email text,
    stripe_customer_id text,
    stripe_subscription_id text,
    plan text,
    amount_jpy integer,
    outcome text,
    failure_reason text,
    alert_sent boolean DEFAULT false,
    alert_sent_at timestamp with time zone,
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.student_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    student_id bigint NOT NULL,
    assessed_by uuid NOT NULL,
    fluency integer NOT NULL,
    grammar integer NOT NULL,
    comprehension integer NOT NULL,
    vocabulary integer NOT NULL,
    pronunciation integer NOT NULL,
    total_score integer GENERATED ALWAYS AS (((((fluency + grammar) + comprehension) + vocabulary) + pronunciation)) STORED,
    band text GENERATED ALWAYS AS (
CASE
    WHEN (((((fluency + grammar) + comprehension) + vocabulary) + pronunciation) >= 39) THEN 'Advanced'::text
    WHEN (((((fluency + grammar) + comprehension) + vocabulary) + pronunciation) >= 26) THEN 'Intermediate'::text
    WHEN (((((fluency + grammar) + comprehension) + vocabulary) + pronunciation) >= 13) THEN 'Beginner'::text
    ELSE 'Super Beginner'::text
END) STORED,
    teacher_notes text,
    assessment_type text DEFAULT 'monthly'::text,
    assessed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.student_needs_survey (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    english_frequency text,
    english_feeling integer,
    stuck_moment text,
    study_history jsonb,
    dream_scenario text,
    specific_target text,
    three_month_goal text,
    daily_minutes text,
    response_preference text,
    priorities jsonb,
    mistake_comfort text,
    feedback_preferences text[],
    additional_notes text,
    onboarding_confirmed boolean DEFAULT false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.student_progress (
    user_id uuid NOT NULL,
    current_week integer DEFAULT 1,
    current_day integer DEFAULT 1,
    last_prompt_sent_at timestamp with time zone,
    total_prompts_sent integer DEFAULT 0,
    total_responses_received integer DEFAULT 0,
    started_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.student_teacher_assignments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    student_id bigint,
    teacher_id uuid,
    assigned_at timestamp with time zone DEFAULT now(),
    is_primary boolean DEFAULT true
);

CREATE TABLE public.survey_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    used_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.teacher_availability (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    teacher_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.teachers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    auth_user_id uuid,
    role text DEFAULT 'teacher'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.trial_feedback_survey (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    overall_satisfaction integer,
    overall_feelings_open text,
    would_recommend text,
    likelihood_to_continue integer,
    overall_emotional_open text,
    prompt_difficulty text,
    prompt_relevance integer,
    prompt_helped_improve text,
    prompts_responded_to text,
    prompt_frequency_rating text,
    prompt_topic_preferences text[],
    prompt_feeling_scale integer,
    prompt_feeling_open text,
    prompt_feedback_open text,
    line_setup_ease text,
    line_enjoyment text,
    line_vs_app_preference text,
    line_message_clarity integer,
    comfortable_voice text,
    comfortable_text text,
    line_feeling_open text,
    line_change_open text,
    received_feedback text,
    feedback_helpfulness integer,
    feedback_encouraging text,
    feedback_type_preferences text[],
    teacher_feeling_open text,
    message_to_teacher_open text,
    account_setup_ease integer,
    questionnaire_rating text,
    had_setup_problems boolean,
    setup_problem_description text,
    welcome_video_rating text,
    onboarding_feeling_open text,
    onboarding_improve_open text,
    dashboard_usage text,
    dashboard_navigation_ease integer,
    wanted_dashboard_nudge text,
    dashboard_use_more_open text,
    dashboard_liked_open text,
    dashboard_confused_open text,
    dashboard_change_open text,
    dashboard_progress_feeling_open text,
    enjoyed_most_open text,
    most_frustrating_open text,
    wished_platform_had_open text,
    would_remove_open text,
    continue_motivation_open text,
    one_word_description_open text,
    final_comments_open text
);


-- ----------------------------------------------------------------------------
-- CONSTRAINTS (primary keys, unique, foreign keys, checks)
-- ----------------------------------------------------------------------------
ALTER TABLE public.advanced_waitlist ADD CONSTRAINT advanced_waitlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.advanced_waitlist ADD CONSTRAINT advanced_waitlist_pkey PRIMARY KEY (id);
ALTER TABLE public.booking_reminders ADD CONSTRAINT booking_reminders_student_id_fkey FOREIGN KEY (student_id) REFERENCES questionnaire_responses(id);
ALTER TABLE public.booking_reminders ADD CONSTRAINT booking_reminders_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES lesson_bookings(id);
ALTER TABLE public.booking_reminders ADD CONSTRAINT booking_reminders_pkey PRIMARY KEY (id);
ALTER TABLE public.breadcrumb_log ADD CONSTRAINT breadcrumb_log_pkey PRIMARY KEY (id);
ALTER TABLE public.cancellation_events ADD CONSTRAINT cancellation_events_retention_offer_result_check CHECK ((retention_offer_result = ANY (ARRAY['accepted'::text, 'declined'::text, 'not_shown'::text])));
ALTER TABLE public.cancellation_events ADD CONSTRAINT cancellation_events_student_id_fkey FOREIGN KEY (student_id) REFERENCES questionnaire_responses(id);
ALTER TABLE public.cancellation_events ADD CONSTRAINT cancellation_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cancellation_events ADD CONSTRAINT cancellation_events_pkey PRIMARY KEY (id);
ALTER TABLE public.error_log ADD CONSTRAINT error_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.error_log ADD CONSTRAINT error_log_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback_log ADD CONSTRAINT feedback_log_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['weekly'::text, 'bi-weekly'::text, 'daily'::text, 'teacher-portal'::text, 'marked_complete'::text])));
ALTER TABLE public.feedback_log ADD CONSTRAINT feedback_log_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id);
ALTER TABLE public.feedback_log ADD CONSTRAINT feedback_log_student_id_fkey FOREIGN KEY (student_id) REFERENCES questionnaire_responses(id) ON DELETE CASCADE;
ALTER TABLE public.feedback_log ADD CONSTRAINT feedback_log_pkey PRIMARY KEY (id);
ALTER TABLE public.first_time_consultations ADD CONSTRAINT first_time_consultations_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES lesson_bookings(id);
ALTER TABLE public.first_time_consultations ADD CONSTRAINT first_time_consultations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.first_time_consultations ADD CONSTRAINT first_time_consultations_student_id_fkey FOREIGN KEY (student_id) REFERENCES questionnaire_responses(id);
ALTER TABLE public.first_time_consultations ADD CONSTRAINT first_time_consultations_pkey PRIMARY KEY (student_id);
ALTER TABLE public.google_calendar_sync ADD CONSTRAINT google_calendar_sync_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.google_calendar_sync ADD CONSTRAINT google_calendar_sync_pkey PRIMARY KEY (id);
ALTER TABLE public.google_calendar_sync ADD CONSTRAINT google_calendar_sync_user_id_key UNIQUE (user_id);
ALTER TABLE public.lesson_bookings ADD CONSTRAINT lesson_bookings_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES auth.users(id);
ALTER TABLE public.lesson_bookings ADD CONSTRAINT lesson_bookings_student_id_fkey FOREIGN KEY (student_id) REFERENCES questionnaire_responses(id);
ALTER TABLE public.lesson_bookings ADD CONSTRAINT lesson_bookings_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id);
ALTER TABLE public.lesson_bookings ADD CONSTRAINT lesson_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.lesson_bookings ADD CONSTRAINT lesson_bookings_pkey PRIMARY KEY (id);
ALTER TABLE public.lesson_credits ADD CONSTRAINT lesson_credits_plan_check CHECK ((plan = ANY (ARRAY['line'::text, 'video'::text, 'power_lite'::text, 'power_pro'::text])));
ALTER TABLE public.lesson_credits ADD CONSTRAINT lesson_credits_student_id_fkey FOREIGN KEY (student_id) REFERENCES questionnaire_responses(id);
ALTER TABLE public.lesson_credits ADD CONSTRAINT fk_lesson_credits_user FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.lesson_credits ADD CONSTRAINT lesson_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.lesson_credits ADD CONSTRAINT lesson_credits_pkey PRIMARY KEY (id);
ALTER TABLE public.lesson_credits ADD CONSTRAINT unique_student_month UNIQUE (student_id, month);
ALTER TABLE public.lesson_credits ADD CONSTRAINT uq_lesson_credits_user_month UNIQUE (user_id, month);
ALTER TABLE public.message_log ADD CONSTRAINT message_log_message_type_check CHECK ((message_type = ANY (ARRAY['prompt'::text, 'student_response'::text, 'teacher_feedback'::text, 'voice_memo'::text])));
ALTER TABLE public.message_log ADD CONSTRAINT message_log_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE SET NULL;
ALTER TABLE public.message_log ADD CONSTRAINT fk_message_log_user FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.message_log ADD CONSTRAINT message_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.message_log ADD CONSTRAINT message_log_pkey PRIMARY KEY (id);
ALTER TABLE public.phrases ADD CONSTRAINT phrases_pkey PRIMARY KEY (id);
ALTER TABLE public.practice_log ADD CONSTRAINT practice_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.practice_log ADD CONSTRAINT practice_log_pkey PRIMARY KEY (id);
ALTER TABLE public.practice_log ADD CONSTRAINT practice_log_user_id_practice_date_key UNIQUE (user_id, practice_date);
ALTER TABLE public.prompts ADD CONSTRAINT prompts_pkey PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
ALTER TABLE public.questionnaire_responses ADD CONSTRAINT questionnaire_responses_subscription_status_check CHECK ((subscription_status = ANY (ARRAY['none'::text, 'active'::text, 'cancelled'::text, 'past_due'::text, 'expired'::text])));
ALTER TABLE public.questionnaire_responses ADD CONSTRAINT questionnaire_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.questionnaire_responses ADD CONSTRAINT questionnaire_responses_pkey PRIMARY KEY (id);
ALTER TABLE public.questionnaire_responses ADD CONSTRAINT questionnaire_responses_alumni_code_key UNIQUE (alumni_code);
ALTER TABLE public.questionnaire_responses ADD CONSTRAINT questionnaire_responses_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
ALTER TABLE public.questionnaire_responses ADD CONSTRAINT questionnaire_responses_line_connect_token_key UNIQUE (line_connect_token);
ALTER TABLE public.questionnaire_responses ADD CONSTRAINT questionnaire_responses_user_id_key UNIQUE (user_id);
ALTER TABLE public.stripe_event_log ADD CONSTRAINT stripe_event_log_pkey PRIMARY KEY (id);
ALTER TABLE public.stripe_event_log ADD CONSTRAINT stripe_event_log_stripe_event_id_key UNIQUE (stripe_event_id);
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_pronunciation_check CHECK (((pronunciation >= 0) AND (pronunciation <= 10)));
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_assessment_type_check CHECK ((assessment_type = ANY (ARRAY['initial'::text, 'monthly'::text, 'progress'::text])));
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_comprehension_check CHECK (((comprehension >= 0) AND (comprehension <= 10)));
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_fluency_check CHECK (((fluency >= 0) AND (fluency <= 10)));
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_grammar_check CHECK (((grammar >= 0) AND (grammar <= 10)));
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_vocabulary_check CHECK (((vocabulary >= 0) AND (vocabulary <= 10)));
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_student_id_fkey FOREIGN KEY (student_id) REFERENCES questionnaire_responses(id) ON DELETE CASCADE;
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES teachers(id);
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.student_assessments ADD CONSTRAINT student_assessments_pkey PRIMARY KEY (id);
ALTER TABLE public.student_needs_survey ADD CONSTRAINT student_needs_survey_pkey PRIMARY KEY (id);
ALTER TABLE public.student_needs_survey ADD CONSTRAINT student_needs_survey_user_id_key UNIQUE (user_id);
ALTER TABLE public.student_progress ADD CONSTRAINT fk_student_progress_user FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.student_progress ADD CONSTRAINT student_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.student_progress ADD CONSTRAINT student_progress_pkey PRIMARY KEY (user_id);
ALTER TABLE public.student_progress ADD CONSTRAINT uq_student_progress_user UNIQUE (user_id);
ALTER TABLE public.student_teacher_assignments ADD CONSTRAINT student_teacher_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES questionnaire_responses(id) ON DELETE CASCADE;
ALTER TABLE public.student_teacher_assignments ADD CONSTRAINT student_teacher_assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE;
ALTER TABLE public.student_teacher_assignments ADD CONSTRAINT student_teacher_assignments_pkey PRIMARY KEY (id);
ALTER TABLE public.student_teacher_assignments ADD CONSTRAINT student_teacher_assignments_student_id_teacher_id_key UNIQUE (student_id, teacher_id);
ALTER TABLE public.survey_tokens ADD CONSTRAINT survey_tokens_pkey PRIMARY KEY (id);
ALTER TABLE public.survey_tokens ADD CONSTRAINT survey_tokens_token_key UNIQUE (token);
ALTER TABLE public.teacher_availability ADD CONSTRAINT teacher_availability_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
ALTER TABLE public.teacher_availability ADD CONSTRAINT teacher_availability_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id);
ALTER TABLE public.teacher_availability ADD CONSTRAINT teacher_availability_pkey PRIMARY KEY (id);
ALTER TABLE public.teacher_availability ADD CONSTRAINT no_overlap UNIQUE (teacher_id, day_of_week, start_time, end_time);
ALTER TABLE public.teacher_availability ADD CONSTRAINT teacher_availability_teacher_day_unique UNIQUE (teacher_id, day_of_week);
ALTER TABLE public.teachers ADD CONSTRAINT teachers_role_check CHECK ((role = ANY (ARRAY['teacher'::text, 'admin'::text])));
ALTER TABLE public.teachers ADD CONSTRAINT teachers_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
ALTER TABLE public.teachers ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);
ALTER TABLE public.teachers ADD CONSTRAINT teachers_email_key UNIQUE (email);
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_would_recommend_check CHECK ((would_recommend = ANY (ARRAY['yes'::text, 'maybe'::text, 'no'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_account_setup_ease_check CHECK (((account_setup_ease >= 1) AND (account_setup_ease <= 5)));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_comfortable_text_check CHECK ((comfortable_text = ANY (ARRAY['yes'::text, 'sometimes'::text, 'no'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_comfortable_voice_check CHECK ((comfortable_voice = ANY (ARRAY['yes'::text, 'sometimes'::text, 'no'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_dashboard_navigation_ease_check CHECK (((dashboard_navigation_ease >= 1) AND (dashboard_navigation_ease <= 5)));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_dashboard_usage_check CHECK ((dashboard_usage = ANY (ARRAY['often'::text, 'few_times'::text, 'didnt_use'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_feedback_encouraging_check CHECK ((feedback_encouraging = ANY (ARRAY['yes'::text, 'somewhat'::text, 'no'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_feedback_helpfulness_check CHECK (((feedback_helpfulness >= 1) AND (feedback_helpfulness <= 5)));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_likelihood_to_continue_check CHECK (((likelihood_to_continue >= 1) AND (likelihood_to_continue <= 5)));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_line_enjoyment_check CHECK ((line_enjoyment = ANY (ARRAY['yes'::text, 'okay'::text, 'not_really'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_line_message_clarity_check CHECK (((line_message_clarity >= 1) AND (line_message_clarity <= 5)));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_line_setup_ease_check CHECK ((line_setup_ease = ANY (ARRAY['very_easy'::text, 'easy'::text, 'difficult'::text, 'very_difficult'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_line_vs_app_preference_check CHECK ((line_vs_app_preference = ANY (ARRAY['line_fine'::text, 'prefer_app'::text, 'either'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_overall_satisfaction_check CHECK (((overall_satisfaction >= 1) AND (overall_satisfaction <= 5)));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_prompt_difficulty_check CHECK ((prompt_difficulty = ANY (ARRAY['too_easy'::text, 'just_right'::text, 'too_hard'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_prompt_feeling_scale_check CHECK (((prompt_feeling_scale >= 1) AND (prompt_feeling_scale <= 5)));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_prompt_frequency_rating_check CHECK ((prompt_frequency_rating = ANY (ARRAY['too_much'::text, 'just_right'::text, 'not_enough'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_prompt_helped_improve_check CHECK ((prompt_helped_improve = ANY (ARRAY['yes'::text, 'a_little'::text, 'not_sure'::text, 'no'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_prompt_relevance_check CHECK (((prompt_relevance >= 1) AND (prompt_relevance <= 5)));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_prompts_responded_to_check CHECK ((prompts_responded_to = ANY (ARRAY['all'::text, 'most'::text, 'some'::text, 'very_few'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_questionnaire_rating_check CHECK ((questionnaire_rating = ANY (ARRAY['very_useful'::text, 'useful'::text, 'a_bit_long'::text, 'too_long'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_received_feedback_check CHECK ((received_feedback = ANY (ARRAY['yes'::text, 'no'::text, 'not_sure'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_wanted_dashboard_nudge_check CHECK ((wanted_dashboard_nudge = ANY (ARRAY['yes'::text, 'no'::text, 'didnt_know'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_welcome_video_rating_check CHECK ((welcome_video_rating = ANY (ARRAY['yes'::text, 'a_little'::text, 'didnt_watch'::text])));
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_pkey PRIMARY KEY (id);
ALTER TABLE public.trial_feedback_survey ADD CONSTRAINT trial_feedback_survey_user_id_key UNIQUE (user_id);


-- ----------------------------------------------------------------------------
-- INDEXES (non-constraint)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_advanced_waitlist_user_id ON public.advanced_waitlist USING btree (user_id);
CREATE INDEX idx_booking_reminders_booking ON public.booking_reminders USING btree (booking_id);
CREATE INDEX idx_booking_reminders_status ON public.booking_reminders USING btree (delivery_status);
CREATE INDEX idx_booking_reminders_student ON public.booking_reminders USING btree (student_id);
CREATE INDEX idx_breadcrumb_session ON public.breadcrumb_log USING btree (session_id, sequence_number);
CREATE INDEX idx_cancellation_events_date ON public.cancellation_events USING btree (cancelled_at);
CREATE INDEX idx_cancellation_events_reason ON public.cancellation_events USING btree (reason_category);
CREATE INDEX idx_cancellation_events_user ON public.cancellation_events USING btree (user_id);
CREATE INDEX idx_cancelled_students ON public.questionnaire_responses USING btree (subscription_status, cancelled_at) WHERE (subscription_status = 'cancelled'::text);
CREATE INDEX idx_dashboard_access_expires ON public.questionnaire_responses USING btree (dashboard_access_expires_at);
CREATE INDEX idx_error_log_created_at ON public.error_log USING btree (created_at DESC);
CREATE INDEX idx_error_log_session_id ON public.error_log USING btree (session_id);
CREATE INDEX idx_error_log_user_id ON public.error_log USING btree (user_id);
CREATE INDEX idx_feedback_log_sent_at ON public.feedback_log USING btree (sent_at);
CREATE INDEX idx_feedback_log_student ON public.feedback_log USING btree (student_id);
CREATE INDEX idx_first_time_eligible ON public.first_time_consultations USING btree (eligible_at);
CREATE INDEX idx_first_time_student ON public.first_time_consultations USING btree (student_id);
CREATE INDEX idx_google_calendar_sync_active ON public.google_calendar_sync USING btree (is_active);
CREATE INDEX idx_google_calendar_sync_user_id ON public.google_calendar_sync USING btree (user_id);
CREATE INDEX idx_lesson_bookings_scheduled ON public.lesson_bookings USING btree (scheduled_at);
CREATE INDEX idx_lesson_bookings_status ON public.lesson_bookings USING btree (status);
CREATE INDEX idx_lesson_bookings_student ON public.lesson_bookings USING btree (student_id);
CREATE INDEX idx_lesson_bookings_user ON public.lesson_bookings USING btree (user_id);
CREATE INDEX idx_lesson_credits_expires ON public.lesson_credits USING btree (expires_at);
CREATE INDEX idx_lesson_credits_month ON public.lesson_credits USING btree (month);
CREATE INDEX idx_lesson_credits_student ON public.lesson_credits USING btree (student_id);
CREATE INDEX idx_message_log_date ON public.message_log USING btree (sent_at);
CREATE INDEX idx_message_log_message_id ON public.message_log USING btree (message_id);
CREATE INDEX idx_message_log_type ON public.message_log USING btree (message_type);
CREATE INDEX idx_message_log_user ON public.message_log USING btree (user_id);
CREATE INDEX idx_practice_log_user_date ON public.practice_log USING btree (user_id, practice_date DESC);
CREATE INDEX idx_prompts_level_purpose ON public.prompts USING btree (level, purpose);
CREATE INDEX idx_prompts_week_day ON public.prompts USING btree (week_number, day_number);
CREATE INDEX idx_questionnaire_alumni_code ON public.questionnaire_responses USING btree (alumni_code);
CREATE INDEX idx_stripe_event_created ON public.stripe_event_log USING btree (created_at DESC);
CREATE INDEX idx_stripe_event_email ON public.stripe_event_log USING btree (user_email);
CREATE INDEX idx_stripe_event_type ON public.stripe_event_log USING btree (stripe_event_type);
CREATE INDEX idx_stripe_subscription_id ON public.questionnaire_responses USING btree (stripe_subscription_id);
CREATE INDEX idx_student_assessments_assessed_at ON public.student_assessments USING btree (assessed_at DESC);
CREATE INDEX idx_student_assessments_user_id ON public.student_assessments USING btree (user_id);
CREATE INDEX idx_student_teacher_student ON public.student_teacher_assignments USING btree (student_id);
CREATE INDEX idx_student_teacher_teacher ON public.student_teacher_assignments USING btree (teacher_id);
CREATE INDEX idx_subscription_period_end ON public.questionnaire_responses USING btree (subscription_period_end);
CREATE INDEX idx_subscription_status ON public.questionnaire_responses USING btree (subscription_status);
CREATE INDEX idx_teacher_availability_day ON public.teacher_availability USING btree (day_of_week);
CREATE INDEX idx_teacher_availability_teacher ON public.teacher_availability USING btree (teacher_id);


-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — enable
-- ----------------------------------------------------------------------------
ALTER TABLE public.advanced_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breadcrumb_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_time_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_needs_survey ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_feedback_survey ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can insert their own waitlist entry" ON public.advanced_waitlist AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own waitlist entry" ON public.advanced_waitlist AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Service role can manage reminders" ON public.booking_reminders AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY "Anyone can insert breadcrumbs" ON public.breadcrumb_log AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service role can read breadcrumbs" ON public.breadcrumb_log AS PERMISSIVE FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can manage cancellation events" ON public.cancellation_events AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can view own cancellation events" ON public.cancellation_events AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Anyone can insert errors" ON public.error_log AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Service role can read errors" ON public.error_log AS PERMISSIVE FOR SELECT TO service_role USING (true);
CREATE POLICY "Teachers can insert feedback" ON public.feedback_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((teacher_id IN ( SELECT teachers.id FROM teachers WHERE (teachers.auth_user_id = auth.uid()))));
CREATE POLICY "Teachers see own feedback" ON public.feedback_log AS PERMISSIVE FOR SELECT TO authenticated USING (((teacher_id IN ( SELECT teachers.id FROM teachers WHERE (teachers.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.role = 'admin'::text))))));
CREATE POLICY "Service role can manage consultations" ON public.first_time_consultations AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY "Students can view own consultation status" ON public.first_time_consultations AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Teachers can view all consultations" ON public.first_time_consultations AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.is_active = true)))));
CREATE POLICY "Service role can manage calendar configs" ON public.google_calendar_sync AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Users can view own calendar config" ON public.google_calendar_sync AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Students can create own bookings" ON public.lesson_bookings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Students can update own bookings" ON public.lesson_bookings AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Students can view own bookings" ON public.lesson_bookings AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Teachers can update bookings" ON public.lesson_bookings AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.is_active = true)))));
CREATE POLICY "Teachers can view all bookings" ON public.lesson_bookings AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.is_active = true)))));
CREATE POLICY "Service role can manage credits" ON public.lesson_credits AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY "Students can view own credits" ON public.lesson_credits AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Teachers can view all credits" ON public.lesson_credits AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.is_active = true)))));
CREATE POLICY "Teachers see assigned student messages" ON public.message_log AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id IN ( SELECT qr.user_id FROM ((student_teacher_assignments sta JOIN questionnaire_responses qr ON ((qr.id = sta.student_id))) JOIN teachers t ON ((t.id = sta.teacher_id))) WHERE (t.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.role = 'admin'::text))))));
CREATE POLICY "Users can view own messages" ON public.message_log AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Allow authenticated to read phrases" ON public.phrases AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access to phrases" ON public.phrases AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users can insert own practice logs" ON public.practice_log AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own practice logs" ON public.practice_log AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own practice logs" ON public.practice_log AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Admin teachers can update prompt audio_url" ON public.prompts AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.role = 'admin'::text) AND (teachers.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.role = 'admin'::text) AND (teachers.is_active = true)))));
CREATE POLICY "Allow authenticated to read prompts" ON public.prompts AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access to prompts" ON public.prompts AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Teachers can manage own subscriptions" ON public.push_subscriptions AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.id = push_subscriptions.teacher_id) AND (teachers.auth_user_id = auth.uid())))));
CREATE POLICY "Teachers can update contact status" ON public.questionnaire_responses AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.is_active = true)))));
CREATE POLICY "Teachers see assigned students" ON public.questionnaire_responses AS PERMISSIVE FOR SELECT TO authenticated USING (((id IN ( SELECT sta.student_id FROM (student_teacher_assignments sta JOIN teachers t ON ((t.id = sta.teacher_id))) WHERE (t.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.role = 'admin'::text))))));
CREATE POLICY "Users can create and update their own response." ON public.questionnaire_responses AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own responses." ON public.questionnaire_responses AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Service role only" ON public.stripe_event_log AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Teachers can insert assessments" ON public.student_assessments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((assessed_by = ( SELECT teachers.id FROM teachers WHERE (teachers.auth_user_id = auth.uid()))) AND ((user_id IN ( SELECT qr.user_id FROM ((student_teacher_assignments sta JOIN questionnaire_responses qr ON ((qr.id = sta.student_id))) JOIN teachers t ON ((t.id = sta.teacher_id))) WHERE (t.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.role = 'admin'::text)))))));
CREATE POLICY "Teachers can view student assessments" ON public.student_assessments AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id IN ( SELECT qr.user_id FROM ((student_teacher_assignments sta JOIN questionnaire_responses qr ON ((qr.id = sta.student_id))) JOIN teachers t ON ((t.id = sta.teacher_id))) WHERE (t.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.role = 'admin'::text))))));
CREATE POLICY "Users can view own assessments" ON public.student_assessments AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Anon can insert survey" ON public.student_needs_survey AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can select own survey" ON public.student_needs_survey AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update survey by user_id" ON public.student_needs_survey AS PERMISSIVE FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can insert survey" ON public.student_needs_survey AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can select own survey" ON public.student_needs_survey AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update survey" ON public.student_needs_survey AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on survey" ON public.student_needs_survey AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY "Teachers can view surveys" ON public.student_needs_survey AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.is_active = true)))));
CREATE POLICY "Teachers see assigned student progress" ON public.student_progress AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id IN ( SELECT qr.user_id FROM ((student_teacher_assignments sta JOIN questionnaire_responses qr ON ((qr.id = sta.student_id))) JOIN teachers t ON ((t.id = sta.teacher_id))) WHERE (t.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.role = 'admin'::text))))));
CREATE POLICY "Users can view own progress" ON public.student_progress AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Teachers see own assignments" ON public.student_teacher_assignments AS PERMISSIVE FOR SELECT TO authenticated USING (((teacher_id IN ( SELECT teachers.id FROM teachers WHERE (teachers.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1 FROM teachers WHERE ((teachers.auth_user_id = auth.uid()) AND (teachers.role = 'admin'::text))))));
CREATE POLICY "Anon can update token used_at" ON public.survey_tokens AS PERMISSIVE FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can validate tokens" ON public.survey_tokens AS PERMISSIVE FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can also validate tokens" ON public.survey_tokens AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update token used_at" ON public.survey_tokens AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on survey_tokens" ON public.survey_tokens AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY "Anyone can view teacher availability" ON public.teacher_availability AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage own availability" ON public.teacher_availability AS PERMISSIVE FOR ALL TO authenticated USING ((teacher_id IN ( SELECT teachers.id FROM teachers WHERE (teachers.auth_user_id = auth.uid()))));
CREATE POLICY "Allow anonymous to check teacher email exists" ON public.teachers AS PERMISSIVE FOR SELECT TO anon USING ((auth_user_id IS NULL));
CREATE POLICY "Allow teachers to read their own record" ON public.teachers AS PERMISSIVE FOR SELECT TO authenticated USING ((auth_user_id = auth.uid()));
CREATE POLICY "Allow teachers to update their own auth_user_id" ON public.teachers AS PERMISSIVE FOR UPDATE TO authenticated USING ((email = (auth.jwt() ->> 'email'::text))) WITH CHECK ((email = (auth.jwt() ->> 'email'::text)));
CREATE POLICY "Anon can insert feedback" ON public.trial_feedback_survey AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update own feedback" ON public.trial_feedback_survey AS PERMISSIVE FOR UPDATE TO anon USING (true);
CREATE POLICY "Service role full access" ON public.trial_feedback_survey AS PERMISSIVE FOR ALL TO service_role USING (true);
CREATE POLICY "Teachers can read all feedback" ON public.trial_feedback_survey AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read own feedback" ON public.trial_feedback_survey AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));


-- ----------------------------------------------------------------------------
-- FUNCTIONS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.allocate_monthly_credits()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    student RECORD;
    current_month DATE;
    expiry_date DATE;
BEGIN
    current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    expiry_date := (DATE_TRUNC('month', current_month + INTERVAL '2 months') - INTERVAL '1 day')::DATE;

    RAISE NOTICE 'Allocating credits for month: %, expiring: %', current_month, expiry_date;

    FOR student IN
        SELECT
            id AS student_id,
            user_id,
            plan,
            CASE
                WHEN plan = 'power_lite' THEN 2
                WHEN plan = 'power_pro' THEN 4
                ELSE 0
            END AS credits
        FROM questionnaire_responses
        WHERE payment_status = 'paid'
          AND subscription_status = 'active'
          AND plan IN ('power_lite', 'power_pro')
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM lesson_credits
            WHERE student_id = student.student_id
              AND month = current_month
        ) THEN
            INSERT INTO lesson_credits (
                student_id, user_id, month, plan,
                total_credits, used_credits, rolled_from_previous, expires_at
            ) VALUES (
                student.student_id, student.user_id, current_month, student.plan,
                student.credits, 0, 0, expiry_date
            );
            RAISE NOTICE 'Allocated % credits to student % (plan: %)',
                         student.credits, student.student_id, student.plan;
        END IF;
    END LOOP;

    RAISE NOTICE 'Credit allocation complete for %', current_month;
END;
$function$;


CREATE OR REPLACE FUNCTION public.auto_assign_student_to_teacher()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO student_teacher_assignments (student_id, teacher_id)
  SELECT NEW.id, t.id
  FROM teachers t
  WHERE t.email = 'prokaiwa.english@gmail.com'
  LIMIT 1
  ON CONFLICT (student_id, teacher_id) DO NOTHING;

  RETURN NEW;
END;
$function$;


-- NOTE: calculate_dashboard_expiration is OVERLOADED (two definitions, swapped
-- argument order). Captured both. Consider consolidating to one.
CREATE OR REPLACE FUNCTION public.calculate_dashboard_expiration(p_cancelled_at timestamp with time zone, p_had_video_access boolean)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
    IF p_had_video_access THEN
        -- 4 months from cancellation for C1/C2 users
        RETURN p_cancelled_at + INTERVAL '4 months';
    ELSE
        -- Plan A users: no extended access
        RETURN NULL;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.calculate_dashboard_expiration(p_had_video_access boolean, p_cancelled_at timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_had_video_access THEN
        -- 4 months extended access for Power Pack users
        RETURN p_cancelled_at + INTERVAL '4 months';
    ELSE
        -- LINE Practice Plan users: no extended access
        RETURN NULL;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.check_booking_eligibility(p_student_id integer, p_lesson_type text DEFAULT 'regular'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_result JSONB;
    v_credits INTEGER;
    v_plan TEXT;
    v_eligible_consultation BOOLEAN;
BEGIN
    SELECT plan INTO v_plan
    FROM questionnaire_responses
    WHERE id = p_student_id;

    v_credits := get_available_credits(p_student_id);
    v_eligible_consultation := is_eligible_for_consultation(p_student_id);

    v_result := jsonb_build_object(
        'canBook', true,
        'availableCredits', v_credits,
        'plan', v_plan,
        'eligibleForConsultation', v_eligible_consultation,
        'needsPayment', CASE
            WHEN p_lesson_type = 'retention' THEN false
            WHEN p_lesson_type = 'first_time_free' THEN false
            WHEN v_plan IN ('power_lite', 'power_pro') AND v_credits > 0 THEN false
            ELSE true
        END
    );

    RETURN v_result;
END;
$function$;


CREATE OR REPLACE FUNCTION public.check_dashboard_access(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_days_remaining INTEGER;
    v_result JSONB;
BEGIN
    SELECT
        subscription_status,
        subscription_period_end,
        had_video_access,
        dashboard_access_expires_at,
        cancelled_at,
        plan
    INTO v_user
    FROM questionnaire_responses
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_access', FALSE,
            'reason', 'no_profile',
            'message', 'Profile not found'
        );
    END IF;

    -- Active subscriber
    IF v_user.subscription_status = 'active' THEN
        RETURN jsonb_build_object(
            'has_access', TRUE,
            'reason', 'active_subscriber',
            'message', NULL,
            'show_warning', FALSE
        );
    END IF;

    -- Cancelled but still in paid period
    IF v_user.subscription_status = 'cancelled' AND
       v_now < v_user.subscription_period_end THEN
        RETURN jsonb_build_object(
            'has_access', TRUE,
            'reason', 'cancelled_in_period',
            'message', 'Subscription cancelled. Access until ' || TO_CHAR(v_user.subscription_period_end, 'Month DD, YYYY'),
            'show_warning', TRUE,
            'access_ends', v_user.subscription_period_end
        );
    END IF;

    -- Video access grace period (4 months)
    IF v_user.had_video_access AND
       v_user.dashboard_access_expires_at IS NOT NULL AND
       v_now < v_user.dashboard_access_expires_at THEN

        v_days_remaining := EXTRACT(DAY FROM v_user.dashboard_access_expires_at - v_now)::INTEGER;

        -- Month 4 warning (last 30 days)
        IF v_days_remaining <= 30 THEN
            RETURN jsonb_build_object(
                'has_access', TRUE,
                'reason', 'grace_period_ending',
                'message', 'Dashboard access ends in ' || v_days_remaining || ' days',
                'show_warning', TRUE,
                'show_resubscribe_cta', TRUE,
                'days_remaining', v_days_remaining
            );
        END IF;

        -- Grace period (months 1-3)
        RETURN jsonb_build_object(
            'has_access', TRUE,
            'reason', 'grace_period',
            'message', 'You can still access your dashboard and book one-time lessons',
            'show_warning', FALSE,
            'can_book_lessons', TRUE
        );
    END IF;

    -- No access
    RETURN jsonb_build_object(
        'has_access', FALSE,
        'reason', 'access_expired',
        'message', 'Your access has expired',
        'show_resubscribe_page', TRUE
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_available_credits(p_student_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_credits INTEGER;
BEGIN
    SELECT (total_credits + rolled_from_previous - used_credits)
    INTO v_credits
    FROM lesson_credits
    WHERE student_id = p_student_id
    AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE
    AND expires_at >= CURRENT_DATE;

    RETURN COALESCE(v_credits, 0);
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_current_teacher_id()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM teachers WHERE auth_user_id = auth.uid() LIMIT 1;
$function$;


CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.increment_student_responses(p_user_id uuid)
 RETURNS void
 LANGUAGE sql
AS $function$
  UPDATE student_progress
  SET total_responses_received = total_responses_received + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
$function$;


CREATE OR REPLACE FUNCTION public.initialize_student_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.plan IN ('line', 'power_lite', 'power_pro') AND NEW.line_id IS NOT NULL THEN
    INSERT INTO student_progress (user_id, current_week, current_day, started_at)
    VALUES (NEW.user_id, 1, 1, NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.is_eligible_for_consultation(p_student_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_eligible BOOLEAN;
BEGIN
    SELECT
        NOT claimed
        AND eligible_at <= CURRENT_DATE
    INTO v_eligible
    FROM first_time_consultations
    WHERE student_id = p_student_id;

    RETURN COALESCE(v_eligible, false);
END;
$function$;


CREATE OR REPLACE FUNCTION public.restore_lesson_credit(p_student_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE lesson_credits
    SET used_credits = GREATEST(used_credits - 1, 0),
        updated_at = NOW()
    WHERE student_id = p_student_id
    AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.use_lesson_credit(p_student_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE lesson_credits
    SET used_credits = used_credits + 1,
        updated_at = NOW()
    WHERE student_id = p_student_id
    AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE
    AND (total_credits + rolled_from_previous - used_credits) > 0;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No available credits for student %', p_student_id;
    END IF;
END;
$function$;


-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------
CREATE TRIGGER lesson_bookings_updated_at BEFORE UPDATE ON public.lesson_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lesson_credits_updated_at BEFORE UPDATE ON public.lesson_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER assign_student_after_questionnaire AFTER INSERT ON public.questionnaire_responses FOR EACH ROW EXECUTE FUNCTION auto_assign_student_to_teacher();
CREATE TRIGGER on_updated_at BEFORE UPDATE ON public.questionnaire_responses FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_initialize_student_progress AFTER INSERT OR UPDATE ON public.questionnaire_responses FOR EACH ROW EXECUTE FUNCTION initialize_student_progress();
CREATE TRIGGER teacher_availability_updated_at BEFORE UPDATE ON public.teacher_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at();
