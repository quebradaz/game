/* Quebrada Z. Todos os direitos reservados.
   Service worker: guarda o jogo no aparelho. Sempre tenta a rede primeiro (o GitHub responde 304 se nada mudou,
   sem baixar de novo); sem internet, abre a última versão guardada. Só arquivos deste endereço. */
const CACHE = "qz-v29.2.1";
const BASE = ["./", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./audio/trilha.mp3", "./audio/ambiente.mp3"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  const nav = r.mode === "navigate";
  e.respondWith(fetch(r).then((res) => {
    if (res.ok && (nav || /\.(png|webp|mp3|webmanifest|html)$/.test(u.pathname))) {
      const cp = res.clone();
      caches.open(CACHE).then((c) => c.put(r, cp));
    }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || (nav ? caches.match("./") : Response.error()))));
});
