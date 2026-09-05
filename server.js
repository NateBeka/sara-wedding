const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { startPolling, notifyAdmins, loadConfig, loadData, saveData, escapeHtml, getTelegramFileUrl, callTelegram, sendMessage } = require('./bot');

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
      couple: 'Eng. Tewodros Belay & Dr. Sara Ayele',
      bot_configured: Boolean(config && config.bot_token),
      bot_username: config ? config.bot_username : 'sara_tewodros_wedding_bot'
    });
    return;
  }

  // --------------------------------------------------------------------------
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

    // ------------------------------------------------------------------------
    // 1. DEDUPLICATE RSVPS (Keep unique entries, clean duplicates)
    // ------------------------------------------------------------------------
    const rawRsvps = Array.isArray(dataStore.rsvps) ? dataStore.rsvps : [];
    const dedupRsvps = [];
    const seenRsvpKeys = new Set();

    for (const r of rawRsvps) {
      if (!r) continue;
      const cleanName = (r.guestName || '').trim().toLowerCase();
      const cleanMsg = (r.message || '').trim().toLowerCase();
      const timeMinute = r.timestamp ? new Date(r.timestamp).toISOString().slice(0, 16) : '';
      const rKey = r.id ? `id:${r.id}` : `${cleanName}:::${timeMinute}:::${cleanMsg}`;

      if (!seenRsvpKeys.has(rKey)) {
        seenRsvpKeys.add(rKey);
        dedupRsvps.push(r);
      }
    }

    // ------------------------------------------------------------------------
    // 2. COMPREHENSIVELY AGGREGATE ALL SENT MESSAGES & DEDUPLICATE
    // ------------------------------------------------------------------------
    const allWishes = [];
    const seenWishSignatures = new Set();
    const seenWishIds = new Set();

    function normalizeText(txt) {
      return (txt || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function addWishUnique(item) {
      if (!item || !item.message) return;
      const cleanMsg = item.message.trim();
      if (!cleanMsg || cleanMsg.length < 2) return;

      if (item.id && seenWishIds.has(item.id)) return;

      const author = (item.guestName || item.sender_name || item.from_user || 'Honored Guest').trim();
      const authorNorm = author.toLowerCase().replace(/[^a-z0-9]/g, '');
      const textNorm = normalizeText(cleanMsg);
      const signature = `${authorNorm}:::${textNorm}`;

      if (seenWishSignatures.has(signature)) return;
      seenWishSignatures.add(signature);
      if (item.id) seenWishIds.add(item.id);

      allWishes.push({
        id: item.id || 'wish_' + Math.random().toString(36).substring(2, 8),
        guestName: author,
        relation: item.relation || 'Friend',
        message: cleanMsg,
        source: item.source || 'Website',
        timestamp: item.timestamp || new Date().toISOString()
      });
    }

    // A. From RSVPs (guests writing wishes alongside RSVP)
    dedupRsvps.forEach(r => {
      if (r.message && r.message.trim().length > 0) {
        addWishUnique({
          id: r.id ? 'wish_' + r.id : undefined,
          guestName: r.guestName,
          relation: r.relation || 'Friend',
          message: r.message,
          source: r.source === 'telegram_bot' ? 'Telegram RSVP' : 'Website RSVP',
          timestamp: r.timestamp
        });
      }
    });

    // B. From standalone Wishes (sent via /wishes or direct text to bot)
    if (Array.isArray(dataStore.wishes)) {
      dataStore.wishes.forEach(w => addWishUnique(w));
    }

    // C. From Moment Photo Captions (guests sharing personal blessings with photos)
    if (Array.isArray(dataStore.moments)) {
      dataStore.moments.forEach(m => {
        if (m.caption && m.caption.trim().length > 2) {
          addWishUnique({
            id: 'wish_moment_' + (m.id || Math.random().toString(36).substring(2, 8)),
            guestName: m.sender_name || m.from_user || 'Guest',
            relation: 'Wedding Guest',
            message: m.caption,
            source: m.source ? `${m.source} Photo` : 'Photo Caption',
            timestamp: m.timestamp
          });
        }
      });
    }

    // Sort wishes chronologically (newest first)
    allWishes.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    // ------------------------------------------------------------------------
    // 3. DEDUPLICATE MOMENTS / CELEBRATION PHOTOS
    // ------------------------------------------------------------------------
    const rawMoments = Array.isArray(dataStore.moments) ? dataStore.moments : [];
    const dedupMoments = [];
    const seenMomentKeys = new Set();

    for (const m of rawMoments) {
      if (!m) continue;
      const mKey = m.file_id || m.id || m.file_path || ((m.sender_name || '') + '_' + (m.timestamp || ''));
      if (!seenMomentKeys.has(mKey)) {
        seenMomentKeys.add(mKey);
        dedupMoments.push(m);
      }
    }

    sendJsonResponse(res, 200, {
      success: true,
      photos_group_id: (config && config.photos_group_id) || null,
      photos_group_link: (config && config.photos_group_link) || null,
      rsvps: dedupRsvps,
      wishes: allWishes,
      moments: dedupMoments
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

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (payload.photos_group_id !== undefined) {
          config.photos_group_id = payload.photos_group_id ? (isNaN(payload.photos_group_id) ? payload.photos_group_id : Number(payload.photos_group_id)) : null;
          saveConfig(config);

          // If testing the group, send a test verification message
          if (config.photos_group_id && config.bot_token) {
            try {
              await callTelegram(config.bot_token, 'sendMessage', {
                chat_id: config.photos_group_id,
                text: `✨ <b>Wedding Photo Stream Connected!</b>\n\nEng. Tewodros & Dr. Sara Wedding Bot is now active in this group. All guest photos and celebration memories will stream here! 📸💒`,
                parse_mode: 'HTML'
              });
            } catch (testErr) {
              console.warn('[Telegram Group Test Note]:', testErr.message);
            }
          }

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
  // API ROUTE: GET /api/moment-photo (RESILIENT CLOUD PHOTO STREAMING)
  // --------------------------------------------------------------------------
  if (pathname === '/api/moment-photo' && req.method === 'GET') {
    const fileId = parsedUrl.searchParams.get('file_id');
    if (!fileId) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('file_id parameter is required');
      return;
    }

    const cleanId = fileId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localMomentPath = path.join(__dirname, 'images', 'moments', `moment_${cleanId}.jpg`);

    // 1. If cached on local disk, serve immediately
    if (fs.existsSync(localMomentPath)) {
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
      });
      fs.createReadStream(localMomentPath).pipe(res);
      return;
    }

    // 2. Fetch fresh file from Telegram cloud & pipe to browser
    const config = loadConfig();
    (async () => {
      try {
        const fileUrl = await getTelegramFileUrl(config.bot_token, fileId);
        if (!fileUrl) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Photo not available on Telegram cloud');
          return;
        }

        const telegramRes = await fetch(fileUrl);
        if (!telegramRes.ok) {
          res.writeHead(telegramRes.status, { 'Content-Type': 'text/plain' });
          res.end('Failed to retrieve photo from Telegram');
          return;
        }

        const arrayBuf = await telegramRes.arrayBuffer();
        const buf = Buffer.from(arrayBuf);

        res.writeHead(200, {
          'Content-Type': telegramRes.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
        });
        res.end(buf);

        // Asynchronously cache on disk for subsequent speed
        try {
          fs.mkdirSync(path.dirname(localMomentPath), { recursive: true });
          fs.writeFileSync(localMomentPath, buf);
        } catch (cacheErr) {}
      } catch (err) {
        console.error('[Moment Photo Proxy Error]:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error streaming photo from cloud');
      }
    })();
    return;
  }

  // --------------------------------------------------------------------------
  // API ROUTE: POST /api/upload-moment (DIRECT WEBSITE PHOTO UPLOAD)
  // --------------------------------------------------------------------------
  if (pathname === '/api/upload-moment' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15e6) req.destroy(); // 15MB limit
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const senderName = (payload.senderName || 'Honored Guest').trim();
        const caption = (payload.caption || '').trim();
        const base64Data = payload.imageBase64 || '';

        if (!base64Data) {
          sendJsonResponse(res, 400, { success: false, error: 'Image data is required' });
          return;
        }

        const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Clean, 'base64');
        const safeSender = senderName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
        const fileName = `moment_${Date.now()}_${safeSender}.jpg`;
        const localPath = path.join(__dirname, 'images', 'moments', fileName);

        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, imageBuffer);

        const config = loadConfig();
        let telegramFileId = null;

        // Post to Telegram Photo Stream & Admins
        if (config && config.bot_token) {
          try {
            // Forward to Wedding Photo Group
            if (config.photos_group_id) {
              const groupForm = new FormData();
              groupForm.append('chat_id', config.photos_group_id);
              groupForm.append('caption', `📸 Shared by <b>${escapeHtml(senderName)}</b> (via Wedding Website)${caption ? `\n<i>"${escapeHtml(caption)}"</i>` : ''}`);
              groupForm.append('parse_mode', 'HTML');
              groupForm.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), fileName);

              const groupRes = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendPhoto`, {
                method: 'POST',
                body: groupForm
              });
              const groupJson = await groupRes.json().catch(() => null);
              if (groupJson && groupJson.ok && groupJson.result && groupJson.result.photo) {
                telegramFileId = groupJson.result.photo[groupJson.result.photo.length - 1].file_id;
                console.log(`[Group Stream]: Streamed website photo to Wedding Photo Group (${config.photos_group_id})`);
              }
            }

            // Forward to Admins
            const adminIds = (config.admins || []).map(a => a.chat_id).filter(Boolean);
            for (const aId of adminIds) {
              try {
                const adminForm = new FormData();
                adminForm.append('chat_id', aId);
                adminForm.append('caption', `📸 <b>NEW WEDDING PHOTO UPLOADED FROM WEBSITE!</b>\nFrom: <b>${escapeHtml(senderName)}</b>\n${caption ? `Caption: <i>"${escapeHtml(caption)}"</i>\n` : ''}⏰ Time: ${new Date().toLocaleTimeString('en-US')}`);
                adminForm.append('parse_mode', 'HTML');
                adminForm.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), fileName);

                const aRes = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendPhoto`, {
                  method: 'POST',
                  body: adminForm
                });
                const aJson = await aRes.json().catch(() => null);
                if (!telegramFileId && aJson && aJson.ok && aJson.result && aJson.result.photo) {
                  telegramFileId = aJson.result.photo[aJson.result.photo.length - 1].file_id;
                }
              } catch (e) {}
            }
          } catch (teleErr) {
            console.error('[Website Photo Telegram Error]:', teleErr.message);
          }
        }

        // Save Moment Entry
        const momentEntry = {
          id: 'moment_web_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          sender_name: senderName,
          from_user: senderName,
          caption: caption,
          file_id: telegramFileId || '',
          file_path: telegramFileId ? `/api/moment-photo?file_id=${encodeURIComponent(telegramFileId)}` : `/images/moments/${fileName}`,
          source: 'website',
          timestamp: new Date().toISOString()
        };

        const dataStore = loadData();
        dataStore.moments.push(momentEntry);
        saveData(dataStore);

        console.log(`[Website Photo Uploaded]: ${senderName}`);
        sendJsonResponse(res, 200, {
          success: true,
          message: 'Moment uploaded and shared successfully!',
          moment: momentEntry
        });
      } catch (err) {
        console.error('[Upload Moment Error]:', err);
        sendJsonResponse(res, 500, { success: false, error: 'Failed to process moment upload' });
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
    const isCompressible = ['.html', '.css', '.js', '.json', '.svg'].includes(ext);
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // Optimized Caching Strategy:
    // - Static media, images, audio, css, js: 1 year immutable
    // - HTML: 0 seconds must-revalidate (instant fresh updates)
    let cacheControl = 'public, max-age=31536000, immutable';
    if (ext === '.html') {
      cacheControl = 'public, max-age=0, must-revalidate';
    }

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
      'Vary': 'Accept-Encoding'
    };

    if (isCompressible && acceptEncoding.includes('gzip')) {
      headers['Content-Encoding'] = 'gzip';
      res.writeHead(200, headers);
      const rawStream = fs.createReadStream(filePath);
      const gzip = zlib.createGzip({ level: 6 });
      rawStream.pipe(gzip).pipe(res);
    } else {
      res.writeHead(200, headers);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`✨ Eng. Tewodros & Dr. Sara Wedding Server is live at http://localhost:${PORT}/`);
  // Automatically start Telegram Bot engine
  startPolling();

  // Keep-alive heartbeat for Render free tier:
  // Render suspends inactive free services after 15 minutes. Self-pinging every 12 minutes
  // keeps the server and Telegram bot continuously active in the cloud!
  const externalUrl = process.env.RENDER_EXTERNAL_URL || 'https://sara-wedding.onrender.com';
  if (externalUrl.startsWith('http')) {
    setInterval(async () => {
      try {
        const pingUrl = `${externalUrl}/api/status`;
        const res = await fetch(pingUrl);
        if (res.ok) {
          console.log(`[Keep-Alive]: Server heartbeat active (${new Date().toLocaleTimeString('en-US')})`);
        }
      } catch (err) {
        // Silently ignore during transient network glitches
      }
    }, 12 * 60 * 1000); // Every 12 minutes
  }
});

