const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({ changeOrigin: true, proxyTimeout: 10000 });

proxy.on('error', (err, req, res) => {
  if (res.headersSent) return;
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
});

// id -> target URL  e.g.  "abc123" -> "http://mini-cloud-abc123:8080"
const routes = new Map();

module.exports = {
  proxy,
  routes,
  register:   (id, target) => { routes.set(id, target); console.log(`[Proxy] Registered ${id} → ${target}`); },
  unregister: (id) => { routes.delete(id); console.log(`[Proxy] Removed ${id}`); }
};
