import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proteger rigorosamente todas as rotas administrativas (/admin e sub-rotas)
  if (pathname.startsWith('/admin')) {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Blindagem por UUID Estático (ADMIN_USER_ID da Vercel)
    const DEFAULT_ADMIN_UUID = "07167607-a59a-48ce-a5b9-1dcc6f01f2f0";
    const configuredAdminId = process.env.ADMIN_USER_ID?.trim();
    const allowedAdminIds = configuredAdminId
      ? configuredAdminId.split(',').map((id) => id.trim()).filter(Boolean)
      : [DEFAULT_ADMIN_UUID];

    if (!allowedAdminIds.includes(DEFAULT_ADMIN_UUID)) {
      allowedAdminIds.push(DEFAULT_ADMIN_UUID);
    }

    const isMatchUuid = !!(user && allowedAdminIds.length > 0 && allowedAdminIds.includes(user.id));

    // Ocultação de Rota: se NÃO for o Admin secreto, retorna erro 404 (Não Encontrado)
    // O atacante nem saberá que a rota /admin existe no sistema
    if (!isMatchUuid) {
      return NextResponse.rewrite(new URL('/_not-found', request.url), {
        status: 404,
      });
    }

    // 2. Validação adicional de integridade no banco de dados
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_banned')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin || profile?.is_banned) {
      return NextResponse.rewrite(new URL('/_not-found', request.url), {
        status: 404,
      });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
