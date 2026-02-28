
CREATE TABLE public.roster (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jersey_number TEXT,
  player_name TEXT NOT NULL,
  position TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roster is publicly readable" ON public.roster FOR SELECT USING (true);
CREATE POLICY "Roster is publicly insertable" ON public.roster FOR INSERT WITH CHECK (true);
CREATE POLICY "Roster is publicly updatable" ON public.roster FOR UPDATE USING (true);
CREATE POLICY "Roster is publicly deletable" ON public.roster FOR DELETE USING (true);
