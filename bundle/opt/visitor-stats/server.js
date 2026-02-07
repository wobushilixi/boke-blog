import http from 'node:http';
import fs from 'node:fs';
import { URL } from 'node:url';

const DATA_FILE = '/opt/visitor-stats/ips.txt';
const ips = new Set();

function load() {
  if (!fs.existsSync(DATA_FILE)) return;
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  data.split('\n').map(s => s.trim()).filter(Boolean).forEach(ip => ips.add(ip));
}
function save(ip) {
  fs.appendFileSync(DATA_FILE, ip + '\n');
}

load();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + req.headers.host);
  if (url.pathname === '/api/visit') {
    const ip = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    if (ip && !ips.has(ip)) {
      ips.add(ip);
      try { save(ip); } catch {}
    }
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control':'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0', 'pragma':'no-cache' });
    res.end(JSON.stringify({ uniqueIps: ips.size }));
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

const PORT = 3010;
server.listen(PORT, '127.0.0.1', () => {
  console.log('visitor-stats listening on ' + PORT);
});
