// Selected definitions generated from the Task Manager Supabase schema.
// Regenerate these when the database schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      email_queue: {
        Row: {
          attempt_count: number
          brevo_message_id: string | null
          cc_emails: Json | null
          created_at: string
          error_message: string | null
          id: number
          idempotency_key: string | null
          last_attempt_at: string | null
          next_attempt_at: string
          priority: Database["public"]["Enums"]["email_priority_enum"]
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_queue_status_enum"]
          template_code: string
          template_params: Json
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          brevo_message_id?: string | null
          cc_emails?: Json | null
          created_at?: string
          error_message?: string | null
          id?: number
          idempotency_key?: string | null
          last_attempt_at?: string | null
          next_attempt_at?: string
          priority?: Database["public"]["Enums"]["email_priority_enum"]
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_queue_status_enum"]
          template_code: string
          template_params?: Json
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          brevo_message_id?: string | null
          cc_emails?: Json | null
          created_at?: string
          error_message?: string | null
          id?: number
          idempotency_key?: string | null
          last_attempt_at?: string | null
          next_attempt_at?: string
          priority?: Database["public"]["Enums"]["email_priority_enum"]
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_queue_status_enum"]
          template_code?: string
          template_params?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_template_code_fkey"
            columns: ["template_code"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["template_code"]
          },
        ]
      }
      email_send_logs: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: number
          queue_id: number | null
          recipient_email: string
          speaker_queue_id: string | null
          template_code: string
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: number
          queue_id?: number | null
          recipient_email: string
          speaker_queue_id?: string | null
          template_code: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: number
          queue_id?: number | null
          recipient_email?: string
          speaker_queue_id?: string | null
          template_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_logs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_logs_speaker_queue_id_fkey"
            columns: ["speaker_queue_id"]
            isOneToOne: false
            referencedRelation: "speaker_email_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          id: number
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          brevo_template_id: number | null
          created_at: string
          html_content: string
          id: number
          is_active: boolean
          subject: string
          template_code: string
          template_name: string
        }
        Insert: {
          brevo_template_id?: number | null
          created_at?: string
          html_content: string
          id?: number
          is_active?: boolean
          subject: string
          template_code: string
          template_name: string
        }
        Update: {
          brevo_template_id?: number | null
          created_at?: string
          html_content?: string
          id?: number
          is_active?: boolean
          subject?: string
          template_code?: string
          template_name?: string
        }
        Relationships: []
      }
      speaker_email_queue: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          speaker_id: string
          status: string
        }
        Insert: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          speaker_id: string
          status?: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          speaker_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_email_queue_speaker_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      speakers: {
        Row: {
          added_by: string | null
          company: string | null
          created_at: string
          description: string | null
          email: string | null
          full_name: string
          id: string
          image_url: string | null
          phone: string | null
          status: Database["public"]["Enums"]["speaker_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          full_name: string
          id?: string
          image_url?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["speaker_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          company?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          full_name?: string
          id?: string
          image_url?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["speaker_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speakers_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      enqueue_birthday_emails: {
        Args: { p_personal_only?: boolean }
        Returns: undefined
      }
      record_birthday_email_delivery: {
        Args: {
          p_birthday_person_id: string
          p_channel: string
          p_notification_year: number
          p_queue_id: number
        }
        Returns: undefined
      }
    }
    Enums: {
      area_member_role_enum: "LEADER" | "TEAM_MEMBER"
      departments_member_role_enum: "LEADER" | "TEAM_MEMBER"
      email_priority_enum: "low" | "medium" | "high"
      email_queue_status_enum: "pending" | "sent" | "failed"
      event_type_enum:
        | "Workshop"
        | "Face-to-Face"
        | "Bootcamp"
        | "Webinar"
        | "Quiz Night"
        | "Mülakat Yayını"
        | "Coffee Talk"
        | "İlk Konuşmam(Future)"
        | "Other"
      link_target_type_enum: "sub_team" | "project"
      notification_type_enum:
        | "task_added"
        | "task_completed"
        | "task_deleted"
        | "member_added"
        | "member_removed"
        | "member_updated"
        | "birthday"
      project_member_role_enum: "LEADER" | "TEAM_MEMBER"
      speaker_status: "green" | "red" | "neutral"
      system_role_enum: "Super Admin" | "Admin" | "User"
      task_status_enum:
        | "backlog"
        | "started"
        | "in_progress"
        | "completed"
        | "done"
      team_member_role_enum: "lead" | "member"
    }
    CompositeTypes: { [_ in never]: never }
  }
}
