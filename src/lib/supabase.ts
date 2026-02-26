import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zkowasqehjvoommmaruy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprb3dhc3FlaGp2b29tbW1hcnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNzkxOTEsImV4cCI6MjA4NzY1NTE5MX0.R9wOQwPCR8zsd8BIUA11gD0U88keLhalSZwnCpbPnxE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
