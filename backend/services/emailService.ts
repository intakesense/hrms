import { Resend } from 'resend';
import Settings from '../models/Settings.model.js';
import logger from '../utils/logger.js';

interface EmailData {
  [key: string]: unknown;
}

interface EmailResult {
  data?: { id: string };
  error?: unknown;
}

interface EmailBatchResult {
  status: 'fulfilled' | 'rejected';
  value?: EmailResult;
  reason?: unknown;
}

interface StatusColors {
  [key: string]: string;
}

interface EmailTemplateItem {
  label: string;
  value: string;
}

interface EmailTemplate {
  subject: string;
  htmlContent: string;
}

class EmailService {
  resend: Resend | null;
  initialized: boolean;
  transporter: Resend | null;

  constructor() {
    this.resend = null;
    this.initialized = false;
    this.transporter = null;
  }

  async initialize(): Promise<void> {
    try {
      if (!process.env.RESEND_API_KEY) {
        logger.info('Email service skipped - Resend API key not provided');
        logger.info('Required: RESEND_API_KEY (sign up at https://resend.com)');
        return;
      }

      logger.info('Initializing email service with Resend API...');

      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.transporter = this.resend;

      try {
        await this.resend.domains.list();
        this.initialized = true;
        logger.info('Resend email service initialized successfully');
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        if (err.message.includes('API key')) {
          throw err;
        }
        this.initialized = true;
        logger.info('Resend email service initialized (domain verification skipped)');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Email service initialization failed');
      logger.info('Email service will be disabled. Emails will not be sent.');
      logger.info('Check your RESEND_API_KEY at https://resend.com/api-keys');
      this.resend = null;
      this.transporter = null;
      this.initialized = false;
    }
  }

  async send(to: string, subject: string, htmlContent: string): Promise<EmailResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized || !this.resend) {
      throw new Error('Email service not initialized');
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'HRMS System <onboarding@resend.dev>',
        to: [to],
        subject,
        html: htmlContent
      });

      if (error) {
        logger.error({ error }, `Failed to send email to ${to}`);
        throw new Error(`Email sending failed: ${JSON.stringify(error)}`);
      }

      logger.info(`Email sent to ${to} via Resend: ${data?.id}`);
      return { data, error };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, `Failed to send email to ${to}`);
      throw error;
    }
  }

  async sendToMultiple(emails: string[], subject: string, htmlContent: string): Promise<EmailBatchResult[]> {
    const results: EmailBatchResult[] = [];
    const delay = 600;

    logger.info(`Sending ${emails.length} emails with rate limiting...`);

    for (let i = 0; i < emails.length; i++) {
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await this.send(emails[i] as string, subject, htmlContent);
        results.push({ status: 'fulfilled', value: result });

        logger.info(`Progress: ${i + 1}/${emails.length} emails sent`);
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error({ err }, `Failed to send email ${i + 1}/${emails.length} to ${emails[i]}`);
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    logger.info(`Email batch completed: ${successful} successful, ${failed} failed`);

    return results;
  }

  async sendBatchWithCallback(emailCallbacks: (() => Promise<unknown>)[]): Promise<EmailBatchResult[]> {
    const results: EmailBatchResult[] = [];
    const delay = 600;

    logger.info(`Processing ${emailCallbacks.length} email operations with rate limiting...`);

    for (let i = 0; i < emailCallbacks.length; i++) {
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const callback = emailCallbacks[i];
        if (callback) {
          const result = await callback();
          results.push({ status: 'fulfilled', value: result as EmailResult });
        }

        logger.info(`Progress: ${i + 1}/${emailCallbacks.length} operations completed`);
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error({ err }, `Failed operation ${i + 1}/${emailCallbacks.length}`);
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    logger.info(`Batch operations completed: ${successful} successful, ${failed} failed`);

    return results;
  }

  async sendNotification(type: string, data: EmailData, recipients: string | string[]): Promise<EmailResult | EmailBatchResult[] | undefined> {
    const settings = await Settings.getGlobalSettings();
    if (!settings.notifications.emailEnabled) {
      logger.info('Email notifications are disabled');
      return;
    }

    const { subject, htmlContent } = this.getTemplate(type, data);

    if (Array.isArray(recipients)) {
      return this.sendToMultiple(recipients, subject, htmlContent);
    } else {
      return this.send(recipients, subject, htmlContent);
    }
  }

  getEmailHeader(): string {
    return `
      <div class="header-padding" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; margin-bottom: 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <img src="https://hr.intakesense.com/icon-192x192.png" alt="HRMS Logo" width="64" height="64" style="display: block; margin: 0 auto 12px; border-radius: 8px;" />
              <h1 class="mobile-heading" style="color: white; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; padding: 0;">
                HRMS System
              </h1>
              <p class="mobile-text-small" style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px; padding: 0;">
                Human Resource Management System
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  getEmailFooter(): string {
    return `
      <div class="mobile-padding" style="margin-top: 30px; padding: 25px 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <p class="mobile-text-small" style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5;">This is an automated message from HRMS System</p>
              <p class="mobile-text-small" style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5;">Please do not reply to this email</p>
              <p class="mobile-text-small" style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                © ${new Date().getFullYear()} HRMS System. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  getBaseEmailTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>HRMS Notification</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
        </style>
        <![endif]-->
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }

          table {
            border-collapse: collapse !important;
          }

          img {
            -ms-interpolation-mode: bicubic;
            max-width: 100%;
            height: auto;
          }

          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              margin: 0 !important;
              border-radius: 0 !important;
            }

            .content-padding {
              padding: 20px 16px !important;
            }

            .header-padding {
              padding: 24px 16px !important;
            }

            .mobile-text-center {
              text-align: center !important;
            }

            .mobile-full-width {
              width: 100% !important;
              display: block !important;
            }

            .mobile-padding {
              padding: 12px !important;
            }

            .mobile-text-small {
              font-size: 14px !important;
            }

            .mobile-heading {
              font-size: 20px !important;
            }

            .mobile-subheading {
              font-size: 16px !important;
            }

            .mobile-hide {
              display: none !important;
            }

            .mobile-stack {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
            }

            .mobile-icon-container {
              width: 50px !important;
              height: 50px !important;
              font-size: 20px !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; padding: 20px 0;">
          <tr>
            <td align="center" style="padding: 0;">
              <div class="email-container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                ${this.getEmailHeader()}
                <div class="content-padding" style="padding: 0 40px 40px 40px;">
                  ${content}
                </div>
                ${this.getEmailFooter()}
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  getStatusBadge(status: string): string {
    const statusColors: StatusColors = {
      approved: '#10b981',
      rejected: '#ef4444',
      pending: '#f59e0b',
      completed: '#10b981',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };

    const color = statusColors[status?.toLowerCase()] || '#6b7280';

    return `
      <span style="
        display: inline-block;
        background-color: ${color};
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      ">${status}</span>
    `;
  }

  getActionButton(text: string, color = '#667eea'): string {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 25px 0;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="border-radius: 8px; background-color: ${color};">
                  <a href="#" class="mobile-text-small" style="
                    display: inline-block;
                    background-color: ${color};
                    color: white;
                    text-decoration: none;
                    padding: 14px 32px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border: none;
                    min-width: 200px;
                    text-align: center;
                  ">${text}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  }

  getInfoCard(items: EmailTemplateItem[]): string {
    const itemsHtml = items.map(item => `
      <tr>
        <td class="mobile-text-small" style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
          <strong style="color: #475569; font-size: 14px; display: block; word-break: break-word;">${item.label}:</strong>
        </td>
        <td class="mobile-text-small" style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top;">
          <span style="color: #1e293b; font-size: 14px; display: block; word-break: break-word;">${item.value}</span>
        </td>
      </tr>
    `).join('');

    return `
      <div class="mobile-padding" style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
          ${itemsHtml}
        </table>
      </div>
    `;
  }

  getTemplate(type: string, data: EmailData): EmailTemplate {
    const templates: Record<string, () => EmailTemplate> = {
      leave_request: () => ({
        subject: `New Leave Request - ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🏖️</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">New Leave Request</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Requires your attention</p>
          </div>

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Leave Type', value: data.type as string },
            { label: 'Date', value: new Date(data.date as string).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
            { label: 'Reason', value: data.reason as string }
          ])}

          <div style="background: linear-gradient(135deg, #fef3c7, #fed7aa); border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
              ⚡ Action Required: Please review and approve/reject this request in the HRMS system.
            </p>
          </div>

          ${this.getActionButton('Review Request', '#10b981')}
        `)
      }),

      expense_request: () => ({
        subject: `New Expense Reimbursement Request - ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">💰</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Expense Reimbursement Request</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">New submission from employee</p>
          </div>

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Employee ID', value: data.employeeId as string },
            { label: 'Item/Description', value: data.item as string },
            { label: 'Amount', value: `₹${Number(data.amount || 0).toLocaleString()}` },
            { label: 'Date', value: new Date(data.date as string).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }
          ])}

          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 500;">
              💵 A new expense has been submitted for your review and approval.
            </p>
          </div>

          ${this.getActionButton('Review Expense', '#10b981')}
        `)
      }),

      expense_status_update: () => ({
        subject: `Expense Request ${data.status ? (data.status as string).charAt(0).toUpperCase() + (data.status as string).slice(1) : 'Update'}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🧾</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Expense Request Update</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Reimbursement status update</p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #475569; font-size: 18px; margin: 0 0 10px 0;">Your expense request has been</p>
            <div style="margin: 10px 0;">
              ${this.getStatusBadge(data.status as string)}
            </div>
          </div>

          ${this.getInfoCard([
            { label: 'Item', value: data.item as string },
            { label: 'Amount', value: `₹${Number(data.amount || 0).toLocaleString()}` },
            { label: 'Status', value: data.status as string }
          ])}

          <div style="background: ${data.status === 'approved' ? '#ecfdf5' : data.status === 'rejected' ? '#fef2f2' : '#fefbeb'}; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${data.status === 'approved' ? '#10b981' : data.status === 'rejected' ? '#ef4444' : '#f59e0b'}; text-align: center;">
            <p style="margin: 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 16px; font-weight: 500;">
              ${data.status === 'approved' ? '✅ Your expense reimbursement has been approved!' : data.status === 'rejected' ? '❌ Your expense request was not approved' : '⏳ Your request is under review'}
            </p>
            ${data.comment ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${data.status === 'approved' ? '#a7f3d0' : data.status === 'rejected' ? '#fca5a5' : '#fed7aa'};">
                <p style="margin: 0; color: ${data.status === 'approved' ? '#047857' : data.status === 'rejected' ? '#7f1d1d' : '#78350f'}; font-size: 14px; font-weight: 500;">Admin Comment:</p>
                <p style="margin: 5px 0 0 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 14px;">${data.comment as string}</p>
              </div>
            ` : ''}
          </div>
        `)
      }),

      wfh_request: () => ({
        subject: `Work From Home Request - ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🏠</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Work From Home Request</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Requires your attention</p>
          </div>

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Employee ID', value: data.employeeId as string },
            { label: 'Request Date', value: data.requestDate as string },
            { label: 'Reason', value: data.reason as string }
          ])}

          <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 500;">
              ℹ️ This employee is requesting to work from home outside the office geofence.
            </p>
          </div>

          ${this.getActionButton('Review Request', '#3b82f6')}
        `)
      }),

      help_request: () => ({
        subject: `New Help Request - ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🆘</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">New Help Request</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Employee needs assistance</p>
          </div>

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Subject', value: data.subject as string },
            { label: 'Category', value: data.category as string },
            { label: 'Priority', value: this.getStatusBadge(data.priority as string) }
          ])}

          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h4 style="color: #1e293b; margin: 0 0 10px 0; font-size: 16px;">Description:</h4>
            <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">${data.description as string}</p>
          </div>

          ${this.getActionButton('Respond in HRMS', '#3b82f6')}
        `)
      }),

      regularization_request: () => ({
        subject: `New Regularization Request - ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">⏰</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Attendance Regularization Request</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Requires approval</p>
          </div>

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Date', value: new Date(data.date as string).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
            { label: 'Check-in Time', value: (data.checkIn as string) || 'Not specified' },
            { label: 'Check-out Time', value: (data.checkOut as string) || 'Not specified' },
            { label: 'Reason', value: data.reason as string }
          ])}

          <div style="background: linear-gradient(135deg, #fef3c7, #fed7aa); border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">
              ⚡ Action Required: Please review and approve/reject this regularization request.
            </p>
          </div>

          ${this.getActionButton('Review Request', '#8b5cf6')}
        `)
      }),

      holiday_reminder: () => ({
        subject: `Holiday Reminder - ${data.title as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #06b6d4, #0891b2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🏖️</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Upcoming Holiday</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Plan your work accordingly</p>
          </div>

          <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; border: 2px solid #60a5fa;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">${data.title as string}</h3>
            <p style="color: #1e40af; margin: 0; font-size: 18px; font-weight: 600;">${data.date as string}</p>
            ${data.description ? `<p style="color: #3730a3; margin: 15px 0 0 0; font-size: 14px; font-style: italic;">${data.description as string}</p>` : ''}
            ${data.isOptional ? `<div style="margin-top: 15px;">${this.getStatusBadge('Optional Holiday')}</div>` : ''}
          </div>

          <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #06b6d4; text-align: center;">
            <p style="margin: 0; color: #0c4a6e; font-size: 16px; font-weight: 500;">
              🏢 The office will be closed on this day
            </p>
            <p style="margin: 5px 0 0 0; color: #075985; font-size: 14px;">
              Please plan your work schedule accordingly
            </p>
          </div>
        `)
      }),

      announcement: () => ({
        subject: `Announcement: ${data.title as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding: 0 0 30px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <div class="mobile-icon-container" style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; margin: 0 auto 15px; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 24px;">📢</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <h2 class="mobile-heading" style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700; padding: 0;">New Announcement</h2>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p class="mobile-text-small" style="color: #64748b; margin: 8px 0 0 0; font-size: 16px; padding: 0;">Important update from management</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div class="mobile-padding" style="background: linear-gradient(135deg, #fefbeb, #fef3c7); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h3 class="mobile-subheading" style="color: #92400e; margin: 0 0 15px 0; font-size: 20px; font-weight: 700; word-break: break-word;">${data.title as string}</h3>
            <div class="mobile-text-small" style="color: #78350f; font-size: 16px; line-height: 1.7;">
              ${(data.content as string).split('\n').map(paragraph => `<p style="margin: 0 0 15px 0; word-break: break-word;">${paragraph}</p>`).join('')}
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #fed7aa;">
              <tr>
                <td align="right">
                  <p class="mobile-text-small mobile-text-center" style="color: #92400e; margin: 0; font-size: 14px; font-weight: 600;">— ${data.author as string}</p>
                </td>
              </tr>
            </table>
          </div>

          <div class="mobile-padding" style="background: #fffbeb; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b; text-align: center;">
            <p class="mobile-text-small" style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500; line-height: 1.4;">
              📋 This announcement is also available in your HRMS dashboard
            </p>
          </div>
        `)
      }),

      employee_milestone: () => ({
        subject: `Employee Milestone - ${data.employee as string}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">🏆</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Employee Milestone Achievement</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Time to celebrate!</p>
          </div>

          <div style="background: linear-gradient(135deg, #fefbeb, #fef3c7); border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; border: 2px solid #f59e0b;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 22px; font-weight: 700;">🎉 ${data.employee as string}</h3>
            <p style="color: #78350f; margin: 0; font-size: 18px; font-weight: 600;">has completed ${data.milestone as string} with the company!</p>
            ${data.department ? `<p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">${data.department as string} Department</p>` : ''}
          </div>

          ${this.getInfoCard([
            { label: 'Employee', value: data.employee as string },
            { label: 'Employee ID', value: data.employeeId as string },
            { label: 'Milestone', value: (data.milestone as string) + ' work anniversary' },
            { label: 'Joining Date', value: new Date(data.joiningDate as string).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
            ...(data.department ? [{ label: 'Department', value: data.department as string }] : []),
            ...(data.position ? [{ label: 'Position', value: data.position as string }] : [])
          ])}

          <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: 500;">
              🎊 Consider recognizing this employee's contribution and dedication
            </p>
            <p style="margin: 5px 0 0 0; color: #047857; font-size: 14px;">
              A milestone like this deserves celebration and appreciation
            </p>
          </div>
        `)
      }),

      leave_status_update: () => ({
        subject: `Leave Request ${data.status ? (data.status as string).charAt(0).toUpperCase() + (data.status as string).slice(1) : 'Update'}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">📋</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Leave Request Update</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Status notification</p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #475569; font-size: 18px; margin: 0 0 10px 0;">Your leave request has been</p>
            <div style="margin: 10px 0;">
              ${this.getStatusBadge(data.status as string)}
            </div>
          </div>

          ${this.getInfoCard([
            { label: 'Leave Type', value: data.type as string },
            { label: 'Date', value: data.date as string },
            { label: 'Reason', value: data.reason as string },
            { label: 'Status', value: data.status as string }
          ])}

          <div style="background: ${data.status === 'approved' ? '#ecfdf5' : data.status === 'rejected' ? '#fef2f2' : '#fefbeb'}; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${data.status === 'approved' ? '#10b981' : data.status === 'rejected' ? '#ef4444' : '#f59e0b'}; text-align: center;">
            <p style="margin: 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 16px; font-weight: 500;">
              ${data.status === 'approved' ? '✅ Your leave has been approved!' : data.status === 'rejected' ? '❌ Your leave request was not approved' : '⏳ Your leave request is under review'}
            </p>
            ${data.comment ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${data.status === 'approved' ? '#a7f3d0' : data.status === 'rejected' ? '#fca5a5' : '#fed7aa'};">
                <p style="margin: 0; color: ${data.status === 'approved' ? '#047857' : data.status === 'rejected' ? '#7f1d1d' : '#78350f'}; font-size: 14px; font-weight: 500;">Review Comment:</p>
                <p style="margin: 5px 0 0 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 14px;">${data.comment as string}</p>
              </div>
            ` : ''}
          </div>
        `)
      }),

      regularization_status_update: () => ({
        subject: `Regularization Request ${data.status ? (data.status as string).charAt(0).toUpperCase() + (data.status as string).slice(1) : 'Update'}`,
        htmlContent: this.getBaseEmailTemplate(`
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">⏰</span>
            </div>
            <h2 style="color: #1e293b; margin: 0; font-size: 24px; font-weight: 700;">Regularization Update</h2>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 16px;">Attendance regularization status</p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #475569; font-size: 18px; margin: 0 0 10px 0;">Your regularization request has been</p>
            <div style="margin: 10px 0;">
              ${this.getStatusBadge(data.status as string)}
            </div>
          </div>

          ${this.getInfoCard([
            { label: 'Date', value: data.date as string },
            { label: 'Check-in', value: data.checkIn as string },
            { label: 'Check-out', value: data.checkOut as string },
            { label: 'Reason', value: data.reason as string },
            { label: 'Status', value: data.status as string }
          ])}

          <div style="background: ${data.status === 'approved' ? '#ecfdf5' : data.status === 'rejected' ? '#fef2f2' : '#fefbeb'}; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${data.status === 'approved' ? '#10b981' : data.status === 'rejected' ? '#ef4444' : '#f59e0b'}; text-align: center;">
            <p style="margin: 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 16px; font-weight: 500;">
              ${data.status === 'approved' ? '✅ Your attendance has been regularized!' : data.status === 'rejected' ? '❌ Your regularization request was not approved' : '⏳ Your request is under review'}
            </p>
            ${data.comment ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid ${data.status === 'approved' ? '#a7f3d0' : data.status === 'rejected' ? '#fca5a5' : '#fed7aa'};">
                <p style="margin: 0; color: ${data.status === 'approved' ? '#047857' : data.status === 'rejected' ? '#7f1d1d' : '#78350f'}; font-size: 14px; font-weight: 500;">Review Comment:</p>
                <p style="margin: 5px 0 0 0; color: ${data.status === 'approved' ? '#065f46' : data.status === 'rejected' ? '#991b1b' : '#92400e'}; font-size: 14px;">${data.comment as string}</p>
              </div>
            ` : ''}
          </div>
        `)
      }),

      birthday_wish: () => ({
        subject: `Happy Birthday ${data.employee as string}!`,
        htmlContent: this.getBaseEmailTemplate(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="padding: 0 0 30px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <div class="mobile-icon-container" style="width: 80px; height: 80px; background: linear-gradient(135deg, #ff6b6b, #ff8e53); border-radius: 50%; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);">
                        <span style="font-size: 32px;">🎂</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <h1 class="mobile-heading" style="color: #ff6b6b; margin: 0 0 10px 0; font-size: 32px; font-weight: 800; padding: 0;">
                        Happy Birthday!
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <h2 class="mobile-subheading" style="color: #667eea; margin: 0; font-size: 24px; font-weight: 700; padding: 0;">${data.employee as string}</h2>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div class="mobile-padding" style="background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);">
            <p class="mobile-text-small" style="color: white; font-size: 20px; margin: 0 0 15px 0; font-weight: 600; line-height: 1.4;">
              Wishing you a wonderful birthday and an amazing year ahead!
            </p>
            ${data.age ? `<p class="mobile-text-small" style="color: rgba(255,255,255,0.9); margin: 0 0 15px 0; font-size: 18px;">Celebrating ${data.age as string} years of awesomeness! 🎂</p>` : ''}
            ${data.department ? `<p class="mobile-text-small" style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">From your ${data.department as string} team and the entire HRMS family</p>` : ''}
          </div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
            <tr>
              <td class="mobile-stack" align="center" style="padding: 15px; width: 33.33%;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <div class="mobile-icon-container" style="width: 50px; height: 50px; background: linear-gradient(135deg, #ff9a9e, #fecfef); border-radius: 50%; margin: 0 auto 10px; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 20px;">🎁</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p class="mobile-text-small" style="color: #64748b; margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; max-width: 200px;">May this special day bring you joy and happiness</p>
                    </td>
                  </tr>
                </table>
              </td>
              <td class="mobile-stack" align="center" style="padding: 15px; width: 33.33%;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <div class="mobile-icon-container" style="width: 50px; height: 50px; background: linear-gradient(135deg, #a8edea, #fed6e3); border-radius: 50%; margin: 0 auto 10px; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 20px;">🌟</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p class="mobile-text-small" style="color: #64748b; margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; max-width: 200px;">Here's to another year of great achievements</p>
                    </td>
                  </tr>
                </table>
              </td>
              <td class="mobile-stack" align="center" style="padding: 15px; width: 33.33%;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <div class="mobile-icon-container" style="width: 50px; height: 50px; background: linear-gradient(135deg, #ffecd2, #fcb69f); border-radius: 50%; margin: 0 auto 10px; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 20px;">🎈</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <p class="mobile-text-small" style="color: #64748b; margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; max-width: 200px;">Enjoy your special celebration!</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div class="mobile-padding" style="background: linear-gradient(135deg, #ffeaa7, #fab1a0); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
            <p class="mobile-text-small" style="color: #2d3436; margin: 0; font-size: 16px; font-weight: 600; line-height: 1.4;">
              🎊 Have a fantastic day filled with love, laughter, and cake! 🎊
            </p>
          </div>
        `)
      }),

      daily_hr_attendance_report: () => {
        const officeGroups = (data.officeGroups as Array<{
          officeAddress: string;
          presentEmployees: Array<{ name: string; checkIn?: string; checkOut?: string }>;
          absentEmployees: Array<{ name: string }>;
        }>) || [];

        return {
          subject: (data.subjectLine as string) || `Daily Attendance Report - ${data.reportDateFormatted as string}`,
          htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @media only screen and (max-width: 600px) {
                .mobile-padding { padding: 12px !important; }
                .mobile-text-small { font-size: 11px !important; }
                .mobile-heading { font-size: 20px !important; }
                .mobile-subheading { font-size: 14px !important; }
                .mobile-stat { font-size: 24px !important; }
                .mobile-table { font-size: 11px !important; }
                .mobile-cell { padding: 6px !important; }
              }
            </style>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.4; color: #1f2937; max-width: 1000px; margin: 0 auto; padding: 8px; background-color: #f9fafb;">

            <!-- Header -->
            <div class="mobile-padding" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 12px; text-align: center;">
              <h1 class="mobile-heading" style="margin: 0; font-size: 24px; font-weight: 700;">📊 Attendance</h1>
              <p class="mobile-text-small" style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${data.reportDateFormatted as string}</p>
            </div>

            <!-- Summary -->
            <div class="mobile-padding" style="background-color: white; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 8px;">
                <div style="text-align: center; padding: 8px;">
                  <div class="mobile-stat" style="font-size: 28px; font-weight: 700; color: #1f2937;">${data.totalEmployees as number}</div>
                  <div class="mobile-text-small" style="font-size: 11px; color: #6b7280; font-weight: 500;">Total</div>
                </div>
                <div style="text-align: center; padding: 8px;">
                  <div class="mobile-stat" style="font-size: 28px; font-weight: 700; color: #10b981;">${data.totalPresent as number}</div>
                  <div class="mobile-text-small" style="font-size: 11px; color: #6b7280; font-weight: 500;">Present</div>
                </div>
                ${(data.totalAbsent as number) > 0 ? `
                <div style="text-align: center; padding: 8px;">
                  <div class="mobile-stat" style="font-size: 28px; font-weight: 700; color: #ef4444;">${data.totalAbsent as number}</div>
                  <div class="mobile-text-small" style="font-size: 11px; color: #6b7280; font-weight: 500;">Absent</div>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- Office Groups -->
            ${officeGroups.map(group => `
              <div class="mobile-padding" style="background-color: white; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

                <!-- Office Header -->
                <div class="mobile-padding" style="background-color: #3b82f6; color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;">
                  <h2 class="mobile-subheading" style="margin: 0; font-size: 15px; font-weight: 600;">📍 ${group.officeAddress.toUpperCase()}</h2>
                </div>

                <!-- Present Employees Table -->
                ${group.presentEmployees.length > 0 ? `
                  <h3 class="mobile-subheading" style="color: #1f2937; font-size: 14px; margin: 0 0 8px 0;">✅ Present (${group.presentEmployees.length})</h3>
                  <div style="overflow-x: auto;">
                    <table class="mobile-table" style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
                      <thead>
                        <tr style="background-color: #f3f4f6;">
                          <th class="mobile-cell" style="padding: 8px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db; font-size: 11px;">Name</th>
                          <th class="mobile-cell" style="padding: 8px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db; font-size: 11px;">In</th>
                          <th class="mobile-cell" style="padding: 8px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db; font-size: 11px;">Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${group.presentEmployees.map(emp => `
                          <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td class="mobile-cell" style="padding: 8px 6px; font-weight: 500; font-size: 11px;">${emp.name}</td>
                            <td class="mobile-cell" style="padding: 8px 6px; font-size: 11px;">${emp.checkIn || '-'}</td>
                            <td class="mobile-cell" style="padding: 8px 6px; font-size: 11px; ${!emp.checkOut ? 'color: #f59e0b; font-weight: 600;' : ''}">${emp.checkOut || 'No'}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : '<p class="mobile-text-small" style="color: #6b7280; font-style: italic; margin-bottom: 16px; font-size: 11px;">No employees present</p>'}

                <!-- Absent Employees Table -->
                ${group.absentEmployees.length > 0 ? `
                  <h3 class="mobile-subheading" style="color: #ef4444; font-size: 14px; margin: 0 0 8px 0;">❌ Absent (${group.absentEmployees.length})</h3>
                  <div style="overflow-x: auto;">
                    <table class="mobile-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                      <thead>
                        <tr style="background-color: #fef2f2;">
                          <th class="mobile-cell" style="padding: 8px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #fecaca; font-size: 11px;">Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${group.absentEmployees.map(emp => `
                          <tr style="border-bottom: 1px solid #fecaca;">
                            <td class="mobile-cell" style="padding: 8px 6px; color: #991b1b; font-size: 11px;">${emp.name}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                ` : ''}

              </div>
            `).join('')}

            <!-- Footer -->
            <div class="mobile-text-small" style="text-align: center; margin-top: 16px; padding: 12px; color: #6b7280; font-size: 10px;">
              <p style="margin: 4px 0;">Automated report by HRMS System</p>
              <p style="margin: 4px 0;">Generated: ${data.generatedAt as string} IST</p>
            </div>

          </body>
          </html>
        `
        };
      }
    };

    const template = templates[type];
    if (template) {
      return template();
    }

    return {
      subject: 'HRMS Notification',
      htmlContent: this.getBaseEmailTemplate(`
        <div style="text-align: center; padding: 40px 0;">
          <h2 style="color: #1e293b; margin: 0;">HRMS Notification</h2>
          <p style="color: #64748b; margin: 10px 0 0 0;">You have a new notification from the HRMS system.</p>
        </div>
      `)
    };
  }
}

export default new EmailService();
