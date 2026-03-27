import { NextResponse } from "next/server";

// Map email prefixes to display names for known team members
const NAME_OVERRIDES: Record<string, string> = {
  jch: "Blake",
  office: "Jess",
};

function nameFromEmail(email: string): string {
  const local = email.split("@")[0];

  // Check for known overrides
  if (NAME_OVERRIDES[local.toLowerCase()]) {
    return NAME_OVERRIDES[local.toLowerCase()];
  }

  // Handle formats like "first.last", "first_last", or just "first"
  return local
    .split(/[._]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export async function GET() {
  const emails = (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const team = emails.map((email) => ({
    email,
    name: nameFromEmail(email),
  }));

  return NextResponse.json(team);
}
