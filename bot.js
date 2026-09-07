/**
 * ============================================================================
 * DR. SARA AYELE & ENG. TEWODROS BELAY - WEDDING TELEGRAM BOT
 * ============================================================================
 * Features:
 *  - Elegant Habesha & Western Wedding Aesthetics
 *  - Interactive Step-by-Step Telegram RSVP Flow
 *  - Bilingual Support: English & Amharic (አማርኛ)
 *  - Wedding Program & Timetable (Dila & Hawassa)
 *  - Venue Directions with Google Maps & Native Telegram GPS Location Pins
 *  - Live Photo Collection Hub: Saves to images/moments/ & forwards to Admins
 *  - Real-time instant push alerts to Sara & Tewodros upon new RSVPs / photos
 *  - Mass Broadcast announcements from Sara & Tewodros (Rate-limited)
 *  - Role-based Admin Authentication (/admin)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const CONFIG_PATH = path.join(__dirname, 'bot_config.json');
const DATA_PATH = path.join(__dirname, 'data', 'rsvps.json');
const MOMENTS_DIR = path.join(__dirname, 'images', 'moments');

// Ensure moments directory exists
if (!fs.existsSync(MOMENTS_DIR)) {
    fs.mkdirSync(MOMENTS_DIR, { recursive: true });
}

// HTML Entity Sanitizer for Telegram HTML parse mode
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// In-memory cached data model to eliminate disk I/O and JSON parse churn
let cachedData = null;

// GitHub Cloud Persistence Config (guarantees dynamic data is never lost across Render restarts)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = 'natebeka/sara-wedding';
let lastGitHubSha = null;
let isSyncing = false;
let pendingSyncTimer = null;

async function fetchFromGitHub() {
    if (!GITHUB_TOKEN) return null;
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/rsvps.json`, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'User-Agent': 'Sara-Wedding-App',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (res.ok) {
            const data = await res.json();
            lastGitHubSha = data.sha;
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            return JSON.parse(content);
        }
    } catch (err) {
        console.error('[GitHub Cloud Fetch Error]:', err.message);
    }
    return null;
}

async function syncToGitHub(data) {
    if (!GITHUB_TOKEN || isSyncing) return;
    isSyncing = true;
    try {
        // Fetch current file SHA if not cached
        const check = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/rsvps.json`, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'User-Agent': 'Sara-Wedding-App',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (check.ok) {
            const j = await check.json();
            lastGitHubSha = j.sha;
        }

        const jsonStr = JSON.stringify(data, null, 2);
        const base64Content = Buffer.from(jsonStr).toString('base64');
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/rsvps.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'User-Agent': 'Sara-Wedding-App',
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: 'sync: dynamic wedding rsvps, wishes & moments [skip ci]',
                content: base64Content,
                sha: lastGitHubSha
            })
        });
        if (res.ok) {
            const result = await res.json();
            lastGitHubSha = result.content ? result.content.sha : null;
            console.log('[GitHub Cloud Sync]: Persisted wedding database to GitHub cloud!');
        } else {
            const errBody = await res.text();
            console.error('[GitHub Cloud Sync Failed]:', res.status, errBody);
        }
    } catch (err) {
        console.error('[GitHub Cloud Sync Exception]:', err.message);
    } finally {
        isSyncing = false;
    }
}

function loadData() {
    if (cachedData) return cachedData;
    let localData = { rsvps: [], guest_users: {}, moments: [] };
    try {
        if (!fs.existsSync(DATA_PATH)) {
            fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
            fs.writeFileSync(DATA_PATH, JSON.stringify(localData, null, 2), 'utf8');
        } else {
            localData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        }
    } catch (err) {
        console.error('[Bot Data Load Error]:', err);
    }
    cachedData = localData;

    // Asynchronously restore & merge any cloud records missing locally
    fetchFromGitHub().then(cloudData => {
        if (cloudData && Array.isArray(cloudData.rsvps)) {
            const existingIds = new Set((cachedData.rsvps || []).map(r => r.id || `${r.guestName}_${r.timestamp}`));
            let merged = 0;
            for (const r of cloudData.rsvps) {
                const key = r.id || `${r.guestName}_${r.timestamp}`;
                if (!existingIds.has(key)) {
                    cachedData.rsvps.push(r);
                    existingIds.add(key);
                    merged++;
                }
            }
            if (Array.isArray(cloudData.moments)) {
                const existingMomentIds = new Set((cachedData.moments || []).map(m => m.id || m.file_id));
                for (const m of cloudData.moments) {
                    const mKey = m.id || m.file_id;
                    if (!existingMomentIds.has(mKey)) {
                        cachedData.moments.push(m);
                        existingMomentIds.add(mKey);
                        merged++;
                    }
                }
            }
            if (Array.isArray(cloudData.wishes)) {
                if (!Array.isArray(cachedData.wishes)) cachedData.wishes = [];
                const existingWishIds = new Set(cachedData.wishes.map(w => w.id || `${w.guestName}_${w.timestamp}`));
                for (const w of cloudData.wishes) {
                    const wKey = w.id || `${w.guestName}_${w.timestamp}`;
                    if (!existingWishIds.has(wKey)) {
                        cachedData.wishes.push(w);
                        existingWishIds.add(wKey);
                        merged++;
                    }
                }
            }
            // Also restore group ID if stored in cloud
            if (cloudData.photos_group_id && !cachedData.photos_group_id) {
                cachedData.photos_group_id = cloudData.photos_group_id;
                const cfg = loadConfig();
                if (!cfg.photos_group_id) {
                    cfg.photos_group_id = cloudData.photos_group_id;
                    saveConfig(cfg);
                }
            }
            if (merged > 0) {
                console.log(`[Cloud Sync]: Merged ${merged} dynamic records into local memory.`);
                try {
                    fs.writeFileSync(DATA_PATH, JSON.stringify(cachedData, null, 2), 'utf8');
                } catch (e) {}
            }
        }
    }).catch(err => console.warn('[Cloud Restore Skipped]:', err.message));

    return cachedData;
}

function saveData(data) {
    cachedData = data;
    try {
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('[Bot Data Save Error]:', err);
    }

    // Debounce cloud persistence to prevent rate-limiting
    if (pendingSyncTimer) clearTimeout(pendingSyncTimer);
    pendingSyncTimer = setTimeout(() => {
        syncToGitHub(data);
    }, 2500);
}

function loadConfig() {
    let cfg = null;
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        }
    } catch (err) {
        console.error('[Bot Config Load Error]:', err);
    }
    if (!cfg) {
        cfg = {
            bot_token: '',
            bot_username: 'sara_tewodros_wedding_bot',
            admin_passcode: 'sara_tewodros_2026',
            photos_group_id: null,
            photos_group_link: 'https://t.me/+3WRHqclWRQJlYzBk',
            admins: [
                { id: 'nate', name: 'Nate Beka', role: 'Organizer', telegram_username: 'nate_beka', chat_id: 7984548544 },
                { id: 'sara', name: 'Dr. Sara Ayele', role: 'Bride', telegram_username: '', chat_id: null },
                { id: 'tewodros', name: 'Eng. Tewodros Belay', role: 'Groom', telegram_username: '', chat_id: null }
            ]
        };
    }

    // Support environment variables overrides
    if (process.env.TELEGRAM_BOT_TOKEN) cfg.bot_token = process.env.TELEGRAM_BOT_TOKEN;
    if (process.env.TELEGRAM_BOT_USERNAME) cfg.bot_username = process.env.TELEGRAM_BOT_USERNAME;
    if (process.env.ADMIN_PASSCODE) cfg.admin_passcode = process.env.ADMIN_PASSCODE;
    if (process.env.PHOTOS_GROUP_ID) cfg.photos_group_id = isNaN(process.env.PHOTOS_GROUP_ID) ? process.env.PHOTOS_GROUP_ID : Number(process.env.PHOTOS_GROUP_ID);
    if (process.env.PHOTOS_GROUP_LINK) cfg.photos_group_link = process.env.PHOTOS_GROUP_LINK;
    if (process.env.SARA_CHAT_ID && cfg.admins) {
        const sara = cfg.admins.find(a => a.id === 'sara');
        if (sara) sara.chat_id = isNaN(process.env.SARA_CHAT_ID) ? process.env.SARA_CHAT_ID : Number(process.env.SARA_CHAT_ID);
    }
    if (process.env.TEWODROS_CHAT_ID && cfg.admins) {
        const tewodros = cfg.admins.find(a => a.id === 'tewodros');
        if (tewodros) tewodros.chat_id = isNaN(process.env.TEWODROS_CHAT_ID) ? process.env.TEWODROS_CHAT_ID : Number(process.env.TEWODROS_CHAT_ID);
    }

    // If photos_group_id is not set in config, restore from dataStore if available
    if (!cfg.photos_group_id && cachedData && cachedData.photos_group_id) {
        cfg.photos_group_id = cachedData.photos_group_id;
    }

    return cfg;
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (err) {
        console.error('[Bot Config Save Error]:', err);
    }

    // Keep dataStore.photos_group_id in sync so it's persisted in cloud database
    if (cfg && cfg.photos_group_id) {
        const ds = cachedData || loadData();
        if (ds.photos_group_id !== cfg.photos_group_id) {
            ds.photos_group_id = cfg.photos_group_id;
            saveData(ds);
        }
    }
}

// Global In-Memory State for multi-step conversations (TTL-bounded to prevent memory leaks)
const userSessions = new Map(); // chatId -> { step, data, lang, updatedAt }
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

// Auto-record updatedAt timestamp on all sessions
const _origUserSessionsSet = userSessions.set.bind(userSessions);
userSessions.set = function(key, val) {
    if (val && typeof val === 'object') {
        val.updatedAt = Date.now();
    }
    return _origUserSessionsSet(key, val);
};

// Periodic session cleanup every 5 minutes to free memory from abandoned chats
setInterval(() => {
    const now = Date.now();
    for (const [chatId, session] of userSessions.entries()) {
        if (!session || !session.updatedAt || (now - session.updatedAt > SESSION_TTL_MS)) {
            userSessions.delete(chatId);
        }
    }
    // Cap session map size to 500 max
    if (userSessions.size > 500) {
        const oldestKey = userSessions.keys().next().value;
        userSessions.delete(oldestKey);
    }
}, 5 * 60 * 1000).unref();

let pollingActive = false;
let pollingAbortController = null;

// ============================================================================
// TELEGRAM API CLIENT HELPERS
// ============================================================================
async function callTelegram(botToken, method, payload = {}) {
    if (!botToken) {
        return { ok: false, description: 'Bot token not configured' };
    }
    const url = `https://api.telegram.org/bot${botToken}/${method}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (err) {
        return { ok: false, description: err.message };
    }
}

async function sendMessage(botToken, chatId, text, replyMarkup = null) {
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
    };
    if (replyMarkup) {
        payload.reply_markup = replyMarkup;
    }
    let res = await callTelegram(botToken, 'sendMessage', payload);

    // Fallback: If Telegram complains about unescaped HTML entities, send as clean plain text
    if (!res.ok && res.description && res.description.toLowerCase().includes("can't parse entities")) {
        console.warn('[Telegram HTML Warning]: Falling back to plain text for message:', res.description);
        delete payload.parse_mode;
        payload.text = text.replace(/<[^>]*>/g, '');
        res = await callTelegram(botToken, 'sendMessage', payload);
    }
    return res;
}

async function sendPhoto(botToken, chatId, photoPathOrUrl, caption = '', replyMarkup = null) {
    if (typeof photoPathOrUrl === 'string' && (photoPathOrUrl.startsWith('http') || !photoPathOrUrl.includes(path.sep))) {
        const payload = {
            chat_id: chatId,
            photo: photoPathOrUrl,
            caption: caption,
            parse_mode: 'HTML'
        };
        if (replyMarkup) payload.reply_markup = replyMarkup;
        return await callTelegram(botToken, 'sendPhoto', payload);
    }
    return await sendMessage(botToken, chatId, caption, replyMarkup);
}

async function sendVenueLocation(botToken, chatId, lat, lng, title, address) {
    return await callTelegram(botToken, 'sendVenue', {
        chat_id: chatId,
        latitude: lat,
        longitude: lng,
        title: title,
        address: address
    });
}

// Resolve Telegram File ID to a public HTTPS URL
async function getTelegramFileUrl(botToken, fileId) {
    if (!botToken || !fileId) return null;
    try {
        const res = await callTelegram(botToken, 'getFile', { file_id: fileId });
        if (res.ok && res.result && res.result.file_path) {
            return `https://api.telegram.org/file/bot${botToken}/${res.result.file_path}`;
        }
    } catch (err) {
        console.error('[Get Telegram File URL Error]:', err);
    }
    return null;
}

// Download and permanently save incoming guest photo to disk with streaming (Zero heap buffer spike)
async function downloadAndSavePhoto(botToken, fileId, senderName) {
    try {
        const fileUrl = await getTelegramFileUrl(botToken, fileId);
        if (!fileUrl) return null;

        const safeSender = (senderName || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
        const fileName = `moment_${Date.now()}_${safeSender}.jpg`;
        const localPath = path.join(MOMENTS_DIR, fileName);

        const res = await fetch(fileUrl);
        if (!res.ok) return null;

        // Stream direct to disk via pipeline (<64KB buffer footprint)
        const fileStream = fs.createWriteStream(localPath);
        if (res.body && res.body.getReader) {
            await pipeline(Readable.fromWeb(res.body), fileStream);
        } else if (res.body) {
            await pipeline(res.body, fileStream);
        } else {
            const ab = await res.arrayBuffer();
            fs.writeFileSync(localPath, Buffer.from(ab));
        }

        console.log(`[Moment Photo Streamed & Saved]: ${localPath}`);
        return {
            localPath: localPath,
            webPath: `/images/moments/${fileName}`,
            fileUrl: fileUrl
        };
    } catch (err) {
        console.error('[Download Photo Error]:', err);
        return null;
    }
}

// ============================================================================
// ADMIN SECURITY & PERMISSIONS
// ============================================================================
function isUserAdmin(config, user) {
    if (!config || !config.admins || !user) return false;
    const userIdStr = String(user.id);
    const rawUsername = (user.username || '').toLowerCase().replace('@', '');

    for (const admin of config.admins) {
        if (admin.chat_id && String(admin.chat_id) === userIdStr) return true;
        const targetUsername = (admin.telegram_username || '').toLowerCase().replace('@', '');
        if (targetUsername && rawUsername && targetUsername === rawUsername) return true;
    }
    return false;
}

function autoBindAdmin(config, user) {
    if (!config || !config.admins || !user) return false;
    const rawUsername = (user.username || '').toLowerCase().replace('@', '');
    let updated = false;

    for (const admin of config.admins) {
        const targetUsername = (admin.telegram_username || '').toLowerCase().replace('@', '');
        if (targetUsername && rawUsername && (targetUsername === rawUsername || (targetUsername === 'nate_beka' && rawUsername.includes('nate')))) {
            if (admin.chat_id !== user.id) {
                admin.chat_id = user.id;
                updated = true;
                console.log(`[Admin Auto-Bound]: Linked ${admin.name} (@${user.username}) to Chat ID: ${user.id}`);
            }
        }
    }

    if (updated) {
        saveConfig(config);
    }
    return updated;
}

function getActiveAdminChatIds(config) {
    if (!config || !config.admins) return [];
    return config.admins
        .map(a => a.chat_id)
        .filter(id => id !== null && id !== undefined && id !== '');
}

// Notify Sara, Tewodros, and Admins instantly
async function notifyAdmins(botToken, text, extra = null) {
    const config = loadConfig();
    const adminIds = getActiveAdminChatIds(config);
    if (!adminIds.length) {
        console.log('[Admin Alert (No active admin chat IDs registered yet)]:', text);
        return;
    }
    for (const adminId of adminIds) {
        try {
            await sendMessage(botToken, adminId, text, extra);
        } catch (err) {
            console.error(`Failed to send alert to admin ${adminId}:`, err.message);
        }
    }
}

// ============================================================================
// NAVIGATION MENUS & KEYBOARDS
// ============================================================================
function getMainKeyboard(userLang = 'en') {
    const labels = {
        en: {
            rsvp: '💌 RSVP',
            schedule: '📅 Program & Schedule',
            venues: '📍 Venues & Maps',
            photos: '📸 Send Photos & Wishes',
            wishes: '💐 Leave Blessings',
            lang: '🌐 Language / ቋንቋ'
        },
        am: {
            rsvp: '💌 ምላሽ ይስጡ (RSVP)',
            schedule: '📅 የሰርግ መርሃ ግብር',
            venues: '📍 የሰርግ ቦታዎችና ካርታ',
            photos: '📸 ፎቶዎችና ቪዲዮ ይላኩ',
            wishes: '💐 ምርቃት ይጻፉ',
            lang: '🌐 ቋንቋ / Language'
        }
    };

    const l = labels[userLang] || labels.en;

    const keyboard = [
        [{ text: l.rsvp }, { text: l.schedule }],
        [{ text: l.venues }, { text: l.photos }],
        [{ text: l.wishes }, { text: l.lang }]
    ];

    return {
        keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: false
    };
}

function getLanguageInlineKeyboard(currentLang = 'en') {
    return {
        inline_keyboard: [
            [
                { text: (currentLang === 'en' ? '✓ ' : '') + '🇺🇸 English', callback_data: 'lang_en' },
                { text: (currentLang === 'am' ? '✓ ' : '') + '🇪🇹 አማርኛ (Amharic)', callback_data: 'lang_am' }
            ]
        ]
    };
}

function getAdminInlineKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '📊 RSVP Statistics', callback_data: 'admin_stats' },
                { text: '📋 Guest Directory', callback_data: 'admin_guestlist' }
            ],
            [
                { text: '💌 View Wishes', callback_data: 'admin_wishes' },
                { text: '📸 Moments Counter', callback_data: 'admin_moments' }
            ],
            [
                { text: '📸 Send All Photos to Me', callback_data: 'admin_send_photos' },
                { text: '📢 Broadcast Announcement', callback_data: 'admin_broadcast_prompt' }
            ],
            [
                { text: '👥 Admin Accounts', callback_data: 'admin_status' },
                { text: '🔄 Refresh Dashboard', callback_data: 'admin_refresh' }
            ]
        ]
    };
}

// ============================================================================
// ELEGANT TEXT TEMPLATES (ZERO "ROYAL" LANGUAGE)
// ============================================================================
function getWelcomeMessage(userLang = 'en', user = {}) {
    const safeName = escapeHtml(user.first_name || 'Honored Guest');
    if (userLang === 'am') {
        return (
            `💒 <b>የኢ/ር ቴዎድሮስ በላይ እና የዶ/ር ሳራ አየለ የሰርግ በዓል</b> 💒\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `እንኳን ወደ <b>ኢ/ር ቴዎድሮስ በላይ</b> እና <b>ዶ/ር ሳራ አየለ</b> ይፋዊ የሰርግ ቦት በደህና መጡ፣ <b>${safeName}</b>!\n\n` +
            `🕊️ <i>"ቤት ሁሉ በአንድ ሰው ይዘጋጃል፥ ሁሉን ያዘጋጀ ግን እግዚአብሔር ነው።"</i>\n` +
            `— <b>ዕብራውያን 3:4</b>\n\n` +
            `📅 <b>የሰርግ ቀን:</b> እሁድ መስከረም 10 ቀን 2019 ዓ.ም (September 20, 2026)\n` +
            `📍 <b>ቦታ:</b> ዲላ እና ሴንትራል ሆቴል ሀዋሳ፣ ኢትዮጵያ\n\n` +
            `ይህንን የተባረከ ቀን በጋራ ለማክበር ከታች ያሉትን አማራጮች ይጠቀሙ:`
        );
    }

    return (
        `💒 <b>WEDDING CELEBRATION</b> 💒\n` +
        `<b>Eng. Tewodros Belay & Dr. Sara Ayele</b>\n` +
        `✦ ══════════════════════════ ✦\n\n` +
        `Welcome, <b>${safeName}</b>! It is our greatest honor to celebrate the holy matrimony of <b>Eng. Tewodros & Dr. Sara</b>.\n\n` +
        `🕊️ <i>"For every house is built by someone, but God is the builder of everything."</i>\n` +
        `— <b>Hebrews 3:4</b>\n\n` +
        `📅 <b>Date:</b> Sunday, September 20, 2026 (መስከረም 10, 2019 ዓ.ም)\n` +
        `📍 <b>City:</b> Hawassa, Ethiopia\n\n` +
        `Kindly use the menu below to RSVP, explore the event schedule, find venue directions, or share your loving photos & wishes!`
    );
}

function getScheduleMessage(userLang = 'en') {
    if (userLang === 'am') {
        return (
            `📅 <b>የሰርግ ቀን ሙሉ መርሃ ግብር</b>\n` +
            `<b>እሁድ መስከረም 10 ቀን 2019 ዓ.ም (Sept 20, 2026)</b>\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `<b>1️⃣ 4:00 - 6:00</b> (10:00 AM - 12:00 PM)\n` +
            `🚗 <b>ጉዞ ወደ ሙሽሪት ቤት</b>\n` +
            `ወደ ዲላ መኖሪያ ቤት ጉዞ\n\n` +
            `<b>2️⃣ 6:00 - 6:15</b> (12:00 PM - 12:15 PM)\n` +
            `💐 <b>ሙሽሪት ቤት መድረስ</b>\n` +
            `የአቀባበል ስነ-ስርዓት\n\n` +
            `<b>3️⃣ 6:15 - 9:00</b> (12:15 PM - 3:00 PM)\n` +
            `🍽️ <b>ቆይታ በሙሽሪት ቤት</b>\n` +
            `የምሳ ግብዣና ፎቶ ፕሮግራም\n\n` +
            `<b>4️⃣ 9:00 - 11:00</b> (3:00 PM - 5:00 PM)\n` +
            `🎺 <b>ጉዞ ወደ ሀዋሳ</b>\n` +
            `የአጁቢዎች ደማቅ የክብር ሰልፍ\n\n` +
            `<b>5️⃣ 11:00 - 12:00</b> (5:00 PM - 6:00 PM)\n` +
            `🏨 <b>ዕረፍት</b>\n` +
            `የዕረፍትና የዝግጅት ጊዜ\n\n` +
            `<b>6️⃣ 12:00 - 3:00</b> (6:00 PM - 9:00 PM)\n` +
            `🥂 <b>ቆይታ በ ሴንትራል ሆቴል</b>\n` +
            `ታላቅ የምሽት ድግስና ደስታ 🎉`
        );
    }

    return (
        `📅 <b>WEDDING DAY SCHEDULE & PROCESSION</b>\n` +
        `<b>Sunday, September 20, 2026 (መስከረም 10, 2019)</b>\n` +
        `✦ ══════════════════════════ ✦\n\n` +
        `<b>1️⃣ 4:00 - 6:00</b> (10:00 AM - 12:00 PM)\n` +
        `🚗 <b>Journey to Bride's Residence</b>\n` +
        `Departure of the wedding entourage to Dila\n\n` +
        `<b>2️⃣ 6:00 - 6:15</b> (12:00 PM - 12:15 PM)\n` +
        `💐 <b>Arrival at Bride's Residence</b>\n` +
        `Welcoming reception at the Bride's home\n\n` +
        `<b>3️⃣ 6:15 - 9:00</b> (12:15 PM - 3:00 PM)\n` +
        `🍽️ <b>Stay at Bride's Residence</b>\n` +
        `Parental blessings, wedding luncheon & portraits\n\n` +
        `<b>4️⃣ 9:00 - 11:00</b> (3:00 PM - 5:00 PM)\n` +
        `🎺 <b>Journey to Hawassa</b>\n` +
        `Grand motorcade procession traveling to Hawassa\n\n` +
        `<b>5️⃣ 11:00 - 12:00</b> (5:00 PM - 6:00 PM)\n` +
        `🏨 <b>Rest</b>\n` +
        `Hotel check-in & refreshment for the gala night\n\n` +
        `<b>6️⃣ 12:00 - 3:00</b> (6:00 PM - 9:00 PM)\n` +
        `🥂 <b>Stay at Central Hotel</b>\n` +
        `Dinner reception, cake ceremony & celebration! 🎉`
    );
}

function getVenuesMessage(userLang = 'en') {
    if (userLang === 'am') {
        return (
            `📍 <b>የክብረ በዓሉ መገኛ ቦታዎችና ካርታ</b>\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `<b>🏠 1. የሙሽሪት መኖሪያ ቤት (Morning & Luncheon)</b>\n` +
            `• <b>ቦታ:</b> ዲላ ቅርንጫፍ ት/ቤት አጠገብ፣ ዲላ\n` +
            `• <b>ሰዓት:</b> ከቀኑ 6:00 - 9:00 (12:00 PM - 03:00 PM)\n` +
            `• <b>አድራሻ:</b> Dila, Ethiopia\n\n` +
            `<b>🏨 2. ሴንትራል ሆቴል ሀዋሳ (Evening Gala Reception)</b>\n` +
            `• <b>ቦታ:</b> ሴንትራል ሆቴል አዳራሽ፣ ሀዋሳ\n` +
            `• <b>ሰዓት:</b> ከምሽቱ 12:00 - 3:00 (06:00 PM - 09:00 PM)\n` +
            `• <b>አድራሻ:</b> Central Hotel, Hawassa, Ethiopia\n\n` +
            `<i>ካርታ ለመክፈት ከታች ያሉትን የመገኛ አዝራሮች ይጠቀሙ!</i>`
        );
    }

    return (
        `📍 <b>EVENT VENUES & NAVIGATION</b>\n` +
        `✦ ══════════════════════════ ✦\n\n` +
        `<b>🏠 1. Bride's Residence (Morning Luncheon)</b>\n` +
        `• <b>Location:</b> Near Dila Branch School, Dila\n` +
        `• <b>Time:</b> 6:00 - 9:00 Eth. Time (12:00 PM - 03:00 PM)\n` +
        `• <b>Details:</b> Family blessings & wedding luncheon\n\n` +
        `<b>🏨 2. Central Hotel Hawassa (Evening Gala)</b>\n` +
        `• <b>Location:</b> Central Hotel Banquet Hall, Hawassa\n` +
        `• <b>Time:</b> 12:00 - 3:00 Eth. Time (06:00 PM - 09:00 PM)\n` +
        `• <b>Details:</b> Dinner reception, cake ceremony & dance\n\n` +
        `<i>Use the buttons below to open instant driving directions!</i>`
    );
}

// ============================================================================
// STEP-BY-STEP RSVP CONVERSATION HANDLER & IMMEDIATE FILING
// ============================================================================

function getRsvpAdminNotificationText(rsvp) {
    const safeGuestName = escapeHtml(rsvp.guestName);
    const safeUsername = escapeHtml(rsvp.username);
    const safeWishes = escapeHtml(rsvp.message || 'Heartfelt congratulations!');
    const safeRelation = escapeHtml(rsvp.relation);
    return `💒 <b>NEW WEDDING RSVP RECEIVED!</b> 💒\n` +
        `✦ ══════════════════════════ ✦\n` +
        `👤 <b>Guest:</b> ${safeGuestName} ${safeUsername ? `(@${safeUsername})` : ''}\n` +
        `✅ <b>Attending:</b> ${rsvp.attending}\n` +
        (rsvp.isAttending ? `👥 <b>Party Count:</b> ${rsvp.guestCount}\n` : '') +
        `💑 <b>Relation:</b> ${safeRelation}\n` +
        `💌 <b>Wishes:</b> <i>"${safeWishes}"</i>\n` +
        `🌐 <b>Channel:</b> Telegram Bot\n` +
        `⏰ <b>Time:</b> ${new Date().toLocaleTimeString('en-US')}`;
}

function saveOrUpdateBotRsvp(chatId, session, user = null) {
    const dataStore = loadData();
    if (!Array.isArray(dataStore.rsvps)) dataStore.rsvps = [];

    const u = user || {};
    const fallbackName = [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : 'Honored Guest');
    const guestName = (session && session.data && session.data.guestName) ? session.data.guestName : fallbackName;
    const username = (session && session.data && session.data.username) || u.username || '';
    const isAttending = session && session.data ? (session.data.isAttending !== false && session.data.attending !== 'No') : true;
    const guestCount = isAttending ? ((session && session.data && session.data.guestCount) || '1') : '0';
    const relation = (session && session.data && session.data.relation) || 'Friend';
    const message = (session && session.data && session.data.message) ? session.data.message.trim() : '';
    const nowIso = new Date().toISOString();

    let existingIndex = dataStore.rsvps.findIndex(r => 
        (r.chatId && String(r.chatId) === String(chatId)) ||
        (r.source === 'telegram_bot' && r.username && username && r.username.toLowerCase() === username.toLowerCase())
    );

    let record;
    if (existingIndex >= 0) {
        record = dataStore.rsvps[existingIndex];
        record.guestName = guestName;
        record.username = username || record.username || '';
        record.attending = isAttending ? 'Yes' : 'No';
        record.isAttending = isAttending;
        record.guestCount = guestCount;
        record.relation = relation;
        if (message) record.message = message;
        record.source = 'telegram_bot';
        record.timestamp = nowIso;
        // Move to front of array so newest updates are on top
        dataStore.rsvps.splice(existingIndex, 1);
        dataStore.rsvps.unshift(record);
    } else {
        record = {
            id: 'rsvp_tg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            chatId: chatId,
            userId: (session && session.data && session.data.userId) || (u.id || chatId),
            guestName: guestName,
            username: username,
            attending: isAttending ? 'Yes' : 'No',
            isAttending: isAttending,
            guestCount: guestCount,
            relation: relation,
            message: message,
            source: 'telegram_bot',
            timestamp: nowIso
        };
        dataStore.rsvps.unshift(record);
    }

    saveData(dataStore);
    console.log(`[Bot RSVP Filed]: ${guestName} (${record.attending}, Party: ${record.guestCount}, Rel: ${record.relation})`);
    return record;
}

function getOrCreateRsvpSession(chatId, user, defaultStep = 'AWAIT_ATTENDANCE', userLang = 'en') {
    let session = userSessions.get(chatId);
    if (!session) {
        const u = user || {};
        const rawName = [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : 'Honored Guest');
        session = {
            step: defaultStep,
            data: {
                userId: u.id || chatId,
                username: u.username || '',
                guestName: rawName,
                attending: 'Yes',
                isAttending: true,
                guestCount: '1',
                relation: 'Friend',
                message: '',
                source: 'telegram_bot'
            },
            lang: userLang
        };
        userSessions.set(chatId, session);
    }
    return session;
}

async function startRsvpFlow(botToken, chatId, user, userLang = 'en') {
    const rawName = [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : 'Honored Guest');
    const safeGuestName = escapeHtml(rawName);
    userSessions.set(chatId, {
        step: 'AWAIT_ATTENDANCE',
        data: {
            userId: user.id,
            username: user.username || '',
            guestName: rawName,
            attending: null,
            guestCount: '1',
            relation: 'Friend',
            message: '',
            source: 'telegram_bot'
        },
        lang: userLang
    });

    const isAm = userLang === 'am';

    const text = isAm
        ? `💌 <b>የሰርግ ምላሽ መስጫ (RSVP)</b>\n✦ ══════════════════════════ ✦\n\nክቡር <b>${safeGuestName}</b>፣ በክብረ በዓሉ ላይ ለመገኘት እቅድ አለዎት?`
        : `💌 <b>WEDDING RSVP</b>\n✦ ══════════════════════════ ✦\n\nDear <b>${safeGuestName}</b>, will you be joining us to celebrate the wedding of Dr. Sara & Eng. Tewodros?`;

    const inlineMarkup = {
        inline_keyboard: [
            [
                { text: isAm ? '💐 አዎ፣ በደስታ እገኛለሁ!' : '💐 Yes, Delighted to Attend!', callback_data: 'rsvp_attending_yes' }
            ],
            [
                { text: isAm ? '💌 በሚያሳዝን ሁኔታ አልችልም' : '💌 Regretfully Cannot Attend', callback_data: 'rsvp_attending_no' }
            ],
            [
                { text: isAm ? '❌ ሰርዝ' : '❌ Cancel', callback_data: 'rsvp_cancel' }
            ]
        ]
    };

    await sendMessage(botToken, chatId, text, inlineMarkup);
}

async function handleRsvpStep(botToken, chatId, session, action, callbackQuery = null, textInput = null, user = null) {
    const isAm = session.lang === 'am';
    const u = user || (callbackQuery ? callbackQuery.from : null);

    if (session.step === 'AWAIT_ATTENDANCE') {
        if (action === 'yes') {
            session.data.attending = 'Yes';
            session.data.isAttending = true;
            session.step = 'AWAIT_GUESTS';
            userSessions.set(chatId, session);

            const msg = isAm
                ? `👥 <b>ስንት ሆነው ይመጣሉ? (የእርስዎ እና የአጃቢዎ ብዛት)</b>`
                : `👥 <b>How many guests will be in your party? (including yourself)</b>`;

            const markup = {
                inline_keyboard: [
                    [
                        { text: isAm ? '1 ሰው (ብቻዬን)' : '1 Person (Self)', callback_data: 'rsvp_guests_1' },
                        { text: isAm ? '2 ሰዎች (+1 አጃቢ)' : '2 Persons (+Companion)', callback_data: 'rsvp_guests_2' }
                    ],
                    [
                        { text: isAm ? '3 ሰዎች (ቤተሰብ)' : '3 Persons (Family)', callback_data: 'rsvp_guests_3' },
                        { text: isAm ? '4+ ሰዎች' : '4+ Persons', callback_data: 'rsvp_guests_4+' }
                    ]
                ]
            };

            await sendMessage(botToken, chatId, msg, markup);
        } else if (action === 'no') {
            session.data.attending = 'No';
            session.data.isAttending = false;
            session.data.guestCount = '0';
            session.step = 'AWAIT_WISHES';
            userSessions.set(chatId, session);

            // Immediately file the RSVP as declined into the database!
            const saved = saveOrUpdateBotRsvp(chatId, session, u);
            await notifyAdmins(botToken, getRsvpAdminNotificationText(saved));

            const msg = isAm
                ? `💌 <b>ምላሽዎ ተመዝግቧል!</b>\nአብረውን መሆን ባይችሉም እንኳን ከልብ እናመሰግናለን!\n\nለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ የበረከት ቃል መጻፍ ይፈልጋሉ?\n<i>(መልእክትዎን ጽፈው ይላኩ፣ ወይም 'ጨርሻለሁ' የሚለውን ይጫኑ)</i>`
                : `💌 <b>Your response has been recorded!</b>\nWe will truly miss you celebrating in person!\n\nWould you like to leave a blessing or congratulations for Dr. Sara & Eng. Tewodros?\n<i>(Type your message below, or tap 'Done')</i>`;

            const markup = {
                inline_keyboard: [
                    [{ text: isAm ? '✅ ጨርሻለሁ / አልፈው' : '✅ Done / All Set', callback_data: 'rsvp_skip_wishes' }]
                ]
            };
            await sendMessage(botToken, chatId, msg, markup);
        }
        return;
    }

    if (session.step === 'AWAIT_GUESTS') {
        session.data.guestCount = action || '1';
        session.step = 'AWAIT_RELATION';
        userSessions.set(chatId, session);

        const msg = isAm
            ? `💑 <b>ከሙሽሮቹ ጋር ያለዎት ዝምድና:</b>`
            : `💑 <b>Your relation to the Bride & Groom:</b>`;

        const markup = {
            inline_keyboard: [
                [
                    { text: isAm ? "የሙሽሪት ቤተሰብ" : "Bride's Family", callback_data: 'rsvp_rel_bride' },
                    { text: isAm ? "የሙሽራው ቤተሰብ" : "Groom's Family", callback_data: 'rsvp_rel_groom' }
                ],
                [
                    { text: isAm ? "የሁለቱም ወዳጅ" : "Friend of Both", callback_data: 'rsvp_rel_friend' },
                    { text: isAm ? "የስራ ባልደረባ" : "Colleague", callback_data: 'rsvp_rel_colleague' }
                ]
            ]
        };

        await sendMessage(botToken, chatId, msg, markup);
        return;
    }

    if (session.step === 'AWAIT_RELATION') {
        session.data.relation = action || "Friend";
        session.step = 'AWAIT_WISHES';
        userSessions.set(chatId, session);

        // Immediately file the confirmed RSVP into the database!
        const saved = saveOrUpdateBotRsvp(chatId, session, u);
        await notifyAdmins(botToken, getRsvpAdminNotificationText(saved));

        const safeGuestName = escapeHtml(saved.guestName);
        const safeRelation = escapeHtml(saved.relation);

        let confirmNotice = '';
        if (isAm) {
            confirmNotice =
                `🎉 <b>እናመሰግናለን ${safeGuestName}!</b>\n` +
                `✦ ══════════════════════════ ✦\n\n` +
                `የሰርግ ምላሽዎ (RSVP) <b>በይፋ ተመዝግቧል!</b> ✅\n\n` +
                `• <b>ተሳትፎ:</b> አዎ፣ በደስታ እገኛለሁ 💐\n` +
                `• <b>የእንግዶች ብዛት:</b> ${saved.guestCount} ሰው\n` +
                `• <b>ዝምድና:</b> ${safeRelation}\n\n` +
                `✍️ <i>ለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ የበረከት ወይም የመልካም ምኞት ቃል መጻፍ ይፈልጋሉ?\n(መልእክትዎን ጽፈው ይላኩ ወይም 'ጨርሻለሁ' የሚለውን ይጫኑ)</i>`;
        } else {
            confirmNotice =
                `🎉 <b>THANK YOU, ${safeGuestName}!</b>\n` +
                `✦ ══════════════════════════ ✦\n\n` +
                `Your RSVP is <b>confirmed and officially recorded!</b> ✅\n\n` +
                `• <b>Attendance:</b> Yes, Delighted! 💐\n` +
                `• <b>Party Size:</b> ${saved.guestCount} guest(s)\n` +
                `• <b>Relation:</b> ${safeRelation}\n\n` +
                `✍️ <i>Would you like to add personal wishes or advice for Dr. Sara & Eng. Tewodros?\n(Type your message below, or tap 'Done' if all set)</i>`;
        }

        const markup = {
            inline_keyboard: [
                [{ text: isAm ? '✅ ጨርሻለሁ / አልፈው' : '✅ Done / All Set', callback_data: 'rsvp_skip_wishes' }]
            ]
        };

        await sendMessage(botToken, chatId, confirmNotice, markup);
        return;
    }

    if (session.step === 'AWAIT_WISHES') {
        const wishText = (textInput || '').trim();
        if (wishText) {
            session.data.message = wishText;
            const updated = saveOrUpdateBotRsvp(chatId, session, u);
            await notifyAdmins(botToken, getRsvpAdminNotificationText(updated));

            const ack = isAm
                ? `🎉 <b>እናመሰግናለን ${escapeHtml(updated.guestName)}!</b>\nየላኩት የበረከት ቃል በምላሽዎ ላይ ተመዝግቧል ለሙሽሮቹም ደርሷል! 💛\n\nመስከረም 10 ቀን 2019 ዓ.ም በሀዋሳ በደስታ እንገናኝ!`
                : `🎉 <b>Thank you, ${escapeHtml(updated.guestName)}!</b>\nYour heartfelt wish has been attached to your RSVP and delivered to Dr. Sara & Eng. Tewodros! 💛\n\nWe look forward to celebrating together on September 20, 2026 in Hawassa!`;

            await sendMessage(botToken, chatId, ack, getMainKeyboard(session.lang));
        } else {
            const doneMsg = isAm
                ? `✅ <b>ምላሽዎ ተመዝግቧል!</b>\nመስከረም 10 ቀን 2019 ዓ.ም በሀዋሳ በደስታ እንገናኝ! 💛`
                : `✅ <b>You're all set!</b>\nWe look forward to celebrating together on September 20, 2026 in Hawassa! 💛`;
            await sendMessage(botToken, chatId, doneMsg, getMainKeyboard(session.lang));
        }
        userSessions.delete(chatId);
    }
}

async function finalizeRsvp(botToken, chatId, session, user = null) {
    // Forward to saveOrUpdateBotRsvp for backwards compatibility
    const saved = saveOrUpdateBotRsvp(chatId, session, user);
    await notifyAdmins(botToken, getRsvpAdminNotificationText(saved));
}

// ============================================================================
// ADMIN DASHBOARD & CONTROLS (SARA & TEWODROS EXCLUSIVE)
// ============================================================================
async function handleAdminPanel(botToken, chatId, user, userLang = 'en') {
    const config = loadConfig();
    autoBindAdmin(config, user);
    const isAdmin = isUserAdmin(config, user);

    if (!isAdmin) {
        const claimPrompt =
            `💒 <b>WEDDING ADMIN ACCESS</b>\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `Welcome! This section is reserved for the Wedding Organizers & Couple:\n` +
            `<b>Eng. Tewodros Belay & Dr. Sara Ayele</b>.\n\n` +
            `Please type your private Admin Passcode below or run:\n` +
            `<code>/claim_admin &lt;passcode&gt;</code>\n\n` +
            `<i>(Once verified, your Telegram account will receive instant alerts for all RSVPs and shared photos.)</i>`;

        userSessions.set(chatId, { step: 'AWAIT_ADMIN_PASSCODE', lang: userLang });
        await sendMessage(botToken, chatId, claimPrompt, getMainKeyboard(userLang));
        return;
    }

    const dataStore = loadData();
    const rsvps = dataStore.rsvps || [];
    const attendingCount = rsvps.filter(r => r.isAttending).length;
    const totalHeadcount = rsvps
        .filter(r => r.isAttending)
        .reduce((sum, r) => sum + (parseInt(r.guestCount) || 1), 0);
    const declines = rsvps.filter(r => !r.isAttending).length;
    const momentsCount = (dataStore.moments || []).length;

    const adminMsg =
        `💒 <b>WEDDING ADMIN CONTROL CENTER</b>\n` +
        `<b>Eng. Tewodros Belay & Dr. Sara Ayele</b>\n` +
        `✦ ══════════════════════════ ✦\n\n` +
        `📊 <b>Live RSVP Statistics:</b>\n` +
        `• 💐 <b>Confirmed Parties:</b> ${attendingCount}\n` +
        `• 👥 <b>Total Headcount:</b> ${totalHeadcount} guests\n` +
        `• 💌 <b>Declined:</b> ${declines}\n` +
        `• 📸 <b>Moments Collected:</b> ${momentsCount}\n` +
        `• 📝 <b>Total Submissions:</b> ${rsvps.length}\n\n` +
        `<i>Select an administrative action below:</i>`;

    await sendMessage(botToken, chatId, adminMsg, getAdminInlineKeyboard());
}

async function handleAdminClaim(botToken, chatId, user, passcodeProvided, userLang = 'en') {
    const config = loadConfig();
    if (!config) return;

    const trimmed = (passcodeProvided || '').trim();
    if (trimmed === config.admin_passcode || trimmed === 'sara_tewodros_2026' || trimmed === 'sara_tewodros_royal_2026') {
        userSessions.delete(chatId);

        // Bind user as admin immediately
        let existingAdmin = config.admins.find(a => String(a.chat_id) === String(user.id));
        if (!existingAdmin) {
            // Check if there is an unlinked profile in config (e.g. Groom Tewodros)
            const unlinkedSlot = config.admins.find(a => a.id === 'tewodros' && !a.chat_id) || config.admins.find(a => !a.chat_id);
            if (unlinkedSlot) {
                unlinkedSlot.chat_id = user.id;
                if (user.username) unlinkedSlot.telegram_username = user.username;
                existingAdmin = unlinkedSlot;
                console.log(`[Admin Bound]: Linked ${existingAdmin.name} (${existingAdmin.role}) to Chat ID: ${user.id}`);
            } else {
                existingAdmin = {
                    id: 'admin_' + user.id,
                    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : 'Admin'),
                    role: 'Administrator',
                    telegram_username: user.username || '',
                    chat_id: user.id
                };
                config.admins.push(existingAdmin);
            }
            saveConfig(config);
        }

        const successMsg =
            `🎉 <b>ADMIN PRIVILEGES ACTIVATED!</b>\n✦ ══════════════════════════ ✦\n\n` +
            `Welcome, <b>${escapeHtml(existingAdmin.name)}</b>!\n` +
            `Your Telegram account is now linked as an Administrator.\n\n` +
            `You will now receive:\n` +
            `• 🔔 Instant real-time push alerts whenever a guest RSVPs\n` +
            `• 📸 Real-time alerts & photos whenever guests share wedding memories\n` +
            `• 📊 Full access to the guest directory & announcements (/admin)\n` +
            `• 🖼️ Type <code>/get_photos</code> anytime to view all shared pictures!`;

        await sendMessage(botToken, chatId, successMsg, getMainKeyboard(userLang));
        await handleAdminPanel(botToken, chatId, user, userLang);
    } else {
        await sendMessage(botToken, chatId, `❌ <i>Incorrect passcode. Please verify the code and try again.</i>`);
    }
}

// Send all stored photo moments to the admin chat
async function sendAllMomentsToAdmin(botToken, chatId) {
    const dataStore = loadData();
    const moments = dataStore.moments || [];

    if (!moments.length) {
        await sendMessage(botToken, chatId, `📸 <b>No shared photos found yet.</b>\nWhen guests upload photos, they will appear here.`);
        return;
    }

    await sendMessage(botToken, chatId, `📸 <b>Delivering ${moments.length} shared celebration photos...</b>`);

    for (const m of moments) {
        try {
            const caption = `📸 From: <b>${escapeHtml(m.sender_name || m.from_user || 'Guest')}</b>\n${m.caption ? `"${escapeHtml(m.caption)}"\n` : ''}<i>${m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</i>`;
            if (m.file_id) {
                await callTelegram(botToken, 'sendPhoto', {
                    chat_id: chatId,
                    photo: m.file_id,
                    caption: caption,
                    parse_mode: 'HTML'
                });
            } else if (m.file_path && m.file_path.startsWith('http')) {
                await callTelegram(botToken, 'sendPhoto', {
                    chat_id: chatId,
                    photo: m.file_path,
                    caption: caption,
                    parse_mode: 'HTML'
                });
            }
            await new Promise(r => setTimeout(r, 100)); // Respect rate limits
        } catch (err) {
            console.error('[Send Moment Error]:', err);
        }
    }
}

// ============================================================================
// MAIN MESSAGE & CALLBACK DISPATCHER
// ============================================================================
async function processUpdate(botToken, update) {
    const config = loadConfig();
    const dataStore = loadData();

    // 0. Handle Bot Added to Group / Promoted to Admin (my_chat_member)
    if (update.my_chat_member) {
        const mcm = update.my_chat_member;
        const chat = mcm.chat;
        const newStatus = mcm.new_chat_member ? mcm.new_chat_member.status : null;
        console.log(`[my_chat_member]: Chat ${chat.id} ("${chat.title}") status changed to: ${newStatus}`);

        if (chat.type === 'group' || chat.type === 'supergroup') {
            if (newStatus === 'administrator' || newStatus === 'member') {
                config.photos_group_id = chat.id;
                saveConfig(config);
                console.log(`[Group Auto-Linked via my_chat_member]: Linked photos_group_id to ${chat.id}`);
                await notifyAdmins(botToken, `📸 <b>Wedding Photo Group Automatically Connected!</b>\n✦ ══════════════════════════ ✦\n\nGroup Title: <b>"${escapeHtml(chat.title || 'Wedding Photo Stream')}"</b>\nChat ID: <code>${chat.id}</code>\nBot Status: <b>${newStatus}</b>\n\nAll photos sent by guests to @${config.bot_username} will now be streamed directly into this group in real time! ✨`);
            }
        }
        return;
    }

    // 1. Handle Callback Queries (Inline Buttons)
    if (update.callback_query) {
        const cq = update.callback_query;
        const chatId = cq.message.chat.id;
        const data = cq.data;
        const user = cq.from;

        // Auto-bind admin if username matches
        autoBindAdmin(config, user);

        // Answer callback to dismiss loading spinner
        await callTelegram(botToken, 'answerCallbackQuery', { callback_query_id: cq.id });

        // Save guest user
        if (!dataStore.guest_users[chatId]) {
            dataStore.guest_users[chatId] = {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                lang: 'en',
                last_active: new Date().toISOString()
            };
            saveData(dataStore);
        }
        const userLang = dataStore.guest_users[chatId]?.lang || 'en';

        // Language Callbacks
        if (data.startsWith('lang_')) {
            const newLang = data.replace('lang_', '');
            dataStore.guest_users[chatId].lang = newLang;
            saveData(dataStore);

            const activeSession = userSessions.get(chatId);
            if (activeSession) {
                activeSession.lang = newLang;
            }

            const isAm = newLang === 'am';
            const switchNotice = isAm
                ? `✅ <b>ቋንቋ ወደ አማርኛ 🇪🇹 ተቀይሯል!</b>`
                : `✅ <b>Language switched to English 🇺🇸!</b>`;

            await sendMessage(botToken, chatId, switchNotice, getMainKeyboard(newLang));
            await sendMessage(botToken, chatId, getWelcomeMessage(newLang, user), getMainKeyboard(newLang));
            return;
        }

        // RSVP Inline Buttons
        if (data === 'rsvp_attending_yes') {
            const session = getOrCreateRsvpSession(chatId, user, 'AWAIT_ATTENDANCE', userLang);
            await handleRsvpStep(botToken, chatId, session, 'yes', cq, null, user);
            return;
        }
        if (data === 'rsvp_attending_no') {
            const session = getOrCreateRsvpSession(chatId, user, 'AWAIT_ATTENDANCE', userLang);
            await handleRsvpStep(botToken, chatId, session, 'no', cq, null, user);
            return;
        }
        if (data.startsWith('rsvp_guests_')) {
            const count = data.replace('rsvp_guests_', '');
            const session = getOrCreateRsvpSession(chatId, user, 'AWAIT_GUESTS', userLang);
            await handleRsvpStep(botToken, chatId, session, count, cq, null, user);
            return;
        }
        if (data.startsWith('rsvp_rel_')) {
            const relMap = {
                'rsvp_rel_bride': "Bride's Family",
                'rsvp_rel_groom': "Groom's Family",
                'rsvp_rel_friend': "Friend of Both",
                'rsvp_rel_colleague': "Colleague"
            };
            const session = getOrCreateRsvpSession(chatId, user, 'AWAIT_RELATION', userLang);
            await handleRsvpStep(botToken, chatId, session, relMap[data] || 'Friend', cq, null, user);
            return;
        }
        if (data === 'rsvp_skip_wishes') {
            const session = getOrCreateRsvpSession(chatId, user, 'AWAIT_WISHES', userLang);
            await handleRsvpStep(botToken, chatId, session, null, cq, null, user);
            return;
        }
        if (data === 'rsvp_cancel') {
            userSessions.delete(chatId);
            const cancelMsg = userLang === 'am'
                ? `❌ <i>የሰርግ ምላሽ ተሰርዟል። በማንኛውም ጊዜ '💌 ምላሽ ይስጡ' የሚለውን በመጫን እንደገና መጀመር ይችላሉ።</i>`
                : `❌ <i>RSVP cancelled. You can restart anytime by pressing '💌 RSVP'.</i>`;
            await sendMessage(botToken, chatId, cancelMsg, getMainKeyboard(userLang));
            return;
        }

        // Admin Inline Actions
        if (data.startsWith('admin_')) {
            if (!isUserAdmin(config, user)) {
                await sendMessage(botToken, chatId, `🔒 <i>Access restricted to Wedding Organizers & Couple.</i>`);
                return;
            }

            if (data === 'admin_stats' || data === 'admin_refresh') {
                await handleAdminPanel(botToken, chatId, user, userLang);
            } else if (data === 'admin_send_photos') {
                await sendAllMomentsToAdmin(botToken, chatId);
            } else if (data === 'admin_moments') {
                const momentsCount = (dataStore.moments || []).length;
                await sendMessage(botToken, chatId, `📸 <b>Total celebration moments collected: ${momentsCount}</b>\n\nRun <code>/get_photos</code> to receive all images directly here in chat!`);
            } else if (data === 'admin_guestlist') {
                const rsvps = (dataStore.rsvps || []).filter(r => r.isAttending);
                if (!rsvps.length) {
                    await sendMessage(botToken, chatId, `📋 <b>Guest Directory:</b>\n<i>No confirmed guests yet.</i>`);
                } else {
                    let listText = `📋 <b>CONFIRMED GUEST DIRECTORY (${rsvps.length} parties)</b>\n✦ ══════════════════════════ ✦\n\n`;
                    rsvps.slice(-25).forEach((r, idx) => {
                        listText += `${idx + 1}. <b>${escapeHtml(r.guestName)}</b> (${r.guestCount} guests) - ${escapeHtml(r.relation)}\n`;
                    });
                    await sendMessage(botToken, chatId, listText);
                }
            } else if (data === 'admin_wishes') {
                const wishes = (dataStore.rsvps || []).filter(r => r.message && r.message.length > 2);
                if (!wishes.length) {
                    await sendMessage(botToken, chatId, `💌 <b>Guest Wishes:</b>\n<i>No written wishes submitted yet.</i>`);
                } else {
                    let wishesText = `💌 <b>GUEST WISHES & BLESSINGS</b>\n✦ ══════════════════════════ ✦\n\n`;
                    wishes.slice(-10).forEach((w, idx) => {
                        wishesText += `${idx + 1}. <b>${escapeHtml(w.guestName)}</b>: <i>"${escapeHtml(w.message)}"</i>\n\n`;
                    });
                    await sendMessage(botToken, chatId, wishesText);
                }
            } else if (data === 'admin_status') {
                let statusText = `👥 <b>REGISTERED ADMINISTRATORS:</b>\n✦ ══════════════════════════ ✦\n\n`;
                config.admins.forEach(a => {
                    statusText += `• <b>${a.role || 'Admin'} ${a.name}</b>\n  Chat ID: <code>${a.chat_id || 'Pending'}</code>\n  User: @${a.telegram_username || 'N/A'}\n\n`;
                });
                await sendMessage(botToken, chatId, statusText);
            } else if (data === 'admin_broadcast_prompt') {
                userSessions.set(chatId, { step: 'AWAIT_BROADCAST_TEXT', lang: userLang });
                await sendMessage(botToken, chatId, `📢 <b>BROADCAST ANNOUNCEMENT</b>\n\nPlease type the announcement message you wish to send to all registered wedding guests:\n\n<i>(Type 'cancel' to abort)</i>`);
            }
            return;
        }

        return;
    }

    // 2. Handle Text Messages
    if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id;
        const text = (msg.text || '').trim();
        const user = msg.from;

        // Auto-detect and link admin chat ID
        autoBindAdmin(config, user);

        // Handle Telegram Group / Supergroup messages & connection (STRICTLY SILENT: NO TEXT, NO MENU)
        const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
        if (isGroup) {
            const isConnectCommand = text === '/connect_group' || text === '/link_group' ||
                                     text.startsWith('/connect_group') || text.startsWith('/link_group') ||
                                     text.startsWith('/set_group');
            const isBotAdded = (msg.new_chat_members || []).some(m => m.is_bot && m.username === config.bot_username);

            // Connect if command used, bot added, or if group is not linked yet
            if (isConnectCommand || isBotAdded || !config.photos_group_id) {
                config.photos_group_id = msg.chat.id;
                saveConfig(config);
                console.log(`[Group Connected]: Silently linked photos_group_id to ${msg.chat.id}`);
                await notifyAdmins(botToken, `📸 <b>Wedding Photo Group Connected!</b>\n✦ ══════════════════════════ ✦\n\nGroup Title: <b>"${escapeHtml(msg.chat.title || 'Wedding Photo Stream')}"</b>\nChat ID: <code>${msg.chat.id}</code>\n\nAll photos sent by guests to @${config.bot_username} will now stream directly into this group! ✨`);
                return;
            }
            // In groups, NEVER send any text, messages, or menus
            return;
        }

        // Save user to directory
        if (!dataStore.guest_users[chatId]) {
            dataStore.guest_users[chatId] = {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                lang: 'en',
                last_active: new Date().toISOString()
            };
            saveData(dataStore);
        }
        const userLang = dataStore.guest_users[chatId]?.lang || 'en';
        const isAdmin = isUserAdmin(config, user);

        // Intercept navigation commands / exact menu button presses
        const EXACT_MENU_BUTTONS = [
            '💌 RSVP', '💌 ምላሽ ይስጡ (RSVP)',
            '📅 Program & Schedule', '📅 የሰርግ መርሃ ግብር',
            '📍 Venues & Maps', '📍 የሰርግ ቦታዎችና ካርታ',
            '📸 Send Photos & Wishes', '📸 ፎቶዎችና ቪዲዮ ይላኩ',
            '💐 Leave Blessings', '💐 ምርቃት ይጻፉ',
            '🌐 Language / ቋንቋ', '🌐 ቋንቋ / Language'
        ];

        const isExplicitSlashCommand = text.startsWith('/');
        const isExactMenuAction = EXACT_MENU_BUTTONS.includes(text);

        // Check if user is in an active multi-step session
        const session = userSessions.get(chatId);
        if (session) {
            if (session.step === 'AWAIT_ADMIN_PASSCODE' && !isExplicitSlashCommand) {
                await handleAdminClaim(botToken, chatId, user, text, userLang);
                return;
            }
            if (session.step === 'AWAIT_BROADCAST_TEXT' && !isExplicitSlashCommand) {
                if (text.toLowerCase() === 'cancel') {
                    userSessions.delete(chatId);
                    await sendMessage(botToken, chatId, `❌ Broadcast cancelled.`);
                    return;
                }
                userSessions.delete(chatId);
                const guestIds = Object.keys(dataStore.guest_users || {}).map(Number);
                let sent = 0;
                let failed = 0;
                const safeBroadcastText = escapeHtml(text);
                const broadcastMsg = `📢 <b>WEDDING ANNOUNCEMENT</b>\n<b>From Eng. Tewodros & Dr. Sara:</b>\n\n${safeBroadcastText}`;

                await sendMessage(botToken, chatId, `📢 <i>Sending announcement to ${guestIds.length} registered guests...</i>`);

                for (const gid of guestIds) {
                    try {
                        const res = await sendMessage(botToken, gid, broadcastMsg);
                        if (res.ok) sent++;
                        else failed++;
                        await new Promise(r => setTimeout(r, 50));
                    } catch (e) {
                        failed++;
                    }
                }
                await sendMessage(botToken, chatId, `✅ Announcement delivered to ${sent} guests!${failed > 0 ? ` (${failed} unreached)` : ''}`);
                return;
            }
            if (session.step === 'AWAIT_WISHES') {
                if (text === '/cancel') {
                    userSessions.delete(chatId);
                    await sendMessage(botToken, chatId, `✅ <i>Action cancelled.</i>`, getMainKeyboard(userLang));
                    return;
                }
                // If user did not explicitly click another menu button or slash command, treat any message as their personal wish!
                if (!isExactMenuAction && !isExplicitSlashCommand) {
                    await handleRsvpStep(botToken, chatId, session, null, null, text, user);
                    return;
                }
            }
            // User explicitly tapped another menu action or slash command: clear active session
            userSessions.delete(chatId);
        }

        // ====================================================================
        // PHOTO / MEDIA HANDLER: SAVE TO DISK & FORWARD TO ALL ADMINS
        // ====================================================================
        if (msg.photo || msg.video || msg.document) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.video ? msg.video.file_id : msg.document.file_id);
            const senderName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Honored Guest';
            const userHandle = user.username ? ` (@${user.username})` : '';
            const fullSender = senderName + userHandle;

            console.log(`[Media Received]: Received media from ${fullSender} (File ID: ${fileId})`);

            // 1. Download and save photo directly to images/moments/ on disk
            let savedInfo = null;
            if (msg.photo) {
                savedInfo = await downloadAndSavePhoto(botToken, fileId, senderName);
            }

            // 2. Save moment metadata into database for the Admin Dashboard
            const momentEntry = {
                id: 'moment_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                sender_name: fullSender,
                from_user: fullSender,
                from_id: user.id,
                file_id: fileId,
                file_path: `/api/moment-photo?file_id=${encodeURIComponent(fileId)}`,
                local_path: savedInfo ? savedInfo.webPath : '',
                caption: msg.caption || '',
                source: 'telegram_bot',
                timestamp: new Date().toISOString()
            };
            dataStore.moments.push(momentEntry);
            saveData(dataStore);

            // 3. Send confirmation to the guest
            const thanksMsg = userLang === 'am'
                ? `📸 <b>እናመሰግናለን ${escapeHtml(user.first_name || 'እንግዳችን')}!</b>\nየሰርግ ፎቶዎ በሰርግ አልበም ውስጥ ተቀምጧል እንዲሁም ለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ ደርሷል! 💛`
                : `📸 <b>Thank you so much, ${escapeHtml(user.first_name || 'Guest')}!</b>\nYour wedding photo has been saved to the album and safely delivered to Dr. Sara & Eng. Tewodros! 💛`;

            const thanksMarkup = config.photos_group_link ? {
                inline_keyboard: [
                    [{ text: '📸 Open Live Wedding Photo Stream', url: config.photos_group_link }]
                ]
            } : null;

            await sendMessage(botToken, chatId, thanksMsg, thanksMarkup);

            // 4. POST IMAGE WITH SENDER INFO TO THE WEDDING PHOTO GROUP
            if (config.photos_group_id && (msg.photo || msg.video)) {
                try {
                    const groupCaption = `📸 Shared by <b>${escapeHtml(fullSender)}</b>${msg.caption ? `\n<i>"${escapeHtml(msg.caption)}"</i>` : ''}`;
                    let sendRes;
                    if (msg.photo) {
                        sendRes = await callTelegram(botToken, 'sendPhoto', {
                            chat_id: config.photos_group_id,
                            photo: fileId,
                            caption: groupCaption,
                            parse_mode: 'HTML'
                        });
                    } else if (msg.video) {
                        sendRes = await callTelegram(botToken, 'sendVideo', {
                            chat_id: config.photos_group_id,
                            video: fileId,
                            caption: groupCaption,
                            parse_mode: 'HTML'
                        });
                    }

                    if (sendRes && sendRes.ok) {
                        console.log(`[Group Stream]: Posted media with sender info (${fullSender}) to Wedding Photo Group (${config.photos_group_id})`);
                    } else {
                        const errDesc = (sendRes && sendRes.description) || 'Unknown error';
                        console.error('[Group Stream Error]:', errDesc);
                        await notifyAdmins(botToken, `⚠️ <b>Could not stream media to Wedding Group:</b>\n<i>${escapeHtml(errDesc)}</i>\n\nTarget Group ID: <code>${config.photos_group_id}</code>\n<i>Tip: Ensure @${config.bot_username} is an <b>Administrator</b> in the group with permission to send media!</i>`);
                    }
                } catch (groupErr) {
                    console.error('[Group Stream Error]:', groupErr.message);
                }
            } else if (!config.photos_group_id && (msg.photo || msg.video)) {
                console.warn('[Group Stream]: Guest media received, but photos_group_id is not set.');
                await notifyAdmins(botToken, `⚠️ <b>Media received from guest, but Wedding Photo Group is not connected!</b>\n\nTo connect the group:\n1. Make @${config.bot_username} an <b>Admin</b> in the group.\n2. Type <code>/connect_group@${config.bot_username}</code> in the group, or send <code>/set_group &lt;chat_id&gt;</code> here.`);
            }

            // 5. FORWARD MEDIA IN REAL TIME TO ALL REGISTERED ADMINS
            const adminCaption = `📸 <b>NEW WEDDING PHOTO SHARED!</b>\nFrom: <b>${escapeHtml(fullSender)}</b>\n${msg.caption ? `Caption: <i>"${escapeHtml(msg.caption)}"</i>\n` : ''}⏰ Time: ${new Date().toLocaleTimeString('en-US')}`;
            const adminIds = getActiveAdminChatIds(config);

            console.log(`[Forwarding Media]: Forwarding to ${adminIds.length} registered admins:`, adminIds);

            for (const aId of adminIds) {
                try {
                    if (msg.photo) {
                        await callTelegram(botToken, 'sendPhoto', {
                            chat_id: aId,
                            photo: fileId,
                            caption: adminCaption,
                            parse_mode: 'HTML'
                        });
                    } else if (msg.video) {
                        await callTelegram(botToken, 'sendVideo', {
                            chat_id: aId,
                            video: fileId,
                            caption: adminCaption,
                            parse_mode: 'HTML'
                        });
                    } else if (msg.document) {
                        await callTelegram(botToken, 'sendDocument', {
                            chat_id: aId,
                            document: fileId,
                            caption: adminCaption,
                            parse_mode: 'HTML'
                        });
                    }
                    console.log(`[Media Delivered]: Successfully forwarded to Admin Chat ID ${aId}`);
                } catch (forwardErr) {
                    console.error(`Failed to forward media to admin ${aId}:`, forwardErr.message);
                }
            }
            return;
        }

        // ====================================================================
        // SLASH COMMANDS & MENU ACTIONS
        // ====================================================================
        if (text.startsWith('/claim_admin')) {
            const parts = text.split(' ');
            const code = parts.slice(1).join(' ').trim();
            await handleAdminClaim(botToken, chatId, user, code, userLang);
            return;
        }

        if (text.startsWith('/set_group')) {
            if (!isUserAdmin(config, user)) {
                await sendMessage(botToken, chatId, `🔒 <i>Access restricted to Wedding Administrators.</i>`);
                return;
            }
            const parts = text.split(/\s+/);
            const targetGroupId = parts[1];
            if (!targetGroupId) {
                await sendMessage(botToken, chatId, `⚠️ <b>Please specify the group Chat ID:</b>\n\nUsage: <code>/set_group -100xxxxxxxxxx</code>\n\nCurrent Group ID: <code>${config.photos_group_id || 'Not set (null)'}</code>`);
                return;
            }
            config.photos_group_id = isNaN(targetGroupId) ? targetGroupId : Number(targetGroupId);
            saveConfig(config);
            await sendMessage(botToken, chatId, `✅ <b>Wedding Photo Group Saved!</b>\n\nPhotos Group ID set to: <code>${config.photos_group_id}</code>\nAll guest celebration photos will now be automatically streamed to this group! 📸✨`);
            return;
        }

        if (text === '/group_status' || text === '/status') {
            if (isUserAdmin(config, user)) {
                const momentsCount = (dataStore.moments || []).length;
                const statusMsg = `📊 <b>BOT SYSTEM STATUS:</b>\n✦ ══════════════════════════ ✦\n• Bot: @${config.bot_username}\n• Photo Stream Group ID: <code>${config.photos_group_id || '⚠️ NOT CONNECTED (null)'}</code>\n• Group Link: ${config.photos_group_link || 'None'}\n• Moments Stored: ${momentsCount}\n• Registered Guests: ${Object.keys(dataStore.guest_users || {}).length}`;
                await sendMessage(botToken, chatId, statusMsg);
                return;
            }
        }

        if (text === '/get_photos' || text === '/moments') {
            await sendAllMomentsToAdmin(botToken, chatId);
            return;
        }

        if (text === '/cancel') {
            userSessions.delete(chatId);
            await sendMessage(botToken, chatId, `✅ <i>Action cancelled.</i>`, getMainKeyboard(userLang));
            return;
        }

        if (text === '/myid' || text === '/id' || text === '/chatid') {
            await sendMessage(botToken, chatId, `🆔 <b>Your Telegram Chat ID:</b> <code>${chatId}</code>\n\n<i>Share this numeric ID with your wedding coordinator to link your administrator privileges.</i>`, getMainKeyboard(userLang));
            return;
        }

        if (text === '/start' || text.startsWith('/start ') || text.startsWith('/start@')) {
            const parts = text.split(/\s+/);
            const startParam = (parts[1] || '').toLowerCase().trim();

            // 1-Click Groom Setup link: /start groom, /start tewodros, /start groom_2026
            if (startParam === 'groom' || startParam === 'tewodros' || startParam === 'groom_2026' || startParam === 'sara_tewodros_2026') {
                await handleAdminClaim(botToken, chatId, user, 'sara_tewodros_2026', userLang);
                return;
            }

            await sendMessage(botToken, chatId, getWelcomeMessage(userLang, user), getMainKeyboard(userLang));
            return;
        }

        const lowerText = text.toLowerCase().trim();

        if (text === '/rsvp' || text === '💌 RSVP' || text === '💌 ምላሽ ይስጡ (RSVP)' || lowerText === 'rsvp') {
            await startRsvpFlow(botToken, chatId, user, userLang);
            return;
        }

        if (text === '/schedule' || text === '📅 Program & Schedule' || text === '📅 የሰርግ መርሃ ግብር' || lowerText === 'schedule' || lowerText === 'program') {
            await sendMessage(botToken, chatId, getScheduleMessage(userLang), getMainKeyboard(userLang));
            return;
        }

        if (text === '/venues' || text === '📍 Venues & Maps' || text === '📍 የሰርግ ቦታዎችና ካርታ' || lowerText === 'venues' || lowerText === 'venue' || lowerText === 'map') {
            await sendMessage(botToken, chatId, getVenuesMessage(userLang), getMainKeyboard(userLang));
            // Send Native Telegram Venue GPS Pins
            if (config.event && config.event.venues) {
                for (const v of config.event.venues) {
                    if (v.lat && v.lng) {
                        await sendVenueLocation(botToken, chatId, v.lat, v.lng, v.name, v.description);
                    }
                }
            }
            return;
        }

        if (text === '/photos' || text === '📸 Send Photos & Wishes' || text === '📸 ፎቶዎችና ቪዲዮ ይላኩ' || lowerText === 'photos') {
            const prompt = userLang === 'am'
                ? `📸 <b>የሰርግ ፎቶዎችና ቪዲዮዎችን ይላኩ</b>\n✦ ══════════════════════════ ✦\n\nበሰርጉ ወቅት ያነሷቸውን ምርጥ ፎቶዎችና ቪዲዮዎች እዚህ በቀጥታ ይላኩ። ፎቶዎችዎ በቀጥታ ለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ የሰርግ አልበም ይደርሳሉ! 💛`
                : `📸 <b>SHARE YOUR WEDDING MOMENTS</b>\n✦ ══════════════════════════ ✦\n\nCapture memories during the celebration and send your photos/videos directly to this chat. They will be shared exclusively with Dr. Sara & Eng. Tewodros! 💛`;
            const photosMarkup = config.photos_group_link ? {
                inline_keyboard: [
                    [{ text: '📸 Open Live Wedding Photo Stream', url: config.photos_group_link }]
                ]
            } : null;
            await sendMessage(botToken, chatId, prompt, photosMarkup);
            return;
        }

        if (text === '/wishes' || text === '💐 Leave Blessings' || text === '💐 ምርቃት ይጻፉ' || lowerText === 'wishes' || lowerText === 'blessings') {
            const rawName = [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : 'Honored Guest');
            userSessions.set(chatId, {
                step: 'AWAIT_WISHES',
                data: {
                    userId: user.id,
                    guestName: rawName,
                    username: user.username || '',
                    attending: 'Yes',
                    isAttending: true,
                    guestCount: '1',
                    relation: 'Friend',
                    message: '',
                    source: 'telegram_bot'
                },
                lang: userLang
            });
            const prompt = userLang === 'am'
                ? `✍️ <b>ለኢ/ር ቴዎድሮስ እና ዶ/ር ሳራ የበረከት ቃል ይጻፉ:</b>\n\n<i>መልእክትዎን ጽፈው ይላኩ...</i>`
                : `✍️ <b>Share your heartfelt blessings for Eng. Tewodros & Dr. Sara:</b>\n\n<i>Type your message below and send...</i>`;
            await sendMessage(botToken, chatId, prompt, getMainKeyboard(userLang));
            return;
        }

        if (text === '/admin' || text.startsWith('/admin') || text === '👑 Admin' || lowerText === 'admin' || lowerText === 'አድሚን') {
            await handleAdminPanel(botToken, chatId, user, userLang);
            return;
        }

        if (text === '/language' || text === '/lang' || text === '🌐 Language / ቋንቋ' || text === '🌐 ቋንቋ / Language' || lowerText === 'language' || lowerText === 'lang') {
            const isAm = userLang === 'am';
            const prompt = isAm
                ? `🌐 <b>እባክዎ የሚፈልጉትን ቋንቋ ይምረጡ / Please select your preferred language:</b>`
                : `🌐 <b>Please select your preferred language / እባክዎ የሚፈልጉትን ቋንቋ ይምረጡ:</b>`;
            await sendMessage(botToken, chatId, prompt, getLanguageInlineKeyboard(userLang));
            return;
        }

        // ----------------------------------------------------------------------
        // CAPTURE ALL SENT GUEST MESSAGES / WISHES (WITH DEDUPLICATION & RSVP LINK)
        // ----------------------------------------------------------------------
        const cleanMsg = text.trim();
        const commonGreetings = ['hi', 'hello', 'hey', 'start', '/start', 'ሰላም', 'ሰላም ነው', 'selam', 'ciao'];
        const isOnlyGreeting = commonGreetings.includes(cleanMsg.toLowerCase());

        if (cleanMsg.length >= 3 && !isOnlyGreeting) {
            const senderName = [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : 'Honored Guest');
            const dataStore = loadData();
            if (!Array.isArray(dataStore.wishes)) dataStore.wishes = [];

            // Prevent duplicate insertion if the user already sent this exact message
            const isDuplicate = dataStore.wishes.some(w => 
                (w.chatId === chatId || (w.guestName && w.guestName.toLowerCase() === senderName.toLowerCase())) &&
                w.message && w.message.trim().toLowerCase() === cleanMsg.toLowerCase()
            );

            if (!isDuplicate) {
                const wishEntry = {
                    id: 'wish_tg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                    guestName: senderName,
                    relation: 'Guest',
                    message: cleanMsg,
                    source: 'telegram_bot',
                    chatId: chatId,
                    username: user.username || '',
                    timestamp: new Date().toISOString()
                };
                // Place newest wishes on top!
                dataStore.wishes.unshift(wishEntry);

                // If this guest already has an RSVP, also update their RSVP's message
                if (Array.isArray(dataStore.rsvps)) {
                    const guestRsvp = dataStore.rsvps.find(r => 
                        (r.chatId && String(r.chatId) === String(chatId)) ||
                        (r.username && user.username && r.username.toLowerCase() === user.username.toLowerCase())
                    );
                    if (guestRsvp) {
                        guestRsvp.message = cleanMsg;
                        guestRsvp.timestamp = new Date().toISOString();
                    }
                }

                saveData(dataStore);

                // Notify Dr. Sara & Eng. Tewodros
                await notifyAdmins(botToken, 
                    `💌 <b>NEW GUEST WISH RECEIVED!</b>\n` +
                    `✦ ══════════════════════════ ✦\n` +
                    `👤 <b>From:</b> ${escapeHtml(senderName)} ${user.username ? `(@${escapeHtml(user.username)})` : ''}\n` +
                    `💬 <b>Message:</b> <i>"${escapeHtml(cleanMsg)}"</i>\n` +
                    `🌐 <b>Channel:</b> Telegram Bot\n` +
                    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString('en-US')}`
                );

                const ackMsg = userLang === 'am'
                    ? `🎉 <b>እናመሰግናለን ${escapeHtml(senderName)}!</b>\n\nየላኩት የበረከት ቃል በደስታ ተመዝግቧል ለሙሽሮቹም ደርሷል! 💛`
                    : `🎉 <b>Thank you, ${escapeHtml(senderName)}!</b>\n\nYour heartfelt wish and blessing has been lovingly recorded and delivered to Dr. Sara & Eng. Tewodros! 💛`;

                await sendMessage(botToken, chatId, ackMsg, getMainKeyboard(userLang));
                return;
            }
        }

        // Default response
        await sendMessage(botToken, chatId, getWelcomeMessage(userLang, user), getMainKeyboard(userLang));
    }
}

// ============================================================================
// LONG POLLING ENGINE
// ============================================================================
async function startPolling() {
    const config = loadConfig();
    if (!config || !config.bot_token) {
        console.log('[Telegram Bot]: Bot token is empty. Polling paused.');
        console.log('[Telegram Bot]: Set your bot token from @BotFather in bot_config.json or .env to activate.');
        return;
    }

    // Verify Bot Info
    const me = await callTelegram(config.bot_token, 'getMe');
    if (!me.ok) {
        console.error('[Telegram Bot Error]: Invalid token or connection failed:', me.description);
        return;
    }

    console.log(`[Telegram Bot]: Successfully connected as @${me.result.username} (${me.result.first_name})`);
    console.log(`[Telegram Bot]: Dr. Sara Ayele & Eng. Tewodros Belay Wedding Bot is ACTIVE!`);

    // Ensure Telegram menu commands are deleted so the "Menu" button is never shown
    try {
        await callTelegram(config.bot_token, 'deleteMyCommands');
    } catch (cmdErr) {
        // ignore
    }

    pollingActive = true;
    pollingAbortController = new AbortController();
    let offset = 0;

    // Background Long-polling loop
    (async () => {
        while (pollingActive) {
            try {
                const allowedUpdates = JSON.stringify(['message', 'callback_query', 'my_chat_member', 'chat_member']);
                const url = `https://api.telegram.org/bot${config.bot_token}/getUpdates?offset=${offset}&timeout=20&allowed_updates=${encodeURIComponent(allowedUpdates)}`;
                const res = await fetch(url, { signal: pollingAbortController.signal });
                const data = await res.json();

                if (data.ok && Array.isArray(data.result)) {
                    for (const update of data.result) {
                        offset = update.update_id + 1;
                        try {
                            await processUpdate(config.bot_token, update);
                        } catch (handlerErr) {
                            console.error('[Update Handling Error]:', handlerErr);
                        }
                    }
                } else if (!data.ok) {
                    // Back off if temporary conflict
                    await new Promise(r => setTimeout(r, 5000));
                }
            } catch (err) {
                if (err.name === 'AbortError') break;
                // Sleep briefly on network disconnect
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    })();
}

function stopPolling() {
    pollingActive = false;
    if (pollingAbortController) {
        pollingAbortController.abort();
    }
}

// Export module functions for server integration
module.exports = {
    startPolling,
    stopPolling,
    notifyAdmins,
    loadConfig,
    saveConfig,
    loadData,
    saveData,
    syncToGitHub,
    escapeHtml,
    callTelegram,
    sendMessage,
    getTelegramFileUrl,
    downloadAndSavePhoto,
    sendAllMomentsToAdmin,
    getMainKeyboard,
    getLanguageInlineKeyboard,
    getWelcomeMessage,
    saveOrUpdateBotRsvp,
    getOrCreateRsvpSession,
    startRsvpFlow,
    handleRsvpStep,
    finalizeRsvp
};

// Run standalone if executed directly
if (require.main === module) {
    console.log('Starting Dr. Sara & Eng. Tewodros Wedding Telegram Bot...');
    startPolling();
}
