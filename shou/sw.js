const CACHE="shou-offline-v3";
const CORE=["./","./index.html","./style.css?v=4","./safety.css?v=2","./app.js?v=7","./manifest.webmanifest?v=1"];
const INDEX=new URL("./index.html",self.location.href).href;

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith("shou-offline-")).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin)return;
  if(request.mode==="navigate"){
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error("network timeout")),4000));
    event.respondWith(Promise.race([fetch(request).then(response=>{
      if(response.ok)caches.open(CACHE).then(cache=>cache.put(INDEX,response.clone()));
      return response;
    }),timeout]).catch(()=>caches.match(INDEX).then(cached=>cached||caches.match("./"))));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>{
    const fresh=fetch(request).then(response=>{
      if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
      return response;
    }).catch(()=>cached);
    return cached||fresh;
  }));
});
