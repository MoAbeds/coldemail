export interface SendEmailParams {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  replyTo?: string;
  headers?: Record<string, string>;
  inReplyTo?: string; // Message-ID for threading
  references?: string; // Message-ID chain for threading
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  isBounce?: boolean;
  isHardBounce?: boolean;
}

export interface EmailProvider {
  send(params: SendEmailParams): Promise<SendEmailResult>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}
