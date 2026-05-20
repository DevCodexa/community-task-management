export type EmailQueueStatus = 'pending' | 'sent' | 'failed';

export interface SpeakerEmailQueueItem {
  id: string; // uuid
  speaker_id: string;
  email_type: string;
  status: EmailQueueStatus;
  retry_count: number;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;

  // joined speakers fields used to render templates
  email: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
}


export interface EmailTemplate {
  id: number;
  template_code: string;
  brevo_template_id: number | null;
  subject: string;
  html_content: string;
  is_active: boolean;
}

export interface EmailSettings {
  brevo_api_key: string;
  sender_email: string;
  sender_name: string;
  daily_limit: number;
  retry_limit: number;
  enabled: boolean;
}

export interface BrevoSendPayload {
  sender: { name: string; email: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  templateId?: number;
  params?: Record<string, string>;
}

export interface BrevoSendResponse {
  messageId: string;
}

