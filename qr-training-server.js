// QR Security Awareness Training - Landing Page + Live Dashboard
// Authorized demo for Hotel Lo Mustang training
// Visitors see: "Welcome to Security Training" page (no forms, no PII).
// You see: a live dashboard at /dashboard with a running list + tally by browser,
// updated in real time over WebSocket as people scan.

const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

const VISITOR_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Training</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e2e8f0;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
    }
    .card { max-width: 480px; }
    h1 { font-size: 1.6rem; margin-bottom: 12px; color: #f8fafc; }
    p { font-size: 1rem; line-height: 1.5; color: #94a3b8; }
    .badge {
      display: inline-block;
      margin-top: 20px;
      padding: 6px 14px;
      background: #1e293b;
      border-radius: 999px;
      font-size: 0.8rem;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to the Security Training</h1>
    <p>You just scanned a QR code as part of a live cybersecurity awareness exercise. This was a demonstration of how easily QR codes ("quishing") can be used to lead people to unexpected pages — no personal data was collected.</p>
    <div class="badge">Techno Planet Security Awareness</div>
  </div>
</body>
</html>`;

const DASHBOARD_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Scan Dashboard</title>
  <style>
    body {
      margin: 0;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e2e8f0;
      padding: 24px;
      box-sizing: border-box;
    }
    h1 { font-size: 1.4rem; margin-bottom: 4px; }
    .status { font-size: 0.85rem; color: #64748b; margin-bottom: 24px; }
    .status.live { color: #4ade80; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .panel {
      background: #1e293b;
      border-radius: 12px;
      padding: 16px;
    }
    .panel h2 {
      font-size: 1rem;
      margin: 0 0 12px 0;
      color: #38bdf8;
    }
    .tally-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #334155;
      font-size: 0.9rem;
    }
    .tally-count {
      font-weight: bold;
      color: #4ade80;
    }
    .scan-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .scan-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #334155;
      font-size: 0.85rem;
    }
    .scan-time { color: #64748b; }
    .scan-browser { color: #e2e8f0; }
    .total {
      font-size: 2rem;
      font-weight: bold;
      color: #f8fafc;
    }
  </style>
</head>
<body>
  <h1>Live Scan Dashboard</h1>
  <div class="status" id="status">Connecting...</div>
  <div class="total" id="total">0</div>
  <div style="color:#64748b; font-size:0.85rem; margin-bottom:20px;">total scans</div>

  <div class="grid">
    <div class="panel">
      <h2>Tally by Browser</h2>
      <div id="tally"></div>
    </div>
    <div class="panel">
      <h2>Recent Scans</h2>
      <div class="scan-list" id="scanList"></div>
    </div>
  </div>

  <script>
    const statusEl = document.getElementById('status');
    const totalEl = document.getElementById('total');
    const tallyEl = document.getElementById('tally');
    const scanListEl = document.getElementById('scanList');

    function parseBrowser(ua) {
      if (/Edg\\//.test(ua)) return 'Edge';
      if (/Chrome\\//.test(ua) && !/Edg\\//.test(ua)) return 'Chrome';
      if (/Safari\\//.test(ua) && !/Chrome\\//.test(ua)) return 'Safari';
      if (/Firefox\\//.test(ua)) return 'Firefox';
      if (/Instagram/.test(ua)) return 'Instagram In-App';
      if (/FBAN|FBAV/.test(ua)) return 'Facebook In-App';
      return 'Other';
    }

    function render(scans) {
      totalEl.textContent = scans.length;

      const tally = {};
      scans.forEach(s => {
        const b = parseBrowser(s.userAgent);
        tally[b] = (tally[b] || 0) + 1;
      });

      tallyEl.innerHTML = Object.entries(tally)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => \`<div class="tally-row"><span>\${name}</span><span class="tally-count">\${count}</span></div>\`)
        .join('') || '<div style="color:#64748b;">No scans yet</div>';

      scanListEl.innerHTML = scans.slice().reverse().map(s => {
        const time = new Date(s.time).toLocaleTimeString();
        return \`<div class="scan-row"><span class="scan-time">\${time}</span><span class="scan-browser">\${parseBrowser(s.userAgent)}</span></div>\`;
      }).join('') || '<div style="color:#64748b;">No scans yet</div>';
    }

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(proto + '//' + location.host);

      ws.onopen = () => {
        statusEl.textContent = 'Live';
        statusEl.className = 'status live';
      };
      ws.onclose = () => {
        statusEl.textContent = 'Disconnected reconnecting...';
        statusEl.className = 'status';
        setTimeout(connect, 2000);
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'init' || data.type === 'update') {
          render(data.scans);
        }
      };
    }
    connect();
  </script>
</body>
</html>`;

// In-memory scan log (resets on restart/redeploy - fine for a single workshop session)
const scans = [];

const server = http.createServer((req, res) => {
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const ua = req.headers['user-agent'] || 'Unknown';
    const entry = { time: Date.now(), userAgent: ua };
    scans.push(entry);
    console.log(`[${new Date(entry.time).toISOString()}] Browser/OS: ${ua}`);
    broadcast({ type: 'update', scans });

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...noCacheHeaders });
    res.end(VISITOR_PAGE);
  } else if (req.method === 'GET' && req.url === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...noCacheHeaders });
    res.end(DASHBOARD_PAGE);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

const wss = new WebSocket.Server({ server });

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.send(JSON.stringify({ type: 'init', scans }));
});

// Ping every 25s to keep connections alive through Render's proxy,
// and drop any that stopped responding.
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Visitor page: http://<your-ip>:${PORT}`);
  console.log(`Live dashboard: http://<your-ip>:${PORT}/dashboard`);
});
