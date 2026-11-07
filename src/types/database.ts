// สร้างอัตโนมัติจาก Supabase project "pass-on" (mtqschdjrndgixqknzep) — อย่าแก้มือ
// สร้างใหม่หลังแก้ schema: npx supabase gen types typescript --project-id mtqschdjrndgixqknzep > src/types/database.ts

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      allowed_email_domains: {
        Row: {
          domain: string
        }
        Insert: {
          domain: string
        }
        Update: {
          domain?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: number
          is_active: boolean
          text: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          text: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      attachments: {
        Row: {
          file_name: string
          file_size_kb: number
          file_type: string
          id: number
          post_id: number
          storage_path: string
          thumb_path: string | null
          uploaded_at: string
        }
        Insert: {
          file_name: string
          file_size_kb: number
          file_type: string
          id?: never
          post_id: number
          storage_path: string
          thumb_path?: string | null
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_size_kb?: number
          file_type?: string
          id?: never
          post_id?: number
          storage_path?: string
          thumb_path?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_stats"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color_hex: string | null
          id: number
          name_th: string
          slug: string
        }
        Insert: {
          color_hex?: string | null
          id?: never
          name_th: string
          slug: string
        }
        Update: {
          color_hex?: string | null
          id?: never
          name_th?: string
          slug?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: number
          is_accepted: boolean
          parent_comment_id: number | null
          post_id: number
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          is_accepted?: boolean
          parent_comment_id?: number | null
          post_id: number
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          is_accepted?: boolean
          parent_comment_id?: number | null
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_stats"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      courses: {
        Row: {
          course_code: string
          credits: number | null
          icon: string | null
          id: number
          instructor: string | null
          name_en: string
          name_th: string | null
          semester: string | null
          track: string | null
          year_level: number | null
        }
        Insert: {
          course_code: string
          credits?: number | null
          icon?: string | null
          id?: never
          instructor?: string | null
          name_en: string
          name_th?: string | null
          semester?: string | null
          track?: string | null
          year_level?: number | null
        }
        Update: {
          course_code?: string
          credits?: number | null
          icon?: string | null
          id?: never
          instructor?: string | null
          name_en?: string
          name_th?: string | null
          semester?: string | null
          track?: string | null
          year_level?: number | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          academic_year: number
          course_id: number
          id: number
          status: Database["public"]["Enums"]["enrollment_status"]
          term: number
          user_id: string
        }
        Insert: {
          academic_year: number
          course_id: number
          id?: never
          status?: Database["public"]["Enums"]["enrollment_status"]
          term: number
          user_id?: string
        }
        Update: {
          academic_year?: number
          course_id?: number
          id?: never
          status?: Database["public"]["Enums"]["enrollment_status"]
          term?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exam_events: {
        Row: {
          course_id: number | null
          created_at: string
          created_by: string | null
          id: number
          kind: Database["public"]["Enums"]["exam_kind"]
          owner_id: string | null
          place: string | null
          starts_at: string
          title: string
        }
        Insert: {
          course_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          kind?: Database["public"]["Enums"]["exam_kind"]
          owner_id?: string | null
          place?: string | null
          starts_at: string
          title: string
        }
        Update: {
          course_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          kind?: Database["public"]["Enums"]["exam_kind"]
          owner_id?: string | null
          place?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "exam_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      favorite_courses: {
        Row: {
          course_id: number
          user_id: string
        }
        Insert: {
          course_id: number
          user_id?: string
        }
        Update: {
          course_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      instructors: {
        Row: {
          group_name: string | null
          id: number
          name: string
          name_en: string | null
          role: string | null
          sort_order: number
        }
        Insert: {
          group_name?: string | null
          id?: never
          name: string
          name_en?: string | null
          role?: string | null
          sort_order?: number
        }
        Update: {
          group_name?: string | null
          id?: never
          name?: string
          name_en?: string | null
          role?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          post_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_stats"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      posts: {
        Row: {
          academic_year: number | null
          category_id: number
          content: string | null
          course_id: number | null
          created_at: string
          id: number
          status: Database["public"]["Enums"]["post_status"]
          term: number | null
          title: string
          updated_at: string | null
          user_id: string
          view_count: number
        }
        Insert: {
          academic_year?: number | null
          category_id: number
          content?: string | null
          course_id?: number | null
          created_at?: string
          id?: never
          status?: Database["public"]["Enums"]["post_status"]
          term?: number | null
          title: string
          updated_at?: string | null
          user_id?: string
          view_count?: number
        }
        Update: {
          academic_year?: number | null
          category_id?: number
          content?: string | null
          course_id?: number | null
          created_at?: string
          id?: never
          status?: Database["public"]["Enums"]["post_status"]
          term?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          color: string | null
          created_at: string
          display_name: string
          emoji: string | null
          entry_year: number | null
          frame: string | null
          id: string
          interests: string[]
          links: Json
          pattern: string | null
          program: string
          role: Database["public"]["Enums"]["user_role"]
          shape: string | null
          status: Json | null
          student_id: string
          updated_at: string
          year_label: string | null
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          color?: string | null
          created_at?: string
          display_name: string
          emoji?: string | null
          entry_year?: number | null
          frame?: string | null
          id: string
          interests?: string[]
          links?: Json
          pattern?: string | null
          program?: string
          role?: Database["public"]["Enums"]["user_role"]
          shape?: string | null
          status?: Json | null
          student_id: string
          updated_at?: string
          year_label?: string | null
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          color?: string | null
          created_at?: string
          display_name?: string
          emoji?: string | null
          entry_year?: number | null
          frame?: string | null
          id?: string
          interests?: string[]
          links?: Json
          pattern?: string | null
          program?: string
          role?: Database["public"]["Enums"]["user_role"]
          shape?: string | null
          status?: Json | null
          student_id?: string
          updated_at?: string
          year_label?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          comment_id: number | null
          created_at: string
          id: number
          post_id: number
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          comment_id?: number | null
          created_at?: string
          id?: never
          post_id: number
          reason: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          comment_id?: number | null
          created_at?: string
          id?: never
          post_id?: number
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_stats"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      post_stats: {
        Row: {
          comment_count: number | null
          like_count: number | null
          post_id: number | null
        }
        Insert: {
          comment_count?: never
          like_count?: never
          post_id?: number | null
        }
        Update: {
          comment_count?: never
          like_count?: never
          post_id?: number | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          answers: number | null
          likes_received: number | null
          posts: number | null
          profile_complete: boolean | null
          projects: number | null
          summaries: number | null
          threads: number | null
          user_id: string | null
        }
        Insert: {
          answers?: never
          likes_received?: never
          posts?: never
          profile_complete?: never
          projects?: never
          summaries?: never
          threads?: never
          user_id?: string | null
        }
        Update: {
          answers?: never
          likes_received?: never
          posts?: never
          profile_complete?: never
          projects?: never
          summaries?: never
          threads?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_view: { Args: { p_post_id: number }; Returns: undefined }
    }
    Enums: {
      enrollment_status: "studying" | "completed"
      exam_kind: "midterm" | "final" | "quiz" | "project" | "other"
      post_status: "published" | "hidden"
      report_status: "open" | "resolved"
      user_role: "student" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      enrollment_status: ["studying", "completed"],
      exam_kind: ["midterm", "final", "quiz", "project", "other"],
      post_status: ["published", "hidden"],
      report_status: ["open", "resolved"],
      user_role: ["student", "admin"],
    },
  },
} as const
