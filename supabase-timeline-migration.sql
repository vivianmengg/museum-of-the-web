-- Run this in your Supabase project SQL editor before running seed-met-timeline.mjs

ALTER TABLE public.objects_cache
  ADD COLUMN IF NOT EXISTS year_begin INTEGER,
  ADD COLUMN IF NOT EXISTS year_end   INTEGER;

CREATE INDEX IF NOT EXISTS objects_cache_year_begin_idx ON public.objects_cache(year_begin);
CREATE INDEX IF NOT EXISTS objects_cache_year_end_idx   ON public.objects_cache(year_end);
