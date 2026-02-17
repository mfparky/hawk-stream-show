import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ktztxvrzqhknpepobrsr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_369_gFwNcBo3qElo_BPPeg_6YsW--1F";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
