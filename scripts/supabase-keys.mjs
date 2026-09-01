/**
 * Gera o trio de chaves que o stack Supabase local exige.
 *
 * O `anon` e o `service_role` não são chaves aleatórias: são JWTs HS256
 * assinados com o `JWT_SECRET`. GoTrue, PostgREST e Storage validam a
 * assinatura, então os três valores precisam ser gerados juntos — trocar o
 * segredo sem regerar as chaves derruba a autenticação inteira.
 *
 * Uso:  node scripts/supabase-keys.mjs [segredo]
 */
import { createHmac, randomBytes } from "node:crypto";

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function sign(payload, secret) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${body}.${signature}`;
}

const secret = process.argv[2] ?? randomBytes(32).toString("hex");
if (secret.length < 32) {
  console.error("O segredo precisa ter ao menos 32 caracteres.");
  process.exit(1);
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 anos: é um ambiente local
const claims = (role) => ({ role, iss: "supabase-docker", iat, exp });

console.log(`JWT_SECRET=${secret}`);
console.log(`ANON_KEY=${sign(claims("anon"), secret)}`);
console.log(`SERVICE_ROLE_KEY=${sign(claims("service_role"), secret)}`);
