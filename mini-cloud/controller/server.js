const http    = require('http');
const express = require('express');

const instanceRoutes = require('./routes/instances');
const metricsRoutes  = require('./routes/metrics');
const proxyMgr       = require('./lib/proxy-manager');
const healthMonitor  = require('./lib/health-monitor');
const store          = require('./lib/state-store');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ── API ────────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  const all = store.all();
  res.json({
    status:  'ok',
    uptime:  `${process.uptime().toFixed(0)}s`,
    total:   all.length,
    running: all.filter(i => i.status === 'running').length,
    failed:  all.filter(i => i.status === 'failed').length
  });
});

app.use('/api/instances', instanceRoutes);
app.use('/api/metrics',   metricsRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'Mini Cloud Controller',
    version: '1.0.0',
    endpoints: {
      'GET  /api/health':                'System health',
      'GET  /api/instances':             'List all instances',
      'POST /api/instances':             'Create & start an instance',
      'GET  /api/instances/:id':         'Get instance details',
      'DELETE /api/instances/:id':       'Stop & remove an instance',
      'POST /api/instances/:id/restart': 'Restart an instance',
      'GET  /api/metrics':               'Host + cluster metrics',
      'GET  /api/metrics/:id':           'Per-instance CPU/memory stats',
      'ANY  /proxy/:id/*':               'Reverse-proxy to a running instance'
    }
  });
});

// ── Reverse proxy ──────────────────────────────────────────────────────────
// Routes /proxy/:id/* → http://mini-cloud-<id>:<containerPort>

function handleProxy(req, res) {
  const id     = req.params.id;
  const target = proxyMgr.routes.get(id);

  if (!target) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: `Service '${id}' not found or not running` }));
  }

  // Strip the /proxy/:id prefix so the upstream sees the real path
  req.url = req.url.replace(`/proxy/${id}`, '') || '/';
  proxyMgr.proxy.web(req, res, { target });
}

app.all('/proxy/:id',   handleProxy);
app.all('/proxy/:id/*', handleProxy);

// ── Boot ───────────────────────────────────────────────────────────────────

// Re-register proxy routes that survived a controller restart
for (const inst of store.all().filter(i => i.status === 'running' && i.containerName)) {
  proxyMgr.register(inst.id, `http://${inst.containerName}:${inst.containerPort}`);
}

const server = http.createServer(app);
healthMonitor.start();

server.listen(PORT, () => {
  console.log(`[Controller] Listening on :${PORT}`);
});

process.on('SIGTERM', () => {
  healthMonitor.stop();
  server.close(() => process.exit(0));
});

process.on('uncaughtException',  err => console.error('[Fatal]', err.message));
process.on('unhandledRejection', err => console.error('[Fatal]', err));
