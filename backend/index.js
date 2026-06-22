const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const TOKENS_FILE = path.join(__dirname, 'tokens.json');

// Initialize files
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({}));
if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, JSON.stringify({}));

// Helper: read/write JSON safely
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return {}; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Google OAuth2 client
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ============================================================
// DASHBOARD - Beautiful HTML at root
// ============================================================
app.get('/', (req, res) => {
  const data = readJSON(DATA_FILE);
  const users = readJSON(USERS_FILE);
  const tokens = readJSON(TOKENS_FILE);

  // Merge all user keys
  const allUsers = [...new Set([...Object.keys(users), ...Object.keys(data)])];

  let userCardsHTML = '';
  let totalWorkouts = 0;
  let totalExercises = new Set();

  allUsers.forEach(user => {
    const workouts = data[user] || [];
    totalWorkouts += workouts.length;
    workouts.forEach(w => totalExercises.add(w.exercise));
    const userData = users[user];
    const email = typeof userData === 'object' ? userData.email : '-';
    const hasDrive = !!tokens[user];

    let rowsHTML = '';
    if (workouts.length === 0) {
      rowsHTML = '<tr><td colspan="5" class="empty">Belum ada data latihan</td></tr>';
    } else {
      workouts.forEach(w => {
        const wt = w.weight ? w.weight + ' kg' : '-';
        rowsHTML += `<tr><td class="date">${w.date}</td><td class="exercise">${w.exercise}</td><td class="num">${w.sets}</td><td class="num">${w.reps}</td><td class="num"><span class="badge">${wt}</span></td></tr>`;
      });
    }

    userCardsHTML += `
      <div class="user-card">
        <div class="user-header">
          <div class="avatar">${user.charAt(0).toUpperCase()}</div>
          <div class="user-info">
            <h3>${user}</h3>
            <p>${email}</p>
          </div>
          <div class="user-badges">
            <span class="count-badge">${workouts.length} latihan</span>
            ${hasDrive ? '<span class="drive-badge">GDrive ✓</span>' : '<span class="no-drive-badge">GDrive ✗</span>'}
          </div>
        </div>
        <table><thead><tr><th>Tanggal</th><th>Latihan</th><th>Sets</th><th>Reps</th><th>Beban</th></tr></thead><tbody>${rowsHTML}</tbody></table>
      </div>`;
  });

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Muszle Backend</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#09090b;color:#fafafa;min-height:100vh}
.top-bar{background:linear-gradient(135deg,#18181b 0%,#27272a 100%);border-bottom:1px solid #3f3f46;padding:1.5rem 2rem}
.top-bar h1{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;display:flex;align-items:center;gap:.75rem}
.top-bar h1 .logo{width:36px;height:36px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#09090b;font-weight:800;font-size:1.25rem}
.top-bar p{color:#a1a1aa;font-size:.875rem;margin-top:.25rem}
.stats{display:flex;gap:1rem;padding:1.5rem 2rem;flex-wrap:wrap}
.stat-card{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:1.25rem 1.5rem;flex:1;min-width:180px}
.stat-card .label{font-size:.75rem;color:#71717a;text-transform:uppercase;letter-spacing:.05em;font-weight:600}
.stat-card .value{font-size:2rem;font-weight:800;margin-top:.25rem;background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.container{padding:0 2rem 2rem;max-width:1200px}
.user-card{background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden;margin-bottom:1.5rem;transition:border-color .2s}
.user-card:hover{border-color:#3f3f46}
.user-header{display:flex;align-items:center;gap:1rem;padding:1.25rem 1.5rem;border-bottom:1px solid #27272a;flex-wrap:wrap}
.avatar{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.125rem;flex-shrink:0}
.user-info h3{font-weight:700;font-size:1rem}
.user-info p{font-size:.8rem;color:#71717a}
.user-badges{margin-left:auto;display:flex;gap:.5rem;flex-wrap:wrap}
.count-badge{background:#27272a;color:#d4d4d8;padding:.25rem .75rem;border-radius:99px;font-size:.75rem;font-weight:600}
.drive-badge{background:#064e3b;color:#34d399;padding:.25rem .75rem;border-radius:99px;font-size:.75rem;font-weight:600}
.no-drive-badge{background:#451a03;color:#f97316;padding:.25rem .75rem;border-radius:99px;font-size:.75rem;font-weight:600}
table{width:100%;border-collapse:collapse}
th{padding:.75rem 1.25rem;text-align:left;font-size:.7rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.05em;background:#111113}
td{padding:.75rem 1.25rem;font-size:.85rem;border-top:1px solid #27272a}
td.date{color:#71717a;font-size:.8rem}
td.exercise{font-weight:600}
td.num{text-align:center}
td.empty{text-align:center;color:#52525b;padding:2rem;font-style:italic}
th:nth-child(3),th:nth-child(4),th:nth-child(5){text-align:center}
.badge{background:#27272a;color:#e4e4e7;padding:.2rem .6rem;border-radius:6px;font-size:.8rem;font-weight:600}
tr:hover td{background:#1c1c1f}
.refresh{text-align:center;padding:1rem;color:#52525b;font-size:.75rem}
</style></head><body>
<div class="top-bar"><h1><span class="logo">M</span>Muszle Backend</h1><p>Real-time database dashboard • Auto-refresh setiap 30 detik</p></div>
<div class="stats">
  <div class="stat-card"><div class="label">Total Users</div><div class="value">${allUsers.length}</div></div>
  <div class="stat-card"><div class="label">Total Workouts</div><div class="value">${totalWorkouts}</div></div>
  <div class="stat-card"><div class="label">Unique Exercises</div><div class="value">${totalExercises.size}</div></div>
</div>
<div class="container">${allUsers.length === 0 ? '<div class="user-card"><div style="padding:3rem;text-align:center;color:#52525b">Belum ada user terdaftar.</div></div>' : userCardsHTML}</div>
<div class="refresh">Data di-refresh otomatis setiap 30 detik</div>
<script>setTimeout(()=>location.reload(),30000)</script>
</body></html>`;
  res.send(html);
});

// ============================================================
// AUTH ENDPOINTS
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Muszle aktif!' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username dan password harus diisi' });

  const users = readJSON(USERS_FILE);
  let targetUser = null;

  // Check by username directly
  if (users[username]) {
    targetUser = username;
  } else {
    // Search by email
    for (const [uname, udata] of Object.entries(users)) {
      if (typeof udata === 'object' && udata.email === username) {
        targetUser = uname;
        break;
      }
    }
  }

  if (!targetUser) return res.status(404).json({ error: 'Akun tidak ditemukan. Silakan daftar terlebih dahulu.' });

  const userData = users[targetUser];
  const correctPassword = typeof userData === 'string' ? userData : userData.password;
  if (correctPassword !== password) return res.status(401).json({ error: 'Password salah' });

  const profile = typeof userData === 'object' ? userData : { password: userData };
  res.json({ success: true, username: targetUser, email: profile.email || '', message: 'Login berhasil' });
});

app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Semua field harus diisi' });

  const users = readJSON(USERS_FILE);
  if (users[username]) return res.status(400).json({ error: 'Username sudah terdaftar.' });

  for (const udata of Object.values(users)) {
    if (typeof udata === 'object' && udata.email === email) {
      return res.status(400).json({ error: 'Email sudah terdaftar.' });
    }
  }

  users[username] = { password, email };
  writeJSON(USERS_FILE, users);
  res.json({ success: true, username, email, message: 'Registrasi berhasil' });
});

// ============================================================
// PROFILE ENDPOINTS
// ============================================================
app.get('/api/profile', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username diperlukan' });

  const users = readJSON(USERS_FILE);
  if (!users[username]) return res.status(404).json({ error: 'User tidak ditemukan' });

  const userData = users[username];
  const tokens = readJSON(TOKENS_FILE);
  const hasDrive = !!tokens[username];

  res.json({
    username,
    email: typeof userData === 'object' ? (userData.email || '') : '',
    gdriveConnected: hasDrive,
  });
});

app.put('/api/profile', (req, res) => {
  const { currentUsername, newUsername, newEmail, newPassword, currentPassword } = req.body;
  if (!currentUsername) return res.status(400).json({ error: 'Username saat ini diperlukan' });

  const users = readJSON(USERS_FILE);
  if (!users[currentUsername]) return res.status(404).json({ error: 'User tidak ditemukan' });

  const userData = users[currentUsername];
  const correctPw = typeof userData === 'string' ? userData : userData.password;

  // Verify current password
  if (currentPassword && correctPw !== currentPassword) {
    return res.status(401).json({ error: 'Password saat ini salah' });
  }

  const updatedData = typeof userData === 'object' ? { ...userData } : { password: userData };

  if (newEmail) updatedData.email = newEmail;
  if (newPassword) updatedData.password = newPassword;

  // Handle username change
  if (newUsername && newUsername !== currentUsername) {
    if (users[newUsername]) return res.status(400).json({ error: 'Username baru sudah digunakan' });

    // Move data
    const data = readJSON(DATA_FILE);
    if (data[currentUsername]) {
      data[newUsername] = data[currentUsername];
      delete data[currentUsername];
      writeJSON(DATA_FILE, data);
    }

    const tokens = readJSON(TOKENS_FILE);
    if (tokens[currentUsername]) {
      tokens[newUsername] = tokens[currentUsername];
      delete tokens[currentUsername];
      writeJSON(TOKENS_FILE, tokens);
    }

    delete users[currentUsername];
    users[newUsername] = updatedData;
    writeJSON(USERS_FILE, users);

    return res.json({ success: true, username: newUsername, email: updatedData.email || '', message: 'Profil berhasil diperbarui' });
  }

  users[currentUsername] = updatedData;
  writeJSON(USERS_FILE, users);
  res.json({ success: true, username: currentUsername, email: updatedData.email || '', message: 'Profil berhasil diperbarui' });
});

// ============================================================
// WORKOUT ENDPOINTS
// ============================================================
app.get('/api/workouts', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username diperlukan' });
  const data = readJSON(DATA_FILE);
  res.json(data[username] || []);
});

app.post('/api/workouts', (req, res) => {
  const { username, workout } = req.body;
  if (!username || !workout) return res.status(400).json({ error: 'Username dan workout diperlukan' });
  const data = readJSON(DATA_FILE);
  if (!data[username]) data[username] = [];
  data[username].push(workout);
  writeJSON(DATA_FILE, data);
  res.json({ success: true, message: 'Data berhasil disimpan' });
});

app.delete('/api/workouts', (req, res) => {
  const { username, workoutId } = req.body;
  if (!username || !workoutId) return res.status(400).json({ error: 'Username dan workoutId diperlukan' });
  const data = readJSON(DATA_FILE);
  if (data[username]) {
    data[username] = data[username].filter(w => w.id !== workoutId);
    writeJSON(DATA_FILE, data);
  }
  res.json({ success: true, message: 'Workout dihapus' });
});

// ============================================================
// GOOGLE DRIVE - REAL INTEGRATION
// ============================================================

// Step 1: Get the Google consent URL
app.get('/api/gdrive/auth-url', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username diperlukan' });

  const oauth2Client = createOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
    ],
    state: username, // pass username through state param
  });
  res.json({ url });
});

// Step 2: Google redirects here after user consents
app.get('/api/gdrive/callback', async (req, res) => {
  const { code, state: username } = req.query;
  if (!code || !username) {
    return res.status(400).send('Missing authorization code or username');
  }

  try {
    const oauth2Client = createOAuth2Client();
    const { tokens: googleTokens } = await oauth2Client.getToken(code);

    // Save tokens per user
    const allTokens = readJSON(TOKENS_FILE);
    allTokens[username] = googleTokens;
    writeJSON(TOKENS_FILE, allTokens);

    // Redirect back to frontend settings with success
    res.send(`<!DOCTYPE html><html><head><title>Success</title><style>
      body{font-family:Inter,system-ui,sans-serif;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:#18181b;border:1px solid #27272a;border-radius:16px;padding:2.5rem;text-align:center;max-width:400px}
      h2{margin-bottom:.5rem;font-size:1.5rem}
      p{color:#a1a1aa;margin-bottom:1.5rem}
      .btn{background:#22c55e;color:#fff;border:none;padding:.75rem 2rem;border-radius:12px;font-weight:600;cursor:pointer;font-size:1rem}
      .btn:hover{background:#16a34a}
    </style></head><body>
    <div class="card">
      <h2>✅ Google Drive Terhubung!</h2>
      <p>Akun Google Drive kamu berhasil disambungkan ke Muszle.</p>
      <button class="btn" onclick="window.close();window.opener&&window.opener.location.reload()">Kembali ke Muszle</button>
      <script>setTimeout(()=>{window.close()},3000)</script>
    </div></body></html>`);
  } catch (err) {
    console.error('GDrive callback error:', err.message);
    res.status(500).send(`<h2>Error</h2><p>${err.message}</p><a href="http://localhost:3000/settings">Kembali</a>`);
  }
});

// Step 3: Check drive status
app.get('/api/gdrive/status', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username diperlukan' });

  const tokens = readJSON(TOKENS_FILE);
  const connected = !!tokens[username];
  res.json({ connected });
});

// Step 4: Disconnect drive
app.post('/api/gdrive/disconnect', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username diperlukan' });

  const tokens = readJSON(TOKENS_FILE);
  delete tokens[username];
  writeJSON(TOKENS_FILE, tokens);
  res.json({ success: true, message: 'Google Drive berhasil diputus' });
});

// Step 5: REAL sync to Google Drive - creates/updates CSV in Drive
app.post('/api/gdrive/sync', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username diperlukan' });

  const tokens = readJSON(TOKENS_FILE);
  if (!tokens[username]) return res.status(401).json({ error: 'Google Drive belum terhubung. Hubungkan dulu di Settings.' });

  const data = readJSON(DATA_FILE);
  const workouts = data[username] || [];
  if (workouts.length === 0) return res.status(400).json({ error: 'Tidak ada data latihan untuk di-sync' });

  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(tokens[username]);

    // Handle token refresh
    oauth2Client.on('tokens', (newTokens) => {
      const allTokens = readJSON(TOKENS_FILE);
      allTokens[username] = { ...allTokens[username], ...newTokens };
      writeJSON(TOKENS_FILE, allTokens);
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Build CSV
    const csvHeader = 'Tanggal,Latihan,Sets,Reps,Beban (kg)\n';
    const csvRows = workouts.map(w => `"${w.date}","${w.exercise}",${w.sets},${w.reps},${w.weight || '-'}`).join('\n');
    const csvContent = csvHeader + csvRows;

    const fileName = `Muszle_${username}_${new Date().toISOString().split('T')[0]}.csv`;

    // Check if Muszle folder exists, create if not
    let folderId = null;
    const folderSearch = await drive.files.list({
      q: "name='Muszle' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id)',
    });

    if (folderSearch.data.files.length > 0) {
      folderId = folderSearch.data.files[0].id;
    } else {
      const folder = await drive.files.create({
        requestBody: { name: 'Muszle', mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id',
      });
      folderId = folder.data.id;
    }

    // Upload CSV
    const { Readable } = require('stream');
    const fileStream = Readable.from(csvContent);

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: 'text/csv',
        parents: [folderId],
      },
      media: { mimeType: 'text/csv', body: fileStream },
      fields: 'id, name, webViewLink',
    });

    res.json({
      success: true,
      message: `Data berhasil di-sync ke Google Drive!`,
      fileName: file.data.name,
      fileLink: file.data.webViewLink,
    });
  } catch (err) {
    console.error('GDrive sync error:', err.message);
    if (err.message.includes('invalid_grant') || err.message.includes('Token has been expired')) {
      const allTokens = readJSON(TOKENS_FILE);
      delete allTokens[username];
      writeJSON(TOKENS_FILE, allTokens);
      return res.status(401).json({ error: 'Token Google Drive expired. Silakan hubungkan ulang di Settings.' });
    }
    res.status(500).json({ error: 'Gagal sync ke Google Drive: ' + err.message });
  }
});

// ============================================================
// AI ANALYSIS ENDPOINT
// ============================================================
app.post('/api/analyze', async (req, res) => {
  try {
    const { prompt } = req.body;
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(401).json({ error: 'API Key Gemini tidak ditemukan.' });

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ text: response.text() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Terjadi kesalahan pada server AI.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Muszle Backend running on http://localhost:${PORT}`);
});
