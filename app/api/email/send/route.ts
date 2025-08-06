import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth'
import { emailService } from '@/lib/services/email-service'
import { config } from '@/lib/config'

export interface EmailDraft {
  lawFirm: string
  to: string[]
  subject: string
  body: string
  invoiceIds?: number[]
}

export interface SendEmailRequest {
  sessionId: string
  emailDrafts: EmailDraft[]
}

export interface EmailSendResult {
  lawFirm: string
  to: string[]
  success: boolean
  messageId?: string
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate session
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: SendEmailRequest = await request.json()
    
    if (!body.emailDrafts || !Array.isArray(body.emailDrafts)) {
      return NextResponse.json(
        { error: 'Invalid request: emailDrafts must be an array' },
        { status: 400 }
      )
    }

    // Process email drafts
    const results: EmailSendResult[] = []
    
    for (const draft of body.emailDrafts) {
      // Validate draft
      if (!draft.to || !Array.isArray(draft.to) || draft.to.length === 0) {
        results.push({
          lawFirm: draft.lawFirm,
          to: draft.to || [],
          success: false,
          error: 'No recipients specified'
        })
        continue
      }

      if (!draft.subject || !draft.body) {
        results.push({
          lawFirm: draft.lawFirm,
          to: draft.to,
          success: false,
          error: 'Subject and body are required'
        })
        continue
      }

      // Format HTML email
      const htmlContent = formatEmailHtml(draft, session.user?.name || 'User')

      try {
        // Send email
        const result = await emailService.sendEmail({
          to: draft.to,
          subject: draft.subject,
          html: htmlContent,
          text: draft.body // Plain text fallback
        })

        results.push({
          lawFirm: draft.lawFirm,
          to: draft.to,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        })
      } catch (error) {
        console.error(`Failed to send email to ${draft.lawFirm}:`, error)
        results.push({
          lawFirm: draft.lawFirm,
          to: draft.to,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send email'
        })
      }
    }

    // Return results
    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })
  } catch (error) {
    console.error('Email send API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatEmailHtml(draft: EmailDraft, senderName: string): string {
  const appName = config.app.name || 'Document Processing System'
  const invoiceInfo = draft.invoiceIds && draft.invoiceIds.length > 0
    ? `<p style="color: #666; font-size: 14px;">Invoice IDs: ${draft.invoiceIds.join(', ')}</p>`
    : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${draft.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #152C5B; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${appName}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #152C5B; margin: 0 0 20px 0; font-size: 20px;">
                ${draft.lawFirm}
              </h2>
              
              <div style="color: #333; line-height: 1.6; white-space: pre-wrap;">
${draft.body}
              </div>
              
              ${invoiceInfo}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                Sent by ${senderName} via ${appName}
              </p>
              <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                This is an automated email. Please do not reply to this address.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}