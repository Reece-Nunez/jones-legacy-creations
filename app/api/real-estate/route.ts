import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

interface RealEstateFormData {
  fullName: string;
  email: string;
  phone: string;
  serviceType?: string;
  propertyType?: string;
  preferredCity: string;
  preferredState: string;
  preferredZipCode?: string;
  budgetRange?: string;
  bedrooms?: string;
  bathrooms?: string;
  moveInTimeline?: string;
  mustHaveFeatures?: string;
  additionalNotes?: string;
}

const getClientEmail = (data: RealEstateFormData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #000; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 28px; font-family: Georgia, serif;">Jones Legacy Creations</h1>
    <p style="color: #ccc; margin: 10px 0 0 0;">Building Your Custom Dream Home</p>
  </div>

  <div style="background-color: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #000; font-size: 24px; margin-top: 0; font-family: Georgia, serif;">Thank You for Your Real Estate Inquiry!</h2>

    <p style="font-size: 16px; color: #4b5563;">Dear ${data.fullName},</p>

    <p style="font-size: 16px; color: #4b5563;">
      Thank you for your interest in building a custom home with Jones Legacy Creations! We're excited to help you create the home of your dreams with our flexible financing options.
    </p>

    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 30px 0; border-left: 4px solid #000;">
      <h3 style="margin-top: 0; color: #000; font-size: 18px;">💰 Remember Our Financing Advantage!</h3>
      <p style="color: #4b5563; margin: 10px 0;">
        With our specialized lenders, you can start building your custom home with just <strong style="color: #000;">3-6% down</strong> instead of the traditional 20%. This means more money in your pocket and the ability to build sooner!
      </p>
    </div>

    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 30px 0; border-left: 4px solid #000;">
      <h3 style="margin-top: 0; color: #000; font-size: 18px;">What Happens Next?</h3>
      <ul style="color: #4b5563; padding-left: 20px;">
        <li style="margin-bottom: 10px;">We'll review your property preferences within 24 hours</li>
        <li style="margin-bottom: 10px;">Schedule a consultation to discuss your vision</li>
        <li style="margin-bottom: 10px;">Connect you with our financing partners for pre-approval</li>
        <li style="margin-bottom: 10px;">Start designing your perfect custom home</li>
      </ul>
    </div>

    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <h3 style="margin-top: 0; color: #000; font-size: 18px;">Your Property Preferences</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; color: #6b7280; width: 40%;">Service Type:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.serviceType || 'Not specified'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; color: #6b7280;">Property Type:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.propertyType || 'Not specified'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; color: #6b7280;">Location:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.preferredCity}, ${data.preferredState}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; color: #6b7280;">Budget Range:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.budgetRange || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280;">Timeline:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.moveInTimeline || 'Not specified'}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 16px; color: #4b5563;">
      We look forward to helping you build your custom home. If you have any questions in the meantime, please don't hesitate to reach out.
    </p>

    <div style="background-color: #000; padding: 20px; border-radius: 6px; margin: 30px 0; text-align: center;">
      <p style="color: #fff; margin: 0 0 15px 0; font-weight: 600;">Contact Blake Jones</p>
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

const getBusinessEmail = (data: RealEstateFormData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #000; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">New Real Estate Form Submission</h1>
  </div>

  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #000; font-size: 20px; margin-top: 0;">Contact Information</h2>
    <table style="width: 100%; margin-bottom: 30px; background-color: #fff; padding: 20px; border-radius: 6px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Name:</td><td style="padding: 8px 0; font-weight: 600;">${data.fullName}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #000;">${data.email}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Phone:</td><td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #000;">${data.phone}</a></td></tr>
    </table>

    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Property Requirements</h2>
    <table style="width: 100%; margin-bottom: 30px; background-color: #fff; padding: 20px; border-radius: 6px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Service Type:</td><td style="padding: 8px 0; font-weight: 600;">${data.serviceType || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Property Type:</td><td style="padding: 8px 0; font-weight: 600;">${data.propertyType || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Location:</td><td style="padding: 8px 0;">${data.preferredCity}, ${data.preferredState} ${data.preferredZipCode || ''}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Budget Range:</td><td style="padding: 8px 0; font-weight: 600;">${data.budgetRange || 'Not specified'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Bedrooms:</td><td style="padding: 8px 0;">${data.bedrooms || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Bathrooms:</td><td style="padding: 8px 0;">${data.bathrooms || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Timeline:</td><td style="padding: 8px 0;">${data.moveInTimeline || 'N/A'}</td></tr>
    </table>

    ${data.mustHaveFeatures ? `
    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Must-Have Features</h2>
    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <p style="margin: 0; white-space: pre-wrap;">${data.mustHaveFeatures}</p>
    </div>
    ` : ''}

    ${data.additionalNotes ? `
    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Additional Notes</h2>
    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <p style="margin: 0; white-space: pre-wrap;">${data.additionalNotes}</p>
    </div>
    ` : ''}

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 30px;">
      <p style="margin: 0; color: #92400e;"><strong>Action Required:</strong> Follow up within 24 hours</p>
    </div>
  </div>
</body>
</html>
`;

export async function POST(request: Request) {
  try {
    const data = await request.json();

    await resend.emails.send({
      from: 'Jones Legacy Creations <noreply@joneslegacycreations.com>',
      to: data.email,
      subject: 'Thank You for Your Custom Home Inquiry',
      html: getClientEmail(data),
    });

    await resend.emails.send({
      from: 'Jones Legacy Creations <noreply@joneslegacycreations.com>',
      to: 'blakerealty@joneslegacycreations.com',
      subject: `New Real Estate Inquiry from ${data.fullName}`,
      html: getBusinessEmail(data),
      replyTo: data.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }
}
