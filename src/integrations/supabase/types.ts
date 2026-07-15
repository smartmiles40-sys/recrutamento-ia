export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      block_template_questions: {
        Row: {
          block_template_id: string
          created_at: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
          question_order: number
          question_text: string
        }
        Insert: {
          block_template_id: string
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_order: number
          question_text: string
        }
        Update: {
          block_template_id?: string
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_order?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_template_questions_block_template_id_fkey"
            columns: ["block_template_id"]
            isOneToOne: false
            referencedRelation: "block_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      block_templates: {
        Row: {
          area: string | null
          created_at: string
          description: string | null
          evaluation_criteria: string | null
          id: string
          is_active: boolean | null
          is_eliminatory: boolean | null
          name: string
          reference_material: string | null
          stage_key: string
          suggested_weight: number | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          description?: string | null
          evaluation_criteria?: string | null
          id?: string
          is_active?: boolean | null
          is_eliminatory?: boolean | null
          name: string
          reference_material?: string | null
          stage_key: string
          suggested_weight?: number | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          description?: string | null
          evaluation_criteria?: string | null
          id?: string
          is_active?: boolean | null
          is_eliminatory?: boolean | null
          name?: string
          reference_material?: string | null
          stage_key?: string
          suggested_weight?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_templates_area_fkey"
            columns: ["area"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["name"]
          },
        ]
      }
      candidate_disc: {
        Row: {
          alerts: string[] | null
          c_score: number | null
          candidate_id: string
          created_at: string
          d_score: number | null
          external_url: string | null
          file_url: string | null
          i_score: number | null
          id: string
          s_score: number | null
          source: string | null
          summary: string | null
        }
        Insert: {
          alerts?: string[] | null
          c_score?: number | null
          candidate_id: string
          created_at?: string
          d_score?: number | null
          external_url?: string | null
          file_url?: string | null
          i_score?: number | null
          id?: string
          s_score?: number | null
          source?: string | null
          summary?: string | null
        }
        Update: {
          alerts?: string[] | null
          c_score?: number | null
          candidate_id?: string
          created_at?: string
          d_score?: number | null
          external_url?: string | null
          file_url?: string | null
          i_score?: number | null
          id?: string
          s_score?: number | null
          source?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_disc_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_evaluations: {
        Row: {
          candidate_id: string
          created_at: string
          evaluator_id: string | null
          id: string
          max_score: number | null
          notes: string | null
          score: number | null
          stage_id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          evaluator_id?: string | null
          id?: string
          max_score?: number | null
          notes?: string | null
          score?: number | null
          stage_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          evaluator_id?: string | null
          id?: string
          max_score?: number | null
          notes?: string | null
          score?: number | null
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_evaluations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_notes: {
        Row: {
          author_id: string
          candidate_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          candidate_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          candidate_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_responses: {
        Row: {
          candidate_id: string
          created_at: string
          file_url: string | null
          id: string
          question_id: string
          response_value: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          file_url?: string | null
          id?: string
          question_id: string
          response_value?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          file_url?: string | null
          id?: string
          question_id?: string
          response_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_responses_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "stage_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          alerts: string[] | null
          applied_at: string
          classification: string | null
          current_stage_id: string | null
          cv_analysis: Json | null
          cv_url: string | null
          desired_area: string | null
          desired_role: string | null
          email: string
          final_score: number | null
          id: string
          job_id: string
          lgpd_consent: boolean | null
          lgpd_consent_date: string | null
          name: string
          phone: string | null
          pipeline_stage: string
          status: string | null
          updated_at: string
        }
        Insert: {
          alerts?: string[] | null
          applied_at?: string
          classification?: string | null
          current_stage_id?: string | null
          cv_analysis?: Json | null
          cv_url?: string | null
          desired_area?: string | null
          desired_role?: string | null
          email: string
          final_score?: number | null
          id?: string
          job_id: string
          lgpd_consent?: boolean | null
          lgpd_consent_date?: string | null
          name: string
          phone?: string | null
          pipeline_stage?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          alerts?: string[] | null
          applied_at?: string
          classification?: string | null
          current_stage_id?: string | null
          cv_analysis?: Json | null
          cv_url?: string | null
          desired_area?: string | null
          desired_role?: string | null
          email?: string
          final_score?: number | null
          id?: string
          job_id?: string
          lgpd_consent?: boolean | null
          lgpd_consent_date?: string | null
          name?: string
          phone?: string | null
          pipeline_stage?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stages: {
        Row: {
          area: string | null
          created_at: string
          evaluation_criteria: string | null
          id: string
          is_eliminatory: boolean | null
          is_enabled: boolean | null
          job_id: string
          label: string
          min_score: number | null
          reference_material: string | null
          source_block_id: string | null
          stage_key: string
          stage_order: number
          weight: number | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          evaluation_criteria?: string | null
          id?: string
          is_eliminatory?: boolean | null
          is_enabled?: boolean | null
          job_id: string
          label: string
          min_score?: number | null
          reference_material?: string | null
          source_block_id?: string | null
          stage_key: string
          stage_order: number
          weight?: number | null
        }
        Update: {
          area?: string | null
          created_at?: string
          evaluation_criteria?: string | null
          id?: string
          is_eliminatory?: boolean | null
          is_enabled?: boolean | null
          job_id?: string
          label?: string
          min_score?: number | null
          reference_material?: string | null
          source_block_id?: string | null
          stage_key?: string
          stage_order?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_stages_area_fkey"
            columns: ["area"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_stages_source_block_id_fkey"
            columns: ["source_block_id"]
            isOneToOne: false
            referencedRelation: "block_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          area: string
          behavioral_profile: string | null
          created_at: string
          created_by: string | null
          culture_rejection_enabled: boolean | null
          disc_test_url: string | null
          id: string
          intro_message: string | null
          intro_title: string | null
          is_talent_pool: boolean
          min_culture_score: number | null
          min_technical_score: number | null
          practical_case: string | null
          required_skills: string[] | null
          status: string
          talent_pool_areas: string[]
          title: string
          updated_at: string
        }
        Insert: {
          area: string
          behavioral_profile?: string | null
          created_at?: string
          created_by?: string | null
          culture_rejection_enabled?: boolean | null
          disc_test_url?: string | null
          id?: string
          intro_message?: string | null
          intro_title?: string | null
          is_talent_pool?: boolean
          min_culture_score?: number | null
          min_technical_score?: number | null
          practical_case?: string | null
          required_skills?: string[] | null
          status?: string
          talent_pool_areas?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          area?: string
          behavioral_profile?: string | null
          created_at?: string
          created_by?: string | null
          culture_rejection_enabled?: boolean | null
          disc_test_url?: string | null
          id?: string
          intro_message?: string | null
          intro_title?: string | null
          is_talent_pool?: boolean
          min_culture_score?: number | null
          min_technical_score?: number | null
          practical_case?: string | null
          required_skills?: string[] | null
          status?: string
          talent_pool_areas?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stage_questions: {
        Row: {
          created_at: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
          question_order: number
          question_text: string
          stage_id: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_order: number
          question_text: string
          stage_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_order?: number
          question_text?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_questions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_candidate_score: {
        Args: { p_candidate_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "recruiter" | "reader"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "recruiter", "reader"],
    },
  },
} as const
