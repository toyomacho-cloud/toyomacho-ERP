import { createClient } from '@supabase/supabase-js'

// Use environment variables in production, fallback for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ombjcmefbpxgruxdvnjl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wBH51MVAek8-oXouBusNnQ_P_LJ0E1P'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

