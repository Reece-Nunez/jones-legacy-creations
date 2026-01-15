import { NextResponse } from 'next/server';

export async function GET() {
  const resendApiKey = process.env.RESEND_API_KEY;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return NextResponse.json({
    resendApiKeyExists: !!resendApiKey,
    resendApiKeyLength: resendApiKey ? resendApiKey.length : 0,
    resendApiKeyPrefix: resendApiKey ? resendApiKey.substring(0, 3) : 'not set',
    gaIdExists: !!gaId,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
