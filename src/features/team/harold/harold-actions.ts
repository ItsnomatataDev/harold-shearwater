"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const SendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1),
});

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, any>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

function extractTaskRequest(
  message: string,
): { title: string; description: string } | null {
  const patterns = [
    /create a task[:\s]+(.*?)(?:\s+with details?[:\s]+(.*?))?$/i,
    /add task[:\s]+(.*?)(?:\s+description?[:\s]+(.*?))?$/i,
    /new task[:\s]+(.*?)(?:,\s*(.*?))?$/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        title: match[1]?.trim() || "Untitled",
        description: match[2]?.trim() || "",
      };
    }
  }

  return null;
}

export async function sendHaroldMessage(
  organizationId: string,
  input: Record<string, any>,
) {
  const parsed = SendMessageSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  let conversationId = parsed.conversationId;

  // Create new conversation if needed
  if (!conversationId) {
    const { data: conversation, error: convError } = await (supabase
      .from("harold_conversations" as any)
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        title: parsed.message.substring(0, 50),
      })
      .select("id")
      .single() as any);

    if (convError) throw convError;
    conversationId = conversation.id;
  }

  // Store user message
  const { data: userMsg, error: userMsgError } = await (supabase
    .from("harold_messages" as any)
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: parsed.message,
    })
    .select("id")
    .single() as any);

  if (userMsgError) throw userMsgError;

  // Prepare assistant response
  let assistantResponse = "";
  let createdTaskId: string | null = null;

  // Check for task creation request
  const taskRequest = extractTaskRequest(parsed.message);
  if (taskRequest) {
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        organization_id: organizationId,
        title: taskRequest.title,
        description: taskRequest.description,
        priority: "medium",
        created_by: user.id,
        status: "open",
      })
      .select("id")
      .single();

    if (taskError) {
      assistantResponse = `I couldn't create that task: ${taskError.message}`;
    } else {
      createdTaskId = task.id;
      assistantResponse = `Task created: "${taskRequest.title}". I've added it to your Operations list with medium priority.`;
      await logAudit(
        supabase,
        organizationId,
        "harold.task_created",
        "tasks",
        task.id,
        {
          message: parsed.message,
        },
      );
    }
  } else {
    // Default assistant response for non-task messages
    const messageContent = parsed.message.toLowerCase();
    if (messageContent.includes("hello") || messageContent.includes("hi")) {
      assistantResponse = `Hello! I'm Harold, your Shearwater AI assistant. I can help you manage tasks, answer questions about your team, and streamline operations. What can I help you with?`;
    } else if (messageContent.includes("help")) {
      assistantResponse = `I can help you with:\n• Create tasks: "Create a task: Fix the booking system"\n• Answer questions about your team and operations\n• Summarize recent activities\n• Find team members and their availability\n\nWhat would you like to do?`;
    } else {
      assistantResponse = `I understand you said: "${parsed.message}". I'm currently focused on task management and team operations. Try asking me to create a task, or let me know how I can help your team work more effectively.`;
    }
  }

  // Store assistant message
  // @ts-ignore - harold_messages table not in Supabase types yet
  const { data: assistantMsg, error: assistantMsgError } = await (supabase
    .from("harold_messages" as any)
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: assistantResponse,
    })
    .select("id")
    .single() as any);

  if (assistantMsgError) throw assistantMsgError;

  await logAudit(
    supabase,
    organizationId,
    "harold.message_sent",
    "harold_messages",
    assistantMsg.id,
    {
      conversationId,
      createdTaskId,
    },
  );

  return {
    success: true,
    conversationId,
    messageId: userMsg.id,
    assistantResponse,
    createdTaskId,
  };
}
