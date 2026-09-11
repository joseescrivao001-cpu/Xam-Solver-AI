import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/chat/messages?conversation_id=... - Buscar mensagens da conversa
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ messages: [] });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversation_id");
    if (!conversationId || conversationId === "guest") {
      return NextResponse.json({ messages: [] });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    // Buscar mensagens ordenadas cronologicamente
    const { data: messages, error } = await db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[MESSAGES_GET_ERROR]", error);
      return NextResponse.json({ messages: [] });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    console.error("[MESSAGES_GET_FATAL]", err);
    return NextResponse.json({ messages: [] });
  }
}
