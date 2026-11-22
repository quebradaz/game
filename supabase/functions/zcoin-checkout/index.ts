// Quebrada Z: o jogador compra um pacote de Z-Coin (com login, verify_jwt ligado).
//   { action: "create", pack: "saco" }                         -> { order, url }
//   { action: "confirm", order, transaction_nsu, slug, receipt_url } -> { status, zcoin? }
// "confirm" é o jogo pedindo para o servidor conferir ao voltar do checkout; quem confere é o servidor.
import { admin, confirm, createLink } from "../_shared/infinitepay.ts";

const ORIGINS = ["https://quebradaz.github.io", "http://localhost:8377", "http://localhost"];
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
  const out = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...h, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return out({ error: "METODO" }, 405);
  try {
    const db = admin();
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u, error: ue } = await db.auth.getUser(token);
    if (ue || !u?.user) return out({ error: "SEM_LOGIN" }, 401);
    const uid = u.user.id;
    const b = await req.json().catch(() => ({}));

    if (b.action === "create") {
      const { data: o, error } = await db.rpc("zc_order_open", { p_uid: uid, p_pack: String(b.pack || "") });
      if (error) return out({ error: error.message }, 400);
      const meta = u.user.user_metadata || {};
      const url = await createLink(o, { name: meta.full_name || meta.name, email: u.user.email });
      await db.rpc("zc_order_set_url", { p_order: o.order, p_url: url });
      return out({ order: o.order, url, zcoin: o.zcoin });
    }

    if (b.action === "confirm") {
      const order = String(b.order || "");
      // só confere pedido da própria conta
      const { data: row } = await db.from("zc_orders").select("user_id,status,zcoin").eq("id", order).maybeSingle();
      if (!row || row.user_id !== uid) return out({ status: "unknown" });
      if (row.status === "paid") return out({ status: "paid", zcoin: row.zcoin, already: true });
      if (!b.transaction_nsu || !b.slug) return out({ status: row.status });
      const r = await confirm(order, String(b.transaction_nsu), String(b.slug), b.receipt_url ? String(b.receipt_url) : null, "jogo");
      return out(r);
    }
    return out({ error: "ACAO_INVALIDA" }, 400);
  } catch (e) {
    console.error(e);
    return out({ error: (e as Error).message === "CHECKOUT_FALHOU" ? "CHECKOUT_FALHOU" : "FALHOU" }, 500);
  }
});
