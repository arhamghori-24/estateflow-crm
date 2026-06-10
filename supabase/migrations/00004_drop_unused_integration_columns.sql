-- Twilio/Resend/OpenAI/SMTP credentials are sourced from environment variables
-- (see lib/services/*), not the integration_settings table. Drop the dead
-- columns; only lead_webhook_secret, default_assignment_mode, and
-- social_publish_webhook_url are read from this table at runtime.
alter table integration_settings
  drop column if exists twilio_account_sid,
  drop column if exists twilio_auth_token_encrypted,
  drop column if exists twilio_phone_number,
  drop column if exists whatsapp_sender_number,
  drop column if exists resend_api_key_encrypted,
  drop column if exists smtp_host,
  drop column if exists smtp_port,
  drop column if exists smtp_user,
  drop column if exists smtp_password_encrypted,
  drop column if exists openai_api_key_encrypted;
