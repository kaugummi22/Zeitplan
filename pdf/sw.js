// PDF-App: Dateien, die per Doppelklick geöffnet wurden, liegen kurz im Cache unter _open/
self.addEventListener('install',function(){self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',function(e){
  if(new URL(e.request.url).pathname.indexOf('/_open/')<0)return;
  e.respondWith(caches.open('pdf-open').then(function(c){return c.match(e.request.url).then(function(r){return r||new Response('',{status:404})})}));
});
