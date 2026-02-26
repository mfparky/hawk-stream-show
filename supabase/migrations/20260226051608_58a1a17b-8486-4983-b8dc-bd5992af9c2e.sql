-- Create settings table for app configuration
CREATE TABLE public.settings (
  key TEXT NOT NULL PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (public app config)
CREATE POLICY "Settings are publicly readable"
  ON public.settings FOR SELECT
  USING (true);

-- Allow anyone to insert settings
CREATE POLICY "Settings are publicly writable"
  ON public.settings FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update settings
CREATE POLICY "Settings are publicly updatable"
  ON public.settings FOR UPDATE
  USING (true);

-- Enable realtime for settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;