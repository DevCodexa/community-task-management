import axios from 'axios';
import type { BrevoSendPayload, BrevoSendResponse } from './types';

type BrevoError = {
  status?: number;
  message?: string;
};

function getAxiosErrorInfo(e: unknown): BrevoError {
  if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    const msgFromResponse = (e.response?.data as { message?: string } | undefined)?.message;

    return {
      status,
      message: msgFromResponse ?? e.message
    };
  }
  if (e instanceof Error) return { message: e.message };
  const unknownErr = e as { message?: unknown } | undefined;
  if (unknownErr?.message != null) return { message: String(unknownErr.message) };
  return { message: 'Unknown error' };
}

export async function sendEmail(payload: BrevoSendPayload, apiKey: string): Promise<BrevoSendResponse> {
  const url = 'https://api.brevo.com/v3/smtp/email';

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: 30000
    });

    // Brevo response includes messageId
    const messageId: string | undefined = response.data?.messageId;
    if (!messageId) throw new Error('Brevo response missing messageId');

    return { messageId };
  } catch (e: unknown) {
    const info = getAxiosErrorInfo(e);
    const status = info.status;
    const message = info.message ?? 'Brevo request failed';

    const err = new Error(`${message}${status ? ` (HTTP ${status})` : ''}`);
    (err as { status?: number }).status = status;
    throw err;
  }
}

