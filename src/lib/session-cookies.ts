/**
 * Nomes dos cookies de sessão.
 *
 * Vivem num módulo próprio porque são lidos em dois mundos que não podem
 * importar um ao outro: o middleware (Edge) e `@/server/auth` (Node, com
 * `next/headers`). Duplicar as strings seria um bug esperando para acontecer.
 */

/** Sessão do modo demonstração (quando não há Supabase configurado). */
export const DEMO_SESSION_COOKIE = "adminer_demo_session";

/** Workspace ativo — usado quando o usuário participa de mais de um. */
export const WORKSPACE_COOKIE = "adminer_workspace";
