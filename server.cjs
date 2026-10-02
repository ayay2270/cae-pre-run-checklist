// Dependency-free local static server. No data is sent to a remote service.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.PORT || 3210);
const allowed = new Set(['index.html', 'styles.css', 'app.js', 'model.js']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (!allowed.has(file)) { res.writeHead(404); res.end('Not found'); return; }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Method not allowed'); return; }
  fs.readFile(path.join(__dirname, file), (error, data) => {
    if (error) { res.writeHead(500); res.end('Cannot read local app'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. If this app is running, open http://localhost:${port}. Otherwise choose another PORT.` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`CAE Pre-Run Checklist ready: http://localhost:${port}`));
