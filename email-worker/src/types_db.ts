// Minimal types for query results used by the worker.
// (We avoid generating full Supabase Database types for this task.)

export interface Database {
  public: {
    Tables: {
      speaker_email_queue: {
        Row: {
          id: string;
          speaker_id: string;
          email_type: string;
          status: 'pending' | 'sent' | 'failed';
          error_message: string | null;
          retry_count: number;
          scheduled_at: string;
          sent_at: string | null;
          created_at: string;
        };
      };
      speakers: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          title: string | null;
          company: string | null;
          status: string;
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


