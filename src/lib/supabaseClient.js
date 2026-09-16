// Single Supabase client for the whole app. Every page imports THIS file —
// never call `createClient` anywhere else, so there's exactly one connection
// and one place to change the project URL/key.
//
// The anon key is safe to ship in client code: it only grants what the RLS
// policies in sql/schema.sql allow (public insert, restricted select).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://wnkejaidmbdcmbksefaf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indua2VqYWlkbWJkY21ia3NlZmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTAwNDYsImV4cCI6MjEwNDg2NjA0Nn0.9LYxHA7RYeLcYaXUq5AEYSflCfIqGHD5uY6LdvE5raY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
