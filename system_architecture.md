# Prokaiwa System Architecture Document
  **Living Reference Document | Last Updated: 2026-04-15**
 
---
 
## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [Edge Functions Reference](#edge-functions-reference)
4. [Frontend Components](#frontend-components)
5. [Feature Impact Matrix](#feature-impact-matrix)
6. [Critical Data Flows](#critical-data-flows)
7. [Subscription & Payment Architecture](#subscription--payment-architecture)
8. [Common Workflows](#common-workflows)
9. [Quick Reference Tables](#quick-reference-tables)
---
 
## 🏗️ System Overview
 
### Technology Stack
- **Frontend**: HTML, CSS, JavaScript (vanilla), <1% TypeScript
- **Shared Components**: assets/js/components.js (nav + footer)
- **Backend**: Supabase (database, auth, edge functions)
- **Payments**: Stripe (subscriptions, one-time payments)
- **Messaging**: LINE (daily prompts, student responses)
- **Meetings**: Google Meet (live lessons)
- **Hosting**: Supabase (edge functions), domain via Namecheap
- **Version Control**: GitHub
### System Architecture Principles
1. **Auth Separation**: Supabase Auth handles all authentication
2. **Mixed ID Strategy**: 
   - UUIDs for: auth users, teachers, bookings, most tracking tables
   - Integers/Bigints for: student entities across legacy tables
3. **Single Source of Truth**: 
   - `questionnaire_responses` = central lifecycle hub
   - `supabase_schema.md` = database authority
   - `EDGE_FUNCTIONS_MASTER_INDEX_md.txt` = edge function authority
4. **No Duplication**: Business logic exists in ONE place only
5. **Fail Gracefully**: Analytics failures never block core business actions
---
 
## 🗄️ Database Architecture
 
### Core Entity Types
1. **Users/Students** - Mixed ID system (uuid auth, integer student_id)
2. **Teachers** - UUID-based, linked to auth
3. **Subscriptions** - Stripe-managed, tracked in database
4. **Lessons** - Bookings, credits, scheduling
5. **Content** - Prompts, phrases, assessments
6. **Analytics** - Tracking, feedback, cancellations
### Database Tables (Grouped by Purpose)
 
#### 👤 User & Auth Tables
| Table | Purpose | Key Columns | Accessed By |
|-------|---------|-------------|-------------|
| `auth.users` | Supabase auth system | id (uuid), email | All authenticated pages/functions |
 
#### 📊 Core Lifecycle & Subscription
| Table | Purpose | Key Columns | Accessed By |
|-------|---------|-------------|-------------|
| `questionnaire_responses` | **Central hub** for user lifecycle, subscription state, onboarding data | id (bigint), user_id (uuid), plan, subscription_status, stripe_customer_id, stripe_subscription_id, line_id, level, goals, retention_offer_*, alumni_* | questionnaire.html, dashboard.html, cancellation.html, cancel-subscription function, handle-retention-offer function, daily-prompt-delivery function |
 
**Why questionnaire_responses is critical**: This table is the single source of truth for:
- What plan the user is on
- Subscription status (active, canceled, trialing)
- Stripe customer/subscription IDs
- LINE ID for messaging
- Learning level and goals
- Retention offer history
- Alumni status
#### 💳 Lessons & Credits
| Table | Purpose | Key Columns | Accessed By |
|-------|---------|-------------|-------------|
| `lesson_bookings` | All lesson scheduling, payment tracking | id (uuid), student_id (int), teacher_id (uuid), scheduled_at, status, price, payment_status, stripe_payment_intent_id, google_meet_link | dashboard.html, teacher-portal.html, lesson-booking function |
| `lesson_credits` | Monthly credit allocation by plan | id (uuid), student_id (int), user_id (uuid) [FK→auth.users], month [UNIQUE with user_id], plan, total_credits, used_credits, rolled_from_previous | dashboard.html, account-settings.html, lesson-booking function (via RPC) |
| `first_time_consultations` | Track first-time consultation eligibility | student_id (int), eligible_at, claimed, booking_id | lesson-booking function |
 
#### 👨‍🏫 Teacher Management
| Table | Purpose | Key Columns | Accessed By |
|-------|---------|-------------|-------------|
| `teachers` | Teacher profiles | id (uuid), auth_user_id (uuid), full_name, email, role, is_active | teacher-portal.html, lesson-booking function |
| `teacher_availability` | Weekly availability slots | id (uuid), teacher_id (uuid), day_of_week, start_time, end_time, is_available | dashboard.html, teacher-portal.html, lesson-booking function |
| `student_teacher_assignments` | Student-teacher pairings | id (uuid), student_id (bigint), teacher_id (uuid), is_primary | teacher-portal.html, send-teacher-feedback function |
| `google_calendar_sync` | Google Calendar integration | id (uuid), user_id (uuid), calendar_id, is_active | dashboard.html, lesson-booking function |
 
#### 💬 LINE Messaging & Content
| Table | Purpose | Key Columns | Accessed By |
|-------|---------|-------------|-------------|
| `prompts` | Daily English prompt content | id (uuid), level, purpose, prompt_text, prompt_text_japanese, week_number, day_number | daily-prompt-delivery function |
| `phrases` | Phrase-based learning content | id (int), phrase_en, phrase_ja, example_en, example_ja, category | Future feature (not currently used) |
| `student_progress` | Track daily prompt progression | user_id (uuid) [UNIQUE, FK→auth.users], current_week, current_day, total_prompts_sent, total_responses_received | daily-prompt-delivery function |
| `message_log` | All LINE messages sent/received | id (uuid), user_id (uuid) [FK→auth.users], prompt_id (uuid), message_type, message_text, line_message_id, media_type, sent_at | dashboard.html, daily-prompt-delivery function, non-responder-reminders function, line-webhook function, fetch-line-media function |
 
#### 📝 Feedback & Assessment
| Table | Purpose | Key Columns | Accessed By |
|-------|---------|-------------|-------------|
| `feedback_log` | Teacher feedback on student work | id (uuid), student_id (bigint), teacher_id (uuid), feedback_type, prompt_day, feedback_text, sent_at | teacher-portal.html, send-teacher-feedback function |
| `student_assessments` | Formal teacher evaluations | id (uuid), student_id (bigint), assessed_by (uuid), fluency, grammar, comprehension, vocabulary, pronunciation, total_score, band, teacher_notes | dashboard.html, teacher-portal.html |
 
#### 📈 Analytics & Retention
| Table | Purpose | Key Columns | Accessed By |
|-------|---------|-------------|-------------|
| `cancellation_events` | Churn analytics and retention tracking | id (uuid), user_id (uuid), cancelled_at, plan_at_cancellation, months_subscribed, reason_category, retention_offer_shown, retention_offer_result, satisfaction_rating | cancellation.html, cancel-subscription function, handle-retention-offer function |
| `practice_log` | Daily practice tracking | id (uuid), user_id (uuid), practice_date | dashboard.html, daily-prompt-delivery function |
| `booking_reminders` | Track lesson reminders sent | id (uuid), booking_id (uuid), student_id (int), reminder_type, sent_at | Automated reminder system (if implemented) |
| `advanced_waitlist` | Users interested in advanced offerings | id (int), user_id (uuid), email, current_level, interests | handle-retention-offer function (advanced alumni) |
 
### Critical Database Relationships
 
```
┌─────────────┐
│ auth.users  │ (uuid)
└──────┬──────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌──────────────────────┐            ┌────────────────┐
│questionnaire_responses│            │   teachers     │
│ (CENTRAL HUB)        │            │                │
│ - user_id (uuid)     │            │ - id (uuid)    │
│ - id (bigint) ───────┼───────┐   │ - auth_user_id │
│   [student_id]       │       │    └────────┬───────┘
│ - stripe_customer_id │       │             │
│ - stripe_subscription│       │             │
│ - line_id            │       │             ▼
│ - plan               │       │    ┌──────────────────┐
│ - subscription_status│       │    │teacher_availability│
└──────┬───────────────┘       │    └──────────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│ student_progress │   │ lesson_bookings  │
│                  │   │                  │
│ - user_id (uuid) │   │ - student_id(int)│◄───┐
└──────────────────┘   │ - teacher_id(uuid)    │
                       │ - booking_id     │    │
                       └─────────┬────────┘    │
                                 │              │
                                 ▼              │
                       ┌──────────────────┐    │
                       │ lesson_credits   │    │
                       │                  │    │
                       │ - student_id(int)├────┘
                       └──────────────────┘
 
       ┌──────────────────┐
       │   message_log    │
       │                  │
       │ - user_id (uuid) │
       │ - prompt_id      │───────► ┌─────────┐
       │ - line_message_id│          │ prompts │
       └──────────────────┘          └─────────┘
 
       ┌──────────────────────┐
       │ cancellation_events  │
       │                      │
       │ - user_id (uuid)     │
       │ - student_id (int)   │
       └──────────────────────┘
```
 
**CRITICAL: Mixed ID Strategy**
- The system uses **both** uuid and integer IDs for students
- `questionnaire_responses.id` (bigint) acts as a logical `student_id`
- Many tables reference `student_id` as an integer
- Always check which ID type each table expects
---
 
## ⚡ Edge Functions Reference
 
### Edge Function Architecture
```
Frontend (HTML) ──HTTP──► Edge Function ──► Database
                  (Auth)                    (Queries/Updates)
                                    │
                                    └──► External APIs
                                         (Stripe, LINE, Google)
```
 
  ### Authentication Patterns
  - **User-triggered functions**: Bearer token verification + role checks in code
  - **Cron-triggered functions**: CRON_SECRET header verification (JWT OFF)
  - **Webhook functions**: Protocol-specific verification (LINE HMAC-SHA256, Stripe signature)
  - **Hybrid functions** (cancel-subscription): Supabase JWT layer + Bearer token in code
---
 
### 1️⃣ lesson-booking
**Trigger**: Authenticated HTTP from dashboard.html  
**Purpose**: Complete lesson lifecycle management  
 
**Actions**:
- Fetch available lesson slots
- Create new bookings
- Cancel bookings
- Reschedule bookings
**Reads From**:
- `teacher_availability`
- `lesson_bookings`
- `lesson_credits` (via RPC: `check_booking_eligibility`)
**Writes To**:
- `lesson_bookings`
- `lesson_credits` (via RPC: `use_lesson_credit`, `restore_lesson_credit`)
**External Services**:
- Google Calendar (create/update events)
**Critical Rules**:
- All times stored in UTC
- Credit validation BEFORE booking
- Google Calendar sync is non-blocking (best-effort)
**Called By**:
- dashboard.html (student booking interface)
- teacher-portal.html (teacher management)
---
 
### 2️⃣ handle-retention-offer
**Trigger**: Authenticated HTTP during cancellation flow  
**Purpose**: Apply retention actions before final cancellation  
 
**Actions**:
- Downgrade plan (e.g., power_pro → power_lite)
- Apply discount coupons
- Pause subscription (not yet implemented)
- Grant alumni status (video/advanced waitlist)
**Reads From**:
- `questionnaire_responses` (current subscription state)
**Writes To**:
- `questionnaire_responses` (retention offer tracking)
- `advanced_waitlist` (if advanced alumni chosen)
- `cancellation_events` (retention offer results)
**External Services**:
- Stripe API (update subscription, apply coupons)
**Critical Rules**:
- Does NOT cancel subscriptions (that's cancel-subscription's job)
- Must be called BEFORE cancel-subscription
- Updates retention_offer_* fields for tracking
**Called By**:
- cancellation.html (user retention flow)
---
 
### 3️⃣ cancel-subscription
**Trigger**: Authenticated HTTP from cancellation.html  
**Purpose**: **FINAL AUTHORITY** for subscription cancellation  
 
**Actions**:
- Cancel Stripe subscription immediately
- Update questionnaire_responses with cancellation state
- Set dashboard access expiry rules
- Log cancellation event for analytics
- Generate alumni codes (if requested)
**Reads From**:
- `questionnaire_responses` (subscription details)
**Writes To**:
- `questionnaire_responses` (cancelled_at, dashboard_access_expires_at, alumni codes)
- `cancellation_events` (full cancellation analytics)
**External Services**:
- Stripe API (cancel subscription)
**Dashboard Access Rules**:
- **Video plans** (video, power_lite, power_pro): +4 months after subscription end
- **LINE-only plans**: Access ends at subscription end
**Critical Rules**:
- Stripe cancellation happens FIRST (before database updates)
- This is the ONLY place subscription cancellation logic exists
- Always logs to cancellation_events for analytics
**Called By**:
- cancellation.html (final cancellation step)
---
 
### 4️⃣ daily-prompt-delivery
**Trigger**: Cron job (once per day) 
**JWT Verification**: OFF
**Authentication**: x-cron-secret header (CRON_SECRET env variable) 
**Purpose**: Send daily English prompts to active LINE students  
 
**Actions**:
- Fetch active students with LINE IDs
- Get next prompt based on student's progress
- Send prompt via LINE Messaging API
- Update student progress (increment day/week)
**Reads From**:
- `questionnaire_responses` (active students, line_id, level)
- `student_progress` (current_week, current_day)
- `prompts` (content based on level/week/day)
**Writes To**:
- `message_log` (prompt delivery record)
- `student_progress` (updated week/day)
**External Services**:
- LINE Messaging API (send prompt)
**Critical Rules**:
- One prompt per student per day
- Progress loops back to week 1 if content exhausted (temporary — planned: flag student as completed, send congratulatory message, notify teacher, continue review prompts until student chooses next path)
- Only sends to active subscriptions
**Triggered By**:
- Supabase Cron (automated daily)
---
 
### 5️⃣ non-responder-reminders (check-non-responders)
**Trigger**: Cron job (daily)  
**JWT Verification**: OFF
**Authentication**: x-cron-secret header (CRON_SECRET env variable)
**Purpose**: Send reminders to students who haven't responded to prompts  
 
**Actions**:
- Check message_log for students with no recent responses
- Send reminder messages at specific intervals
- Log reminder delivery
**Reads From**:
- `questionnaire_responses` (active students, line_id)
- `message_log` (last response dates)
**Writes To**:
- `message_log` (reminder messages)
**External Services**:
- LINE Messaging API
**Reminder Schedule**:
- Day 3: Missed 2 days → First reminder
- Day 5: Missed 4 days → Second reminder
- Day 7: Missed 6 days → Final reminder
**Critical Rules**:
- Maximum one reminder per student per day
- Only targets active subscriptions
**Triggered By**:
- Supabase Cron (automated daily)
---
 
### 6️⃣ line-webhook
**Trigger**: Webhook POST from LINE Messaging API
**JWT Verification**: OFF
**Authentication**: HMAC-SHA256 signature verification (LINE_CHANNEL_SECRET)
**Purpose**: Receive and process student responses to prompts  
 
**Actions**:
- Verify request signature from LINE
- Receive text, image, audio, video from students
- Store messages in message_log with prompt_id linking
- Handle follow events for account activation
- Process media IDs for later retrieval
 
**Reads From**:
- `questionnaire_responses` (user lookup by line_id)
- `message_log` (active prompt lookup via findActivePromptId)
 
**Writes To**:
- `questionnaire_responses` (line_id update on activation)
- `message_log` (student responses with prompt_id)
 
**External Services**:
- LINE Messaging API (webhook receiver + push messages)
 
**Critical Rules**:
- All requests verified via x-line-signature HMAC-SHA256
- Invalid/missing signatures rejected with 403
- Media files stored as LINE message IDs (not downloaded)
- Student responses linked to active prompt via prompt_id
 
**Called By**:
- LINE Platform (webhook delivery)
---
 
### 7️⃣ fetch-line-media (get-line-media)
**Trigger**: Authenticated HTTP GET from teacher-portal.html and student-detail.html
**JWT Verification**: OFF
**CORS Origin**: https://www.prokaiwa.com
**Authentication**: Query param token verified via supabase.auth.getUser() + active teacher check
**Purpose**: Securely proxy LINE media (audio, image, video) to browser for playback
 
**Actions**:
- Verify teacher authentication via query param token
- Look up message ID in message_log
- Fetch media from LINE Messaging API
- Stream media to client with correct Content-Type
**Reads From**:
- `message_log` (verify message exists, media_type lookup)
- `teachers` (active teacher verification)
**Writes To**:
- None (read-only)
**External Services**:
- LINE Messaging API (media download)
**Critical Rules**:
- Must return correct Content-Type for mobile playback
- Supports HTTP range requests
- Token passed as query param (HTML media tags cannot send Authorization headers)
- CORS headers included on ALL responses (success and error)
- OPTIONS preflight handler present
**Called By**:
- teacher-portal.html (student conversation media)
- student-detail.html (student conversation media)
---
 
### 8️⃣ send-teacher-feedback
**Trigger**: Authenticated HTTP from teacher-portal.html and student-detail.html
**JWT Verification**: ON
**CORS Origin**: https://www.prokaiwa.com
**Authentication**: Supabase JWT + Bearer token + active teacher role check
 
**Actions**:
- Verify caller is an active teacher
- Validate audioUrl domain (*.supabase.co only)
- Send feedback to student via LINE (text or native audio)
- Log feedback with authenticated teacher ID
 
**Reads From**:
- `teachers` (auth verification)
- `questionnaire_responses` (student LINE ID)
- `student_progress` (current prompt day)
 
**Writes To**:
- `feedback_log` (uses authenticated teacher.id, not client-sent)
 
**External Services**:
- LINE Messaging API (send feedback to student)
 
**Critical Rules**:
- Client-sent teacherId is IGNORED — server derives from JWT
- audioUrl must be from *.supabase.co domain
- LINE message sent before database insert
 
**Called By**:
- teacher-portal.html (all queue sections)
- student-detail.html (composer panel)
---
 
### 9️⃣ stripe-webhook
**Trigger**: HTTP POST from Stripe servers
**JWT Verification**: OFF
**Authentication**: Stripe webhook signature verification (STRIPE_WEBHOOK_SIGNING_SECRET)
**Purpose**: Handle Stripe payment events — initial checkout, subscription cancellations, monthly renewals
 
**Stripe Events Handled**:
- `checkout.session.completed` — Activates subscription, stores Stripe IDs, sends LINE welcome
- `customer.subscription.deleted` — Marks cancelled, calculates dashboard access expiry
- `invoice.paid` — Syncs subscription period dates on monthly renewal
**Reads From**:
- `questionnaire_responses` (line_id, given_name_romaji, plan, subscription_status, had_video_access)
**Writes To**:
- `questionnaire_responses` (payment_status, subscription_status, stripe_subscription_id, stripe_customer_id, period dates, cancellation fields)
- `survey_tokens` (generates token for welcome survey)
**External Services**:
- Stripe API (signature verification)
- LINE Messaging API (welcome message after checkout)
**Critical Rules**:
- Stripe signature verification must NEVER be bypassed
- payment_status update happens BEFORE LINE message attempt
- LINE message failure must NOT block payment success
- customer.subscription.deleted skips if already cancelled in DB (cancel-subscription page handled it)
- cancellation_reason_category = 'stripe_direct' distinguishes Stripe-side cancellations from user-initiated ones
**Called By**:
- Stripe Platform (webhook delivery)
---
 
### Edge Function Dependencies Summary
 
```
┌─────────────────────────┐
│   User-Triggered        │
├─────────────────────────┤
│ lesson-booking          │──► dashboard.html, teacher-portal.html
│ handle-retention-offer  │──► cancellation.html
│ cancel-subscription     │──► cancellation.html
│ send-teacher-feedback   │──► teacher-portal.html
└─────────────────────────┘
 
┌─────────────────────────┐
│   Cron-Triggered        │
├─────────────────────────┤
│ daily-prompt-delivery   │──► Automated (daily)
│ non-responder-reminders │──► Automated (daily)
└─────────────────────────┘
 
┌─────────────────────────┐
│   Webhook-Triggered     │
├─────────────────────────┤
│ line-webhook            │──► LINE Platform
│ stripe-webhook          │──► Stripe
│ fetch-line-media        │──► teacher-portal.html, student-detail.html
└─────────────────────────┘
```
---
 
---
 
## 🔍 Monitoring System
 
### Overview
Prokaiwa has a production monitoring system that captures errors, tracks user behaviour, and sends real-time alerts. It is fully operational as of April 14, 2026.
 
### Components
 
**prokaiwa-monitor.js** (assets/js/prokaiwa-monitor.js)
- Loaded on all 24 HTML pages via `<script>` tag in `<head>`
- Generates a unique session ID per browser tab (sessionStorage)
- Records click/navigation breadcrumbs in memory (up to 75 entries)
- Hooks into window.onerror, window.onunhandledrejection, and console.error
- On any error: saves full breadcrumb trail to breadcrumb_log + error details to error_log
- Fires email alert via notify-admin edge function
- Self-contained — no imports, no SDK dependency
**notify-admin** (edge function)
- Receives alert payloads from monitor and stripe-webhook
- Sends formatted HTML email to prokaiwa.english@gmail.com via Resend
- Email subject and badge color vary by error type for at-a-glance triage
- Marks error_log.alert_sent = true to prevent duplicate alerts
**stripe_event_log** (database table)
- Permanent record of every Stripe webhook event
- Includes outcome (success/failed/abandoned/cancelled) and failure_reason
- Populated by stripe-webhook on every event going forward
### Alert Email Types
| Type | Trigger | Badge |
|---|---|---|
| JS Error | Uncaught JavaScript exception | 🔴 RED |
| Promise Rejection | Failed Supabase/fetch call | 🟠 ORANGE |
| Console Error | console.error() call | 🟡 YELLOW |
| Payment Failure | Stripe payment_failed or DB error | 🟣 PURPLE |
| Abandoned Checkout | checkout.session.expired | 🟣 PURPLE |
 
### Email Infrastructure
- Provider: Resend (resend.com) — free tier, 3,000 emails/month
- From address: alerts@prokaiwa.com
- DNS: DKIM + SPF + DMARC + MX records verified in Namecheap
- API key stored as RESEND_API_KEY in Supabase Edge Function Secrets
## 🗂️ Supabase Storage Buckets
 
### Bucket Overview
 
| Bucket Name | Public | Max Size | Managed By |
|-------------|--------|----------|------------|
| `teacher-feedback-audio` | Yes | 5MB | teacher-portal.html |
| `prompt-recordings` | Yes | 5MB | prompt-recordings.html |
 
---
 
### teacher-feedback-audio
 
**Purpose**: Stores voice messages recorded by teachers and sent to students via LINE.
 
**Allowed MIME types**: `audio/mp4`, `audio/webm`, `audio/aac`
 
**Path pattern**: `teacher-audio/{teacher_id}/{timestamp}.{ext}`
 
**Extension logic**:
- Safari/iOS records M4A → `.m4a` → sent as LINE native audio message (plays inline)
- Chrome records WebM → `.webm` → sent as text message with playable link
**RLS Policy**: Authenticated teachers can upload. Public read (required for LINE to fetch the audio URL).
 
**Used by**:
- `teacher-portal.html` — uploads via `uploadAudioToStorage()`, then calls `send-teacher-feedback` with `audioUrl` + `audioDuration`
- `send-teacher-feedback` edge function — receives the public URL and passes it to the LINE audio message API
---
 
### prompt-recordings
 
**Purpose**: Stores teacher-recorded audio for prompt delivery. Used for Day 1 Listening Practice prompts where students hear a native speaker before responding.
 
**Allowed MIME types**: `audio/*`
 
**Path pattern**: `prompts/{level}/{purpose}/week-{nn}-{timestamp}.m4a`
 
**RLS Policy**: Admin-only upload. Public read.
 
**Used by**:
- `prompt-recordings.html` — admin page for browsing prompts and recording/uploading audio
- Updates `prompts.audio_url` column on successful upload
- `daily-prompt-sender` edge function — reads `prompts.audio_url` and sends audio via LINE before the text prompt on Day 1
---
---
 
## 🖥️ Frontend Components
 
### Page Overview
| File | Purpose | Auth Required | Connects To |
|------|---------|---------------|-------------|
| index.html | Landing page | No | None (static marketing) |
| login.html | Sign up / Sign in / Password reset | No | Supabase Auth API |
| questionnaire.html | Post-signup onboarding | Yes | questionnaire_responses table, Stripe Checkout |
| dashboard.html | Main student portal | Yes | questionnaire_responses, lesson_bookings, lesson_credits, student_progress, message_log, student_assessments, lesson-booking function, fetch-line-media function |
| account-settings.html | Account & subscription management | Yes | questionnaire_responses, lesson_credits |
| cancellation.html | Cancel subscription flow | Yes | questionnaire_responses, handle-retention-offer function, cancel-subscription function |
| teacher-login.html | Teacher authentication | No | Supabase Auth API |
| teacher-portal.html | Teacher dashboard | Yes (teacher) | lesson_bookings, teachers, teacher_availability, student_teacher_assignments, send-teacher-feedback function |
| thank-you/index.html | Post-signup confirmation | No | None (URL: /thank-you) |
| thank-you-video/index.html | Post-signup (Video) | No | None (URL: /thank-you-video) |
| thank-you-pro/index.html | Post-signup (Power) | No | None (URL: /thank-you-pro) |
| thank-you-line/index.html | Post-signup (LINE) | No | None (URL: /thank-you-line) |
| reset-password.html | Password reset handler | No | Supabase Auth API |
| password-reset.html | Password reset form | No | Supabase Auth API |
| about/index.html | Static about page | No | None (URL: /about) |
| contact/index.html | Static contact page | No | None (URL: /contact) |
| terms-of-service/index.html | Legal | No | None (URL: /terms-of-service) |
| privacy-policy/index.html | Legal | No | None (URL: /privacy-policy) |
| commerce-disclosure/index.html | Legal (Japanese) | No | None (URL: /commerce-disclosure) |
| reactivate.html | Reactivation for cancelled users | Yes | questionnaire_responses |
| student-detail.html | Individual student profile | Yes (teacher) | questionnaire_responses, message_log, feedback_log, student_assessments |
 | prompt-recordings.html | Admin audio management | Yes (admin teacher) | prompts, Supabase Storage |
 
---
 
### Frontend-Backend Connection Patterns
 
#### Pattern 1: Direct Supabase Queries
Pages that query the database directly:
```javascript
const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('user_id', userId);
```
 
**Used By**:
- dashboard.html (reads: questionnaire_responses, lesson_bookings, message_log, student_assessments, student_progress)
- account-settings.html (reads: questionnaire_responses, lesson_credits)
- questionnaire.html (writes: questionnaire_responses)
---
 
#### Pattern 2: Edge Function Calls
Pages that call Supabase Edge Functions:
```javascript
const { data, error } = await supabase.functions.invoke('function-name', {
    body: { ... }
});
```
 
**Used By**:
- dashboard.html → calls `lesson-booking` (create/cancel/reschedule lessons)
- cancellation.html → calls `handle-retention-offer`, then `cancel-subscription`
- teacher-portal.html → calls `send-teacher-feedback`
---
 
#### Pattern 3: External Redirects
Pages that redirect to external services:
```javascript
window.location.href = stripeCheckoutUrl;
```
 
**Used By**:
- questionnaire.html → redirects to Stripe Checkout
- (Stripe redirects back to thank-you pages after payment)
---
 
#### Pattern 4: Auth-Only Pages
Pages that only use Supabase Auth:
```javascript
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signUp({ email, password });
await supabase.auth.resetPasswordForEmail(email);
```
 
**Used By**:
- login.html (sign up, sign in, password reset)
- teacher-login.html (teacher sign in)
- reset-password.html (password reset handler)
- All pages (session management via `supabase.auth.onAuthStateChange`)
---
 
### Shared Dependencies Across All Pages
```javascript
// Every authenticated page includes:
import { createClient } from '@supabase/supabase-js@2.49.1';
const SUPABASE_URL = 'https://luyzyzefgintksydmwoh.supabase.co';
const SUPABASE_ANON_KEY = '...';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storageKey: 'prokaiwa-supabase-auth',  // CRITICAL: Consistent across all pages
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});
 
// Session Check Pattern
const { data: { session }, error } = await supabase.auth.getSession();
if (!session) {
    window.location.href = '/login.html';
}
 
// Auth State Listener
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = '/login.html';
    }
});
```
 
---
 
  ### Stylesheet & Script Dependencies
  | File | Used By | Purpose |
  |------|---------|---------|
  | assets/css/style.css | All pages | Global styles |
  | assets/js/components.js | All pages | Shared nav + footer injection |
  | assets/js/script.js | Public pages | Navigation, language toggle, FAQ, utilities |
  | Chart.js (CDN) | dashboard.html | Pentagon radar chart |
  | Font Awesome (CDN) | All pages (via components.js) | Icons |
 
---
 
## 🎯 Feature Impact Matrix
 
**How to use this**: When you want to add or change a feature, look here first to see everything that might be affected.
 
### If You Want To: Add/Change a Subscription Plan
 
**What's Affected**:
1. **Database**:
   - `questionnaire_responses.plan` (add new plan value)
   - `lesson_credits` (define credit allocation)
2. **Edge Functions**:
   - ✅ `handle-retention-offer` (add downgrade path if relevant)
   - ✅ `cancel-subscription` (add dashboard access rules)
   - ⚠️ `daily-prompt-delivery` (if LINE features differ)
3. **Frontend**:
   - ✅ `questionnaire.html` (add plan option + Stripe link)
   - ✅ `dashboard.html` (adjust features shown per plan)
   - ✅ `account-settings.html` (display plan details)
   - ✅ `cancellation.html` (update retention offers)
   - ✅ Add/update thank-you-[plan].html
4. **External Services**:
   - ✅ Stripe: Create new price/product
   - ⚠️ Stripe Webhook: Ensure plan_id mapping works
**Files to Update**: 7+ files, 2 edge functions, 1 Stripe config
 
---
 
### If You Want To: Modify Dashboard Features
 
**What's Affected**:
1. **Database**:
   - May need: new tables for new features
   - Will read: `questionnaire_responses` (for user plan/status)
2. **Edge Functions**:
   - Existing: May need to extend `lesson-booking` if booking-related
   - New: May need new edge function for complex operations
3. **Frontend**:
   - ✅ `dashboard.html` (always)
   - ⚠️ `style.css` (if new UI components)
   - ⚠️ May affect mobile responsiveness
**Files to Update**: 1-3 files, possibly 1 edge function
 
---
 
### If You Want To: Change LINE Prompt Content or Frequency
 
**What's Affected**:
1. **Database**:
   - ✅ `prompts` table (add/modify prompt content)
   - ⚠️ `student_progress` (if changing week/day structure)
2. **Edge Functions**:
   - ✅ `daily-prompt-delivery` (delivery logic)
   - ⚠️ `non-responder-reminders` (if reminder timing changes)
3. **Frontend**:
   - ⚠️ `dashboard.html` (if displaying prompt history)
4. **External Services**:
   - ⚠️ Supabase Cron (if frequency changes)
**Files to Update**: 1 database table, 1-2 edge functions, possibly 1 frontend file
 
---
 
### If You Want To: Add a New Retention Offer
 
**What's Affected**:
1. **Database**:
   - ✅ `questionnaire_responses` (add retention_offer_* tracking fields)
   - ✅ `cancellation_events` (update retention offer analytics)
2. **Edge Functions**:
   - ✅ `handle-retention-offer` (add new offer logic)
   - ⚠️ May affect Stripe subscription updates
3. **Frontend**:
   - ✅ `cancellation.html` (add offer UI)
4. **External Services**:
   - ⚠️ Stripe API (if offer involves subscription changes)
**Files to Update**: 1 frontend file, 1 edge function, database schema
 
---
 
### If You Want To: Modify Lesson Booking System
 
**What's Affected**:
1. **Database**:
   - ✅ `lesson_bookings` (booking records)
   - ✅ `lesson_credits` (credit logic)
   - ⚠️ `teacher_availability` (if changing scheduling)
2. **Edge Functions**:
   - ✅ `lesson-booking` (core booking logic)
3. **Frontend**:
   - ✅ `dashboard.html` (student booking interface)
   - ✅ `teacher-portal.html` (teacher management)
   - ⚠️ `account-settings.html` (if showing credit balance)
4. **External Services**:
   - ⚠️ Google Calendar integration
   - ⚠️ Stripe (if payment logic changes)
**Files to Update**: 2-3 frontend files, 1 edge function, possibly 3 database tables
 
---
 
### If You Want To: Add Teacher Feedback Features
 
**What's Affected**:
1. **Database**:
   - ✅ `feedback_log` (feedback records)
   - ⚠️ `student_teacher_assignments` (if changing pairings)
2. **Edge Functions**:
   - ✅ `send-teacher-feedback` (feedback delivery)
3. **Frontend**:
   - ✅ `teacher-portal.html` (teacher interface)
   - ✅ `dashboard.html` (student view of feedback)
4. **External Services**:
   - ✅ LINE Messaging API (send feedback to students)
**Files to Update**: 2 frontend files, 1 edge function, 1 database table
 
---
 
### If You Want To: Change Cancellation Flow
 
**What's Affected**:
1. **Database**:
   - ✅ `cancellation_events` (analytics tracking)
   - ✅ `questionnaire_responses` (cancellation state)
2. **Edge Functions**:
   - ✅ `cancel-subscription` (**CRITICAL**: single source of truth)
   - ⚠️ `handle-retention-offer` (if retention logic changes)
3. **Frontend**:
   - ✅ `cancellation.html` (cancellation UI)
4. **External Services**:
   - ✅ Stripe API (subscription cancellation)
**Files to Update**: 1 frontend file, 2 edge functions, 2 database tables
 
---
 
## 🔄 Critical Data Flows
 
### Flow 1: New User Signup → Subscription
 
```
User visits index.html
    ↓
User clicks "Start Learning"
    ↓
Redirected to login.html
    ↓
User signs up (email + password)
    ├──► Supabase Auth creates user (uuid)
    └──► User redirected to questionnaire.html
         ↓
         User completes onboarding form
         ├──► Selects plan (line, video, power_lite, power_pro)
         ├──► Enters goals, level, LINE ID
         └──► Submits form
              ├──► Writes to questionnaire_responses table
              │    (user_id, name, email, plan, level, goals, line_id)
              └──► Redirected to Stripe Checkout
                   (URL includes client_reference_id = user.id)
                   ↓
                   User completes payment on Stripe
                   ↓
                   Stripe Webhook fires → Updates questionnaire_responses
                   ├──► Sets stripe_customer_id
                   ├──► Sets stripe_subscription_id
                   ├──► Sets subscription_status = "active"
                   └──► Sets subscription_period_start/end
                        ↓
                        Stripe redirects user to thank-you-[plan].html
                        ↓
                        User can now access dashboard.html
```
 
**Tables Touched**:
- `auth.users` (created by Supabase Auth)
- `questionnaire_responses` (written twice: onboarding + Stripe webhook)
**External Services**:
- Supabase Auth
- Stripe Checkout
- Stripe Webhook
---
 
### Flow 2: Daily Prompt Delivery
 
```
Cron triggers daily-prompt-delivery function (e.g., 8 AM JST)
    ↓
Function queries questionnaire_responses
    ├──► Filter: subscription_status = 'active'
    ├──► Filter: line_id IS NOT NULL
    └──► Gets: user_id, line_id, level
         ↓
         For each active student:
             ↓
             Query student_progress
             ├──► Get current_week, current_day
             └──► Query prompts table
                  ├──► Match: level, week_number, day_number
                  └──► Get: prompt_text, prompt_text_japanese
                       ↓
                       Send prompt via LINE Messaging API
                       ├──► Use line_id as recipient
                       └──► Log success/failure
                            ↓
                            Write to message_log
                            ├──► user_id, prompt_id, message_type='prompt'
                            └──► message_text, line_message_id, sent_at
                                 ↓
                                 Update student_progress
                                 ├──► Increment current_day
                                 ├──► If day > 7: increment current_week, reset day to 1
                                 └──► Update last_prompt_sent_at
```
 
**Tables Touched**:
- `questionnaire_responses` (read: active students)
- `student_progress` (read: current progress, write: updated progress)
- `prompts` (read: prompt content)
- `message_log` (write: delivery record)
**External Services**:
- LINE Messaging API (send prompt)
**Edge Functions**:
- `daily-prompt-delivery` (cron-triggered)
---
 
### Flow 3: Student Responds to Prompt
 
```
Student sends message on LINE
    ↓
LINE Messaging API sends webhook POST to line-webhook function
    ├──► Payload includes: message text/media, user LINE ID
    └──► Function receives webhook
         ↓
         Look up user by LINE ID in questionnaire_responses
         ↓
         Store response in message_log
         ├──► user_id (uuid)
         ├──► message_type = 'response'
         ├──► message_text (text content)
         ├──► media_type (if image/audio/video)
         ├──► line_message_id (for media retrieval)
         └──► sent_at (timestamp)
              ↓
              Return 200 OK to LINE (acknowledge receipt)
              ↓
              [Later] Teacher views dashboard
                  ↓
                  dashboard.html queries message_log
                  ├──► Shows student responses
                  └──► If media: calls fetch-line-media function
                       ├──► Function fetches from LINE API
                       └──► Streams media to dashboard
```
 
**Tables Touched**:
- `questionnaire_responses` (read: look up user by line_id)
- `message_log` (write: student response)
**External Services**:
- LINE Messaging API (webhook receiver, media retrieval)
**Edge Functions**:
- `line-webhook` (webhook-triggered)
- `fetch-line-media` (HTTP-triggered by dashboard)
---
 
### Flow 4: Student Books a Lesson
 
```
Student opens dashboard.html
    ↓
Click "Book a Lesson"
    ↓
Dashboard calls lesson-booking function (action: 'fetchAvailability')
    ├──► Function queries teacher_availability
    ├──► Filters by date range, availability
    └──► Returns available time slots
         ↓
         Student selects date/time/teacher
         ↓
         Dashboard calls lesson-booking function (action: 'create')
         ├──► Function validates student has lesson credits
         │    ├──► Calls check_booking_eligibility RPC
         │    └──► Checks lesson_credits table
         ├──► Function creates booking in lesson_bookings
         │    ├──► student_id, teacher_id, scheduled_at, duration_minutes
         │    ├──► price, payment_status, status='scheduled'
         │    └──► booking_source='dashboard'
         ├──► Function decrements lesson credit
         │    └──► Calls use_lesson_credit RPC
         └──► Function creates Google Meet link
              ├──► Calls Google Calendar API
              ├──► Stores google_meet_link, google_calendar_event_id
              └──► Returns booking confirmation
                   ↓
                   Dashboard displays confirmation
                   ├──► Shows booking details
                   └──► Updates lesson history
```
 
**Tables Touched**:
- `teacher_availability` (read: available slots)
- `lesson_bookings` (write: new booking)
- `lesson_credits` (read/write: credit balance)
**External Services**:
- Google Calendar API (create event + Meet link)
**Edge Functions**:
- `lesson-booking` (HTTP-triggered by dashboard)
**Supabase RPC Functions**:
- `check_booking_eligibility`
- `use_lesson_credit`
---
 
### Flow 5: Student Cancels Subscription
 
```
Student opens dashboard.html
    ↓
Sees cancellation banner (if status shows cancellation eligible)
    ↓
Clicks "Cancel Subscription"
    ↓
Redirected to cancellation.html
    ↓
cancellation.html loads user data from questionnaire_responses
    ├──► Shows current plan
    ├──► Shows reason for cancellation form
    └──► Shows retention offers
         ↓
         Student selects cancellation reason(s)
         ↓
         Student sees retention offer (e.g., downgrade, discount)
         ↓
         IF student accepts retention offer:
             ↓
             cancellation.html calls handle-retention-offer function
             ├──► Offer type: downgrade, discount, alumni, etc.
             ├──► Function updates Stripe subscription
             ├──► Function updates questionnaire_responses
             │    └──► Sets retention_offer_accepted = true
             └──► Function logs to cancellation_events
                  └──► retention_offer_shown, retention_offer_result
                       ↓
                       User stays subscribed (with modifications)
         ↓
         ELSE student declines retention offer:
             ↓
             Student clicks "Confirm Cancellation"
             ↓
             cancellation.html calls cancel-subscription function
             ├──► Function cancels Stripe subscription FIRST
             │    └──► Stripe API: subscription.cancel() or cancel_at_period_end
             ├──► Function updates questionnaire_responses
             │    ├──► Sets subscription_status = 'canceled'
             │    ├──► Sets cancelled_at = now()
             │    ├──► Sets dashboard_access_expires_at
             │    │    └──► Video plans: +4 months
             │    │    └──► LINE-only: subscription_period_end
             │    └──► Generates alumni_code (if requested)
             └──► Function logs to cancellation_events
                  ├──► reason_category, reason_details
                  ├──► months_subscribed, total_revenue
                  ├──► satisfaction_rating, would_recommend
                  └──► additional_comments
                       ↓
                       User sees confirmation message
                       ↓
                       User can still access dashboard until expiry date
```
 
**Tables Touched**:
- `questionnaire_responses` (read: current state, write: cancellation state)
- `cancellation_events` (write: analytics)
- `advanced_waitlist` (write: if advanced alumni)
**External Services**:
- Stripe API (cancel subscription, apply discounts)
**Edge Functions**:
- `handle-retention-offer` (optional, if retention accepted)
- `cancel-subscription` (always called for final cancellation)
---
 
### Flow 6: Teacher Sends Feedback
 
```
Teacher logs into teacher-portal.html
    ↓
Views student responses in message_log
    ↓
Clicks "Send Feedback" on a response
    ↓
Teacher writes feedback
    ↓
Teacher clicks "Send"
    ↓
teacher-portal.html calls send-teacher-feedback function
    ├──► student_id, teacher_id, prompt_day, feedback_text
    └──► Function writes to feedback_log
         ├──► Links to student, teacher, prompt day
         └──► Stores feedback_text, sent_at
              ↓
              Function sends feedback to student via LINE
              ├──► Looks up student's line_id in questionnaire_responses
              ├──► Sends message via LINE Messaging API
              └──► Logs to message_log
                   └──► message_type='feedback', message_text
                        ↓
                        Student receives feedback on LINE
                        ↓
                        Student can view feedback history on dashboard.html
```
 
**Tables Touched**:
- `feedback_log` (write: feedback record)
- `message_log` (write: feedback delivery)
- `questionnaire_responses` (read: student line_id)
- `student_teacher_assignments` (read: verify assignment)
**External Services**:
- LINE Messaging API (send feedback)
**Edge Functions**:
- `send-teacher-feedback` (HTTP-triggered by teacher portal)
---
 
## 💳 Subscription & Payment Architecture
 
### Stripe Integration Points
 
#### Stripe Checkout
  **NOTE**: These are currently TEST MODE URLs. Must be replaced with
  production URLs before accepting real customers. See prokaiwa-implementation-plan.txt
  Task 3.6 for details.
- **Triggered By**: questionnaire.html (after onboarding)
- **Checkout URLs**:
  ```javascript
  'line':       'https://buy.stripe.com/test_...',
  'video':      'https://buy.stripe.com/test_...',
  'power_lite': 'https://buy.stripe.com/test_...',
  'power_pro':  'https://buy.stripe.com/test_...'
  ```
- **client_reference_id**: Set to `user.id` (Supabase Auth UUID)
- **Success Redirect**: thank-you-[plan].html
- **Cancel Redirect**: questionnaire.html
#### Stripe Webhook
- **Events Handled**:
  - `checkout.session.completed` → Create subscription record
  - `customer.subscription.updated` → Update subscription status
  - `customer.subscription.deleted` → Handle subscription end
  - `invoice.payment_succeeded` → Track successful payments
  - `invoice.payment_failed` → Handle payment failures
- **Updates questionnaire_responses**:
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `subscription_status`
  - `subscription_period_start`
  - `subscription_period_end`
  - `next_billing_date`
#### Subscription Modifications (Edge Functions)
1. **handle-retention-offer**:
   - Downgrade plan: `stripe.subscriptions.update()`
   - Apply discount: `stripe.subscriptions.update({ coupon })`
   - Pause (future): `stripe.subscriptions.update({ pause_collection })`
2. **cancel-subscription**:
   - Immediate cancel: `stripe.subscriptions.cancel()`
   - End-of-period: `stripe.subscriptions.update({ cancel_at_period_end: true })`
---
 
### Plan Codes: Legacy vs. New
 
  **Migration Status**: COMPLETE. All code uses new descriptive codes.
  Legacy codes (A, B45, B60, C1, C2) no longer appear in any code or documentation.
 
| Legacy Code | New Code | Description | Monthly Price | Lesson Credits |
|-------------|----------|-------------|---------------|----------------|
| A | line | LINE messages only | ¥2,980 | 0 |
| B45 | video | Video lessons (45 min) | ¥4,980 | 1 x 45-min |
| B60 | power_lite | Video + LINE (60 min) | ¥6,980 | 1 x 60-min |
| C1 | power_pro | Power tier 1 | ¥8,980 | 2 x 60-min |
| C2 | power_pro | Power tier 2 (same as C1 now) | ¥8,980 | 2 x 60-min |
 
**Where Plan Codes Appear**:
- `questionnaire_responses.plan`
- `lesson_credits.plan`
- Edge function logic (retention offers, credit allocation)
- Frontend display (dashboard, account settings)
**Migration Strategy**:
- Maintain backward compatibility (both codes work)
- New signups use descriptive codes
- Legacy data preserved but gradually migrated
- Database queries handle both formats
---
 
### Subscription States
 
| Status | Meaning | Dashboard Access | LINE Prompts | Lesson Booking |
|--------|---------|------------------|--------------|----------------|
| `active` | Paid, current | ✅ Full | ✅ Yes | ✅ Yes |
| `trialing` | In trial period | ✅ Full | ✅ Yes | ✅ Yes |
| `past_due` | Payment failed | ⚠️ Limited | ⚠️ Paused | ❌ No |
| `canceled` | Ended by user | ⏱️ Until expiry | ❌ No | ❌ No |
| `unpaid` | Payment failed (final) | ❌ No | ❌ No | ❌ No |
| `incomplete` | Checkout not finished | ❌ No | ❌ No | ❌ No |
 
**Dashboard Access After Cancellation**:
- **Video Plans** (video, power_lite, power_pro): 
  - Access until `dashboard_access_expires_at` = `subscription_period_end` + 4 months
  - Can view past lessons, download content
- **LINE-Only Plans** (line):
  - Access until `dashboard_access_expires_at` = `subscription_period_end`
  - No extended access
---
 
## 🔀 Common Workflows
 
### Workflow: Complete User Journey
 
```
┌─────────────────────────────────────────────────────────┐
│ 1. DISCOVERY & SIGNUP                                    │
├─────────────────────────────────────────────────────────┤
│ User visits index.html                                   │
│   ↓                                                      │
│ Clicks "Start Learning" → login.html                    │
│   ↓                                                      │
│ Signs up (Supabase Auth creates user)                   │
│   ↓                                                      │
│ Redirected to questionnaire.html                        │
│   ↓                                                      │
│ Completes onboarding (writes to questionnaire_responses)│
│   ↓                                                      │
│ Redirected to Stripe Checkout                           │
│   ↓                                                      │
│ Completes payment                                        │
│   ↓                                                      │
│ Stripe webhook updates questionnaire_responses          │
│   ↓                                                      │
│ Redirected to thank-you-[plan].html                     │
└─────────────────────────────────────────────────────────┘
 
┌─────────────────────────────────────────────────────────┐
│ 2. DAILY LEARNING LOOP                                   │
├─────────────────────────────────────────────────────────┤
│ Cron: daily-prompt-delivery runs (8 AM JST)             │
│   ↓                                                      │
│ Student receives prompt on LINE                         │
│   ↓                                                      │
│ Student responds (text/voice/photo)                     │
│   ↓                                                      │
│ Webhook: line-webhook stores response                   │
│   ↓                                                      │
│ [Optional] Teacher views response on teacher-portal.html│
│   ↓                                                      │
│ [Optional] Teacher sends feedback via send-teacher-feedback│
│   ↓                                                      │
│ Student receives feedback on LINE                       │
│   ↓                                                      │
│ [Optional] Student views feedback/responses on dashboard.html│
└─────────────────────────────────────────────────────────┘
 
┌─────────────────────────────────────────────────────────┐
│ 3. LESSON LIFECYCLE (For plans with credits)            │
├─────────────────────────────────────────────────────────┤
│ Student opens dashboard.html                             │
│   ↓                                                      │
│ Clicks "Book a Lesson"                                  │
│   ↓                                                      │
│ lesson-booking function: Fetches available slots        │
│   ↓                                                      │
│ Student selects date/time/teacher                       │
│   ↓                                                      │
│ lesson-booking function: Creates booking                │
│   ├─ Validates credits                                  │
│   ├─ Creates booking record                             │
│   ├─ Decrements credit                                  │
│   └─ Creates Google Meet link                           │
│   ↓                                                      │
│ Student receives booking confirmation                   │
│   ↓                                                      │
│ [On lesson day] Student joins Google Meet               │
│   ↓                                                      │
│ Teacher conducts lesson                                 │
│   ↓                                                      │
│ [After lesson] Teacher updates assessment (optional)    │
│   ↓                                                      │
│ Student views assessment on dashboard.html              │
└─────────────────────────────────────────────────────────┘
 
┌─────────────────────────────────────────────────────────┐
│ 4. SUBSCRIPTION MANAGEMENT                               │
├─────────────────────────────────────────────────────────┤
│ [SCENARIO A: Account Management]                        │
│ Student opens dashboard.html                             │
│   ↓                                                      │
│ Clicks "Account Settings" → account-settings.html       │
│   ↓                                                      │
│ Views subscription details, lesson credits              │
│   ↓                                                      │
│ [Optional] Changes email, resets password               │
└─────────────────────────────────────────────────────────┘
 
┌─────────────────────────────────────────────────────────┐
│ [SCENARIO B: Cancellation]                               │
│ Student opens dashboard.html                             │
│   ↓                                                      │
│ Sees cancellation banner → Clicks "Cancel"             │
│   ↓                                                      │
│ Redirected to cancellation.html                         │
│   ↓                                                      │
│ Selects cancellation reasons                            │
│   ↓                                                      │
│ Sees retention offer (downgrade, discount, alumni)      │
│   ↓                                                      │
│ [PATH A] Accepts retention offer                        │
│     ↓                                                    │
│     handle-retention-offer function: Updates subscription│
│     ↓                                                    │
│     User stays subscribed (modified)                    │
│   ↓                                                      │
│ [PATH B] Declines retention offer                       │
│     ↓                                                    │
│     Clicks "Confirm Cancellation"                       │
│     ↓                                                    │
│     cancel-subscription function: Cancels subscription  │
│     ↓                                                    │
│     Subscription ends (access until expiry date)        │
└─────────────────────────────────────────────────────────┘
```
 
---
 
### Workflow: Teacher Journey
 
```
┌─────────────────────────────────────────────────────────┐
│ TEACHER ONBOARDING                                       │
├─────────────────────────────────────────────────────────┤
│ Admin creates teacher account in Supabase Auth          │
│   ↓                                                      │
│ Admin adds teacher record to 'teachers' table           │
│   ├─ auth_user_id (links to Supabase Auth)             │
│   ├─ email, full_name, role                            │
│   └─ is_active = true                                   │
│   ↓                                                      │
│ Teacher receives login credentials                      │
│   ↓                                                      │
│ Teacher logs in via teacher-login.html                  │
└─────────────────────────────────────────────────────────┘
 
┌─────────────────────────────────────────────────────────┐
│ TEACHER DAILY WORKFLOW                                   │
├─────────────────────────────────────────────────────────┤
│ Teacher opens teacher-portal.html                       │
│   ↓                                                      │
│ Views upcoming lessons (from lesson_bookings)           │
│   ↓                                                      │
│ Views student responses (from message_log)              │
│   ↓                                                      │
│ Clicks "Send Feedback" on a response                    │
│   ↓                                                      │
│ Writes feedback → Clicks "Send"                         │
│   ↓                                                      │
│ send-teacher-feedback function: Sends to student        │
│   ├─ Stores in feedback_log                            │
│   └─ Sends via LINE API                                 │
│   ↓                                                      │
│ Student receives feedback on LINE                       │
│   ↓                                                      │
│ [Optional] Teacher updates student assessment           │
│   ↓                                                      │
│ Assessment appears on student's dashboard.html          │
└─────────────────────────────────────────────────────────┘
```
 
---
 
## 📊 Quick Reference Tables
 
### Table: Who Writes to Each Database Table?
 
| Table | Written By |
|-------|------------|
| `auth.users` | Supabase Auth (via login.html, teacher-login.html) |
| `questionnaire_responses` | questionnaire.html, Stripe webhook, handle-retention-offer, cancel-subscription |
| `lesson_bookings` | lesson-booking function |
| `lesson_credits` | Supabase RPC functions (via lesson-booking) |
| `teacher_availability` | teacher-portal.html |
| `teachers` | Admin (manual) |
| `student_teacher_assignments` | Admin or teacher-portal.html |
| `prompts` | Admin (manual, content management) |
| `student_progress` | daily-prompt-delivery function |
| `message_log` | daily-prompt-delivery, line-webhook, send-teacher-feedback, non-responder-reminders |
| `feedback_log` | send-teacher-feedback function |
| `student_assessments` | teacher-portal.html |
| `cancellation_events` | cancel-subscription, handle-retention-offer |
| `practice_log` | dashboard.html (when user practices) |
| `advanced_waitlist` | handle-retention-offer function |
| `booking_reminders` | Automated reminder system (if implemented) |
| `google_calendar_sync` | Google Calendar integration |
| `first_time_consultations` | lesson-booking function |
 
---
 
### Table: External Service Dependencies
 
| Service | Used By | Purpose |
|---------|---------|---------|
| **Stripe** | questionnaire.html, handle-retention-offer, cancel-subscription | Payment processing, subscription management |
| **LINE Messaging API** | daily-prompt-delivery, line-webhook, send-teacher-feedback, non-responder-reminders, fetch-line-media | Daily prompts, student responses, feedback delivery |
| **Google Calendar API** | lesson-booking function | Create lesson events, generate Meet links |
| **Google Meet** | lesson_bookings table | Host live lessons |
| **Supabase Auth** | All authenticated pages | User authentication, session management |
| **Supabase Database** | All pages and functions | Data storage and retrieval |
| **Supabase Edge Functions** | Various frontend pages | Backend business logic |
 
---
 
### Table: File Size & Complexity
 
| File | Lines | Complexity | Primary Dependencies |
|------|-------|------------|---------------------|
| dashboard.html | 4,881 | Very High | questionnaire_responses, lesson_bookings, message_log, student_progress, student_assessments, lesson-booking function, fetch-line-media function |
| cancellation.html | ~3,700 | High | questionnaire_responses, handle-retention-offer function, cancel-subscription function |
| teacher-portal.html | ~2,500 | High | lesson_bookings, teachers, teacher_availability, send-teacher-feedback function |
| questionnaire.html | ~900 | Medium | questionnaire_responses, Stripe Checkout |
| account-settings.html | ~1,200 | Medium | questionnaire_responses, lesson_credits |
| login.html | ~650 | Medium | Supabase Auth |
| index.html | ~800 | Low | None (static) |
| about.html | ~400 | Low | None (static) |
| contact.html | ~300 | Low | None (static) |
 
---
## 🔒 Security Architecture
 
Last updated: April 8, 2026
 
### Authentication & Authorization by Function
 
| Function | JWT Verify | CORS Origin | Auth Method |
|---|---|---|---|
| lesson-booking | OFF | prokaiwa.com | Bearer token in code |
| handle-retention-offer | OFF | prokaiwa.com | Bearer token in code |
| cancel-subscription | ON | prokaiwa.com | Supabase JWT + Bearer in code |
| send-teacher-feedback | ON | prokaiwa.com | Supabase JWT + teacher role check |
| line-webhook | OFF | None | LINE HMAC-SHA256 signature |
| daily-prompt-sender | OFF | None | Cron secret header |
| check-non-responders | OFF | None | Cron secret header |
| get-line-media | OFF | prokaiwa.com | Query param token + teacher role check |
| google-calendar | OFF | — | Service-to-service |
| stripe-webhook | OFF | — | Stripe signature |
 
### Content Security Policy (CSP)
 
All HTML pages include a CSP meta tag in the <head> that restricts:
- Scripts: self, unsafe-inline, jsdelivr, cdnjs, googletagmanager, google-analytics
- Styles: self, unsafe-inline, cdnjs, fonts.googleapis
- Connections: self, *.supabase.co, jsdelivr, google-analytics
- Images: self, data, blob, *.supabase.co, google-analytics, googletagmanager, api.qrserver.com
- Media: self, blob, *.supabase.co
- Frames: none
- Objects: none
 
### Row-Level Security (RLS)
 
All 20 database tables have RLS enabled. Policies enforce:
- Students can only read/write their own data
- Teachers can see assigned students (via student_teacher_assignments join)
- Admin teachers can see all students
- Service role (edge functions) can bypass RLS when needed
- Sensitive columns (plan, subscription_status, stripe_*) are only writable by service role
 
Full RLS policy documentation is in supabase_schema.md.
 
### XSS Protection
 
teacher-portal.html and student-detail.html use escapeHtml() to sanitize
all user-provided data before innerHTML insertion:
- message_text, feedback_text, student names, teacher_notes
- Media URLs use encodeURIComponent()
 
### Environment Variables (Security-Related)
 
| Variable | Purpose | Used By |
|---|---|---|
| LINE_CHANNEL_SECRET | HMAC-SHA256 webhook signature verification | line-webhook |
| CRON_SECRET | Authenticate cron job requests | daily-prompt-sender, check-non-responders |
 
### pg_cron Jobs
 
| Job | Schedule (UTC) | Schedule (JST) | Target | Auth |
|---|---|---|---|---|
| send-daily-prompts | 0 0 * * * | 9:00 AM | daily-prompt-sender | x-cron-secret header |
| check-non-responders-daily | 0 11 * * * | 8:00 PM | check-non-responders | x-cron-secret header |
| auto-complete-past-lessons | 0 * * * * | Hourly | Database function | N/A |
| allocate-monthly-credits | 0 16 1 * * | 1st of month | Database function | N/A |
 
---
 
## 🏗️ Frontend Architecture (Updated March 2026)
 
### Shared Nav & Footer Component
 
The header and footer HTML have been removed from all individual HTML files.
All pages now load a shared component:
 
```
assets/js/components.js
```
 
This file dynamically injects the nav and footer into placeholder divs.
 
**Every HTML page now has:**
```html
<body>
  <div id="nav-placeholder"></div>
  <!-- page content -->
  <div id="footer-placeholder"></div>
  <script src="assets/js/components.js"></script>
  <script src="assets/js/script.js"></script>
</body>
```
 
Auth pages (dashboard.html, account-settings.html, etc.) load components.js
just before </body> since they don't use script.js.
 
**Rules:**
- To update nav or footer, ONLY edit assets/js/components.js
- Never add header/footer HTML directly into individual files
- All new pages must include the two placeholder divs
- Asset paths inside components.js use absolute paths (e.g., /assets/images/prokaiwa-logo.jpg)
- Always null-check before getElementById event listeners
 
### Clean URL Structure
 
Public pages have moved from root into subfolders for clean URLs:
 
| Old Path | New Path | URL |
|---|---|---|
| about.html | about/index.html | /about |
| contact.html | contact/index.html | /contact |
| privacy-policy.html | privacy-policy/index.html | /privacy-policy |
| terms-of-service.html | terms-of-service/index.html | /terms-of-service |
| commerce-disclosure.html | commerce-disclosure/index.html | /commerce-disclosure |
| thank-you.html | thank-you/index.html | /thank-you |
| thank-you-line.html | thank-you-line/index.html | /thank-you-line |
| thank-you-pro.html | thank-you-pro/index.html | /thank-you-pro |
| thank-you-video.html | thank-you-video/index.html | /thank-you-video |
 
**Pages that stay in root** (Supabase auth redirect URLs depend on them):
index.html, login.html, dashboard.html, account-settings.html,
password-reset.html, reset-password.html, questionnaire.html,
cancellation.html, reactivate.html, teacher-login.html,
teacher-portal.html, student-detail.html, prompt-recordings.html
 
**Rules:**
- Internal links to moved pages use clean URLs (e.g., /about not about.html)
- Subfolder pages use absolute asset paths (e.g., /assets/css/style.css)
- New public content pages follow the subfolder pattern
- Auth pages stay in root until Supabase redirect URLs are updated
 
### Creating New Pages
 
**New public page** (e.g., /faq):
- Create at faq/index.html
- Use absolute paths for all assets
- Include nav-placeholder and footer-placeholder divs
- Load /assets/js/components.js then /assets/js/script.js
 
**New auth page:**
- Create in root as pagename.html
- Same placeholder divs
- Load assets/js/components.js just before </body>
- Relative asset paths are fine
 
---
 
## 🚨 Critical System Rules
 
### Database Rules
1. **Never invent database columns** - Always check `supabase_schema.md` first
2. **Respect ID types** - UUIDs vs integers are not interchangeable
3. **questionnaire_responses is the hub** - Almost all user actions involve this table
4. **No database logic in frontend** - Complex operations go in edge functions
### Edge Function Rules
1. **One function, one folder** - Never combine multiple functions
2. **Secrets in environment variables** - Never hardcode credentials
3. **Business logic exists once** - No duplication across functions
4. **Analytics never blocks business** - Failures in tracking don't stop core actions
5. **Check EDGE_FUNCTIONS_MASTER_INDEX_md.txt** before modifying
### Frontend Rules
1. **Consistent auth storage key** - `prokaiwa-supabase-auth` across all pages
2. **Session checks on every page** - Redirect to login if no session
3. **Auth state listener on every page** - Handle sign-out events
4. **Never store credentials in frontend** - Always use Supabase client
5. **Mobile-first responsive design** - Test on mobile devices
### Subscription Rules
1. **Stripe is the source of truth** for subscription status
2. **Cancellation logic exists in two places**: cancel-subscription (user-initiated via cancellation page) and stripe-webhook `customer.subscription.deleted` (Stripe-side cancellations). stripe-webhook skips if cancel-subscription already handled it.
3. **Always cancel Stripe BEFORE** updating database on cancellations
4. **Dashboard access rules are non-negotiable**:
   - Video plans: +4 months after end
   - LINE-only: Access ends with subscription
### LINE Messaging Rules
1. **One prompt per student per day** - No exceptions
2. **Webhook must respond 200 OK quickly** - Process after acknowledging
3. **Media is stored as message IDs** - Not downloaded immediately
4. **LINE ID is the link** between Prokaiwa and LINE Platform
---
 
## 🔧 Maintenance Checklists
 
### When Adding a New Table
- [ ] Add to `supabase_schema.md` with full column definitions
- [ ] Document relationships to other tables
- [ ] Update this architecture doc with table purpose
- [ ] Identify which files/functions will access it
- [ ] Update Feature Impact Matrix
### When Adding a New Edge Function
- [ ] Create individual folder with `index.ts`
- [ ] Add to `EDGE_FUNCTIONS_MASTER_INDEX_md.txt`
- [ ] Create function-specific `.md` file documenting logic
- [ ] List all database tables it reads/writes
- [ ] List all external services it calls
- [ ] Update this architecture doc
- [ ] Update Feature Impact Matrix
  ### When Adding a New Frontend Page
  - [ ] Add <div id="nav-placeholder"></div> at top of body
  - [ ] Add <div id="footer-placeholder"></div> before closing body
  - [ ] Load assets/js/components.js (and script.js if public page)
  - [ ] If public page: create as subfolder/index.html with absolute asset paths
  - [ ] If auth page: create in root as pagename.html
  - [ ] Add Supabase client initialization (consistent config) if authenticated
  - [ ] Add session check and redirect logic if authenticated
  - [ ] Add CSP meta tag in <head>
  - [ ] Add to sitemap.xml
  - [ ] Update this architecture doc
### When Modifying Subscription Plans
- [ ] Update questionnaire.html (plan selection)
- [ ] Update Stripe product/price
- [ ] Update handle-retention-offer function (downgrade paths)
- [ ] Update cancel-subscription function (access rules)
- [ ] Update dashboard.html (feature display)
- [ ] Update account-settings.html (plan display)
- [ ] Update cancellation.html (retention offers)
- [ ] Create thank-you-[plan].html
- [ ] Update this architecture doc
---
 
## 📝 Document Maintenance
 
**This document should be updated whenever**:
- A new database table is added or modified
- A new edge function is created or changed
- A new frontend page is added
- A significant feature is added or removed
- External service integrations change
- Subscription plans are modified
- Critical workflows are altered
**Update Log**:
| Date | Updated By | Changes |
|------|------------|---------|
| 2026-02-10 | Claude | Initial comprehensive architecture document created |
  | 2026-03-17 | Claude | Security architecture section added. Auth patterns updated for all edge functions. Frontend architecture updated for components.js and clean URLs. Page paths updated. Maintenance checklists updated. |
  | 2026-04-08 | Claude | Pre-launch systems audit. stripe-webhook section added (3 events). get-line-media updated with auth and CORS. FK constraints added to student_progress, message_log, lesson_credits. Unique constraints added. Security table corrected. RLS count updated to 20. Subscription rules updated for dual cancellation paths. |
 
---
 
## 🎯 Using This Document
 
### For Adding Features
1. Check Feature Impact Matrix → See what's affected
2. Review relevant Database Tables → Understand data structures
3. Check Edge Functions Reference → See if existing functions can be extended
4. Review Critical Data Flows → Understand how data moves
5. Follow Maintenance Checklists → Ensure nothing is missed
### For Debugging
1. Identify the feature area (e.g., "lesson booking")
2. Check relevant sections:
   - Database Architecture → What tables are involved?
   - Edge Functions Reference → Which function handles this?
   - Frontend Components → Which pages connect to this?
3. Review Critical Data Flows → Trace the full path
4. Check Quick Reference Tables → See who writes what
### For Onboarding New Developers
1. Start with System Overview → Understand the tech stack
2. Read Database Architecture → Learn the data model
3. Review Edge Functions Reference → Understand backend logic
4. Study Common Workflows → See how features work end-to-end
5. Refer to Critical System Rules → Learn the constraints
---
 
---
 
## 🔍 Monitoring System
 
### Overview
Prokaiwa has a full production monitoring system active as of April 14, 2026. It captures errors automatically, tracks user behaviour, logs all Stripe events, and sends real-time email alerts.
 
### Components
 
**prokaiwa-monitor.js** (assets/js/prokaiwa-monitor.js)
- Loaded on all 24 HTML pages via `<script defer>` tag in `<head>`
- Generates a unique session ID per browser tab (sessionStorage)
- Records click/navigation breadcrumbs in memory (up to 75 entries)
- Hooks into window.onerror, window.onunhandledrejection, and console.error
- On any error: saves full breadcrumb trail to breadcrumb_log + error to error_log
- Fires email alert via notify-admin edge function
- Self-contained — no imports, no SDK dependency
**notify-admin** (edge function)
- Receives alert payloads from monitor and stripe-webhook
- Sends formatted HTML email to prokaiwa.english@gmail.com via Resend
- Email subject and badge colour vary by error type for at-a-glance triage
- Marks error_log.alert_sent = true to prevent duplicate alerts
- JWT: OFF, CORS: prokaiwa.com
**stripe_event_log** (database table)
- Permanent record of every Stripe webhook event
- Includes outcome (success/failed/abandoned/cancelled) and failure_reason
- Populated by stripe-webhook on every event going forward
### Alert Email Types
| Type | Trigger | Badge |
|---|---|---|
| JS Error | Uncaught JavaScript exception | 🔴 RED |
| Promise Rejection | Failed Supabase/fetch call | 🟠 ORANGE |
| Console Error | console.error() call | 🟡 YELLOW |
| Payment Failure | Stripe payment_failed or DB error | 🟣 PURPLE |
| Abandoned Checkout | checkout.session.expired | 🟣 PURPLE |
 
### Email Infrastructure
- Provider: Resend (resend.com) — free tier, 3,000 emails/month
- From: alerts@prokaiwa.com
- To: prokaiwa.english@gmail.com
- DNS: DKIM, SPF, DMARC, MX records verified in Namecheap
- Secret: RESEND_API_KEY in Supabase Edge Function Secrets
---
 
## 🔗 LINE CONNECT Token System
 
### Overview
Implemented April 15, 2026. Replaces timing-window matching for paid users with precise token-based linking.
 
### How It Works
1. Student completes questionnaire → unique 8-char `line_connect_token` generated and saved to `questionnaire_responses`
2. Thank-you page loads token from Supabase → LINE button becomes a deep link pre-filled with `CONNECT-{token}`
3. Student taps button → LINE opens with message pre-filled → taps Send
4. `line-webhook` CONNECT handler receives message → looks up token → saves `line_id` → sends welcome
5. Dashboard shows LINE connection banner when `line_id` is null — with copy-able CONNECT code
### Fallback Paths
- **QR code / manual add:** follow event fires → bot tells paid users to send their CONNECT code
- **Unpaid users:** follow event still handles via 7-day timing window as before
- **No token (pre-April 15 signups):** banner shows without code box — QR/follow path used
### Files Involved
- `questionnaire.html` — generates and saves token on submission
- `thank-you-line/index.html` — loads token, updates button deep link, shows tap-to-copy code
- `thank-you-pro/index.html` — same as above
- `dashboard.html` — LINE connection banner when line_id is null
- `assets/css/dashboard.css` — LINE banner styles
- `assets/js/dashboard.js` — banner show logic, updateLineBanner(), pkDashboardCopyCode()
- `line-webhook` edge function — CONNECT message handler
---
 
**END OF DOCUMENT**
 
This is a living document. When the code and this document disagree, update this document to match the code.
