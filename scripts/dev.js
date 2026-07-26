/**
 * Utrecht Voor Jou — Local Development Preview Server
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3000;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Trigger initial build
console.log('⚡ Running static build...');
execSync('node scripts/build.js', { stdio: 'inherit' });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl.endsWith('/')) {
    reqUrl += 'index.html';
  }

  let filePath = path.join(DIST_DIR, reqUrl);

  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '/index.html')) {
    filePath = filePath + '/index.html';
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Page Not Found</h1><p><a href="/nl/">Back to Utrecht Voor Jou Home</a></p>');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🎉 Utrecht Voor Jou local preview server running at:\n   👉 http://localhost:${PORT}/nl/\n`);
});
