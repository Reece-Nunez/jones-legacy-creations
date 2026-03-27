import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Get the current user (the person creating the task)
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...body, project_id: id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Send email notification if task is assigned to someone
  if (body.assigned_to && process.env.RESEND_API_KEY) {
    // Get project name for the email
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", id)
      .single();

    const projectName = project?.name || "a project";
    const assignerName = user?.user_metadata?.full_name || user?.email || "Someone";
    const dueDateStr = body.due_date
      ? new Date(body.due_date + "T00:00:00").toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: "noreply@joneslegacycreations.com",
        to: body.assigned_to,
        subject: `New Task Assigned: ${body.title}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #000; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 28px; font-family: Georgia, serif;">Jones Legacy Creations</h1>
    <p style="color: #ccc; margin: 10px 0 0 0;">Task Assignment</p>
  </div>

  <div style="background-color: #f9fafb; padding: 40px 30px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #000; font-size: 22px; margin-top: 0; font-family: Georgia, serif;">You've Been Assigned a Task</h2>

    <p style="font-size: 16px; color: #4b5563;">
      <strong>${assignerName}</strong> assigned you a task on <strong>${projectName}</strong>:
    </p>

    <div style="background-color: #fff; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #000;">
      <p style="font-size: 18px; font-weight: 600; color: #111; margin: 0 0 8px 0;">${body.title}</p>
      ${dueDateStr ? `<p style="font-size: 14px; color: #6b7280; margin: 0;">Due: ${dueDateStr}</p>` : ""}
    </div>

    <p style="font-size: 14px; color: #6b7280;">
      Log in to the admin dashboard to view and complete this task.
    </p>
  </div>

  <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 30px;">
    Jones Legacy Creations &bull; Building Legacies, One Project at a Time
  </p>
</body>
</html>`,
      });
    } catch (emailErr) {
      // Log but don't fail the request if email fails
      console.error("Failed to send task assignment email:", emailErr);
    }
  }

  return NextResponse.json(data, { status: 201 });
}
