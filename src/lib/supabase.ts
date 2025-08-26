import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase URL/key missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase: SupabaseClient<Database, 'public'> = createClient<Database, 'public'>(supabaseUrl, supabaseAnonKey)

export const PROMPT_TYPES = [
  'Global Instruction',
  'Learning',
  'Persona',
  'Tool Setup',
  'Evaluation',
  'Other',
] as const

export type PromptType = typeof PROMPT_TYPES[number]
