import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

interface DesignFormData {
  fullName: string;
  email: string;
  phone: string;
  serviceType?: string;
  propertyAddress?: string;
  propertyCity: string;
  propertyState: string;
  propertyZipCode?: string;
  squareFootage?: string;
  numberOfRooms?: string;
  projectDescription?: string;
  estimatedBudget?: string;
  projectTimeline?: string;
  stylePreference?: string;
  colorPreferences?: string;
  additionalNotes?: string;
}

const getClientEmail = (data: DesignFormData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #000; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 28px; font-family: Georgia, serif;">Jones Legacy Creations</h1>
    <p style="color: #ccc; margin: 10px 0 0 0;">Interior Design & Home Staging</p>
  </div>

  <div style="background-color: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #000; font-size: 24px; margin-top: 0; font-family: Georgia, serif;">Thank You for Your Design Inquiry!</h2>

    <p style="font-size: 16px; color: #4b5563;">Dear ${data.fullName},</p>

    <p style="font-size: 16px; color: #4b5563;">
      Thank you for reaching out about our ${data.serviceType === 'interior-design' ? 'interior design' : data.serviceType === 'home-staging' ? 'home staging' : 'design'} services! We're excited to help transform your space.
    </p>

    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 30px 0; border-left: 4px solid #000;">
      <h3 style="margin-top: 0; color: #000; font-size: 18px;">What Happens Next?</h3>
      <ul style="color: #4b5563; padding-left: 20px;">
        <li style="margin-bottom: 10px;">Our designer Hilari will review your project details within 24 hours</li>
        <li style="margin-bottom: 10px;">We'll schedule an initial consultation to discuss your vision</li>
        <li style="margin-bottom: 10px;">Create a custom design plan tailored to your style and budget</li>
        <li style="margin-bottom: 10px;">Begin transforming your space into something beautiful</li>
      </ul>
    </div>

    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <h3 style="margin-top: 0; color: #000; font-size: 18px;">Your Project Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; color: #6b7280; width: 40%;">Service:</td>
          <td style="padding: 10px 0; color: #000; font-weight: 500;">${data.serviceType || 'Not specified'}</td>
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
      In the meantime, feel free to browse our portfolio on Instagram for inspiration and recent projects!
    </p>

    <div style="background-color: #000; padding: 20px; border-radius: 6px; margin: 30px 0; text-align: center;">
      <p style="color: #fff; margin: 0 0 15px 0; font-weight: 600;">Contact Hilari Jones</p>
  <p style="color: #ccc; margin: 5px 0; font-size: 14px;">📞 (801) 735-7089</p>
  <p style="color: #ccc; margin: 5px 0; font-size: 14px;">✉️ interiors@joneslegacycreations.com</p>
  <a href="https://www.instagram.com/interiors.by.jch/" style="color: #fff; text-decoration: none; font-size: 14px;">@interiors.by.jch</a>
</div>

    <p style="font-size: 16px; color: #4b5563; margin-top: 30px;">
      Best regards,<br>
      <strong style="color: #000;">Hilari Jones & The Jones Legacy Creations Team</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px;">
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px;">
    <p style="margin: 5px 0;">Jones Legacy Creations</p>
    <p style="margin: 5px 0;">Hurricane, Utah • Serving Southern Utah</p>
    <p style="margin: 5px 0;">www.joneslegacycreations.com</p>
  </div>
</body>
</html>
`;

const getBusinessEmail = (data: DesignFormData) => `
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #000; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">New Design Form Submission</h1>
  </div>

  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #000; font-size: 20px; margin-top: 0;">Contact Information</h2>
    <table style="width: 100%; margin-bottom: 30px; background-color: #fff; padding: 20px; border-radius: 6px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Name:</td><td style="padding: 8px 0; font-weight: 600;">${data.fullName}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #000;">${data.email}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Phone:</td><td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #000;">${data.phone}</a></td></tr>
    </table>

    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Project Details</h2>
    <table style="width: 100%; margin-bottom: 30px; background-color: #fff; padding: 20px; border-radius: 6px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Service Type:</td><td style="padding: 8px 0; font-weight: 600;">${data.serviceType || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Location:</td><td style="padding: 8px 0;">${data.propertyAddress || ''} ${data.propertyCity}, ${data.propertyState} ${data.propertyZipCode || ''}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Square Footage:</td><td style="padding: 8px 0;">${data.squareFootage || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Number of Rooms:</td><td style="padding: 8px 0;">${data.numberOfRooms || 'N/A'}</td></tr>
    </table>

    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Project Description</h2>
    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <p style="margin: 0; white-space: pre-wrap;">${data.projectDescription || 'No description provided'}</p>
    </div>

    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Budget & Timeline</h2>
    <table style="width: 100%; margin-bottom: 30px; background-color: #fff; padding: 20px; border-radius: 6px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Budget Range:</td><td style="padding: 8px 0; font-weight: 600;">${data.estimatedBudget || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Timeline:</td><td style="padding: 8px 0;">${data.projectTimeline || 'N/A'}</td></tr>
    </table>

    ${data.stylePreference ? `
    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Style Preferences</h2>
    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <p style="margin: 0;"><strong>Preferred Style:</strong> ${data.stylePreference}</p>
      ${data.colorPreferences ? `<p style="margin: 10px 0 0 0;"><strong>Color Preferences:</strong> ${data.colorPreferences}</p>` : ''}
    </div>
    ` : ''}

    ${data.additionalNotes ? `
    <h2 style="color: #000; font-size: 20px; margin-top: 30px;">Additional Notes</h2>
    <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
      <p style="margin: 0; white-space: pre-wrap;">${data.additionalNotes}</p>
    </div>
    ` : ''}

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 30px;">
      <p style="margin: 0; color: #92400e;"><strong>Action Required:</strong> Hilari should follow up within 24 hours</p>
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
      subject: 'Thank You for Your Design Inquiry',
      html: getClientEmail(data),
    });

    await resend.emails.send({
      from: 'Jones Legacy Creations <noreply@joneslegacycreations.com>',
      to: 'interiors@joneslegacycreations.com',
      subject: `New Design Inquiry from ${data.fullName}`,
      html: getBusinessEmail(data),
      replyTo: data.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
  }
}
