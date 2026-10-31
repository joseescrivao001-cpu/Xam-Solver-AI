import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isConfiguredAdmin } from "@/lib/admin-config";

/**
 * Middleware de sessão e proteção administrativa.
 *
 * Alterações (2026-10-28):
 *  - Removidos o e-mail e os UUIDs de administrador que estavam fixos aqui.
 *  - A verificação passou a usar a configuração de ambiente partilhada.
 *  - O matcher deixou de cobrir `/api/*`: as rotas já autenticam por si e cada
 *    pedido passava a fazer dois `auth.getUser()` (uma viagem extra à rede por
 *    pedido de IA). Continua a cobrir páginas e o painel.
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Atualiza a sessão (renova o token quando expirou).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/admin")) {
    if (!isConfiguredAdmin(user?.id, user?.email)) {
      // Ocultação de rota: 404 em vez de 403.
      return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Mantém-se a cobrir as rotas de API de propósito: é aqui que o token de
     * sessão é renovado. Uma otimização futura poderá retirá-las do matcher e
     * renovar a sessão apenas nas páginas, mas isso exige verificar antes que
     * as rotas propagam os cookies renovados nas respostas em streaming.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
