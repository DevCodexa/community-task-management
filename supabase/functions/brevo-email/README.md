# brevo-email Edge Function

Bu fonksiyon iki modda çalışır:

1) **BREVO_API_KEY varsa** -> Brevo HTTP API (Transactional) kullanır.
   - Endpoint: `POST https://api.brevo.com/v3/smtp/email`
   - Auth header: `api-key: BREVO_API_KEY`

2) **BREVO_API_KEY yoksa** -> SMTP fallback ile `nodemailer` kullanır.

## Request
`POST` body:
```json
{
  "to": "...",
  "subject": "...",
  "html": "...",
  "fromEmail": "...",   
  "fromName": "..."
}
```

## Response
```json
{ "success": true, "messageId": "..." }
```
veya
```json
{ "success": false, "error": "..." }
```

