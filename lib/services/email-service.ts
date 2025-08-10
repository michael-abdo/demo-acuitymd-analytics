import * as nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'
import { config } from '@/lib/config'

export interface EmailMessage {
  to: string | string[]
  from?: string
  subject: string
  text?: string
  html?: string
  attachments?: Mail.Attachment[]
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
  testRecipient?: string
}

class EmailService {
  private transporter: Mail | null = null
  private config: EmailConfig

  constructor() {
    this.config = {
      host: process.env.AWS_SES_SMTP_HOST || `email-smtp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`,
      port: parseInt(process.env.AWS_SES_SMTP_PORT || '587', 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.AWS_SES_SMTP_USERNAME || '',
        pass: process.env.AWS_SES_SMTP_PASSWORD || ''
      },
      from: process.env.SES_FROM_EMAIL || config.app.email,
      testRecipient: process.env.SES_TEST_RECIPIENT
    }

    // Only initialize transporter if credentials are provided
    if (this.config.auth.user && this.config.auth.pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass
        }
      })
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not configured - missing SMTP credentials')
      return false
    }

    try {
      await this.transporter.verify()
      console.log('SMTP connection verified successfully')
      return true
    } catch (error) {
      console.error('SMTP connection verification failed:', error)
      return false
    }
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    // Check if email should be sent based on environment
    const isProduction = process.env.NODE_ENV === 'production'
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isStaging = process.env.NODE_ENV === 'staging'
    const enableEmailInDev = process.env.ENABLE_EMAIL_IN_DEV === 'true'

    // Development mode email interception
    if (isDevelopment && !enableEmailInDev) {
      console.log('📧 Email intercepted in development mode:')
      console.log('To:', message.to)
      console.log('Subject:', message.subject)
      console.log('Content:', message.text || message.html)
      return {
        success: true,
        messageId: 'dev-mock-' + Date.now(),
        error: undefined
      }
    }

    // Staging mode email interception
    if (isStaging) {
      console.log('📧 Email intercepted in staging mode:')
      console.log('Original To:', message.to)
      console.log('Subject:', message.subject)
      
      // Optionally redirect to test recipient
      if (this.config.testRecipient) {
        message.to = this.config.testRecipient
        console.log('Redirected To:', message.to)
      } else {
        return {
          success: true,
          messageId: 'staging-mock-' + Date.now(),
          error: undefined
        }
      }
    }

    // Check if transporter is configured
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email service not configured - missing SMTP credentials'
      }
    }

    try {
      // Prepare email options
      const mailOptions: Mail.Options = {
        from: message.from || this.config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments
      }

      // Send email
      const info = await this.transporter.sendMail(mailOptions)

      return {
        success: true,
        messageId: info.messageId,
        error: undefined
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      return {
        success: false,
        messageId: undefined,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async sendNotification(
    to: string | string[],
    subject: string,
    content: string,
    isHtml: boolean = false
  ): Promise<EmailResult> {
    const message: EmailMessage = {
      to,
      subject,
      ...(isHtml ? { html: content } : { text: content })
    }
    return this.sendEmail(message)
  }

  async sendSystemAlert(
    subject: string,
    message: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<EmailResult> {
    const adminEmail = process.env.ADMIN_EMAIL || config.app.email
    const priorityEmoji = {
      high: '🚨',
      medium: '⚠️',
      low: 'ℹ️'
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #152C5B;">${priorityEmoji[priority]} System Alert</h2>
        <p style="color: #333; line-height: 1.6;">${message}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated system alert from ${config.app.name}
        </p>
      </div>
    `

    return this.sendEmail({
      to: adminEmail,
      subject: `[${priority.toUpperCase()}] ${subject}`,
      html: htmlContent,
      text: message
    })
  }

  async testEmail(): Promise<EmailResult> {
    const testRecipient = this.config.testRecipient || process.env.ADMIN_EMAIL || config.app.email
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #152C5B;">Email Service Test</h1>
        <p style="color: #333; line-height: 1.6;">
          This is a test email from the ${config.app.name} email service.
        </p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #152C5B;">Configuration Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>SMTP Host:</strong> ${this.config.host}</li>
            <li><strong>SMTP Port:</strong> ${this.config.port}</li>
            <li><strong>From Email:</strong> ${this.config.from}</li>
            <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
          </ul>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you received this email, your email service is configured correctly! 🎉
        </p>
      </div>
    `

    return this.sendEmail({
      to: testRecipient,
      subject: `Test Email - ${config.app.name}`,
      html: htmlContent,
      text: `This is a test email from ${config.app.name}. If you received this, your email service is working correctly!`
    })
  }
}

// Export singleton instance
export const emailService = new EmailService()