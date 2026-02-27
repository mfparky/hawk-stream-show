
CREATE TABLE public.viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers are publicly readable" ON public.viewers FOR SELECT USING (true);
CREATE POLICY "Viewers are publicly insertable" ON public.viewers FOR INSERT WITH CHECK (true);
CREATE POLICY "Viewers are publicly updatable" ON public.viewers FOR UPDATE USING (true);
