import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { checkSpamProtection } from '@/lib/spam-protection';
import { constructionSubmissionSchema, ConstructionFormData } from '@/lib/schemas/construction';

// Email template for client confirmation
const getClientEmail = (data: ConstructionFormData) => `
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
    <h2 style="color: #000; font-size: 24px; margin-top: 0; font-family: Georgia, serif;">Thank You for Your Construction Inquiry!</h2>

    <p style="font-size: 16px; color: #4b5563;">Dear ${data.fullName},</p>

    <p style="font-size: 16px; color: #4b5563;">
      Thank you for reaching out to Jones Legacy Creations! We've received your construction project details and are excited about the opportunity to work with you.
    </p>

    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 30px 0; border-left: 4px solid #000;">
      <h3 style="margin-top: 0; color: #000; font-size: 18px;">What Happens Next?</h3>
      <ul style="color: #4b5563; padding-left: 20px;">
        <li style="margin-bottom: 10px;">Our team will review your project details within 24-48 hours</li>
        <li style="margin-bottom: 10px;">We'll contact you to schedule an initial consultation</li>
        <li style="margin-bottom: 10px;">We'll discuss your vision, timeline, and provide a detailed estimate</li>
      </ul>
    </div>

    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <h3 style="margin-top: 0; color: #000; font-size: 18px;">Your Project Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; color: #6b7280; width: 40%;">Project Type:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.projectType || 'Not specified'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; color: #6b7280;">Location:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.propertyCity}, ${data.propertyState}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; color: #6b7280;">Budget Range:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.estimatedBudget || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280;">Timeline:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.projectTimeline || 'Not specified'}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 16px; color: #4b5563;">
      In the meantime, if you have any questions or need to provide additional information, please don't hesitate to reach out.
    </p>

<div style="background-color: #000; padding: 20px; border-radius: 6px; margin: 30px 0; text-align: center;">
  <p style="color: #fff; margin: 5px 0; font-size: 16px;"><strong>📞 (123) 456-7890</strong></p>
  <p style="color: #ccc; margin: 5px 0; font-size: 14px;">✉️ jch@joneslegacycreations.com</p>
</div>

    <p style="font-size: 16px; color: #4b5563; margin-top: 30px;">
      Best regards,<br>
      <strong style="color: #000;">The Jones Legacy Creations Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px;">
    <p style="margin: 5px 0;">Jones Legacy Creations</p>
    <p style="margin: 5px 0;">Hurricane, Utah • Serving Southern Utah</p>
    <p style="margin: 5px 0;">www.joneslegacycreations.com</p>
  </div>
</body>
</html>
`;

// Email template for business notification
const getBusinessEmail = (data: ConstructionFormData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #000; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">New Construction Form Submission</h1>
  </div>

  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #000; font-size: 20px; margin-top: 0;">Contact Information</h2>
    <table style="width: 100%; margin-bottom: 30px; background-color: #fff; padding: 20px; border-radius: 6px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Name:</td><td style="padding: 8px 0; font-weight: 600;">${data.fullName}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #000;">${data.email}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Phone:</td><td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #000;">${data.phone}</a></td></tr>
      ${data.company ? `<tr><td style="padding: 8px 0; color: #6b7280;">Company:</td><td style="padding: 8px 0;">${data.company}</td></tr>` : ''}
    </table>

    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Project Details</h2>
    <table style="width: 100%; margin-bottom: 30px; background-color: #fff; padding: 20px; border-radius: 6px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Project Category:</td><td style="padding: 8px 0; font-weight: 600;">${data.projectCategory || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Project Type:</td><td style="padding: 8px 0; font-weight: 600;">${data.projectType || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Location:</td><td style="padding: 8px 0;">${data.propertyAddress || ''} ${data.propertyCity}, ${data.propertyState} ${data.propertyZipCode || ''}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Property Ownership:</td><td style="padding: 8px 0;">${data.propertyOwnership || 'N/A'}</td></tr>
    </table>

    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Project Scope</h2>
    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <p style="margin: 0; white-space: pre-wrap;">${data.projectScope || 'No description provided'}</p>
    </div>

    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Budget & Timeline</h2>
    <table style="width: 100%; margin-bottom: 30px; background-color: #fff; padding: 20px; border-radius: 6px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Budget Range:</td><td style="padding: 8px 0; font-weight: 600;">${data.estimatedBudget || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Timeline:</td><td style="padding: 8px 0;">${data.projectTimeline || 'N/A'}</td></tr>
      ${data.startDate ? `<tr><td style="padding: 8px 0; color: #6b7280;">Preferred Start:</td><td style="padding: 8px 0;">${data.startDate}</td></tr>` : ''}
      ${data.completionDate ? `<tr><td style="padding: 8px 0; color: #6b7280;">Required Completion:</td><td style="padding: 8px 0;">${data.completionDate}</td></tr>` : ''}
    </table>

    ${data.additionalNotes ? `
    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Additional Notes</h2>
    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <p style="margin: 0; white-space: pre-wrap;">${data.additionalNotes}</p>
    </div>
    ` : ''}

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 30px;">
      <p style="margin: 0; color: #92400e;"><strong>Action Required:</strong> Follow up within 24-48 hours</p>
    </div>
  </div>
</body>
</html>
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Server-side validation with Zod
    const parseResult = constructionSubmissionSchema.safeParse(body);
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
      recaptchaAction: 'construction_form',
      honeypotValue: honeypot,
    });

    if (!spamCheck.passed) {
      console.log('Spam detected:', spamCheck.error);
      return NextResponse.json(
        { error: 'Unable to process request' },
        { status: 429 }
      );
    }

    // 3. Process form submission
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send confirmation email to client
    const clientEmailResult = await resend.emails.send({
      from: 'Jones Legacy Creations <noreply@joneslegacycreations.com>',
      to: data.email,
      subject: 'Thank You for Your Construction Inquiry',
      html: getClientEmail(data),
    });

    if (clientEmailResult.error) {
      console.error('Error sending client email:', clientEmailResult.error);
      return NextResponse.json({ error: clientEmailResult.error.message }, { status: 500 });
    }

    // Send notification email to business
    const businessEmailResult = await resend.emails.send({
      from: 'Jones Legacy Creations <noreply@joneslegacycreations.com>',
      to: 'jch@joneslegacycreations.com',
      subject: `New Construction Inquiry from ${data.fullName}`,
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
