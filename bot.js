/**
 * ============================================================================
 * DR. SARA AYELE & ENG. TEWODROS BELAY - ROYAL WEDDING TELEGRAM BOT
 * ============================================================================
 * Features:
 *  - Luxury Royal Design (Ethiopian & Western wedding aesthetics)
 *  - Admin Dashboard exclusively for Dr. Sara and Eng. Tewodros
 *  - Real-time instant push alerts to Sara & Tewodros upon new RSVPs / photos
 *  - Interactive Step-by-Step Telegram RSVP Flow
 *  - Wedding Program & Timetable
 *  - Venue Directions with Google Maps & Telegram GPS Location Pins
 *  - Guest Wishes & Live Wedding Photo Collection Hub
 *  - Broadcast announcements from Sara & Tewodros to guests
 *  - Trilingual Support: English, Amharic (አማርኛ), Afaan Oromoo
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'bot_config.json');
const DATA_PATH = path.join(__dirname, 'data', 'rsvps.json');

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
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return null;
        }
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (err) {
        console.error('[Bot Config Load Error]:', err);
        return null;
    }
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
    return await callTelegram(botToken, 'sendMessage', payload);
}

async function sendPhoto(botToken, chatId, photoPathOrUrl, caption = '', replyMarkup = null) {
    // If it's a URL or file_id
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
    // Fallback: send text with image preview
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

// ============================================================================
// ADMIN SECURITY & PERMISSIONS
// ============================================================================
function isUserAdmin(config, user) {
    if (!config || !config.admins) return false;
    const userIdStr = String(user.id);
    const username = (user.username || '').toLowerCase();

    for (const admin of config.admins) {
        if (admin.chat_id && String(admin.chat_id) === userIdStr) return true;
        if (admin.telegram_username && admin.telegram_username.toLowerCase().replace('@', '') === username) {
            // Auto-lock chat ID if username matches
            if (!admin.chat_id) {
                admin.chat_id = user.id;
                saveConfig(config);
            }
            return true;
        }
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
// NAVIGATION MENUS & KEYBOARDS (FINE DESIGN)
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

    if (isAdmin) {
        keyboard.push([{ text: l.admin }, { text: l.lang }]);
    } else {
        keyboard.push([{ text: l.admin }, { text: l.lang }]);
    }

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
    const name = user.first_name || 'Honored Guest';
    if (userLang === 'am') {
        return (
            `👑 <b>የዶ/ር ሳራ አየለ እና ኢ/ር ቴዎድሮስ በላይ የሰርግ በዓል</b> 👑
✦ ══════════════════════════ ✦

እንኳን ወደ ክብርት <b>ዶ/ር ሳራ አየለ</b> እና ክቡር <b>ኢ/ር ቴዎድሮስ በላይ</b> ይፋዊ የሰርግ ቦት በደህና መጡ!

🕊️ <i>"ቤት ሁሉ በአንድ ሰው ይዘጋጃል፥ ሁሉን ያዘጋጀ ግን እግዚአብሔር ነው።"</i>
— <b>ዕብራውያን 3:4</b>

📅 <b>የሰርግ ቀን:</b> እሁድ መስከረም 10 ቀን 2018 ዓ.ም (September 20, 2026)
📍 <b>ቦታ:</b> ቡላላ እና ሴንትራል ሆቴል ሀዋሳ፣ ኢትዮጵያ

ይህ የተከበረ ቀን በጋራ ለማክበር እና በደስታ ለመካፈል ከታች ያሉትን አማራጮች ይጠቀሙ:`
        );
    } else if (userLang === 'ao') {
        return (
            `👑 <b>Ayyaana Cidha Dr. Sara Ayele & Eng. Tewodros Belay</b> 👑
✦ ══════════════════════════ ✦

Baga nagaan gara Boottii Cidha <b>Dr. Sara Ayele</b> fi <b>Eng. Tewodros Belay</b> dhuftan!

🕊️ <i>"Manni hundinuu nama tokkoon ijaarama, wanta hundumaa kan ijaare garuu Waaqayyoodha."</i>
— <b>Ibroota 3:4</b>

📅 <b>Guyyaa Cidhaa:</b> Dilbata, Fulbaana 10, 2018 (Sept 20, 2026)
📍 <b>Iddoo:</b> Bulaalaa fi Hoteelagiddugaleessaa Hawaasaa

Sagantaa cidhaa, deebii RSVP kennuu fi kaartaa argachuuf qabduulee armaan gadii fayyadamaa:`
        );
    }

    return (
        `👑 <b>ROYAL WEDDING CELEBRATION</b> 👑
<b>Dr. Sara Ayele & Eng. Tewodros Belay</b>
✦ ══════════════════════════ ✦

Welcome, <b>${name}</b>! It is our greatest honor to celebrate the holy matrimony of <b>Dr. Sara & Eng. Tewodros</b>.

🕊️ <i>"For every house is built by someone, but God is the builder of everything."</i>
— <b>Hebrews 3:4</b>

📅 <b>Date:</b> Sunday, September 20, 2026 (መስከረም 10, 2018 ዓ.ም)
📍 <b>City:</b> Hawassa, Ethiopia

Kindly use the menu below to RSVP, explore the event schedule, find venue directions, or share your loving wishes!`
    );
}

function getScheduleMessage(userLang = 'en') {
    if (userLang === 'am') {
        return (
            `📅 <b>የሰርግ ቀን ሙሉ መርሃ ግብር</b>
<b>እሁድ መስከረም 10 ቀን 2018 ዓ.ም (Sept 20, 2026)</b>
✦ ══════════════════════════ ✦

<b>1️⃣ 10:00 AM - 12:00 PM</b>
🚗 <b>ጉዞ ወደ ሙሽሪት መኖሪያ ቤት</b>
የሚዜዎችና የታዳሚዎች ጉዞ ወደ ቡላላ

<b>2️⃣ 12:00 PM - 12:15 PM</b>
💐 <b>የሙሽራው አቀባበል</b>
በሙሽሪት ቤተሰብ ደማቅ የደስታ አቀባበል

<b>3️⃣ 12:15 PM - 03:00 PM</b>
🍽️ <b>የምሳ ግብዣ፣ ምርቃትና ፎቶ</b>
የወላጆች ምርቃት፣ የሰርግ ምሳ ግብዣ በቡላላ መኖሪያ ቤት

<b>4️⃣ 03:00 PM - 05:00 PM</b>
🎺 <b>ደማቅ የክብር ኮንቮይ ጉዞ ወደ ሀዋሳ</b>
የሰርግ አጀብና የደስታ ጉዞ ወደ ሀዋሳ ከተማ

<b>5️⃣ 05:00 PM - 06:00 PM</b>
🏨 <b>የሆቴል እረፍትና ዝግጅት</b>
ለማታው ደማቅ ዝግጅት እረፍትና ሽኝት

<b>6️⃣ 06:00 PM - 09:00 PM</b>
🥂 <b>ደማቅ የምሽት ግብዣና ጭፈራ</b>
በሴንትራል ሆቴል ሀዋሳ ታላቅ የምሽት እራት ግብዣ፣ ኬክ ቆረሳና ደማቅ ጭፈራ! 🎉`
        );
    }

    return (
        `📅 <b>WEDDING DAY SCHEDULE & PROCESSION</b>
<b>Sunday, September 20, 2026 (መስከረም 10, 2018)</b>
✦ ══════════════════════════ ✦

<b>1️⃣ 10:00 AM - 12:00 PM</b>
🚗 <b>Journey to Bride's Residence</b>
Departure of the wedding entourage to Dila

<b>2️⃣ 12:00 PM - 12:15 PM</b>
💐 <b>Arrival & Welcoming</b>
Warm reception at the Bride's family home

<b>3️⃣ 12:15 PM - 03:00 PM</b>
🍽️ <b>Luncheon, Blessings & Portraits</b>
Parental blessings and wedding feast at Dila

<b>4️⃣ 03:00 PM - 05:00 PM</b>
🎺 <b>Grand Procession to Hawassa</b>
Motorcade procession traveling to Hawassa

<b>5️⃣ 05:00 PM - 06:00 PM</b>
🏨 <b>Rest & Hotel Refreshment</b>
Hotel check-in and preparation for gala night

<b>6️⃣ 06:00 PM - 09:00 PM</b>
🥂 <b>Gala Dinner & Celebration</b>
Dinner reception, cake ceremony & dancing at Central Hotel Hawassa! 🎉`
    );
}

function getVenuesMessage(userLang = 'en') {
    if (userLang === 'am') {
        return (
            `📍 <b>የክብረ በዓሉ መገኛ ቦታዎችና ካርታ</b>
✦ ══════════════════════════ ✦

<b>🏠 1. የሙሽሪት መኖሪያ ቤት (Morning & Luncheon)</b>
• <b>ቦታ:</b> ቡላላ ቅርንጫፍ ት/ቤት አጠገብ፣ ቡላላ
• <b>ሰዓት:</b> ከጠዋቱ 12:00 PM - 03:00 PM
• <b>አድራሻ:</b> Dila, Ethiopia

<b>🏨 2. ሴንትራል ሆቴል ሀዋሳ (Evening Gala Reception)</b>
• <b>ቦታ:</b> ሴንትራል ሆቴል አዳራሽ፣ ሀዋሳ
• <b>ሰዓት:</b> ከምሽቱ 06:00 PM - 09:00 PM
• <b>አድራሻ:</b> Central Hotel, Hawassa, Ethiopia

<i>ካርታ ለመክፈት ከታች ያሉትን የመገኛ አዝራሮች ይጠቀሙ!</i>`
        );
    }

    return (
        `📍 <b>EVENT VENUES & NAVIGATION</b>
✦ ══════════════════════════ ✦

<b>🏠 1. Bride's Residence (Morning Luncheon)</b>
• <b>Location:</b> Near Dila Branch School, Dila
• <b>Time:</b> 12:00 PM - 03:00 PM
• <b>Details:</b> Family blessings & wedding luncheon

<b>🏨 2. Central Hotel Hawassa (Evening Gala)</b>
• <b>Location:</b> Central Hotel Banquet Hall, Hawassa
• <b>Time:</b> 06:00 PM - 09:00 PM
• <b>Details:</b> Dinner reception, cake ceremony & dance

<i>Use the buttons below to open instant driving directions!</i>`
    );
}

// ============================================================================
// STEP-BY-STEP RSVP CONVERSATION HANDLER
// ============================================================================
async function startRsvpFlow(botToken, chatId, user, userLang = 'en') {
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
        ? `💌 <b>የሰርግ ምላሽ መስጫ (RSVP)</b>\n✦ ══════════════════════════ ✦\n\nክቡር <b>${user.first_name || 'እንግዳችን'}</b>፣ በክብረ በዓሉ ላይ ለመገኘት እቅድ አለዎት?`
        : `💌 <b>WEDDING RSVP</b>\n✦ ══════════════════════════ ✦\n\nDear <b>${user.first_name || 'Guest'}</b>, will you be joining us to celebrate the royal wedding of Dr. Sara & Eng. Tewodros?`;

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
        session.data.message = textInput || (isAm ? 'ከልብ የመነጨ መልካም ምኞት!' : 'Warmest congratulations and blessings!');

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

    // Confirmation message to the guest
    const confirmMsg = isAm
        ? `🎉 <b>እናመሰግናለን ${rsvp.guestName}!</b>\n✦ ══════════════════════════ ✦\n\nምላሽዎ በደስታ ተመዝግቧል!\n\n` +
        `• <b>ተሳትፎ:</b> ${rsvp.isAttending ? 'አዎ፣ በደስታ እገኛለሁ 💐' : 'አልችልም 💌'}\n` +
        (rsvp.isAttending ? `• <b>የእንግዶች ብዛት:</b> ${rsvp.guestCount}\n` : '') +
        `• <b>ዝምድና:</b> ${rsvp.relation}\n` +
        `• <b>ምርቃት:</b> <i>"${rsvp.message}"</i>\n\n` +
        `መስከረም 10 ቀን 2018 ዓ.ም በሀዋሳ በደስታ እንገናኝ! 💛`
        : `🎉 <b>THANK YOU, ${rsvp.guestName}!</b>\n✦ ══════════════════════════ ✦\n\nYour RSVP has been joyfully recorded!\n\n` +
        `• <b>Attendance:</b> ${rsvp.isAttending ? 'Yes, Delighted! 💐' : 'Regretfully No 💌'}\n` +
        (rsvp.isAttending ? `• <b>Party Size:</b> ${rsvp.guestCount} guests\n` : '') +
        `• <b>Relation:</b> ${rsvp.relation}\n` +
        `• <b>Blessings:</b> <i>"${rsvp.message}"</i>\n\n` +
        `We eagerly anticipate celebrating together on September 20, 2026 in Hawassa! 💛`;

    await sendMessage(botToken, chatId, confirmMsg, getMainKeyboard(session.lang, false));

    // Send instant priority push alert to Sara & Tewodros
    const adminAlert =
        `👑 <b>NEW ROYAL WEDDING RSVP!</b> 👑
✦ ══════════════════════════ ✦
👤 <b>Guest:</b> ${rsvp.guestName} ${rsvp.username ? `(@${rsvp.username})` : ''}
✅ <b>Attending:</b> ${rsvp.attending}
${rsvp.isAttending ? `👥 <b>Party Count:</b> ${rsvp.guestCount}\n` : ''}💑 <b>Relation:</b> ${rsvp.relation}
💌 <b>Wishes:</b> <i>"${rsvp.message}"</i>
🌐 <b>Channel:</b> Telegram Bot
⏰ <b>Time:</b> ${new Date().toLocaleTimeString('en-US')}`;

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
            `👑 <b>ROYAL WEDDING ADMIN ACCESS</b>
✦ ══════════════════════════ ✦

Welcome! This section is reserved for the Bride & Groom:
<b>Dr. Sara Ayele & Eng. Tewodros Belay</b>.

If you are <b>Sara</b> or <b>Tewodros</b>, please type your private Admin Passcode below or run:
<code>/claim_admin &lt;passcode&gt;</code>

<i>(Once claimed, your Telegram account will be permanently registered as Admin and you will receive real-time RSVP notifications.)</i>`;

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
        `👑 <b>ADMIN CONTROL CENTER</b>
<b>Dr. Sara Ayele & Eng. Tewodros Belay</b>
✦ ══════════════════════════ ✦

📊 <b>Live RSVP Statistics:</b>
• 💐 <b>Confirmed Parties:</b> ${attendingCount}
• 👥 <b>Total Headcount:</b> ${totalHeadcount} guests
• 💌 <b>Declined:</b> ${declines}
• 📸 <b>Moments Collected:</b> ${momentsCount}
• 📝 <b>Total Submissions:</b> ${rsvps.length}

<i>Select an administrative action below:</i>`;

    await sendMessage(botToken, chatId, adminMsg, getAdminInlineKeyboard());
}

async function handleAdminClaim(botToken, chatId, user, passcodeProvided, userLang = 'en') {
    const config = loadConfig();
    if (!config) return;

    const trimmed = (passcodeProvided || '').trim();
    if (trimmed === config.admin_passcode) {
        // Find or create admin entry for this user
        let matchedAdmin = config.admins.find(a => !a.chat_id);
        if (!matchedAdmin) {
            // Already have slot or create one
            matchedAdmin = {
                id: 'admin_' + user.id,
                name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Admin',
                role: 'Administrator',
                telegram_username: user.username || '',
                chat_id: user.id
            };
            config.admins.push(matchedAdmin);
        } else {
            matchedAdmin.chat_id = user.id;
            matchedAdmin.name = [user.first_name, user.last_name].filter(Boolean).join(' ') || matchedAdmin.name;
            if (user.username) matchedAdmin.telegram_username = user.username;
        }

        saveConfig(config);
        userSessions.delete(chatId);

        const successMsg =
            `🎉 <b>ADMIN PRIVILEGES GRANTED!</b>
✦ ══════════════════════════ ✦

Welcome, <b>${matchedAdmin.name}</b>!
You are now officially linked as an Administrator for <b>Dr. Sara & Eng. Tewodros's</b> wedding bot.

You will now receive:
• 🔔 Real-time instant push notifications whenever a guest RSVPs
• 📸 Real-time alerts when guests upload photos & memories
• 📊 Access to the full guest directory & broadcast announcements!`;

        await sendMessage(botToken, chatId, successMsg, getMainKeyboard(userLang, true));
        await handleAdminPanel(botToken, chatId, user, userLang);
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
            await sendMessage(botToken, chatId, `❌ <i>RSVP cancelled. You can start anytime by pressing '💌 RSVP'.</i>`, getMainKeyboard(userLang, isUserAdmin(config, user)));
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
                const rsvps = dataStore.rsvps.filter(r => r.isAttending);
                if (!rsvps.length) {
                    await sendMessage(botToken, chatId, `📋 <b>Guest Directory:</b>\n<i>No confirmed guests yet.</i>`);
                } else {
                    let listText = `📋 <b>CONFIRMED GUEST DIRECTORY (${rsvps.length} parties)</b>\n✦ ══════════════════════════ ✦\n\n`;
                    rsvps.slice(-25).forEach((r, idx) => {
                        listText += `${idx + 1}. <b>${r.guestName}</b> (${r.guestCount} guests) - ${r.relation}\n`;
                    });
                    await sendMessage(botToken, chatId, listText);
                }
            } else if (data === 'admin_wishes') {
                const wishes = dataStore.rsvps.filter(r => r.message && r.message.length > 2);
                if (!wishes.length) {
                    await sendMessage(botToken, chatId, `💌 <b>Warm Wishes:</b>\n<i>No written wishes submitted yet.</i>`);
                } else {
                    let wishesText = `💌 <b>GUEST WISHES & BLESSINGS</b>\n✦ ══════════════════════════ ✦\n\n`;
                    wishes.slice(-10).forEach((w, idx) => {
                        wishesText += `${idx + 1}. <b>${w.guestName}</b>: <i>"${w.message}"</i>\n\n`;
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

        // Check if user is in an active multi-step session
        const session = userSessions.get(chatId);
        if (session) {
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
                const guestIds = Object.keys(dataStore.guest_users).map(Number);
                let sent = 0;
                for (const gid of guestIds) {
                    try {
                        await sendMessage(botToken, gid, `👑 <b>ROYAL WEDDING ANNOUNCEMENT</b>\n<b>From Dr. Sara & Eng. Tewodros:</b>\n\n${text}`);
                        sent++;
                    } catch (e) { }
                }
                await sendMessage(botToken, chatId, `✅ Announcement delivered to ${sent} guests!`);
                return;
            }
            if (session.step === 'AWAIT_WISHES') {
                await handleRsvpStep(botToken, chatId, session, null, null, text);
                return;
            }
        }

        // Handle Photo / Media Uploads from Guests
        if (msg.photo || msg.video || msg.document) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.video ? msg.video.file_id : msg.document.file_id);
            const momentEntry = {
                id: 'moment_' + Date.now(),
                from_user: user.first_name + (user.username ? ` (@${user.username})` : ''),
                from_id: user.id,
                file_id: fileId,
                caption: msg.caption || '',
                timestamp: new Date().toISOString()
            };
            dataStore.moments.push(momentEntry);
            saveData(dataStore);

            await sendMessage(botToken, chatId, `📸 <b>Thank you so much, ${user.first_name}!</b>\nYour wedding photo/memory has been safely delivered to Dr. Sara & Eng. Tewodros! 💛`);

            // Forward to Sara & Tewodros
            const caption = `📸 <b>NEW WEDDING MEMORY!</b>\nFrom: <b>${momentEntry.from_user}</b>\n${momentEntry.caption ? `Caption: <i>"${momentEntry.caption}"</i>` : ''}`;
            const adminIds = getActiveAdminChatIds(config);
            for (const aId of adminIds) {
                if (msg.photo) {
                    await callTelegram(botToken, 'sendPhoto', { chat_id: aId, photo: fileId, caption: caption, parse_mode: 'HTML' });
                } else if (msg.video) {
                    await callTelegram(botToken, 'sendVideo', { chat_id: aId, video: fileId, caption: caption, parse_mode: 'HTML' });
                }
            }
            return;
        }

        // Handle Slash Commands
        if (text.startsWith('/claim_admin')) {
            const parts = text.split(' ');
            const code = parts.slice(1).join(' ').trim();
            await handleAdminClaim(botToken, chatId, user, code, userLang);
            return;
        }

        if (text === '/start') {
            await sendMessage(botToken, chatId, getWelcomeMessage(userLang, user), getMainKeyboard(userLang, isAdmin));
            return;
        }

        if (text === '/rsvp' || text.includes('RSVP') || text.includes('ምላሽ')) {
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

        if (text === '/photos' || text.includes('Photos') || text.includes('ፎቶ')) {
            const prompt = userLang === 'am'
                ? `📸 <b>የሰርግ ፎቶዎችና ቪዲዮዎችን ይላኩ</b>\n✦ ══════════════════════════ ✦\n\nበሰርጉ ወቅት ያነሷቸውን ምርጥ ፎቶዎችና ቪዲዮዎች እዚህ በቀጥታ ይላኩ። ፎቶዎችዎ በቀጥታ ለዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ የሰርግ አልበም ይደርሳሉ! 💛`
                : `📸 <b>SHARE YOUR WEDDING MOMENTS</b>\n✦ ══════════════════════════ ✦\n\nCapture memories during the celebration and send your photos/videos directly to this chat. They will be shared exclusively with Dr. Sara & Eng. Tewodros! 💛`;
            await sendMessage(botToken, chatId, prompt, getMainKeyboard(userLang, isAdmin));
            return;
        }

        if (text === '/wishes' || text.includes('Blessings') || text.includes('ምርቃት')) {
            userSessions.set(chatId, {
                step: 'AWAIT_WISHES',
                data: {
                    guestName: user.first_name || 'Guest',
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

        if (text === '/language' || text.includes('Language') || text.includes('ቋንቋ')) {
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
        console.log('[Telegram Bot]: Bot token is empty in bot_config.json. Polling paused.');
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
    saveData
};

// Run standalone if executed directly
if (require.main === module) {
    console.log('Starting Dr. Sara & Eng. Tewodros Wedding Telegram Bot...');
    startPolling();
}
