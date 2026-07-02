// QR Security Awareness Training - Landing Page Server
// Authorized demo for Hotel Lo Mustang training
// Purpose: Show a simple "Welcome to Security Training" page when scanned.
// Only logs Browser/OS (User-Agent) + timestamp. No forms, no PII, no cookies.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'scan-log.txt');

const HTML_PAGE = `<!DOCTYPE html>
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
    .card {
      max-width: 480px;
    }
    h1 {
      font-size: 1.6rem;
      margin-bottom: 12px;
      color: #f8fafc;
    }
    p {
      font-size: 1rem;
      line-height: 1.5;
      color: #94a3b8;
    }
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
    <div class="badge">Techno Planet · Security Awareness</div>
  </div>
</body>
</html>`;

// Simple in-memory + file logger. Only browser/OS + time, nothing identifying.
function logScan(userAgent) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] Browser/OS: ${userAgent}\n`;
  console.log(line.trim());
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error('Failed to write log:', err.message);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const ua = req.headers['user-agent'] || 'Unknown';
    logScan(ua);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
  } else {
    // Anything else (favicon.ico etc.) - just 404, don't log
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Training landing page running at http://<your-ip>:${PORT}`);
  console.log(`Scans will be logged here and to ${LOG_FILE}`);
});
