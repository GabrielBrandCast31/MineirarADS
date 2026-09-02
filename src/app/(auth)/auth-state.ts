/**
 * Estado do formulário de autenticação.
 *
 * Vive fora de `actions.ts` porque aquele módulo é `"use server"`: lá só podem
 * existir exports de funções async. Exportar a constante de dentro dele fazia
 * o Next tratá-la como server reference e derrubar *toda* invocação de action
 * do módulo com `invalid-use-server-value` — ou seja, o login inteiro.
 */

export interface AuthState {
  error: string | null;
  notice: string | null;
}

export const EMPTY_AUTH_STATE: AuthState = { error: null, notice: null };
