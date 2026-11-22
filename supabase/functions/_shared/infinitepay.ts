// Quebrada Z: conversa com a API do checkout integrado da InfinitePay (só no servidor).
// Configuração (Supabase > Edge Functions > Secrets sobrepõe os padrões abaixo):
//   INFINITEPAY_HANDLE   InfiniteTag da conta, sem o "$" (pública; padrão "norduk")
//   GAME_URL             endereço do jogo para a volta do checkout (padrão https://quebradaz.github.io/game/)
//   INFINITEPAY_API_KEY  opcional, chave "inchk_..." (segredo; só se a conta exigir no /payment_check)
// O token do endereço do webhook é derivado da chave de serviço (nunca sai do servidor). Ele só filtra ruído:
// a prova do pagamento é sempre o /payment_check.
import { createClient } from "npm:@supabase/supabase-js@2";

export const API = "https://api.checkout.infinitepay.io";

const DEFAULTS: Record<string, string> = {
  INFINITEPAY_HANDLE: "norduk",
  GAME_URL: "https://quebradaz.github.io/game/",
};

export function env(k: string, req = true): string {
  const v = Deno.env.get(k) || DEFAULTS[k] || "";
  if (req && !v) throw new Error("FALTA_" + k);
  return v;
}

export async function webhookToken(): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("qz-zcoin-webhook:" + env("SUPABASE_SERVICE_ROLE_KEY")));
  return Array.from(new Uint8Array(d)).slice(0, 20).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function admin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
}

function ipHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const k = env("INFINITEPAY_API_KEY", false);
  if (k) h["X-Api-Key"] = k;
  return h;
}

// cria o link de pagamento; o preço vem do pedido aberto no banco, nunca do aparelho
export async function createLink(o: { order: string; price_cents: number; description: string }, buyer?: { name?: string; email?: string }) {
  const fnBase = env("SUPABASE_URL") + "/functions/v1";
  const body: Record<string, unknown> = {
    handle: env("INFINITEPAY_HANDLE"),
    items: [{ quantity: 1, price: o.price_cents, description: o.description }],
    order_nsu: o.order,
    redirect_url: env("GAME_URL") + (env("GAME_URL").includes("?") ? "&" : "?") + "zcpay=1",
    webhook_url: fnBase + "/zcoin-webhook?k=" + (await webhookToken()),
  };
  if (buyer && (buyer.name || buyer.email)) body.customer = { name: buyer.name || undefined, email: buyer.email || undefined };
  const r = await fetch(API + "/links", { method: "POST", headers: ipHeaders(), body: JSON.stringify(body) });
  const t = await r.text();
  let j: Record<string, unknown> = {};
  try { j = JSON.parse(t); } catch { /* texto */ }
  // o nome do campo não está escrito na documentação; aceita os conhecidos
  const url = (j.checkout_url || j.url || j.link || (j.data as Record<string, unknown> | undefined)?.url) as string | undefined;
  if (!r.ok || !url || !/^https:\/\/([a-z0-9-]+\.)*infinitepay\.io\//i.test(url)) {
    console.error("links", r.status, t.slice(0, 400));
    throw new Error("CHECKOUT_FALHOU");
  }
  return url;
}

// pergunta à InfinitePay se o pagamento existe e está pago
export async function paymentCheck(order: string, tx: string, slug: string) {
  const r = await fetch(API + "/payment_check", {
    method: "POST", headers: ipHeaders(),
    body: JSON.stringify({ handle: env("INFINITEPAY_HANDLE"), order_nsu: order, transaction_nsu: tx, slug }),
  });
  const t = await r.text();
  let j: Record<string, unknown> = {};
  try { j = JSON.parse(t); } catch { /* texto */ }
  if (!r.ok) console.error("payment_check", r.status, t.slice(0, 400));
  return {
    paid: r.ok && j.success === true && j.paid === true,
    amount: typeof j.amount === "number" ? j.amount : null,
    paid_amount: typeof j.paid_amount === "number" ? j.paid_amount : null,
    capture_method: typeof j.capture_method === "string" ? j.capture_method : null,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE = /^[A-Za-z0-9._:-]{3,120}$/;

// confirma e credita. via = "webhook" ou "jogo". Devolve o estado final do pedido.
export async function confirm(order: string, tx: string, slug: string, receipt: string | null, via: string) {
  if (!UUID.test(order) || !SAFE.test(tx) || !SAFE.test(slug)) return { status: "invalid" };
  const db = admin();
  const chk = await paymentCheck(order, tx, slug);
  if (!chk.paid) return { status: "pending" };
  const { data, error } = await db.rpc("zc_order_pay", {
    p_order: order, p_tx: tx, p_slug: slug, p_amount: chk.amount, p_paid_amount: chk.paid_amount,
    p_method: chk.capture_method, p_receipt: receipt && /^https:\/\//.test(receipt) ? receipt.slice(0, 500) : null, p_via: via,
  });
  if (error) {
    console.error("zc_order_pay", order, error.message);
    return { status: "failed", error: error.message };
  }
  const d = data as Record<string, unknown>;
  if (!d || d.ok !== true) return { status: "failed", error: String(d && d.error || "FALHOU") };
  return { status: "paid", ...d };
}
