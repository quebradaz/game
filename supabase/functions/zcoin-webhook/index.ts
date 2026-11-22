// Quebrada Z: aviso de pagamento da InfinitePay (verify_jwt desligado: quem chama é a InfinitePay).
// O aviso não tem assinatura, então ele só serve de gatilho: o crédito sai depois que o servidor
// confirma em /payment_check (ver _shared/infinitepay.ts). Responde rápido; fora de 2xx a InfinitePay reenvia.
import { confirm, webhookToken } from "../_shared/infinitepay.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("metodo", { status: 405 });
  const k = new URL(req.url).searchParams.get("k") || "";
  if (!k || k !== await webhookToken()) return new Response("x", { status: 401 });
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b) return new Response("corpo", { status: 400 });
  const order = String(b.order_nsu || ""), tx = String(b.transaction_nsu || ""), slug = String(b.invoice_slug || b.slug || "");
  try {
    const r = await confirm(order, tx, slug, b.receipt_url ? String(b.receipt_url) : null, "webhook");
    console.log("webhook", order, r.status);
    // pago, inválido ou recusado: 200 (não adianta reenviar). Ainda pendente ou erro nosso: 400 para a InfinitePay tentar de novo.
    if (r.status === "paid" || r.status === "invalid" || (r.status === "failed" && /VALOR|OUTRO_PEDIDO|NAO_ENCONTRADO/.test(String((r as { error?: string }).error)))) return new Response("ok", { status: 200 });
    return new Response("pendente", { status: 400 });
  } catch (e) {
    console.error(e);
    return new Response("erro", { status: 400 });
  }
});
