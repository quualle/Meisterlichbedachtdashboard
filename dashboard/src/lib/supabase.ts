import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jprzdmmvyxqejifazkbo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcnpkbW12eXhxZWppZmF6a2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjUwOTIsImV4cCI6MjA4NDQwMTA5Mn0.VrwKmQ7SLqyh_c2VJB3dehjcyDVEJ3FECEPhLlxVgiw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
