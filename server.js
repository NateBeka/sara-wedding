const http = require('http');
const fs = require('fs');
const path = require('path');
const { startPolling, notifyAdmins, loadConfig, loadData, saveData, escapeHtml } = require('./bot');

const PORT = process.env.PORT || 8080;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ics': 'text/calendar; charset=utf-8'
};

function sendJsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // --------------------------------------------------------------------------
  // API ROUTE: GET /api/status
  // --------------------------------------------------------------------------
  if (pathname === '/api/status' && req.method === 'GET') {
    const config = loadConfig();
    sendJsonResponse(res, 200, {
      status: 'ok',
      couple: 'Dr. Sara Ayele & Eng. Tewodros Belay',
      bot_configured: Boolean(config && config.bot_token),
      bot_username: config ? config.bot_username : 'sara_tewodros_wedding_bot'
    });
    return;
  }

  // --------------------------------------------------------------------------
  // API ROUTE: GET /api/admin/rsvps (SECURE ADMIN ACCESS)
  // --------------------------------------------------------------------------
  if (pathname === '/api/admin/rsvps' && req.method === 'GET') {
    const config = loadConfig();
    const providedPasscode = parsedUrl.searchParams.get('passcode') || req.headers['x-admin-passcode'];
    const expectedPasscode = (config && config.admin_passcode) || 'sara_tewodros_2026';

    if (providedPasscode !== expectedPasscode) {
      sendJsonResponse(res, 401, { success: false, error: 'Unauthorized: invalid passcode' });
      return;
    }

    const dataStore = loadData();
    sendJsonResponse(res, 200, {
      success: true,
      photos_group_id: (config && config.photos_group_id) || null,
      photos_group_link: (config && config.photos_group_link) || null,
      rsvps: dataStore.rsvps || [],
      moments: dataStore.moments || []
    });
    return;
  }

  // --------------------------------------------------------------------------
  // API ROUTE: POST /api/admin/set-group (SET PHOTOS GROUP ID)
  // --------------------------------------------------------------------------
  if (pathname === '/api/admin/set-group' && req.method === 'POST') {
    const config = loadConfig();
    const providedPasscode = parsedUrl.searchParams.get('passcode') || req.headers['x-admin-passcode'];
    const expectedPasscode = (config && config.admin_passcode) || 'sara_tewodros_2026';

    if (providedPasscode !== expectedPasscode) {
      sendJsonResponse(res, 401, { success: false, error: 'Unauthorized: invalid passcode' });
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e4) req.destroy();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (payload.photos_group_id !== undefined) {
          config.photos_group_id = payload.photos_group_id;
          saveConfig(config);
          sendJsonResponse(res, 200, {
            success: true,
            photos_group_id: config.photos_group_id
          });
        } else {
          sendJsonResponse(res, 400, { success: false, error: 'photos_group_id is required' });
        }
      } catch (err) {
        sendJsonResponse(res, 400, { success: false, error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // API ROUTE: POST /api/rsvp (SECURE SERVER-SIDE DISPATCH)
  // --------------------------------------------------------------------------
  if (pathname === '/api/rsvp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) req.destroy(); // 1MB limit
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const guestName = (payload.guestName || '').trim();

        if (!guestName) {
          sendJsonResponse(res, 400, { success: false, error: 'Guest name is required' });
          return;
        }

        const isAttending = payload.attending === 'Yes' || payload.isAttending === true;
        const rsvpEntry = {
          id: 'web_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          guestName: guestName,
          attending: isAttending ? 'Yes' : 'No',
          isAttending: isAttending,
          guestCount: isAttending ? (payload.guestCount || '1') : '0',
          relation: payload.relation || 'Friend',
          message: (payload.message || '').trim(),
          source: 'website',
          timestamp: new Date().toISOString()
        };

        // Save RSVP into private database
        const dataStore = loadData();
        dataStore.rsvps.push(rsvpEntry);
        saveData(dataStore);

        // Notify Sara & Tewodros via Telegram Bot if active
        const config = loadConfig();
        if (config && config.bot_token) {
          const partyLine = rsvpEntry.isAttending ? `👥 <b>Party Size:</b> ${escapeHtml(rsvpEntry.guestCount)} Guests\n` : `👥 <b>Attending:</b> No\n`;
          const adminAlert = 
`💒 <b>NEW WEBSITE RSVP RECEIVED!</b> 💒
✦ ══════════════════════════ ✦
👤 <b>Guest:</b> ${escapeHtml(rsvpEntry.guestName)}
✅ <b>Attending:</b> ${escapeHtml(rsvpEntry.attending)}
${partyLine}💑 <b>Relation:</b> ${escapeHtml(rsvpEntry.relation)}
💌 <b>Wishes:</b> <i>"${escapeHtml(rsvpEntry.message || 'Heartfelt congratulations!')}"</i>
🌐 <b>Channel:</b> Wedding Website (Online)
⏰ <b>Time:</b> ${new Date().toLocaleTimeString('en-US')}`;

          await notifyAdmins(config.bot_token, adminAlert);
        }

        console.log(`[RSVP Received]: ${rsvpEntry.guestName} (${rsvpEntry.attending})`);
        sendJsonResponse(res, 200, {
          success: true,
          message: 'RSVP recorded successfully',
          guestName: rsvpEntry.guestName
        });
      } catch (err) {
        console.error('[RSVP Error]:', err);
        sendJsonResponse(res, 500, { success: false, error: 'Internal server error processing RSVP' });
      }
    });
    return;
  }

  // --------------------------------------------------------------------------
  // STATIC FILE SERVING
  // --------------------------------------------------------------------------
  let reqPath = decodeURIComponent(pathname);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  } else if (reqPath === '/dashboard' || reqPath === '/admin') {
    reqPath = '/dashboard.html';
  }

  // Prevent directory traversal
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  // Security check: ensure path stays within workspace root
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`✨ Dr. Sara & Eng. Tewodros Wedding Server is live at http://localhost:${PORT}/`);
  // Automatically start Telegram Bot engine
  startPolling();
});
