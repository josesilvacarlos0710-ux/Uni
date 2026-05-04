const CACHE_NAME = "ryzecompliance-cache-v1";
const URLS_TO_CACHE = [
  "index.html",
  "checklist.html",
  "Usuario.html",
  "teste.html",
  "conformidade.html",
  "login.html",
  "main.js",
  "Imag/drag logo.png"
];

// Instala e guarda em cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Ativa e remove caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Busca arquivos: cache primeiro, depois rede
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
