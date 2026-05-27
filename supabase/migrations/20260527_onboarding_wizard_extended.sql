-- Extended onboarding fields for wizard (seat count, modules, trial/plan)
ALTER TABLE public.client_onboarding_requests
  ADD COLUMN IF NOT EXISTS requested_modules     text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requested_seat_count  integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS is_trial_request      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_plan        text    NOT NULL DEFAULT 'trial';

-- Public storage bucket for client logo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('client-logos','client-logos',true,2097152,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/svg+xml','image/gif'])
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='public_upload_client_logos' AND tablename='objects') THEN
    CREATE POLICY "public_upload_client_logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id='client-logos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='public_read_client_logos' AND tablename='objects') THEN
    CREATE POLICY "public_read_client_logos" ON storage.objects FOR SELECT USING (bucket_id='client-logos');
  END IF;
END $$;
