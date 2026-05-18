// Minimal types for query results used by the worker.
// (We avoid generating full Supabase Database types for this task.)

export interface Database {
  public: {
    Tables: {
      email_queue: {
        Row: {
          id: number;
          recipient_email: string;
          recipient_name: string | null;
          template_code: string;
          template_params: Record<string, string>;
          priority: 'low' | 'medium' | 'high';
          status: 'pending' | 'sent' | 'failed';
          attempt_count: number;
          last_attempt_at: string | null;
          brevo_message_id: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      email_templates: {
        Row: {
          id: number;
          template_code: string;
          brevo_template_id: number | null;
          subject: string;
          html_content: string;
          is_active: boolean;
          created_at: string;
        };
      };
      email_settings: {
        Row: {
          id: number;
          setting_key: string;
          setting_value: string | null;
          updated_at: string;
        };
      };
      email_send_logs: {
        Row: {
          id: number;
          queue_id: number;
          recipient_email: string;
          template_code: string;
          event_type: string;
          event_data: Record<string, unknown>;
          created_at: string;
        };
      };
    };
  };
}

