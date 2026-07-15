const CACHE_NAME='encartebrasil-v1';
const STATIC=['/','/manifest.json','/icon-192.png','/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(STATIC)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const{request:r}=e;const u=new URL(r.url);if(r.method!=='GET'||!u.protocol.startsWith('http'))return;if(u.pathname.startsWith('/api/'))return;if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{caches.open(CACHE_NAME).then(c=>c.put(r,res.clone()));return res}).catch(()=>caches.match(r).then(c=>c||caches.match('/'))));return}
if(u.pathname.startsWith('/_next/')||u.pathname.endsWith('.png')||u.pathname.endsWith('.js')||u.pathname.endsWith('.css')){e.respondWith(caches.open(CACHE_NAME).then(c=>c.match(r).then(cached=>{const fp=fetch(r).then(res=>{c.put(r,res.clone());return res}).catch(()=>cached);return cached||fp})));return}});
