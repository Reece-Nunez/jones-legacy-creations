import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { checkSpamProtection } from '@/lib/spam-protection';
import { contactSubmissionSchema, ContactFormData } from '@/lib/schemas/contact';

const getClientEmail = (data: ContactFormData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #000; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 28px; font-family: Georgia, serif;">Jones Legacy Creations</h1>
    <p style="color: #ccc; margin: 10px 0 0 0;">Building Legacies, One Project at a Time</p>
  </div>

  <div style="background-color: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #000; font-size: 24px; margin-top: 0; font-family: Georgia, serif;">Thank You for Contacting Us!</h2>

    <p style="font-size: 16px; color: #4b5563;">Dear ${data.fullName},</p>

    <p style="font-size: 16px; color: #4b5563;">
      Thank you for reaching out to Jones Legacy Creations! We've received your message and will respond within 24 hours.
    </p>

    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 30px 0; border-left: 4px solid #000;">
      <h3 style="margin-top: 0; color: #000; font-size: 18px;">Your Message</h3>
      <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;"><strong>Subject:</strong> ${data.subject}</p>
      <p style="color: #4b5563; margin: 0; white-space: pre-wrap;">${data.message}</p>
    </div>

    <p style="font-size: 16px; color: #4b5563;">
      If you need immediate assistance, please feel free to call us directly at (435) 288-9807.
    </p>

    <div style="background-color: #000; padding: 20px; border-radius: 6px; margin: 30px 0; text-align: center;">
      <p style="color: #fff; margin: 0 0 15px 0; font-weight: 600;">Contact Us</p>
      <p style="color: #ccc; margin: 5px 0; font-size: 14px;">📞 (435) 288-9807</p>
      <p style="color: #ccc; margin: 5px 0; font-size: 14px;">✉️ office@joneslegacycreations.com</p>
    </div>

    <p style="font-size: 16px; color: #4b5563; margin-top: 30px;">
      Best regards,<br>
      <strong style="color: #000;">The Jones Legacy Creations Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px;">
    <p style="margin: 5px 0;">Hurricane, Utah • Serving Southern Utah</p>
    <p style="margin: 5px 0;">www.joneslegacycreations.com</p>
  </div>
</body>
</html>
`;

const getBusinessEmail = (data: ContactFormData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #000; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
  </div>

  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #000; font-size: 20px; margin-top: 0;">Contact Information</h2>
    <table style="width: 100%; margin-bottom: 30px; background-color: #fff; padding: 20px; border-radius: 6px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 120px;">Name:</td><td style="padding: 8px 0; font-weight: 600;">${data.fullName}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #000;">${data.email}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Phone:</td><td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #000;">${data.phone}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Subject:</td><td style="padding: 8px 0; font-weight: 600;">${data.subject}</td></tr>
    </table>

    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Message</h2>
    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <p style="margin: 0; white-space: pre-wrap;">${data.message}</p>
    </div>

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e;"><strong>Action Required:</strong> Respond within 24 hours</p>
    </div>
  </div>
</body>
</html>
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Server-side validation with Zod
    const parseResult = contactSubmissionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { recaptchaToken, honeypot, ...data } = parseResult.data;

    // 2. Spam protection checks
    const spamCheck = await checkSpamProtection({
      request,
      recaptchaToken,
      recaptchaAction: 'contact_form',
      honeypotValue: honeypot,
      contentCheck: {
        name: data.fullName,
        message: data.message,
        minMessageWords: 3,
      },
    });

    if (!spamCheck.passed) {
      console.log('Spam detected:', spamCheck.error);
      // Return generic error to not tip off attackers
      return NextResponse.json(
        { error: 'Unable to process request' },
        { status: 429 }
      );
    }

    // 3. Process form submission
    const resend = new Resend(process.env.RESEND_API_KEY);

    const clientEmailResult = await resend.emails.send({
      from: 'Jones Legacy Creations <noreply@joneslegacycreations.com>',
      to: data.email,
      subject: 'Thank You for Contacting Jones Legacy Creations',
      html: getClientEmail(data),
    });

    if (clientEmailResult.error) {
      console.error('Error sending client email:', clientEmailResult.error);
      return NextResponse.json({ error: clientEmailResult.error.message }, { status: 500 });
    }

    const businessEmailResult = await resend.emails.send({
      from: 'Jones Legacy Creations <noreply@joneslegacycreations.com>',
      to: 'office@joneslegacycreations.com',
      subject: `New Contact Form: ${data.subject} - ${data.fullName}`,
      html: getBusinessEmail(data),
      replyTo: data.email,
    });

    if (businessEmailResult.error) {
      console.error('Error sending business email:', businessEmailResult.error);
      return NextResponse.json({ error: businessEmailResult.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending emails:', error);
    const message = error instanceof Error ? error.message : 'Failed to send emails';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
