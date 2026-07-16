// 18-Draw Scoreboard — local server
// Zero dependencies: uses only Node's built-in http/fs modules.
// Run with:  node server.js
// Then open: http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MONGODB_URI = process.env.MONGODB_URI || '';
const USE_MONGO = !!MONGODB_URI;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

function defaultState() {
  return { config: null, pointLogs: {}, updatedAt: 0 };
}

/* ---------- Storage backend A: local file (used when running on your own computer) ---------- */

function readStateFile(cb) {
  fs.readFile(DATA_FILE, 'utf8', (err, raw) => {
    if (err) return cb(null, defaultState()); // no file yet — fresh tournament
    try { cb(null, JSON.parse(raw)); }
    catch (e) { cb(null, defaultState()); }
  });
}

function writeStateFile(state, cb) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8', (err) => {
    if (err) return cb(err);
    fs.rename(tmp, DATA_FILE, cb); // atomic-ish write, avoids half-written files
  });
}

/* ---------- Storage backend B: MongoDB Atlas (used when MONGODB_URI is set, e.g. on Render) ----------
   Render's free tier wipes local disk on every redeploy/restart/wake-from-sleep, so hosted
   deployments need data to live somewhere outside that container. MongoDB Atlas's free M0
   tier persists indefinitely and doesn't sleep or expire. */

let mongoClientPromise = null;
function getMongoCollection() {
  if (!mongoClientPromise) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(MONGODB_URI);
    mongoClientPromise = client.connect().then(() => client.db('tennis_tracker').collection('state'));
  }
  return mongoClientPromise;
}

function readStateMongo(cb) {
  getMongoCollection()
    .then((col) => col.findOne({ _id: 'tournament' }))
    .then((doc) => cb(null, doc ? doc.state : defaultState()))
    .catch((err) => cb(err, defaultState()));
}

function writeStateMongo(state, cb) {
  getMongoCollection()
    .then((col) => col.updateOne({ _id: 'tournament' }, { $set: { state: state } }, { upsert: true }))
    .then(() => cb(null))
    .catch((err) => cb(err));
}

/* ---------- Unified interface used by the rest of the server ---------- */

function readState(cb) {
  if (USE_MONGO) return readStateMongo(cb);
  return readStateFile(cb);
}

function writeState(state, cb) {
  if (USE_MONGO) return writeStateMongo(state, cb);
  return writeStateFile(state, cb);
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function serveStatic(req, res) {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, reqPath);

  // Prevent path traversal outside the public folder
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found: ' + reqPath);
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/state')) {
    if (req.method === 'GET') {
      return readState((err, state) => sendJson(res, 200, state));
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) req.destroy(); // 5MB safety cap
      });
      req.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          return sendJson(res, 400, { error: 'Invalid JSON' });
        }
        parsed.updatedAt = Date.now();
        writeState(parsed, (err) => {
          if (err) return sendJson(res, 500, { error: 'Could not save state' });
          sendJson(res, 200, parsed);
        });
      });
      return;
    }
    res.writeHead(405);
    return res.end('Method not allowed');
  }

  if (req.method === 'GET') return serveStatic(req, res);

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  18-Draw Scoreboard is running.');
  console.log('  On this computer:   http://localhost:' + PORT);
  console.log('  On your network:    http://<this-computer-ip>:' + PORT);
  console.log('  (Find your IP with `ipconfig` on Windows or `ifconfig`/`ip a` on Mac/Linux)');
  if (USE_MONGO) {
    console.log('  Data storage:       MongoDB Atlas (persists across restarts/redeploys)');
  } else {
    console.log('  Data storage:       local file — ' + DATA_FILE);
    console.log('  (Set a MONGODB_URI environment variable to use MongoDB Atlas instead — see README.)');
  }
  console.log('');
});
