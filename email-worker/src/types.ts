export type EmailQueuePriority = 'low' | 'medium' | 'high';
export type EmailQueueStatus = 'pending' | 'sent' | 'failed';

export interface EmailQueueItem {
  id: number;
  recipient_email: string;
  recipient_name: string | null;
  template_code: string;
  template_params: Record<string, string>;
  priority: EmailQueuePriority;
  status: EmailQueueStatus;
  attempt_count: number;
  last_attempt_at: string | null;
  brevo_message_id: string | null;
  error_message: string | null;
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

