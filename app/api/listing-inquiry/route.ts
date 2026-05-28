/**
 * POST /api/listing-inquiry
 *
 * Single-listing inquiry from the public detail page. Same dual-write
 * pattern as the other public form routes — captureLead() first, then
 * Resend the notification. Source is 'real_estate' so triage on
 * /admin/leads aggregates listing-specific inquiries with the broader
 * real-estate intake form.
 */

import { Resend } from "resend";
import { NextResponse } from "next/server";
import { checkSpamProtection } from "@/lib/spam-protection";
import { listingInquirySubmissionSchema } from "@/lib/schemas/listing-inquiry";
import { captureLead } from "@/lib/leads/capture";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parseResult = listingInquirySubmissionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { recaptchaToken, honeypot, ...data } = parseResult.data;

    const spamCheck = await checkSpamProtection({
      request,
      recaptchaToken,
      recaptchaAction: "listing_inquiry",
      honeypotValue: honeypot,
      contentCheck: {
        name: data.fullName,
        message: data.message,
        minMessageWords: 2,
      },
    });

    if (!spamCheck.passed) {
      return NextResponse.json(
        { error: "Unable to process request" },
        { status: 429 },
      );
    }

    // Persist BEFORE Resend. Subject pre-populated with the listing
    // address so /admin/leads is scannable.
    const captured = await captureLead({
      source: "real_estate",
      request,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      subject: `Listing inquiry: ${data.listingAddress}`,
      message: data.message,
      rawPayload: data as unknown as Record<string, unknown>,
    });

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: true, leadId: captured?.id ?? null });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Client confirmation
    await resend.emails.send({
      from: "Blake Jones Realty <noreply@joneslegacycreations.com>",
      to: data.email,
      subject: `Thanks — we'll be in touch about ${data.listingAddress}`,
      html: `
        <p>Hi ${data.fullName},</p>
        <p>Thanks for reaching out about <strong>${data.listingAddress}</strong>.
           Blake will follow up within 24 hours.</p>
        <p>If it's urgent, give us a call at <a href="tel:+14352889807">(435) 288-9807</a>.</p>
        <p>— Blake Jones Realty</p>
      `,
    });

    // Internal notification
    await resend.emails.send({
      from: "Blake Jones Realty <noreply@joneslegacycreations.com>",
      to: "office@joneslegacycreations.com",
      subject: `New listing inquiry: ${data.listingAddress}`,
      replyTo: data.email,
      html: `
        <h2>New listing inquiry</h2>
        <p><strong>Listing:</strong> ${data.listingAddress}</p>
        <p><strong>Name:</strong> ${data.fullName}</p>
        <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
        <p><strong>Phone:</strong> <a href="tel:${data.phone}">${data.phone}</a></p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${data.message}</p>
      `,
    });

    return NextResponse.json({ success: true, leadId: captured?.id ?? null });
  } catch (error) {
    console.error("Listing inquiry error:", error);
    return NextResponse.json(
      { error: "Failed to process inquiry" },
      { status: 500 },
    );
  }
}
