/**
 * ============================================================================
 * DR. SARA AYELE & ENG. TEWODROS BELAY - ROYAL WEDDING TELEGRAM BOT
 * ============================================================================
 * Features:
 *  - Luxury Royal Design (Ethiopian & Western wedding aesthetics)
 *  - Interactive Step-by-Step Telegram RSVP Flow
 *  - Trilingual Support: English, Amharic (አማርኛ), Afaan Oromoo
 *  - Wedding Program & Timetable (Dila & Hawassa)
 *  - Venue Directions with Google Maps & Native Telegram GPS Location Pins
 *  - Guest Wishes & Live Wedding Photo Collection Hub (Synced with Dashboard)
 *  - Real-time instant push alerts to Sara & Tewodros upon new RSVPs / photos
 *  - Broadcast announcements from Sara & Tewodros to guests (Rate-limited)
 *  - Role-based Admin Authentication for Dr. Sara and Eng. Tewodros
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'bot_config.json');
const DATA_PATH = path.join(__dirname, 'data', 'rsvps.json');

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
            admin_passcode: 'sara_tewodros_royal_2026',
            admins: [
                { id: 'sara', name: 'Dr. Sara Ayele', role: 'Bride', chat_id: null },
                { id: 'tewodros', name: 'Eng. Tewodros Belay', role: 'Groom', chat_id: null }
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

// Resolve Telegram File ID to a public HTTPS URL (for Dashboard photo rendering)
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

// ============================================================================
// ADMIN SECURITY & PERMISSIONS
// ============================================================================
function isUserAdmin(config, user) {
    if (!config || !config.admins || !user) return false;
    const userIdStr = String(user.id);

    // Verify against registered numeric chat_id
    for (const admin of config.admins) {
        if (admin.chat_id && String(admin.chat_id) === userIdStr) return true;
    }
    return false;
}

function getAdminNames(config) {
    if (!config || !config.admins) return 'Dr. Sara & Eng. Tewodros';
    return config.admins.map(a => `${a.role || 'Admin'} ${a.name}`).join(' & ');
}

function getActiveAdminChatIds(config) {
    if (!config || !config.admins) return [];
    return config.admins
        .map(a => a.chat_id)
        .filter(id => id !== null && id !== undefined);
}

// Notify Sara and Tewodros instantly
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
function getMainKeyboard(userLang = 'en', isAdmin = false) {
    const labels = {
        en: {
            rsvp: '💌 RSVP',
            schedule: '📅 Program & Schedule',
            venues: '📍 Venues & Maps',
            photos: '📸 Send Photos & Wishes',
            wishes: '💐 Leave Blessings',
            admin: '👑 Admin Lounge',
            lang: '🌍 Language / ቋንቋ'
        },
        am: {
            rsvp: '💌 ምላሽ ይስጡ (RSVP)',
            schedule: '📅 የሰርግ መርሃ ግብር',
            venues: '📍 የሰርግ ቦታዎችና ካርታ',
            photos: '📸 ፎቶዎችና ቪዲዮ ይላኩ',
            wishes: '💐 ምርቃት ይጻፉ',
            admin: '👑 የአድሚን ክፍል',
            lang: '🌍 ቋንቋ ቀይር'
        },
        ao: {
            rsvp: '💌 Deebii Kennaa (RSVP)',
            schedule: '📅 Sagantaa Cidhaa',
            venues: '📍 Bakkeewwan & Kaartaa',
            photos: '📸 Suuraa & Eebba Ergaa',
            wishes: '💐 Eebba Barreessaa',
            admin: '👑 Kutaa Admin',
            lang: '🌍 Afaan Jijjiiri'
        }
    };

    const l = labels[userLang] || labels.en;

    const keyboard = [
        [{ text: l.rsvp }, { text: l.schedule }],
        [{ text: l.venues }, { text: l.photos }],
        [{ text: l.wishes }]
    ];

    keyboard.push([{ text: l.admin }, { text: l.lang }]);

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
                { text: '🇪🇹 አማርኛ (Amharic)', callback_data: 'lang_am' },
                { text: '🌸 Afaan Oromoo', callback_data: 'lang_ao' }
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
                { text: '💌 View Warm Wishes', callback_data: 'admin_wishes' },
                { text: '📸 Moments Counter', callback_data: 'admin_moments' }
            ],
            [
                { text: '📢 Broadcast Announcement', callback_data: 'admin_broadcast_prompt' },
                { text: '👑 Admin Accounts', callback_data: 'admin_status' }
            ],
            [
                { text: '🔄 Refresh Dashboard', callback_data: 'admin_refresh' }
            ]
        ]
    };
}

// ============================================================================
// LUXURY TEXT TEMPLATES
// ============================================================================
function getWelcomeMessage(userLang = 'en', user = {}) {
    const safeName = escapeHtml(user.first_name || 'Honored Guest');
    if (userLang === 'am') {
        return (
            `👑 <b>የዶ/ር ሳራ አየለ እና ኢ/ር ቴዎድሮስ በላይ የሰርግ በዓል</b> 👑\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `እንኳን ወደ ክብርት <b>ዶ/ር ሳራ አየለ</b> እና ክቡር <b>ኢ/ር ቴዎድሮስ በላይ</b> ይፋዊ የሰርግ ቦት በደህና መጡ!\n\n` +
            `🕊️ <i>"ቤት ሁሉ በአንድ ሰው ይዘጋጃል፥ ሁሉን ያዘጋጀ ግን እግዚአብሔር ነው።"</i>\n` +
            `— <b>ዕብራውያን 3:4</b>\n\n` +
            `📅 <b>የሰርግ ቀን:</b> እሁድ መስከረም 10 ቀን 2018 ዓ.ም (September 20, 2026)\n` +
            `📍 <b>ቦታ:</b> ዲላ እና ሴንትራል ሆቴል ሀዋሳ፣ ኢትዮጵያ\n\n` +
            `ይህ የተከበረ ቀን በጋራ ለማክበር እና በደስታ ለመካፈል ከታች ያሉትን አማራጮች ይጠቀሙ:`
        );
    } else if (userLang === 'ao') {
        return (
            `👑 <b>Ayyaana Cidha Dr. Sara Ayele & Eng. Tewodros Belay</b> 👑\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `Baga nagaan gara Boottii Cidha <b>Dr. Sara Ayele</b> fi <b>Eng. Tewodros Belay</b> dhuftan, <b>${safeName}</b>!\n\n` +
            `🕊️ <i>"Manni hundinuu nama tokkoon ijaarama, wanta hundumaa kan ijaare garuu Waaqayyoodha."</i>\n` +
            `— <b>Ibroota 3:4</b>\n\n` +
            `📅 <b>Guyyaa Cidhaa:</b> Dilbata, Fulbaana 10, 2018 (Sept 20, 2026)\n` +
            `📍 <b>Iddoo:</b> Dila fi Hoteela Sentiraal Hawaasaa\n\n` +
            `Sagantaa cidhaa, deebii RSVP kennuu fi kaartaa argachuuf qabduulee armaan gadii fayyadamaa:`
        );
    }

    return (
        `👑 <b>ROYAL WEDDING CELEBRATION</b> 👑\n` +
        `<b>Dr. Sara Ayele & Eng. Tewodros Belay</b>\n` +
        `✦ ══════════════════════════ ✦\n\n` +
        `Welcome, <b>${safeName}</b>! It is our greatest honor to celebrate the holy matrimony of <b>Dr. Sara & Eng. Tewodros</b>.\n\n` +
        `🕊️ <i>"For every house is built by someone, but God is the builder of everything."</i>\n` +
        `— <b>Hebrews 3:4</b>\n\n` +
        `📅 <b>Date:</b> Sunday, September 20, 2026 (መስከረም 10, 2018 ዓ.ም)\n` +
        `📍 <b>City:</b> Hawassa, Ethiopia\n\n` +
        `Kindly use the menu below to RSVP, explore the event schedule, find venue directions, or share your loving wishes!`
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
    } else if (userLang === 'ao') {
        return (
            `📅 <b>Sagantaa Guutuu Guyyaa Cidhaa</b>\n` +
            `<b>Dilbata, Fulbaana 10, 2018 (Sept 20, 2026)</b>\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `<b>1️⃣ 10:00 AM - 12:00 PM</b>\n` +
            `🚗 <b>Imala gara Mana Misirroo (Dila)</b>\n` +
            `Imala hamamotaa fi maatii gara Dilaatti\n\n` +
            `<b>2️⃣ 12:00 PM - 12:15 PM</b>\n` +
            `💐 <b>Simannaa Misirrichaa</b>\n` +
            `Simannaa ho’aa maatii misirrootiin taasifamu\n\n` +
            `<b>3️⃣ 12:15 PM - 3:00 PM</b>\n` +
            `🍽️ <b>Affiraa Laaqanaa, Eebba & Suuraa</b>\n` +
            `Eebba warraa fi affiraa qophii laaqanaa mana Dilaatti\n\n` +
            `<b>4️⃣ 3:00 PM - 5:00 PM</b>\n` +
            `🎺 <b>Konooyii Giddugaleessa Hawaasaatti</b>\n` +
            `Imala kabajaa fi gammachuu gara magaalaa Hawaasaatti\n\n` +
            `<b>5️⃣ 5:00 PM - 6:00 PM</b>\n` +
            `🏨 <b>Boqonnaa Hoteelaa</b>\n` +
            `Boqonnaa fi qophii sirna galgalaa hoteela keessatti\n\n` +
            `<b>6️⃣ 6:00 PM - 9:00 PM</b>\n` +
            `🥂 <b>Qophii Irbaataa & Sirba Galgalaa</b>\n` +
            `Sirna affiraa irbaata galgalaa, keekii qirixuu fi sirba gammachuu Hoteela Sentiraal Hawaasaatti! 🎉`
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
    } else if (userLang === 'ao') {
        return (
            `📍 <b>Bakkeewwan Cidhaa fi Kaartaa</b>\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `<b>🏠 1. Mana Misirroo (Qophii Ganamaa & Laaqanaa)</b>\n` +
            `• <b>Iddoo:</b> Mana Barumsaa Damee Dilaatti dhiyoo, Dila\n` +
            `• <b>Sa'aatii:</b> Waaree booda 6:00 - 9:00 (12:00 PM - 03:00 PM)\n` +
            `• <b>Teessoo:</b> Dila, Itoophiyaa\n\n` +
            `<b>🏨 2. Hoteela Sentiraal Hawaasaa (Qophii Irbaataa & Sirna Galgalaa)</b>\n` +
            `• <b>Iddoo:</b> Galma Guddaa Hoteela Sentiraal, Hawaasaa\n` +
            `• <b>Sa'aatii:</b> Galgala 12:00 - 3:00 (06:00 PM - 09:00 PM)\n` +
            `• <b>Teessoo:</b> Central Hotel, Hawaasaa, Itoophiyaa\n\n` +
            `<i>Kaartaa Google fi kallattii argachuuf qabduulee armaan gadii fayyadamaa!</i>`
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
    const isAo = userLang === 'ao';

    const text = isAm
        ? `💌 <b>የሰርግ ምላሽ መስጫ (RSVP)</b>\n✦ ══════════════════════════ ✦\n\nክቡር <b>${safeGuestName}</b>፣ በክብረ በዓሉ ላይ ለመገኘት እቅድ አለዎት?`
        : (isAo
            ? `💌 <b>Deebii Cidhaa (RSVP)</b>\n✦ ══════════════════════════ ✦\n\nKabajamoo <b>${safeGuestName}</b>, sirna cidha kabajamaa Dr. Sara fi Eng. Tewodros irratti ni argamtuu?`
            : `💌 <b>WEDDING RSVP</b>\n✦ ══════════════════════════ ✦\n\nDear <b>${safeGuestName}</b>, will you be joining us to celebrate the royal wedding of Dr. Sara & Eng. Tewodros?`);

    const inlineMarkup = {
        inline_keyboard: [
            [
                { text: isAm ? '💐 አዎ፣ በደስታ እገኛለሁ!' : (isAo ? '💐 Eeyyee, Gammachuudhaan!' : '💐 Yes, Delighted to Attend!'), callback_data: 'rsvp_attending_yes' }
            ],
            [
                { text: isAm ? '💌 በሚያሳዝን ሁኔታ አልችልም' : (isAo ? '💌 Hin Danda\'u, Na Dhiifamaa' : '💌 Regretfully Cannot Attend'), callback_data: 'rsvp_attending_no' }
            ],
            [
                { text: isAm ? '❌ ሰርዝ' : (isAo ? '❌ Haqii' : '❌ Cancel'), callback_data: 'rsvp_cancel' }
            ]
        ]
    };

    await sendMessage(botToken, chatId, text, inlineMarkup);
}

async function handleRsvpStep(botToken, chatId, session, action, callbackQuery = null, textInput = null) {
    const isAm = session.lang === 'am';
    const isAo = session.lang === 'ao';

    if (session.step === 'AWAIT_ATTENDANCE') {
        if (action === 'yes') {
            session.data.attending = 'Yes';
            session.data.isAttending = true;
            session.step = 'AWAIT_GUESTS';

            const msg = isAm
                ? `👥 <b>ስንት ሆነው ይመጣሉ? (የእርስዎ እና የአጃቢዎ ብዛት)</b>`
                : (isAo
                    ? `👥 <b>Namoota meeqa taatanii dhuftu? (Ofii keessaniifi hiriyyaa keessan dabalatee)</b>`
                    : `👥 <b>How many guests will be in your party? (including yourself)</b>`);

            const markup = {
                inline_keyboard: [
                    [
                        { text: isAm ? '1 ሰው (ብቻዬን)' : (isAo ? 'Nama 1 (Qofaa)' : '1 Person (Self)'), callback_data: 'rsvp_guests_1' },
                        { text: isAm ? '2 ሰዎች (+1 አጃቢ)' : (isAo ? 'Nama 2 (+1 Hiriyyaa)' : '2 Persons (+Companion)'), callback_data: 'rsvp_guests_2' }
                    ],
                    [
                        { text: isAm ? '3 ሰዎች (ቤተሰብ)' : (isAo ? 'Nama 3 (Maatii)' : '3 Persons (Family)'), callback_data: 'rsvp_guests_3' },
                        { text: isAm ? '4+ ሰዎች' : (isAo ? 'Nama 4+ (Baay\'ee)' : '4+ Persons'), callback_data: 'rsvp_guests_4+' }
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
                : (isAo
                    ? `💌 Deebiin keessan nu ga'eera! Dr. Sara fi Eng. Tewodrosiif eebba ykn dhaamsa gabaabaa barreessuu barbaadduu?\n\n<i>Ergaa keessan barreessaa, ykn 'Darbi' jedhaa:</i>`
                    : `💌 We will miss you! Would you like to leave a warm blessing or congratulations for Dr. Sara & Eng. Tewodros?\n\n<i>Type your message below, or tap 'Skip':</i>`);

            const markup = {
                inline_keyboard: [
                    [{ text: isAm ? '⏩ ዝለል / አልፈው' : (isAo ? '⏩ Darbi' : '⏩ Skip Wishes'), callback_data: 'rsvp_skip_wishes' }]
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
            : (isAo
                ? `💑 <b>Hariiroo misirroota waliin qabdan filadhaa:</b>`
                : `💑 <b>Your relation to the Bride & Groom:</b>`);

        const markup = {
            inline_keyboard: [
                [
                    { text: isAm ? "የሙሽሪት ቤተሰብ" : (isAo ? "Maatii Misirroo" : "Bride's Family"), callback_data: 'rsvp_rel_bride' },
                    { text: isAm ? "የሙሽራው ቤተሰብ" : (isAo ? "Maatii Misirrichaa" : "Groom's Family"), callback_data: 'rsvp_rel_groom' }
                ],
                [
                    { text: isAm ? "የሁለቱም ወዳጅ" : (isAo ? "Hiriyyaa Lamaan" : "Friend of Both"), callback_data: 'rsvp_rel_friend' },
                    { text: isAm ? "የስራ ባልደረባ" : (isAo ? "Hiriyaa Hojii" : "Colleague"), callback_data: 'rsvp_rel_colleague' }
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
            : (isAo
                ? `✍️ <b>Dr. Sara fi Eng. Tewodrosiif eebbaafi ergaa baga gammaddanii barreessaa:</b>\n\n<i>(Ergaa keessan barreessaa ergaa, ykn 'Darbi' kan jedhu tuqaa)</i>`
                : `✍️ <b>Share your heartfelt blessings & wishes for Dr. Sara & Eng. Tewodros:</b>\n\n<i>(Type your message below, or tap 'Skip')</i>`);

        const markup = {
            inline_keyboard: [
                [{ text: isAm ? '⏩ ዝለል' : (isAo ? '⏩ Darbi' : '⏩ Skip Wishes'), callback_data: 'rsvp_skip_wishes' }]
            ]
        };

        await sendMessage(botToken, chatId, msg, markup);
        return;
    }

    if (session.step === 'AWAIT_WISHES') {
        const defaultWishes = isAm ? 'ከልብ የመነጨ መልካም ምኞት!' : (isAo ? 'Baga gammaddan, eebbi isiniif haa baay\'atu!' : 'Warmest congratulations and blessings!');
        session.data.message = (textInput || defaultWishes).trim();

        // Finalize RSVP
        await finalizeRsvp(botToken, chatId, session);
        userSessions.delete(chatId);
    }
}

async function finalizeRsvp(botToken, chatId, session) {
    const dataStore = loadData();
    const isAm = session.lang === 'am';
    const isAo = session.lang === 'ao';

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
    } else if (isAo) {
        confirmMsg = `🎉 <b>Galatoomaa ${safeGuestName}!</b>\n✦ ══════════════════════════ ✦\n\nDeebiin keessan gammachuudhaan galmaa'eera!\n\n` +
            `• <b>Hirmaannaa:</b> ${rsvp.isAttending ? 'Eeyyee, Gammachuudhaan 💐' : 'Hin Danda\'u 💌'}\n` +
            (rsvp.isAttending ? `• <b>Baay\'ina Keessummaa:</b> ${rsvp.guestCount}\n` : '') +
            `• <b>Hariiroo:</b> ${safeRelation}\n` +
            `• <b>Eebba:</b> <i>"${safeWishes}"</i>\n\n` +
            `Guyyaa kabajamaa Dilbata Fulbaana 10, 2018 (Sept 20, 2026) magaalaa Hawaasaatti gammachuudhaan wal haa arginu! 💛`;
    } else {
        confirmMsg = `🎉 <b>THANK YOU, ${safeGuestName}!</b>\n✦ ══════════════════════════ ✦\n\nYour RSVP has been joyfully recorded!\n\n` +
            `• <b>Attendance:</b> ${rsvp.isAttending ? 'Yes, Delighted! 💐' : 'Regretfully No 💌'}\n` +
            (rsvp.isAttending ? `• <b>Party Size:</b> ${rsvp.guestCount} guests\n` : '') +
            `• <b>Relation:</b> ${safeRelation}\n` +
            `• <b>Blessings:</b> <i>"${safeWishes}"</i>\n\n` +
            `We eagerly anticipate celebrating together on September 20, 2026 in Hawassa! 💛`;
    }

    await sendMessage(botToken, chatId, confirmMsg, getMainKeyboard(session.lang, false));

    // Send instant priority push alert to Sara & Tewodros
    const adminAlert =
        `👑 <b>NEW ROYAL WEDDING RSVP!</b> 👑\n` +
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
    const isAdmin = isUserAdmin(config, user);

    if (!isAdmin) {
        // Invite Sara or Tewodros to claim admin rights securely
        const claimPrompt =
            `👑 <b>ROYAL WEDDING ADMIN ACCESS</b>\n` +
            `✦ ══════════════════════════ ✦\n\n` +
            `Welcome! This section is reserved for the Bride & Groom:\n` +
            `<b>Dr. Sara Ayele & Eng. Tewodros Belay</b>.\n\n` +
            `If you are <b>Sara</b> or <b>Tewodros</b>, please type your private Admin Passcode below or run:\n` +
            `<code>/claim_admin &lt;passcode&gt;</code>\n\n` +
            `<i>(Once claimed, your Telegram account will be linked and you will receive real-time RSVP & Photo notifications.)</i>`;

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
        `👑 <b>ADMIN CONTROL CENTER</b>\n` +
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
    if (trimmed === config.admin_passcode) {
        userSessions.delete(chatId);

        // Offer explicit identity claim buttons to prevent race conditions
        const promptText =
            `👑 <b>ROYAL PASSCODE VERIFIED!</b>\n✦ ══════════════════════════ ✦\n\n` +
            `Welcome! Please confirm your profile to link this Telegram account:`;

        const markup = {
            inline_keyboard: [
                [
                    { text: '👰 I am Dr. Sara Ayele (Bride)', callback_data: 'claim_role_sara' }
                ],
                [
                    { text: '🤵 I am Eng. Tewodros Belay (Groom)', callback_data: 'claim_role_tewodros' }
                ]
            ]
        };

        await sendMessage(botToken, chatId, promptText, markup);
    } else {
        await sendMessage(botToken, chatId, `❌ <i>Incorrect passcode. Please verify the code and try again.</i>`);
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

        // Role Claim Callbacks (Bride / Groom selection)
        if (data.startsWith('claim_role_')) {
            const roleKey = data.replace('claim_role_', '');
            let adminSlot = config.admins.find(a => a.id === roleKey);
            const displayName = roleKey === 'sara' ? 'Dr. Sara Ayele' : 'Eng. Tewodros Belay';
            const roleName = roleKey === 'sara' ? 'Bride' : 'Groom';

            if (!adminSlot) {
                adminSlot = {
                    id: roleKey,
                    name: displayName,
                    role: roleName,
                    telegram_username: user.username || '',
                    chat_id: user.id
                };
                config.admins.push(adminSlot);
            } else {
                adminSlot.chat_id = user.id;
                if (user.username) adminSlot.telegram_username = user.username;
            }

            saveConfig(config);

            const successMsg =
                `🎉 <b>ADMIN PRIVILEGES GRANTED!</b>\n✦ ══════════════════════════ ✦\n\n` +
                `Welcome, <b>${displayName}</b>!\n` +
                `Your Telegram account has been permanently linked as <b>${roleName}</b> for the Royal Wedding system.\n\n` +
                `You will now receive:\n` +
                `• 🔔 Instant real-time push alerts whenever a guest RSVPs (website & Telegram)\n` +
                `• 📸 Real-time alerts when guests upload wedding photos & memories\n` +
                `• 📊 Full access to the guest directory & broadcast announcements!`;

            await sendMessage(botToken, chatId, successMsg, getMainKeyboard(userLang, true));
            await handleAdminPanel(botToken, chatId, user, userLang);
            return;
        }

        // Language Callbacks
        if (data.startsWith('lang_')) {
            const newLang = data.replace('lang_', '');
            dataStore.guest_users[chatId].lang = newLang;
            saveData(dataStore);

            const langNames = { en: 'English 🇺🇸', am: 'አማርኛ 🇪🇹', ao: 'Afaan Oromoo 🌸' };
            await sendMessage(botToken, chatId, `✅ <i>Language updated to ${langNames[newLang]}.</i>`, getMainKeyboard(newLang, isUserAdmin(config, user)));
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
                : (userLang === 'ao'
                    ? `❌ <i>Deebiin RSVP haqameera. Yeroo barbaaddan '💌 Deebii Kennaa' cuqaasuun eegaluu dandeessu.</i>`
                    : `❌ <i>RSVP cancelled. You can restart anytime by pressing '💌 RSVP'.</i>`);
            await sendMessage(botToken, chatId, cancelMsg, getMainKeyboard(userLang, isUserAdmin(config, user)));
            return;
        }

        // Admin Inline Actions
        if (data.startsWith('admin_')) {
            if (!isUserAdmin(config, user)) {
                await sendMessage(botToken, chatId, `🔒 <i>Access restricted to Sara & Tewodros.</i>`);
                return;
            }

            if (data === 'admin_stats' || data === 'admin_refresh') {
                await handleAdminPanel(botToken, chatId, user, userLang);
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
                    await sendMessage(botToken, chatId, `💌 <b>Warm Wishes:</b>\n<i>No written wishes submitted yet.</i>`);
                } else {
                    let wishesText = `💌 <b>GUEST WISHES & BLESSINGS</b>\n✦ ══════════════════════════ ✦\n\n`;
                    wishes.slice(-10).forEach((w, idx) => {
                        wishesText += `${idx + 1}. <b>${escapeHtml(w.guestName)}</b>: <i>"${escapeHtml(w.message)}"</i>\n\n`;
                    });
                    await sendMessage(botToken, chatId, wishesText);
                }
            } else if (data === 'admin_status') {
                let statusText = `👑 <b>REGISTERED ADMINISTRATORS:</b>\n✦ ══════════════════════════ ✦\n\n`;
                config.admins.forEach(a => {
                    statusText += `• <b>${a.role || 'Admin'} ${a.name}</b>\n  ID: <code>${a.chat_id || 'Pending claim'}</code>\n  User: @${a.telegram_username || 'N/A'}\n\n`;
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
        // PREVENTS INPUT TRAP: Never treat navigation buttons or slash commands as free-form text input!
        const MENU_TRIGGERS = [
            '💌', 'RSVP', 'ምላሽ', 'Deebii',
            '📅', 'Program', 'Schedule', 'መርሃ ግብር', 'Sagantaa',
            '📍', 'Venues', 'Maps', 'ቦታዎች', 'Kaartaa',
            '📸', 'Photos', 'ፎቶ', 'Suuraa',
            '💐', 'Wishes', 'Blessings', 'ምርቃት', 'Eebba',
            '👑', 'Admin', 'አድሚን', 'Kutaa',
            '🌍', 'Language', 'ቋንቋ', 'Afaan',
            '/start', '/rsvp', '/schedule', '/venues', '/photos', '/wishes', '/admin', '/language', '/claim_admin', '/cancel'
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
                const broadcastMsg = `👑 <b>ROYAL WEDDING ANNOUNCEMENT</b>\n<b>From Dr. Sara & Eng. Tewodros:</b>\n\n${safeBroadcastText}`;

                await sendMessage(botToken, chatId, `📢 <i>Sending announcement to ${guestIds.length} registered guests...</i>`);

                for (const gid of guestIds) {
                    try {
                        const res = await sendMessage(botToken, gid, broadcastMsg);
                        if (res.ok) sent++;
                        else failed++;
                        // Rate-limiting pause: 50ms between sends (Telegram limits to 30 msgs/sec)
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
            // User pressed a menu button or slash command while in a session -> clear session cleanly
            userSessions.delete(chatId);
        }

        // Handle Photo / Media Uploads from Guests
        if (msg.photo || msg.video || msg.document) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.video ? msg.video.file_id : msg.document.file_id);
            const senderName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Honored Guest';
            const userHandle = user.username ? ` (@${user.username})` : '';

            // Resolve direct file URL for Web Dashboard display
            let directFileUrl = '';
            if (msg.photo) {
                directFileUrl = await getTelegramFileUrl(botToken, fileId);
            }

            const momentEntry = {
                id: 'moment_' + Date.now(),
                sender_name: senderName + userHandle,
                from_user: senderName + userHandle,
                from_id: user.id,
                file_id: fileId,
                file_path: directFileUrl || '',
                caption: msg.caption || '',
                timestamp: new Date().toISOString()
            };
            dataStore.moments.push(momentEntry);
            saveData(dataStore);

            const thanksMsg = userLang === 'am'
                ? `📸 <b>እናመሰግናለን ${escapeHtml(user.first_name || 'እንግዳችን')}!</b>\nየሰርግ ፎቶዎ/ቪዲዮዎ በቀጥታ ለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ ደርሷል! 💛`
                : (userLang === 'ao'
                    ? `📸 <b>Baay'ee galatoomaa, ${escapeHtml(user.first_name || 'Kabajamoo')}!</b>\nSuuraan/Viidiyoon keessan Dr. Sara fi Eng. Tewodros bira ga'eera! 💛`
                    : `📸 <b>Thank you so much, ${escapeHtml(user.first_name || 'Guest')}!</b>\nYour wedding photo/memory has been safely delivered to Dr. Sara & Eng. Tewodros! 💛`);

            await sendMessage(botToken, chatId, thanksMsg);

            // Forward to Sara & Tewodros
            const adminCaption = `📸 <b>NEW WEDDING MEMORY!</b>\nFrom: <b>${escapeHtml(momentEntry.sender_name)}</b>\n${msg.caption ? `Caption: <i>"${escapeHtml(msg.caption)}"</i>` : ''}`;
            const adminIds = getActiveAdminChatIds(config);
            for (const aId of adminIds) {
                try {
                    if (msg.photo) {
                        await callTelegram(botToken, 'sendPhoto', { chat_id: aId, photo: fileId, caption: adminCaption, parse_mode: 'HTML' });
                    } else if (msg.video) {
                        await callTelegram(botToken, 'sendVideo', { chat_id: aId, video: fileId, caption: adminCaption, parse_mode: 'HTML' });
                    } else if (msg.document) {
                        await callTelegram(botToken, 'sendDocument', { chat_id: aId, document: fileId, caption: adminCaption, parse_mode: 'HTML' });
                    }
                } catch (forwardErr) {
                    console.error(`Failed to forward media to admin ${aId}:`, forwardErr.message);
                }
            }
            return;
        }

        // Handle Slash Commands & Menu Actions
        if (text.startsWith('/claim_admin')) {
            const parts = text.split(' ');
            const code = parts.slice(1).join(' ').trim();
            await handleAdminClaim(botToken, chatId, user, code, userLang);
            return;
        }

        if (text === '/cancel') {
            userSessions.delete(chatId);
            await sendMessage(botToken, chatId, `✅ <i>Action cancelled.</i>`, getMainKeyboard(userLang, isAdmin));
            return;
        }

        if (text === '/start') {
            await sendMessage(botToken, chatId, getWelcomeMessage(userLang, user), getMainKeyboard(userLang, isAdmin));
            return;
        }

        if (text === '/rsvp' || text.includes('RSVP') || text.includes('ምላሽ') || text.includes('Deebii')) {
            await startRsvpFlow(botToken, chatId, user, userLang);
            return;
        }

        if (text === '/schedule' || text.includes('Program') || text.includes('መርሃ ግብር') || text.includes('Sagantaa')) {
            await sendMessage(botToken, chatId, getScheduleMessage(userLang), getMainKeyboard(userLang, isAdmin));
            return;
        }

        if (text === '/venues' || text.includes('Venues') || text.includes('ቦታዎች') || text.includes('Kaartaa')) {
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

        if (text === '/photos' || text.includes('Photos') || text.includes('ፎቶ') || text.includes('Suuraa')) {
            const prompt = userLang === 'am'
                ? `📸 <b>የሰርግ ፎቶዎችና ቪዲዮዎችን ይላኩ</b>\n✦ ══════════════════════════ ✦\n\nበሰርጉ ወቅት ያነሷቸውን ምርጥ ፎቶዎችና ቪዲዮዎች እዚህ በቀጥታ ይላኩ። ፎቶዎችዎ በቀጥታ ለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ የሰርግ አልበም ይደርሳሉ! 💛`
                : (userLang === 'ao'
                    ? `📸 <b>Suuraa & Viidiyoo Cidhaa Ergaa</b>\n✦ ══════════════════════════ ✦\n\nSuuraawwan fi viidiyoo sirna cidhaa irratti kaastan asitti ergaa. Kallattiin Dr. Sara fi Eng. Tewodrosiif ni ergama! 💛`
                    : `📸 <b>SHARE YOUR WEDDING MOMENTS</b>\n✦ ══════════════════════════ ✦\n\nCapture memories during the celebration and send your photos/videos directly to this chat. They will be shared exclusively with Dr. Sara & Eng. Tewodros! 💛`);
            await sendMessage(botToken, chatId, prompt, getMainKeyboard(userLang, isAdmin));
            return;
        }

        if (text === '/wishes' || text.includes('Blessings') || text.includes('ምርቃት') || text.includes('Eebba')) {
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
                : (userLang === 'ao'
                    ? `✍️ <b>Dr. Sara fi Eng. Tewodrosiif eebba barreessaa:</b>\n\n<i>Ergaa keessan asitti barreessaa ergaa...</i>`
                    : `✍️ <b>Share your heartfelt blessings for Dr. Sara & Eng. Tewodros:</b>\n\n<i>Type your message below and send...</i>`);
            await sendMessage(botToken, chatId, prompt);
            return;
        }

        if (text === '/admin' || text.includes('Admin') || text.includes('አድሚን') || text.includes('Kutaa')) {
            await handleAdminPanel(botToken, chatId, user, userLang);
            return;
        }

        if (text === '/language' || text.includes('Language') || text.includes('ቋንቋ') || text.includes('Afaan')) {
            await sendMessage(botToken, chatId, `🌍 <b>Please select your preferred language:</b>`, getLanguageInlineKeyboard());
            return;
        }

        // Default response
        await sendMessage(botToken, chatId, getWelcomeMessage(userLang, user), getMainKeyboard(userLang, isAdmin));
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
    console.log(`[Telegram Bot]: Royal Wedding Bot for Dr. Sara Ayele & Eng. Tewodros Belay is ACTIVE!`);

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
                    console.warn('[Telegram Polling Warning]:', data.description);
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
    getTelegramFileUrl
};

// Run standalone if executed directly
if (require.main === module) {
    console.log('Starting Dr. Sara & Eng. Tewodros Wedding Telegram Bot...');
    startPolling();
}
