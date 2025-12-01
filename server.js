const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_USER = process.env.ADMIN_USER || 'sharun';
const ADMIN_PASS = process.env.ADMIN_PASS || 'adminlgsharun123';
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(require('cors')());
app.use(express.static('public'));

// ensure data file exists
if(!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ ids: [] }, null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

// Basic auth middleware for admin routes
function basicAuth(req, res, next) {
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const creds = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [user, pass] = creds.split(':');
  if(user === ADMIN_USER && pass === ADMIN_PASS) return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// Helper to fetch Instagram profile pic server-side (unofficial)
async function fetchInstagramPic(username) {
  try {
    const url = `https://www.instagram.com/${encodeURIComponent(username)}/?__a=1&__d=dis`;
    const res = await fetch(url, { timeout: 10000 });
    if(res.ok) {
      const data = await res.json();
      const pic = data?.graphql?.user?.profile_pic_url_hd || data?.user?.profile_pic_url_hd || null;
      if(pic) return pic;
    }
  } catch (err) {
    console.warn('primary fetch failed', err);
  }
  // fallback: fetch HTML and regex
  try {
    const page = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, { timeout: 10000 });
    const text = await page.text();
    const m = text.match(/profile_pic_url_hd\":\"([^\"]+)\"/);
    if(m && m[1]) return m[1].replace(/\\u0026/g, '&');
  } catch (err) {
    console.warn('html fallback failed', err);
  }
  return null;
}

// Public API: list ids
app.get('/api/ids', (req, res) => {
  const data = readData();
  res.json(data.ids);
});

// Admin API: add id (protected)
app.post('/api/ids', basicAuth, async (req, res) => {
  const username = (req.body.username || '').trim();
  if(!username) return res.status(400).json({ error: 'username required' });
  const data = readData();
  // attempt to fetch pic
  const pic = await fetchInstagramPic(username).catch(()=>null);
  const entry = { username, profilePicUrl: pic || null, addedAt: new Date().toISOString() };
  data.ids.push(entry);
  writeData(data);
  res.json(entry);
});

// serve static files (frontend)
app.use('/', express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
