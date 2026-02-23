
-- Table to track CSV uploads and their reference period
CREATE TABLE public.csv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  unit_code TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  periodo_referencia TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read csv_uploads"
  ON public.csv_uploads FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert csv_uploads"
  ON public.csv_uploads FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete csv_uploads"
  ON public.csv_uploads FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public) VALUES ('csv-files', 'csv-files', true);

-- Storage policies
CREATE POLICY "Anyone can read csv files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'csv-files');

CREATE POLICY "Admins can upload csv files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'csv-files' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete csv files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'csv-files' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
