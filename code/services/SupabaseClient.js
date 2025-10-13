import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pslgbarmivjmsqmmupqx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbGdiYXJtaXZqbXNxbW11cHF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM1OTM3NCwiZXhwIjoyMDcxOTM1Mzc0fQ.zmTnM-x9IgaS_Yko_yOTeDAUATWYZLgcMaEkRNKlDTo";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
