-- 0001 — Instagram post generator (Phase 1: draft-by-email)
-- Applied 2026-06-14. Creates the post-tracking cursor + public image bucket.
-- Content tables/data are seeded separately by:
--   ../seeds/ig_words.sql       (100 Word-of-the-Day rows)
--   ../seeds/ig_dialogues.sql   (12 Mimi/Ten dialogue carousels)
-- Phrase cards reuse the existing public.phrases table.

BEGIN;

-- Tracks which content has already been posted (the "don't repeat" cursor).
CREATE TABLE IF NOT EXISTS public.ig_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style       text NOT NULL,          -- 'word' | 'phrase' | 'dialogue'
  content_id  integer NOT NULL,       -- id within ig_words / phrases / ig_dialogues
  image_urls  text[],
  caption     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ig_posts ENABLE ROW LEVEL SECURITY;
-- service-role-only (read/written by the ig-post-generator edge function).

-- Public bucket so draft emails can <img> the rendered cards.
INSERT INTO storage.buckets (id, name, public)
VALUES ('ig-cards', 'ig-cards', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
