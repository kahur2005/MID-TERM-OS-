const http = require('http');
const os = require('os');

const PORT = process.env.PORT || 8080;
const SERVICE_NAME = process.env.SERVICE_NAME || os.hostname();

const server = http.createServer((req, res) => {
  const body = JSON.stringify({
    service: SERVICE_NAME,
    hostname: os.hostname(),
    path: req.url,
    method: req.method,
    time: new Date().toISOString(),
    message: 'Hello from Mini Cloud!'
  }, null, 2);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(body);
});

server.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Hello service running on port ${PORT}`);
});
