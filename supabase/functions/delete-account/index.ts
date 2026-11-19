// Quebrada Z: o jogador apaga a propria conta (exigido pela Google Play).
// Apaga o usuario do Auth; perfil, progresso, estatisticas, partidas e ranking saem em cascata.
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGINS = ["https://quebradaz.github.io", "http://localhost:8377"];
function cors(req: Request) {
  const o = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return new Response("metodo", { status: 405, headers: h });
  const url = Deno.env.get("SUPABASE_URL")!;
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return new Response(JSON.stringify({ ok: false, error: "SEM_LOGIN" }), { status: 401, headers: { ...h, "Content-Type": "application/json" } });
  const del = await admin.auth.admin.deleteUser(data.user.id);
  if (del.error) return new Response(JSON.stringify({ ok: false, error: "FALHOU" }), { status: 500, headers: { ...h, "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ ok: true }), { headers: { ...h, "Content-Type": "application/json" } });
});
