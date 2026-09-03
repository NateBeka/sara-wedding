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

// Ensure data file exists
function loadData() {
    try {
        if (!fs.existsSync(DATA_PATH)) {
            const initial = { rsvps: [], guest_users: {}, moments: [] };
            fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
            fs.writeFileSync(DATA_PATH, JSON.stringify(initial, null, 2), 'utf8');
            return initial;
        }
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch (err) {
        console.error('[Bot Data Load Error]:', err);
        return { rsvps: [], guest_users: {}, moments: [] };
    }
}

function saveData(data) {
    try {
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('[Bot Data Save Error]:', err);
    }
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
            admins: [
                { id: 'group', name: 'Sara & Tewodros Wedding', role: 'Organizer', telegram_username: 'https://t.me/+3WRHqclWRQJlYzBk', chat_id: 581789098 },
                { id: 'nate', name: 'Nate Beka', role: 'Organizer', telegram_username: 'nate_beka', chat_id: 581789098 },
                { id: 'sara', name: 'Dr. Sara Ayele', role: 'Bride', telegram_username: '', chat_id: null },
                { id: 'tewodros', name: 'Eng. Tewodros Belay', role: 'Groom', telegram_username: '', chat_id: null }
            ]
        };
    }

    // Support environment variables overrides
    if (process.env.TELEGRAM_BOT_TOKEN) cfg.bot_token = process.env.TELEGRAM_BOT_TOKEN;
    if (process.env.TELEGRAM_BOT_USERNAME) cfg.bot_username = process.env.TELEGRAM_BOT_USERNAME;
    if (process.env.ADMIN_PASSCODE) cfg.admin_passcode = process.env.ADMIN_PASSCODE;
    if (process.env.SARA_CHAT_ID && cfg.admins) {
        const sara = cfg.admins.find(a => a.id === 'sara');
        if (sara) sara.chat_id = isNaN(process.env.SARA_CHAT_ID) ? process.env.SARA_CHAT_ID : Number(process.env.SARA_CHAT_ID);
    }
    if (process.env.TEWODROS_CHAT_ID && cfg.admins) {
        const tewodros = cfg.admins.find(a => a.id === 'tewodros');
        if (tewodros) tewodros.chat_id = isNaN(process.env.TEWODROS_CHAT_ID) ? process.env.TEWODROS_CHAT_ID : Number(process.env.TEWODROS_CHAT_ID);
    }

    return cfg;
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (err) {
        console.error('[Bot Config Save Error]:', err);
    }
}

// Global In-Memory State for multi-step conversations
const userSessions = new Map(); // chatId -> { step, data, lang }
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

// Download and permanently save incoming guest photo to disk (images/moments/)
async function downloadAndSavePhoto(botToken, fileId, senderName) {
    try {
        const fileUrl = await getTelegramFileUrl(botToken, fileId);
        if (!fileUrl) return null;

        const safeSender = (senderName || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
        const fileName = `moment_${Date.now()}_${safeSender}.jpg`;
        const localPath = path.join(MOMENTS_DIR, fileName);

        const res = await fetch(fileUrl);
        if (!res.ok) return null;

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(localPath, buffer);

        console.log(`[Moment Photo Saved]: ${localPath} (${buffer.length} bytes)`);
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
// NAVIGATION MENUS & KEYBOARDS (CLEAN 5 BUTTONS ONLY - NO ADMIN/LANG BUTTONS)
// ============================================================================
function getMainKeyboard(userLang = 'en') {
    const labels = {
        en: {
            rsvp: '💌 RSVP',
            schedule: '📅 Program & Schedule',
            venues: '📍 Venues & Maps',
            photos: '📸 Send Photos & Wishes',
            wishes: '💐 Leave Blessings'
        },
        am: {
            rsvp: '💌 ምላሽ ይስጡ (RSVP)',
            schedule: '📅 የሰርግ መርሃ ግብር',
            venues: '📍 የሰርግ ቦታዎችና ካርታ',
            photos: '📸 ፎቶዎችና ቪዲዮ ይላኩ',
            wishes: '💐 ምርቃት ይጻፉ'
        }
    };

    const l = labels[userLang] || labels.en;

    const keyboard = [
        [{ text: l.rsvp }, { text: l.schedule }],
        [{ text: l.venues }, { text: l.photos }],
        [{ text: l.wishes }]
    ];

    return {
        keyboard: keyboard,
        resize_keyboard: true,
        one_time_keyboard: false
    };
}

function getLanguageInlineKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🇺🇸 English', callback_data: 'lang_en' },
                { text: '🇪🇹 አማርኛ (Amharic)', callback_data: 'lang_am' }
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
            `💒 <b>የዶ/ር ሳራ አየለ እና ኢ/ር ቴዎድሮስ በላይ የሰርግ በዓል</b> 💒\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `እንኳን ወደ <b>ዶ/ር ሳራ አየለ</b> እና <b>ኢ/ር ቴዎድሮስ በላይ</b> ይፋዊ የሰርግ ቦት በደህና መጡ፣ <b>${safeName}</b>!\n\n` +
            `🕊️ <i>"ቤት ሁሉ በአንድ ሰው ይዘጋጃል፥ ሁሉን ያዘጋጀ ግን እግዚአብሔር ነው።"</i>\n` +
            `— <b>ዕብራውያን 3:4</b>\n\n` +
            `📅 <b>የሰርግ ቀን:</b> እሁድ መስከረም 10 ቀን 2018 ዓ.ም (September 20, 2026)\n` +
            `📍 <b>ቦታ:</b> ዲላ እና ሴንትራል ሆቴል ሀዋሳ፣ ኢትዮጵያ\n\n` +
            `ይህንን የተባረከ ቀን በጋራ ለማክበር ከታች ያሉትን አማራጮች ይጠቀሙ:`
        );
    }

    return (
        `💒 <b>WEDDING CELEBRATION</b> 💒\n` +
        `<b>Dr. Sara Ayele & Eng. Tewodros Belay</b>\n` +
        `✦ ══════════════════════════ ✦\n\n` +
        `Welcome, <b>${safeName}</b>! It is our greatest honor to celebrate the holy matrimony of <b>Dr. Sara & Eng. Tewodros</b>.\n\n` +
        `🕊️ <i>"For every house is built by someone, but God is the builder of everything."</i>\n` +
        `— <b>Hebrews 3:4</b>\n\n` +
        `📅 <b>Date:</b> Sunday, September 20, 2026 (መስከረም 10, 2018 ዓ.ም)\n` +
        `📍 <b>City:</b> Hawassa, Ethiopia\n\n` +
        `Kindly use the menu below to RSVP, explore the event schedule, find venue directions, or share your loving photos & wishes!`
    );
}

function getScheduleMessage(userLang = 'en') {
    if (userLang === 'am') {
        return (
            `📅 <b>የሰርግ ቀን ሙሉ መርሃ ግብር</b>\n` +
            `<b>እሁድ መስከረም 10 ቀን 2018 ዓ.ም (Sept 20, 2026)</b>\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `<b>1️⃣ 10:00 AM - 12:00 PM</b>\n` +
            `🚗 <b>ጉዞ ወደ ሙሽሪት መኖሪያ ቤት</b>\n` +
            `የሚዜዎችና የታዳሚዎች ጉዞ ወደ ዲላ\n\n` +
            `<b>2️⃣ 12:00 PM - 12:15 PM</b>\n` +
            `💐 <b>የሙሽራው አቀባበል</b>\n` +
            `በሙሽሪት ቤተሰብ ደማቅ የደስታ አቀባበል\n\n` +
            `<b>3️⃣ 12:15 PM - 3:00 PM</b>\n` +
            `🍽️ <b>የምሳ ግብዣ፣ ምርቃትና ፎቶ</b>\n` +
            `የወላጆች ምርቃት፣ የሰርግ ምሳ ግብዣ በዲላ መኖሪያ ቤት\n\n` +
            `<b>4️⃣ 3:00 PM - 5:00 PM</b>\n` +
            `🎺 <b>ደማቅ የክብር ኮንቮይ ጉዞ ወደ ሀዋሳ</b>\n` +
            `የሰርግ አጀብና የደስታ ጉዞ ወደ ሀዋሳ ከተማ\n\n` +
            `<b>5️⃣ 5:00 PM - 6:00 PM</b>\n` +
            `🏨 <b>የሆቴል እረፍትና ዝግጅት</b>\n` +
            `ለማታው ደማቅ ዝግጅት እረፍትና ሽኝት\n\n` +
            `<b>6️⃣ 6:00 PM - 9:00 PM</b>\n` +
            `🥂 <b>ደማቅ የምሽት ግብዣና ጭፈራ</b>\n` +
            `በሴንትራል ሆቴል ሀዋሳ ታላቅ የምሽት እራት ግብዣ፣ ኬክ ቆረሳና ደማቅ ጭፈራ! 🎉`
        );
    }

    return (
        `📅 <b>WEDDING DAY SCHEDULE & PROCESSION</b>\n` +
        `<b>Sunday, September 20, 2026 (መስከረም 10, 2018)</b>\n` +
        `✦ ══════════════════════════ ✦\n\n` +
        `<b>1️⃣ 10:00 AM - 12:00 PM</b>\n` +
        `🚗 <b>Journey to Bride's Residence</b>\n` +
        `Departure of the wedding entourage to Dila\n\n` +
        `<b>2️⃣ 12:00 PM - 12:15 PM</b>\n` +
        `💐 <b>Arrival & Welcoming</b>\n` +
        `Warm reception at the Bride's family home\n\n` +
        `<b>3️⃣ 12:15 PM - 3:00 PM</b>\n` +
        `🍽️ <b>Luncheon, Blessings & Portraits</b>\n` +
        `Parental blessings and wedding feast at Dila\n\n` +
        `<b>4️⃣ 3:00 PM - 5:00 PM</b>\n` +
        `🎺 <b>Grand Procession to Hawassa</b>\n` +
        `Motorcade procession traveling to Hawassa\n\n` +
        `<b>5️⃣ 5:00 PM - 6:00 PM</b>\n` +
        `🏨 <b>Rest & Hotel Refreshment</b>\n` +
        `Hotel check-in and preparation for gala night\n\n` +
        `<b>6️⃣ 6:00 PM - 9:00 PM</b>\n` +
        `🥂 <b>Gala Dinner & Celebration</b>\n` +
        `Dinner reception, cake ceremony & dancing at Central Hotel Hawassa! 🎉`
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
// STEP-BY-STEP RSVP CONVERSATION HANDLER
// ============================================================================
async function startRsvpFlow(botToken, chatId, user, userLang = 'en') {
    const safeGuestName = escapeHtml([user.first_name, user.last_name].filter(Boolean).join(' ') || 'Honored Guest');
    userSessions.set(chatId, {
        step: 'AWAIT_ATTENDANCE',
        data: {
            userId: user.id,
            username: user.username || '',
            guestName: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Honored Guest',
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

async function handleRsvpStep(botToken, chatId, session, action, callbackQuery = null, textInput = null) {
    const isAm = session.lang === 'am';

    if (session.step === 'AWAIT_ATTENDANCE') {
        if (action === 'yes') {
            session.data.attending = 'Yes';
            session.data.isAttending = true;
            session.step = 'AWAIT_GUESTS';

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

            const msg = isAm
                ? `💌 መልእክትዎን ተቀብለናል! ለሙሽሮቹ የመልካም ምኞት እና የበረከት ቃል መጻፍ ይፈልጋሉ?\n\n<i>መልእክትዎን ጽፈው ይላኩ ወይም 'ዝለል' የሚለውን ይጫኑ:</i>`
                : `💌 We will miss you! Would you like to leave a warm blessing or congratulations for Dr. Sara & Eng. Tewodros?\n\n<i>Type your message below, or tap 'Skip':</i>`;

            const markup = {
                inline_keyboard: [
                    [{ text: isAm ? '⏩ ዝለል / አልፈው' : '⏩ Skip Wishes', callback_data: 'rsvp_skip_wishes' }]
                ]
            };
            await sendMessage(botToken, chatId, msg, markup);
        }
        return;
    }

    if (session.step === 'AWAIT_GUESTS') {
        session.data.guestCount = action || '1';
        session.step = 'AWAIT_RELATION';

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

        const msg = isAm
            ? `✍️ <b>ለሙሽሮቹ የመልካም ምኞት እና የበረከት ቃል ይጻፉ:</b>\n\n<i>(ምክር፣ ጸሎት ወይም የበረከት ቃል ጽፈው ይላኩ፣ ወይም 'ዝለል' ይጫኑ)</i>`
            : `✍️ <b>Share your heartfelt blessings & wishes for Dr. Sara & Eng. Tewodros:</b>\n\n<i>(Type your message below, or tap 'Skip')</i>`;

        const markup = {
            inline_keyboard: [
                [{ text: isAm ? '⏩ ዝለል' : '⏩ Skip Wishes', callback_data: 'rsvp_skip_wishes' }]
            ]
        };

        await sendMessage(botToken, chatId, msg, markup);
        return;
    }

    if (session.step === 'AWAIT_WISHES') {
        const defaultWishes = isAm ? 'ከልብ የመነጨ መልካም ምኞት!' : 'Warmest congratulations and blessings!';
        session.data.message = (textInput || defaultWishes).trim();

        // Finalize RSVP
        await finalizeRsvp(botToken, chatId, session);
        userSessions.delete(chatId);
    }
}

async function finalizeRsvp(botToken, chatId, session) {
    const dataStore = loadData();
    const isAm = session.lang === 'am';

    const rsvp = {
        id: 'rsvp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        chatId: chatId,
        guestName: session.data.guestName,
        username: session.data.username,
        attending: session.data.attending,
        isAttending: session.data.isAttending,
        guestCount: session.data.guestCount,
        relation: session.data.relation,
        message: session.data.message,
        source: 'telegram_bot',
        timestamp: new Date().toISOString()
    };

    // Save to database
    dataStore.rsvps.push(rsvp);
    saveData(dataStore);

    const safeGuestName = escapeHtml(rsvp.guestName);
    const safeWishes = escapeHtml(rsvp.message);
    const safeRelation = escapeHtml(rsvp.relation);
    const safeUsername = escapeHtml(rsvp.username);

    // Confirmation message to the guest
    let confirmMsg = '';
    if (isAm) {
        confirmMsg = `🎉 <b>እናመሰግናለን ${safeGuestName}!</b>\n✦ ══════════════════════════ ✦\n\nምላሽዎ በደስታ ተመዝግቧል!\n\n` +
            `• <b>ተሳትፎ:</b> ${rsvp.isAttending ? 'አዎ፣ በደስታ እገኛለሁ 💐' : 'አልችልም 💌'}\n` +
            (rsvp.isAttending ? `• <b>የእንግዶች ብዛት:</b> ${rsvp.guestCount}\n` : '') +
            `• <b>ዝምድና:</b> ${safeRelation}\n` +
            `• <b>ምርቃት:</b> <i>"${safeWishes}"</i>\n\n` +
            `መስከረም 10 ቀን 2018 ዓ.ም በሀዋሳ በደስታ እንገናኝ! 💛`;
    } else {
        confirmMsg = `🎉 <b>THANK YOU, ${safeGuestName}!</b>\n✦ ══════════════════════════ ✦\n\nYour RSVP has been joyfully recorded!\n\n` +
            `• <b>Attendance:</b> ${rsvp.isAttending ? 'Yes, Delighted! 💐' : 'Regretfully No 💌'}\n` +
            (rsvp.isAttending ? `• <b>Party Size:</b> ${rsvp.guestCount} guests\n` : '') +
            `• <b>Relation:</b> ${safeRelation}\n` +
            `• <b>Blessings:</b> <i>"${safeWishes}"</i>\n\n` +
            `We eagerly anticipate celebrating together on September 20, 2026 in Hawassa! 💛`;
    }

    await sendMessage(botToken, chatId, confirmMsg, getMainKeyboard(session.lang));

    // Send instant priority push alert to Sara & Tewodros
    const adminAlert =
        `💒 <b>NEW WEDDING RSVP RECEIVED!</b> 💒\n` +
        `✦ ══════════════════════════ ✦\n` +
        `👤 <b>Guest:</b> ${safeGuestName} ${safeUsername ? `(@${safeUsername})` : ''}\n` +
        `✅ <b>Attending:</b> ${rsvp.attending}\n` +
        (rsvp.isAttending ? `👥 <b>Party Count:</b> ${rsvp.guestCount}\n` : '') +
        `💑 <b>Relation:</b> ${safeRelation}\n` +
        `💌 <b>Wishes:</b> <i>"${safeWishes}"</i>\n` +
        `🌐 <b>Channel:</b> Telegram Bot\n` +
        `⏰ <b>Time:</b> ${new Date().toLocaleTimeString('en-US')}`;

    await notifyAdmins(botToken, adminAlert);
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
            `<b>Dr. Sara Ayele & Eng. Tewodros Belay</b>.\n\n` +
            `Please type your private Admin Passcode below or run:\n` +
            `<code>/claim_admin &lt;passcode&gt;</code>\n\n` +
            `<i>(Once verified, your Telegram account will receive instant alerts for all RSVPs and shared photos.)</i>`;

        userSessions.set(chatId, { step: 'AWAIT_ADMIN_PASSCODE', lang: userLang });
        await sendMessage(botToken, chatId, claimPrompt);
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
        `<b>Dr. Sara Ayele & Eng. Tewodros Belay</b>\n` +
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
            existingAdmin = {
                id: 'admin_' + user.id,
                name: [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.username ? `@${user.username}` : 'Admin'),
                role: 'Administrator',
                telegram_username: user.username || '',
                chat_id: user.id
            };
            config.admins.push(existingAdmin);
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

            const langNames = { en: 'English 🇺🇸', am: 'አማርኛ 🇪🇹' };
            await sendMessage(botToken, chatId, `✅ <i>Language updated to ${langNames[newLang] || 'English'}.</i>`, getMainKeyboard(newLang));
            await sendMessage(botToken, chatId, getWelcomeMessage(newLang, user));
            return;
        }

        // RSVP Inline Buttons
        if (data === 'rsvp_attending_yes') {
            const session = userSessions.get(chatId) || { step: 'AWAIT_ATTENDANCE', data: {}, lang: userLang };
            await handleRsvpStep(botToken, chatId, session, 'yes', cq);
            return;
        }
        if (data === 'rsvp_attending_no') {
            const session = userSessions.get(chatId) || { step: 'AWAIT_ATTENDANCE', data: {}, lang: userLang };
            await handleRsvpStep(botToken, chatId, session, 'no', cq);
            return;
        }
        if (data.startsWith('rsvp_guests_')) {
            const count = data.replace('rsvp_guests_', '');
            const session = userSessions.get(chatId);
            if (session) await handleRsvpStep(botToken, chatId, session, count, cq);
            return;
        }
        if (data.startsWith('rsvp_rel_')) {
            const relMap = {
                'rsvp_rel_bride': "Bride's Family",
                'rsvp_rel_groom': "Groom's Family",
                'rsvp_rel_friend': "Friend of Both",
                'rsvp_rel_colleague': "Colleague"
            };
            const session = userSessions.get(chatId);
            if (session) await handleRsvpStep(botToken, chatId, session, relMap[data] || 'Friend', cq);
            return;
        }
        if (data === 'rsvp_skip_wishes') {
            const session = userSessions.get(chatId);
            if (session) {
                await finalizeRsvp(botToken, chatId, session);
                userSessions.delete(chatId);
            }
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

        // Intercept navigation commands / menu button presses
        const MENU_TRIGGERS = [
            '💌', 'RSVP', 'ምላሽ',
            '📅', 'Program', 'Schedule', 'መርሃ ግብር',
            '📍', 'Venues', 'Maps', 'ቦታዎች',
            '📸', 'Photos', 'ፎቶ',
            '💐', 'Wishes', 'Blessings', 'ምርቃት',
            '/start', '/rsvp', '/schedule', '/venues', '/photos', '/wishes', '/admin', '/language', '/lang', '/claim_admin', '/get_photos', '/moments', '/cancel'
        ];

        const isNavigationCommand = text.startsWith('/') || MENU_TRIGGERS.some(trigger => text.includes(trigger));

        // Check if user is in an active multi-step session
        const session = userSessions.get(chatId);
        if (session && !isNavigationCommand) {
            if (session.step === 'AWAIT_ADMIN_PASSCODE') {
                await handleAdminClaim(botToken, chatId, user, text, userLang);
                return;
            }
            if (session.step === 'AWAIT_BROADCAST_TEXT') {
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
                const broadcastMsg = `📢 <b>WEDDING ANNOUNCEMENT</b>\n<b>From Dr. Sara & Eng. Tewodros:</b>\n\n${safeBroadcastText}`;

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
                await handleRsvpStep(botToken, chatId, session, null, null, text);
                return;
            }
        } else if (session && isNavigationCommand) {
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
                id: 'moment_' + Date.now(),
                sender_name: fullSender,
                from_user: fullSender,
                from_id: user.id,
                file_id: fileId,
                file_path: savedInfo ? savedInfo.webPath : (savedInfo ? savedInfo.fileUrl : ''),
                caption: msg.caption || '',
                timestamp: new Date().toISOString()
            };
            dataStore.moments.push(momentEntry);
            saveData(dataStore);

            // 3. Send confirmation to the guest
            const thanksMsg = userLang === 'am'
                ? `📸 <b>እናመሰግናለን ${escapeHtml(user.first_name || 'እንግዳችን')}!</b>\nየሰርግ ፎቶዎ በሰርግ አልበም ውስጥ ተቀምጧል እንዲሁም ለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ ደርሷል! 💛`
                : `📸 <b>Thank you so much, ${escapeHtml(user.first_name || 'Guest')}!</b>\nYour wedding photo has been saved to the album and safely delivered to Dr. Sara & Eng. Tewodros! 💛`;

            await sendMessage(botToken, chatId, thanksMsg);

            // 4. FORWARD MEDIA IN REAL TIME TO ALL REGISTERED ADMINS
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

        if (text === '/get_photos' || text === '/moments') {
            await sendAllMomentsToAdmin(botToken, chatId);
            return;
        }

        if (text === '/cancel') {
            userSessions.delete(chatId);
            await sendMessage(botToken, chatId, `✅ <i>Action cancelled.</i>`, getMainKeyboard(userLang));
            return;
        }

        if (text === '/start') {
            await sendMessage(botToken, chatId, getWelcomeMessage(userLang, user), getMainKeyboard(userLang));
            return;
        }

        if (text === '/rsvp' || text.includes('RSVP') || text.includes('ምላሽ')) {
            await startRsvpFlow(botToken, chatId, user, userLang);
            return;
        }

        if (text === '/schedule' || text.includes('Program') || text.includes('መርሃ ግብር')) {
            await sendMessage(botToken, chatId, getScheduleMessage(userLang), getMainKeyboard(userLang));
            return;
        }

        if (text === '/venues' || text.includes('Venues') || text.includes('ቦታዎች')) {
            await sendMessage(botToken, chatId, getVenuesMessage(userLang));
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

        if (text === '/photos' || text.includes('Photos') || text.includes('ፎቶ')) {
            const prompt = userLang === 'am'
                ? `📸 <b>የሰርግ ፎቶዎችና ቪዲዮዎችን ይላኩ</b>\n✦ ══════════════════════════ ✦\n\nበሰርጉ ወቅት ያነሷቸውን ምርጥ ፎቶዎችና ቪዲዮዎች እዚህ በቀጥታ ይላኩ። ፎቶዎችዎ በቀጥታ ለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ የሰርግ አልበም ይደርሳሉ! 💛`
                : `📸 <b>SHARE YOUR WEDDING MOMENTS</b>\n✦ ══════════════════════════ ✦\n\nCapture memories during the celebration and send your photos/videos directly to this chat. They will be shared exclusively with Dr. Sara & Eng. Tewodros! 💛`;
            await sendMessage(botToken, chatId, prompt, getMainKeyboard(userLang));
            return;
        }

        if (text === '/wishes' || text.includes('Blessings') || text.includes('ምርቃት')) {
            userSessions.set(chatId, {
                step: 'AWAIT_WISHES',
                data: {
                    guestName: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Honored Guest',
                    username: user.username,
                    attending: 'Yes',
                    isAttending: true,
                    guestCount: '1',
                    relation: 'Friend'
                },
                lang: userLang
            });
            const prompt = userLang === 'am'
                ? `✍️ <b>ለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ የበረከት ቃል ይጻፉ:</b>\n\n<i>መልእክትዎን ጽፈው ይላኩ...</i>`
                : `✍️ <b>Share your heartfelt blessings for Dr. Sara & Eng. Tewodros:</b>\n\n<i>Type your message below and send...</i>`;
            await sendMessage(botToken, chatId, prompt);
            return;
        }

        if (text === '/admin' || text.includes('Admin') || text.includes('አድሚን')) {
            await handleAdminPanel(botToken, chatId, user, userLang);
            return;
        }

        if (text === '/language' || text === '/lang' || text.includes('Language') || text.includes('ቋንቋ')) {
            await sendMessage(botToken, chatId, `🌍 <b>Please select your preferred language / ቋንቋ ይምረጡ:</b>`, getLanguageInlineKeyboard());
            return;
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

    pollingActive = true;
    pollingAbortController = new AbortController();
    let offset = 0;

    // Background Long-polling loop
    (async () => {
        while (pollingActive) {
            try {
                const url = `https://api.telegram.org/bot${config.bot_token}/getUpdates?offset=${offset}&timeout=20`;
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
    escapeHtml,
    getTelegramFileUrl,
    downloadAndSavePhoto,
    sendAllMomentsToAdmin
};

// Run standalone if executed directly
if (require.main === module) {
    console.log('Starting Dr. Sara & Eng. Tewodros Wedding Telegram Bot...');
    startPolling();
}
