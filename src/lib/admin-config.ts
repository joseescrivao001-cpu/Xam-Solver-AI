/**
 * Configuração de administradores — sem dependências de Next.js ou Supabase,
 * para poder ser usada tanto no middleware (Edge) como nas rotas (Node).
 *
 * Nenhum identificador administrativo vive no código: tudo vem do ambiente.
 * Falha fechada — sem configuração, ninguém é administrador.
 */

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function adminUserIds(): string[] {
  return parseList(process.env.ADMIN_USER_ID);
}

export function adminEmails(): string[] {
  return [...parseList(process.env.ADMIN_EMAILS), ...parseList(process.env.ADMIN_EMAIL)];
}

export function isConfiguredAdmin(
  userId?: string | null,
  userEmail?: string | null
): boolean {
  const ids = adminUserIds();
  const emails = adminEmails();

  if (ids.length === 0 && emails.length === 0) {
    console.error(
      "[ADMIN_CONFIG] ADMIN_USER_ID / ADMIN_EMAILS não configurados. " +
        "Acesso administrativo negado a todos (falha fechada)."
    );
    return false;
  }

  if (userId && ids.includes(userId.toLowerCase())) return true;
  if (userEmail && emails.includes(userEmail.toLowerCase().trim())) return true;

  return false;
}
