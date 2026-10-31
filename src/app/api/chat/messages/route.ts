import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isUuid, ownsConversation } from "@/lib/access";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/messages?conversation_id=... — mensagens de uma conversa.
 *
 * Correção de segurança (2026-10-28): a consulta anterior filtrava apenas por
 * `conversation_id`, usando o cliente `service_role` (que ignora RLS). Qualquer
 * utilizador autenticado podia ler a conversa de outro se conhecesse o id.
 * Passa a validar a propriedade antes de devolver qualquer mensagem.
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ messages: [] }, { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversation_id");

    if (!isUuid(conversationId) || conversationId === "guest") {
      return NextResponse.json({ messages: [] });
    }

    const db = createServiceClient() || supabase;

    if (!(await ownsConversation(db, conversationId, user.id))) {
      // 404 deliberado: não confirmar a existência da conversa a terceiros.
      return NextResponse.json({ messages: [] }, { status: 404 });
    }

    const { data: messages, error } = await db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[MESSAGES_GET_ERROR]", error.message);
      return NextResponse.json({ messages: [] }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    console.error("[MESSAGES_GET_FATAL]", err);
    return NextResponse.json({ messages: [] }, { status: 500 });
  }
}
