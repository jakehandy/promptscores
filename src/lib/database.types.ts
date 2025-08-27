export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string | null
          display_name: string | null
          display_name_last_changed_at: string | null
        }
        Insert: {
          id: string
          created_at?: string | null
          display_name?: string | null
          display_name_last_changed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          display_name?: string | null
          display_name_last_changed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      prompts: {
        Row: {
          id: string
          created_at: string | null
          user_id: string
          title: string
          body: string
          type: string
          tags: string[] | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          user_id: string
          title: string
          body: string
          type: string
          tags?: string[] | null
        }
        Update: {
          id?: string
          created_at?: string | null
          user_id?: string
          title?: string
          body?: string
          type?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      prompt_votes: {
        Row: {
          prompt_id: string
          user_id: string
          created_at: string | null
        }
        Insert: {
          prompt_id: string
          user_id: string
          created_at?: string | null
        }
        Update: {
          prompt_id?: string
          user_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_votes_prompt_id_fkey"
            columns: ["prompt_id"]
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_votes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      prompts_with_counts: {
        Row: Database["public"]["Tables"]["prompts"]["Row"] & { vote_count: number; author_display_name: string | null }
      }
      profile_metrics: {
        Row: {
          user_id: string
          prompts_created: number
          votes_received: number
          votes_given: number
          prompts_percentile: number
          votes_received_percentile: number
          votes_given_percentile: number
        }
      }
    }
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

