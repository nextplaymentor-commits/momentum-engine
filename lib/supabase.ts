import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://htnfcdtiutzqxvpzwfse.supabase.co";

const supabaseAnonKey =
  "sb_publishable_vbvrX8GyeyVCJDSBq89qDw_gNFT4MKT";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);