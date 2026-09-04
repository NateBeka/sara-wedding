// ==========================================================================
// DR. SARA AYELE & ENG. TEWODROS BELAY - WEDDING EXPERIENCE
// Pure Trilingual Localization, Dual Audio, WhatsApp & Robust UI
// ==========================================================================

const WEDDING_DATE = new Date(2026, 8, 20, 12, 0, 0); // Sept 20, 2026 12:00 PM

// 28 Real Couple Photos in Sequential Order (1 to 28)
const PHOTO_ARRAY = [
    "images/photo_1_2026-09-03_19-04-18.jpg",
    "images/photo_2_2026-09-03_19-04-18.jpg",
    "images/photo_3_2026-09-03_19-04-18.jpg",
    "images/photo_4_2026-09-03_19-04-18.jpg",
    "images/photo_5_2026-09-03_19-04-18.jpg",
    "images/photo_6_2026-09-03_19-04-18.jpg",
    "images/photo_7_2026-09-03_19-04-18.jpg",
    "images/photo_8_2026-09-03_19-04-18.jpg",
    "images/photo_9_2026-09-03_19-04-18.jpg",
    "images/photo_10_2026-09-03_19-04-18.jpg",
    "images/photo_11_2026-09-03_19-04-18.jpg",
    "images/photo_12_2026-09-03_19-04-18.jpg",
    "images/photo_13_2026-09-03_19-04-18.jpg",
    "images/photo_14_2026-09-03_19-04-18.jpg",
    "images/photo_15_2026-09-03_19-04-18.jpg",
    "images/photo_16_2026-09-03_19-04-18.jpg",
    "images/photo_17_2026-09-03_19-04-18.jpg",
    "images/photo_18_2026-09-03_19-04-18.jpg",
    "images/photo_19_2026-09-03_19-04-18.jpg",
    "images/photo_20_2026-09-03_19-04-18.jpg",
    "images/photo_21_2026-09-03_19-04-18.jpg",
    "images/photo_22_2026-09-03_19-04-18.jpg",
    "images/photo_23_2026-09-03_19-04-18.jpg",
    "images/photo_24_2026-09-03_19-04-18.jpg",
    "images/photo_25_2026-09-03_19-04-18.jpg",
    "images/photo_26_2026-09-03_19-04-18.jpg",
    "images/photo_27_2026-09-03_19-04-18.jpg",
    "images/photo_28_2026-09-03_19-04-18.jpg"
];

// Lightweight thumbnails for the filmstrip to eliminate memory & decode bottlenecks on mobile
const THUMB_ARRAY = PHOTO_ARRAY.map(src => src.replace('images/', 'images/thumbs/'));

// Hardware-aware mobile smoothness detector
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const isLowEndDevice = Boolean(
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 3) ||
    (isTouchDevice && window.innerWidth < 768)
);

// Active scroll detector: pauses background canvas during touch gestures/scrolling to yield 100% CPU/GPU to smooth scrolling
let isUserScrolling = false;
let scrollPauseTimer = null;
window.addEventListener('scroll', () => {
    isUserScrolling = true;
    clearTimeout(scrollPauseTimer);
    scrollPauseTimer = setTimeout(() => {
        isUserScrolling = false;
    }, 120);
}, { passive: true });

// Pure Trilingual Localization Dictionaries (Zero mixed-language)
const translations = {
    en: {
        music_label: "Play Song",
        music_playing: "Playing",
        splash_subtitle: "Wedding Invitation",
        splash_title: "Eng. Tewodros & Dr. Sara",
        splash_tap: "✨ Open Invitation ✨",
        splash_hint: "✦ Tap anywhere to enter ✦",
        middle_date_main: "Sunday, September 20, 2026",
        fancy_title: "ENG. TEWODROS BELAY & DR. SARA AYELE",
        hero_tagline: "Eternal Love & Blessings",
        hero_meta: "🗓️ September 20, 2026 • 📍 Hawassa, Ethiopia",
        btn_rsvp_hero: "Send RSVP",
        btn_view_program: "View Program ↓",
        save_date_badge: "Save The Date",
        save_date_title: '<span class="title-icon">💍</span> <span class="title-text">Join Our Celebration</span>',
        save_date_subtitle: "Sunday, September 20, 2026",
        countdown_heading: "Countdown to the Joyous Day",
        countdown_header: "Countdown",
        timer_label: "Days until our wedding",
        unit_days: "Days",
        unit_hrs: "Hours",
        unit_min: "Mins",
        unit_sec: "Secs",
        btn_add_calendar: "Add to My Calendar",
        calendar_header: "September 2026",
        cal_badge_day: "Sept 20",
        day_sun: "Sun", day_mon: "Mon", day_tue: "Tue", day_wed: "Wed", day_thu: "Thu", day_fri: "Fri", day_sat: "Sat",
        card_tag: "Official Invitation",
        card_header: '<span class="title-icon">📜</span> <span class="title-text">The Official Invitation Card</span>',
        scripture: '"For every house is built by someone, but God is the builder of everything." — Hebrews 3:4',
        timeline_tag: "Full Program",
        timeline_heading: '<span class="title-icon">📅</span> <span class="title-text">Event Schedule</span>',
        timeline_subtitle: "Wedding Day Schedule & Procession",
        timeline_1_time: "10:00 AM - 12:00 PM",
        timeline_1_title: "Journey to Bride's Residence",
        timeline_1_desc: "Departure of the wedding entourage to the Bride's residence in Dila",
        timeline_2_time: "12:00 PM - 12:15 PM",
        timeline_2_title: "Arrival at Bride's Residence",
        timeline_2_desc: "Arrival and warm welcoming reception at the Bride's family residence",
        timeline_3_time: "12:15 PM - 3:00 PM",
        timeline_3_title: "Stay at Bride's Residence",
        timeline_3_desc: "Parental blessings, wedding feast, luncheon, and portraits at Dila",
        timeline_4_time: "3:00 PM - 5:00 PM",
        timeline_4_title: "Journey to Hawassa",
        timeline_4_desc: "Joyous convoy and motorcade procession traveling to Hawassa",
        timeline_5_time: "5:00 PM - 6:00 PM",
        timeline_5_title: "Rest",
        timeline_5_desc: "Hotel check-in, rest, and preparation for the evening celebration",
        timeline_6_time: "6:00 PM - 9:00 PM",
        timeline_6_title: "Stay at Central Hotel",
        timeline_6_desc: "Dinner reception, ceremonial cake-cutting, and celebration at Central Hotel Hawassa!",
        locations_tag: "Directions",
        locations_heading: '<span class="title-icon">📍</span> <span class="title-text">Event Locations</span>',
        locations_subtitle: "Easily find your way with interactive maps and navigation",
        loc_badge_day: "6:00 – 9:00• Morning & Luncheon",
        loc_Dila_title: "Bride's Residence",
        loc_Dila_desc: "Near Dila Branch School, Dila, Ethiopia",
        loc_badge_night: "2:00 – 3:00 • Evening Banquet & Gala",
        loc_central_title: "Central Hotel",
        loc_central_desc: "Central Hotel, Hawassa, Ethiopia",
        btn_maps: "Open in Google Maps",
        gallery_tag: "Memories",
        photos_heading: '<span class="title-icon">✨</span> <span class="title-text">Our Wedding Photos</span> <span class="title-icon">✨</span>',
        photos_subtitle: "A cherished collection of 28 portraits and love-filled memories",
        btn_view_fullscreen: "View in Fullscreen Lightbox",
        rsvp_tag: "RSVP",
        rsvp_heading: '<span class="title-icon">💌</span> <span class="title-text">Will You Attend?</span>',
        rsvp_subtitle: "Kindly let us know so we can reserve your seat",
        lbl_name: "Full Name *",
        lbl_attendance: "Attendance *",
        opt_attend_yes: "Yes, Delighted!",
        opt_attend_no: "Unfortunately No",
        lbl_guests: "Number of Guests",
        guest_1: "1 Person (Self)",
        guest_2: "2 Persons (+ Companion)",
        guest_3: "3 Persons (Family)",
        guest_4: "4+ Persons",
        opt_rel_hint: "Relation to Bride & Groom",
        opt_rel_bride: "Bride's Family",
        opt_rel_groom: "Groom's Family",
        opt_rel_both: "Friend of Both",
        opt_rel_fam: "Extended Family",
        opt_rel_col: "Colleague",
        lbl_wishes: "Warm Wishes & Blessings",
        btn_rsvp_submit: "Send RSVP",
        share_tag: "Live Upload",
        qr_title: '<span class="title-icon">📸</span> <span class="title-text">Share Your Moments</span>',
        qr_subtitle: "Capture high-res memories during the celebration and send them directly to our Telegram Bot!",
        footer_text: "Eng. Tewodros Belay & Dr. Sara Ayele — Eternal Love | September 20, 2026 | Hawassa, Ethiopia",
        footer_credits: "Celebrated with heartfelt joy, faith, and blessings 💛"
    },
    am: {
        music_label: "ሙዚቃ አጫውት",
        music_playing: "እየተጫወተ ነው",
        splash_subtitle: "የክብር የጋብቻ ጥሪ",
        splash_title: "ኢ/ር ቴዎድሮስ እና ዶ/ር ሳራ",
        splash_tap: "✨ ጥሪውን ይክፈቱ ✨",
        splash_hint: "✦ ለመግባት የትም ይንኩ ✦",
        middle_date_main: "እሑድ መስከረም 10 ቀን 2018 ዓ.ም",
        fancy_title: "ኢ/ር ቴዎድሮስ በላይ እና ዶ/ር ሳራ አየለ",
        hero_tagline: "ዘላለማዊ ፍቅርና በረከት",
        hero_meta: "🗓️ እሑድ መስከረም 10 ቀን 2018 ዓ.ም • 📍 ሀዋሳ ፣ ኢትዮጵያ",
        btn_rsvp_hero: "ምላሽ ይላኩ",
        btn_view_program: "ፕሮግራሙን ይመልከቱ ↓",
        save_date_badge: "ቀኑን ያስቀምጡ",
        save_date_title: '<span class="title-icon">💍</span> <span class="title-text">በደስታችን አብረውን ይሁኑ</span>',
        save_date_subtitle: "እሑድ መስከረም 10 ቀን 2018 ዓ.ም",
        countdown_heading: "ወደ ደማቁ የሠርግ ቀን ቆጠራ",
        countdown_header: "የሠርግ ቆጠራ",
        timer_label: "ለሠርጋችን የሚቀረው ጊዜ",
        unit_days: "ቀናት",
        unit_hrs: "ሰዓታት",
        unit_min: "ደቂቃዎች",
        unit_sec: "ሰከንዶች",
        btn_add_calendar: "ወደ Google Calendar ያክሉ",
        calendar_header: "መስከረም 2018 ዓ.ም",
        cal_badge_day: "መስከረም 10",
        day_sun: "እሑድ", day_mon: "ሰኞ", day_tue: "ማክሰ", day_wed: "ረቡዕ", day_thu: "ሐሙስ", day_fri: "ዓርብ", day_sat: "ቅዳሜ",
        card_tag: "የጥሪ ካርድ",
        card_header: '<span class="title-icon">📜</span> <span class="title-text">ኦፊሴላዊ የጥሪ ካርድ</span>',
        scripture: '"ሁሉን ያዘጋጀ ግን እግዚአብሔር ነው::" — ዕብ 3:4',
        timeline_tag: "የቀኑ መርሐ-ግብር",
        timeline_heading: '<span class="title-icon">📅</span> <span class="title-text">የሠርጉ ቀን መርሐ-ግብር</span>',
        timeline_subtitle: "የክብረ በዓሉ ቅደም ተከተልና የጉዞ ዝግጅት",
        timeline_1_time: "10:00 AM - 12:00 PM",
        timeline_1_title: "ጉዞ ወደ ሙሽሪት ቤት",
        timeline_1_desc: "ወደ ዲላ መኖሪያ ቤት ጉዞ",
        timeline_2_time: "12:00 PM - 12:15 PM",
        timeline_2_title: "ሙሽሪት ቤት መድረስ",
        timeline_2_desc: "የአቀባበል ስነ-ስርዓት",
        timeline_3_time: "12:15 PM - 3:00 PM",
        timeline_3_title: "ቆይታ በሙሽሪት ቤት",
        timeline_3_desc: "የምሳ ግብዣና ፎቶ ፕሮግራም",
        timeline_4_time: "3:00 PM - 5:00 PM",
        timeline_4_title: "ጉዞ ወደ ሀዋሳ",
        timeline_4_desc: "የአጁቢዎች ደማቅ የክብር ሰልፍ",
        timeline_5_time: "5:00 PM - 6:00 PM",
        timeline_5_title: "ዕረፍት",
        timeline_5_desc: "የዕረፍትና የዝግጅት ጊዜ",
        timeline_6_time: "6:00 PM - 9:00 PM",
        timeline_6_title: "ቆይታ በ ሴንትራል ሆቴል",
        timeline_6_desc: "ታላቅ የምሽት ድግስና ደስታ",
        locations_tag: "የቦታ መመሪያ",
        locations_heading: '<span class="title-icon">📍</span> <span class="title-text">የክብረ በዓሉ ቦታዎች</span>',
        locations_subtitle: "በቀላሉ ወደ ቦታዎቹ ለመድረስ የካርታ መመሪያዎችን ይጠቀሙ",
        loc_badge_day: "6:00 – 9:00 • የጠዋትና የምሳ ዝግጅት",
        loc_Dila_title: "የሙሽሪት መኖሪያ ቤት (ዲላ)",
        loc_Dila_desc: "ዲላ ቅርንጫፍ ት/ቤት አጠገብ ፣ ዲላ ፣ ኢትዮጵያ",
        loc_badge_night: "12:00 – 3:00 • የምሽት የእራት ግብዣ",
        loc_central_title: "ሴንትራል ሆቴል",
        loc_central_desc: "ሴንትራል ሆቴል ፣ ሀዋሳ ፣ ኢትዮጵያ",
        btn_maps: "በጎግል ካርታ ክፈት",
        gallery_tag: "ትዝታዎች",
        photos_heading: '<span class="title-icon">✨</span> <span class="title-text">የሠርጋችን የትዝታ ምስሎች</span> <span class="title-icon">✨</span>',
        photos_subtitle: "ልዩ የፍቅርና የደስታ ፎቶዎች ስብስብ (28 ፎቶዎች)",
        btn_view_fullscreen: "በሙሉ ገጽ ይመልከቱ",
        rsvp_tag: "የግብዣ ምላሽ",
        rsvp_heading: '<span class="title-icon">💌</span> <span class="title-text">በሠርጋችን ላይ ይገኛሉ?</span>',
        rsvp_subtitle: "ክብርዎን እንድንጠብቅ እባክዎ መገኘትዎን ያሳውቁን",
        lbl_name: "ሙሉ ስም *",
        lbl_attendance: "መገኘት *",
        opt_attend_yes: "በደስታ እገኛለሁ",
        opt_attend_no: "አልችልም",
        lbl_guests: "የእንግዶች ብዛት",
        guest_1: "1 ሰው (ብቻዬን)",
        guest_2: "2 ሰዎች (+ አጋር)",
        guest_3: "3 ሰዎች (ቤተሰብ)",
        guest_4: "4+ ሰዎች",
        opt_rel_hint: "ለሙሽሮቹ ያለዎት ዝምድና",
        opt_rel_bride: "የሙሽሪት ቤተሰብ",
        opt_rel_groom: "የሙሽራው ቤተሰብ",
        opt_rel_both: "የሁለቱም ወዳጅ",
        opt_rel_fam: "ቤተሰብ",
        opt_rel_col: "የሥራ ባልደረባ",
        lbl_wishes: "የምርቃት መልዕክትና መልካም ምኞት",
        btn_rsvp_submit: "ምላሽዎን ይላኩ",
        share_tag: "ቀጥታ ይላኩ",
        qr_title: '<span class="title-icon">📸</span> <span class="title-text">ፎቶዎችና ቪዲዮዎችን ያጋሩ</span>',
        qr_subtitle: "በሠርጉ ላይ የሚያነሷቸውን ልዩ ፎቶዎችና ቪዲዮዎች ለቴሌግራም ቦቱ በቀጥታ ይላኩ!",
        footer_text: "ኢ/ር ቴዎድሮስ በላይ እና ዶ/ር ሳራ አየለ — ዘላለማዊ ፍቅር | እሑድ መስከረም 10 ቀን 2018 ዓ.ም | ሀዋሳ ፣ ኢትዮጵያ",
        footer_credits: "በታላቅ ደስታና ፍቅር የተዘጋጀ 💛"
    }
};

let currentLang = localStorage.getItem('sara_wedding_lang') || 'en';
if (currentLang !== 'en' && currentLang !== 'am') {
    currentLang = 'en';
}

function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'am') lang = 'en';
    currentLang = lang;
    localStorage.setItem('sara_wedding_lang', lang);
    document.body.classList.remove('lang-en', 'lang-am');
    document.body.classList.add(`lang-${lang}`);
    document.documentElement.setAttribute('lang', lang);

    // Update single toggle button indicators
    const optEn = document.getElementById('langOptEn');
    const optAm = document.getElementById('langOptAm');
    if (optEn) optEn.classList.toggle('active', lang === 'en');
    if (optAm) optAm.classList.toggle('active', lang === 'am');

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    renderCalendarForCurrentLanguage();
    updateTimer();
    updateMusicLabel();
    updateGuestVisibility();
}

function toggleLanguage() {
    setLanguage(currentLang === 'en' ? 'am' : 'en');
}

// --------------------------------------------------------------------------
// 1. CELESTIAL MOVING STARS & FLOATING STARDUST (HIGH-PERFORMANCE & LOW-MEMORY)
// --------------------------------------------------------------------------
const sparkleCanvas = document.getElementById('sparkleCanvas');
let sparkleCtx = null;
let celestialStars = [];
let shootingStars = [];
let cursorStars = [];
let lastShootingStarTime = 0;
let isSparkleActive = true;
let sparkleAnimId = null;
let resizeDebounceTimer = null;

// Offscreen sprite caches: Pre-rendered once at startup - ZERO shadowBlur per frame!
let starSpriteGold = null;
let starSpriteWhite = null;
let circleSpriteGold = null;
let circleSpriteWhite = null;

function createStarSprite(colorRgb, size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const center = size / 2;
    const outer = size * 0.42;
    const inner = outer * 0.25;

    // Fast soft outer glow using radial gradient
    const radGrad = ctx.createRadialGradient(center, center, 0, center, center, outer * 1.15);
    radGrad.addColorStop(0, `rgba(${colorRgb}, 0.5)`);
    radGrad.addColorStop(0.4, `rgba(${colorRgb}, 0.16)`);
    radGrad.addColorStop(1, `rgba(${colorRgb}, 0)`);
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(center, center, outer * 1.15, 0, Math.PI * 2);
    ctx.fill();

    // 4-point star geometry
    ctx.beginPath();
    const step = Math.PI / 4;
    for (let i = 0; i < 8; i++) {
        const r = (i % 2 === 0) ? outer : inner;
        const x = center + Math.cos(i * step - Math.PI / 2) * r;
        const y = center + Math.sin(i * step - Math.PI / 2) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = `rgb(${colorRgb})`;
    ctx.fill();

    // Bright core flare point
    ctx.beginPath();
    ctx.arc(center, center, Math.max(1, inner * 0.9), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    return c;
}

function createCircleSprite(colorRgb, size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const center = size / 2;
    const radius = size * 0.45;

    const radGrad = ctx.createRadialGradient(center, center, 0, center, center, radius);
    radGrad.addColorStop(0, '#ffffff');
    radGrad.addColorStop(0.35, `rgba(${colorRgb}, 0.85)`);
    radGrad.addColorStop(0.7, `rgba(${colorRgb}, 0.2)`);
    radGrad.addColorStop(1, `rgba(${colorRgb}, 0)`);
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    return c;
}

function initSparkleSprites() {
    if (starSpriteGold) return;
    starSpriteGold = createStarSprite('212, 175, 55', 48);
    starSpriteWhite = createStarSprite('255, 245, 215', 48);
    circleSpriteGold = createCircleSprite('212, 175, 55', 36);
    circleSpriteWhite = createCircleSprite('255, 245, 215', 36);
}

function initSparkles() {
    if (!sparkleCanvas) return;
    sparkleCtx = sparkleCanvas.getContext('2d', { alpha: true });
    initSparkleSprites();
    resizeSparkleCanvas();

    // Debounced resize listener to avoid rapid canvas buffer re-allocations
    window.addEventListener('resize', () => {
        clearTimeout(resizeDebounceTimer);
        resizeDebounceTimer = setTimeout(resizeSparkleCanvas, 150);
    }, { passive: true });

    // Only enable pointermove cursor stardust on non-touch (mouse) devices to save mobile battery & RAM
    if (!isTouchDevice) {
        window.addEventListener('pointermove', onPointerMoveSparkle, { passive: true });
    }

    // Pause canvas rendering when tab is hidden or minimized
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isSparkleActive = false;
            if (sparkleAnimId) {
                cancelAnimationFrame(sparkleAnimId);
                sparkleAnimId = null;
            }
        } else {
            isSparkleActive = true;
            if (!sparkleAnimId) {
                lastShootingStarTime = Date.now();
                sparkleAnimId = requestAnimationFrame(renderCelestialField);
            }
        }
    });

    // Mobile & low-memory particle count:
    // Low-end / older phones: 6 stars (silky 60-120 FPS, virtually 0 CPU)
    // Normal mobile: 10 stars
    // Desktop: 24 stars
    const starCount = isLowEndDevice ? 6 : (window.innerWidth < 768 ? 10 : 24);
    celestialStars = [];

    for (let i = 0; i < starCount; i++) {
        const isStarShape = Math.random() > 0.45;
        const isGold = Math.random() > 0.25;
        celestialStars.push({
            x: Math.random() * sparkleCanvas.width,
            y: Math.random() * sparkleCanvas.height,
            isStar: isStarShape,
            sprite: isStarShape
                ? (isGold ? starSpriteGold : starSpriteWhite)
                : (isGold ? circleSpriteGold : circleSpriteWhite),
            size: isStarShape ? (Math.random() * 8 + 14) : (Math.random() * 5 + 8),
            vx: (Math.random() - 0.5) * 0.25,
            vy: -(Math.random() * 0.35 + 0.12),
            baseAlpha: Math.random() * 0.5 + 0.35,
            twinkleSpeed: Math.random() * 0.035 + 0.015,
            twinklePhase: Math.random() * Math.PI * 2
        });
    }

    lastShootingStarTime = Date.now();
    sparkleAnimId = requestAnimationFrame(renderCelestialField);
}

// Fixed-size cursor particle pool to avoid GC object churn
let lastPointerTime = 0;
function onPointerMoveSparkle(e) {
    if (cursorStars.length >= 8) return;
    const now = performance.now();
    if (now - lastPointerTime < 80) return; // Throttle to max ~12 particles/sec
    lastPointerTime = now;

    cursorStars.push({
        x: e.clientX,
        y: e.clientY,
        size: Math.random() * 6 + 10,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6 - 0.2,
        sprite: Math.random() > 0.4 ? starSpriteGold : circleSpriteGold,
        alpha: 0.8,
        decay: Math.random() * 0.035 + 0.025
    });
}

function resizeSparkleCanvas() {
    if (!sparkleCanvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (sparkleCanvas.width !== w || sparkleCanvas.height !== h) {
        sparkleCanvas.width = w;
        sparkleCanvas.height = h;
    }
}

function spawnShootingStar() {
    const startX = Math.random() * (sparkleCanvas.width * 0.7);
    const startY = Math.random() * (sparkleCanvas.height * 0.35);
    const length = Math.random() * 110 + 80;
    const speed = Math.random() * 7 + 6;
    const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.2;

    shootingStars.push({
        x: startX,
        y: startY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        len: length,
        life: 1.0,
        decay: Math.random() * 0.018 + 0.014
    });
}

let lastSparkleRenderTime = 0;
function renderCelestialField(timestamp) {
    if (!isSparkleActive || !sparkleCtx) return;

    // Yield 100% of CPU and GPU to the browser during active user touch/scrolling on mobile
    if (isUserScrolling && isLowEndDevice) {
        sparkleAnimId = requestAnimationFrame(renderCelestialField);
        return;
    }

    // On low-end mobile devices, cap to ~30 FPS to prevent battery drain and frame drops
    const ts = timestamp || performance.now();
    if (isLowEndDevice && (ts - lastSparkleRenderTime < 32)) {
        sparkleAnimId = requestAnimationFrame(renderCelestialField);
        return;
    }
    lastSparkleRenderTime = ts;

    sparkleCtx.clearRect(0, 0, sparkleCanvas.width, sparkleCanvas.height);

    // 1. Render Floating Ambient & Diamond Stars via cached GPU sprite blit (ZERO shadowBlur!)
    for (let i = 0; i < celestialStars.length; i++) {
        const s = celestialStars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.twinklePhase += s.twinkleSpeed;

        if (s.y < -20) {
            s.y = sparkleCanvas.height + 15;
            s.x = Math.random() * sparkleCanvas.width;
        } else if (s.y > sparkleCanvas.height + 20) {
            s.y = -15;
        }
        if (s.x < -20) s.x = sparkleCanvas.width + 15;
        else if (s.x > sparkleCanvas.width + 20) s.x = -15;

        const currentAlpha = Math.max(0.12, s.baseAlpha * (0.65 + 0.35 * Math.sin(s.twinklePhase)));
        const halfSize = s.size / 2;

        sparkleCtx.globalAlpha = currentAlpha;
        sparkleCtx.drawImage(s.sprite, s.x - halfSize, s.y - halfSize, s.size, s.size);
    }

    // 2. Render Interactive Cursor Stardust
    for (let i = cursorStars.length - 1; i >= 0; i--) {
        const c = cursorStars[i];
        c.x += c.vx;
        c.y += c.vy;
        c.alpha -= c.decay;

        if (c.alpha <= 0) {
            cursorStars.splice(i, 1);
            continue;
        }

        const halfSize = c.size / 2;
        sparkleCtx.globalAlpha = c.alpha;
        sparkleCtx.drawImage(c.sprite, c.x - halfSize, c.y - halfSize, c.size, c.size);
    }

    // 3. Periodic Shooting Star (Capped interval to minimize wakeups)
    const now = Date.now();
    if (now - lastShootingStarTime > 5500 + Math.random() * 4000) {
        if (shootingStars.length < 2) spawnShootingStar();
        lastShootingStarTime = now;
    }

    // 4. Render Shooting Stars without expensive shadowBlur
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const meteor = shootingStars[i];
        meteor.x += meteor.dx;
        meteor.y += meteor.dy;
        meteor.life -= meteor.decay;

        if (meteor.life <= 0 || meteor.x > sparkleCanvas.width + 80 || meteor.y > sparkleCanvas.height + 80) {
            shootingStars.splice(i, 1);
            continue;
        }

        const tailX = meteor.x - (meteor.dx / Math.hypot(meteor.dx, meteor.dy)) * meteor.len;
        const tailY = meteor.y - (meteor.dy / Math.hypot(meteor.dx, meteor.dy)) * meteor.len;

        const grad = sparkleCtx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
        grad.addColorStop(0, 'rgba(212, 175, 55, 0)');
        grad.addColorStop(0.7, `rgba(212, 175, 55, ${meteor.life * 0.5})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${meteor.life})`);

        sparkleCtx.globalAlpha = 1.0;
        sparkleCtx.beginPath();
        sparkleCtx.moveTo(tailX, tailY);
        sparkleCtx.lineTo(meteor.x, meteor.y);
        sparkleCtx.strokeStyle = grad;
        sparkleCtx.lineWidth = 2.0;
        sparkleCtx.stroke();

        // Glowing head using fast dual arc (zero shadowBlur)
        sparkleCtx.beginPath();
        sparkleCtx.arc(meteor.x, meteor.y, 4, 0, Math.PI * 2);
        sparkleCtx.fillStyle = `rgba(212, 175, 55, ${meteor.life * 0.4})`;
        sparkleCtx.fill();

        sparkleCtx.beginPath();
        sparkleCtx.arc(meteor.x, meteor.y, 2, 0, Math.PI * 2);
        sparkleCtx.fillStyle = `rgba(255, 255, 255, ${meteor.life})`;
        sparkleCtx.fill();
    }

    sparkleCtx.globalAlpha = 1.0;
    sparkleAnimId = requestAnimationFrame(renderCelestialField);
}

// --------------------------------------------------------------------------
// 2. CONFETTI CELEBRATION EFFECT
// --------------------------------------------------------------------------
const confettiCanvas = document.getElementById('confettiCanvas');
let confettiCtx = null;
let confettiParticles = [];
let confettiRunning = false;

function fireConfetti() {
    if (!confettiCanvas) return;
    confettiCtx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    confettiParticles = [];
    const colors = ['#f5d77f', '#d4af37', '#ffffff', '#e8dec8', '#ffccd5', '#fceda9'];
    for (let i = 0; i < 140; i++) {
        confettiParticles.push({
            x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 200,
            y: confettiCanvas.height * 0.65,
            w: Math.random() * 10 + 6,
            h: Math.random() * 6 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 16,
            vy: -(Math.random() * 14 + 10),
            gravity: 0.38,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10,
            opacity: 1
        });
    }

    if (!confettiRunning) {
        confettiRunning = true;
        renderConfetti();
    }
}

function renderConfetti() {
    if (!confettiCtx) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.007;

        if (p.opacity <= 0 || p.y > confettiCanvas.height + 20) {
            confettiParticles.splice(i, 1);
            continue;
        }

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.globalAlpha = Math.max(0, p.opacity);
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
    }

    if (confettiParticles.length > 0) {
        requestAnimationFrame(renderConfetti);
    } else {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiRunning = false;
    }
}

// --------------------------------------------------------------------------
// 3. AUDIO LOGIC (Background Music & Web Audio Fallback)
// --------------------------------------------------------------------------
const audio = document.getElementById('weddingSong');
const musicToggleBtn = document.getElementById('musicToggleBtn');
const musicStatusLabel = document.getElementById('musicStatusLabel');
let isMusicPlaying = false;
let audioContext = null;
let synthInterval = null;

function ensureAudioUnlocked() {
    if (!audioContext) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) audioContext = new AudioCtx();
        } catch (e) { }
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Romantic Harp/Celesta Chord Arpeggiator
const chordProgressions = [
    [261.63, 329.63, 392.00, 523.25], // C major
    [220.00, 261.63, 329.63, 440.00], // A minor
    [174.61, 220.00, 261.63, 349.23], // F major
    [196.00, 246.94, 293.66, 392.00]  // G major
];
let chordIndex = 0;
let noteIndex = 0;

function playAcousticNote() {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume();

    const currentChord = chordProgressions[chordIndex % chordProgressions.length];
    const freq = currentChord[noteIndex % currentChord.length];

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);

    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 1.4);

    noteIndex++;
    if (noteIndex % currentChord.length === 0) {
        chordIndex++;
    }
}

function updateMusicLabel() {
    if (!musicStatusLabel) return;
    const key = isMusicPlaying ? 'music_playing' : 'music_label';
    musicStatusLabel.textContent = translations[currentLang][key] || (isMusicPlaying ? 'Playing' : 'Play Song');
}

function startSynthMusic() {
    ensureAudioUnlocked();
    if (!synthInterval) {
        playAcousticNote();
        synthInterval = setInterval(() => {
            if (isMusicPlaying) playAcousticNote();
        }, 480);
    }
}

function startMusic() {
    ensureAudioUnlocked();
    isMusicPlaying = true;
    if (musicToggleBtn) musicToggleBtn.classList.add('playing');
    updateMusicLabel();

    if (audio) {
        const p = audio.play();
        if (p !== undefined) {
            p.catch(err => {
                console.warn("Native audio play failed, using acoustic synthesizer fallback:", err);
                startSynthMusic();
            });
        }
    } else {
        startSynthMusic();
    }
}

function stopMusic() {
    isMusicPlaying = false;
    if (musicToggleBtn) musicToggleBtn.classList.remove('playing');
    updateMusicLabel();

    if (audio) audio.pause();
    if (synthInterval) {
        clearInterval(synthInterval);
        synthInterval = null;
    }
}

if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        ensureAudioUnlocked();
        if (isMusicPlaying) stopMusic();
        else startMusic();
    });
}

// --------------------------------------------------------------------------
// 4. ROYAL INVITATION WAX-SEAL REVEAL
// --------------------------------------------------------------------------
const royalSplash = document.getElementById('royalSplash');
const mainContent = document.getElementById('mainContent');
const openSealBtn = document.getElementById('openSealBtn');
const openInvitationBtn = document.getElementById('openInvitationBtn');
let hasOpened = false;

function unveilInvitation(immediate = false) {
    if (hasOpened) return;
    hasOpened = true;

    ensureAudioUnlocked();
    startMusic();

    // Release scroll lock on html and body so 2nd page can be scrolled normally
    document.documentElement.classList.remove('splash-active');
    document.body.classList.remove('splash-active');

    if (royalSplash) {
        if (immediate) {
            royalSplash.style.display = 'none';
            if (mainContent) mainContent.classList.add('show');
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            triggerScrollRevealCheck();
            return;
        }
        royalSplash.classList.add('hide');
        if (mainContent) mainContent.classList.add('show');
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        setTimeout(() => {
            royalSplash.style.display = 'none';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            const heroSection = document.getElementById('heroSection');
            if (heroSection) {
                heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            triggerScrollRevealCheck();
        }, 500);
    } else {
        if (mainContent) mainContent.classList.add('show');
        triggerScrollRevealCheck();
    }
}

// Click, tap or swipe anywhere on the first page (or on the button) to open invitation and scroll to 2nd page
if (royalSplash) {
    royalSplash.addEventListener('click', unveilInvitation);
    royalSplash.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') unveilInvitation();
    });

    // Prevent background scrolling while guest is viewing the 1st page
    royalSplash.addEventListener('touchmove', (e) => {
        if (!hasOpened) {
            e.preventDefault();
        }
    }, { passive: false });

    let splashTouchStartY = 0;
    royalSplash.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
            splashTouchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    royalSplash.addEventListener('touchend', (e) => {
        if (e.changedTouches && e.changedTouches.length === 1) {
            const diffY = splashTouchStartY - e.changedTouches[0].clientY;
            if (diffY > 30) {
                unveilInvitation();
            }
        }
    }, { passive: true });
}
if (openInvitationBtn) {
    openInvitationBtn.addEventListener('click', unveilInvitation);
}
if (new URLSearchParams(window.location.search).has('unveil')) {
    unveilInvitation(true);
}



// --------------------------------------------------------------------------
// 5. LIVE COUNTDOWN TIMER & PURE LINGUISTIC CALENDAR
// --------------------------------------------------------------------------
function updateTimer() {
    const now = new Date();
    const diff = WEDDING_DATE - now;

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minEl = document.getElementById('minutes');
    const secEl = document.getElementById('seconds');
    const timerLabel = document.getElementById('timerLabel');

    if (!daysEl) return;

    if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minEl.textContent = String(minutes).padStart(2, '0');
        secEl.textContent = String(seconds).padStart(2, '0');

        if (timerLabel && translations[currentLang]) {
            timerLabel.textContent = translations[currentLang].timer_label;
        }
    } else {
        const marriedTime = now - WEDDING_DATE;
        const days = Math.floor(marriedTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((marriedTime % 86400000) / 3600000);
        const minutes = Math.floor((marriedTime % 3600000) / 60000);
        const seconds = Math.floor((marriedTime % 60000) / 1000);

        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minEl.textContent = String(minutes).padStart(2, '0');
        secEl.textContent = String(seconds).padStart(2, '0');

        if (timerLabel) {
            if (currentLang === 'am') timerLabel.textContent = 'በትዳር ያሳለፍናቸው ቀናት';
            else timerLabel.textContent = 'Days we have been married';
        }
    }
}

updateTimer();
setInterval(updateTimer, 1000);

// Calendar rendering strictly matching the selected language
function renderCalendarForCurrentLanguage() {
    const grid = document.getElementById('calendarDaysGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (currentLang === 'en') {
        // Gregorian September 2026:
        // September 1, 2026 is Tuesday (0=Sun, 1=Mon, 2=Tue)
        const startDayIndex = 2;
        const totalDays = 30;
        const weddingDay = 20; // Sept 20, 2026

        for (let i = 0; i < startDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'cal-day-cell';
            emptyCell.style.visibility = 'hidden';
            grid.appendChild(emptyCell);
        }

        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'cal-day-cell';
            if (day === weddingDay) {
                dayCell.classList.add('wedding-day');
                dayCell.title = "Wedding Day!";
                dayCell.innerHTML = `<span>${day}</span><span class="wedding-day-pin">💍</span>`;
            } else {
                dayCell.textContent = day;
            }
            grid.appendChild(dayCell);
        }
    } else {
        // Ethiopian Meskerem 2018 (for AM and AO):
        // Meskerem 1, 2018 is Friday (0=Sun, 1=Mon, ..., 5=Fri)
        const startDayIndex = 5;
        const totalDays = 30;
        const weddingDay = 10; // Meskerem 10, 2018

        for (let i = 0; i < startDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'cal-day-cell';
            emptyCell.style.visibility = 'hidden';
            grid.appendChild(emptyCell);
        }

        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'cal-day-cell';
            if (day === weddingDay) {
                dayCell.classList.add('wedding-day');
                dayCell.title = "Wedding Day!";
                dayCell.innerHTML = `<span>${day}</span><span class="wedding-day-pin">💍</span>`;
            } else {
                dayCell.textContent = day;
            }
            grid.appendChild(dayCell);
        }
    }
}

// Initial calendar render immediately
renderCalendarForCurrentLanguage();

// --------------------------------------------------------------------------
// 6. PHOTO GALLERY & LIGHTBOX MODAL (29 PHOTOS)
// --------------------------------------------------------------------------
let currentPhotoIndex = 0;
let galleryAutoInterval = null;

const featuredPhotoImg = document.getElementById('featuredPhotoImg');
const photoCounterBadge = document.getElementById('photoCounterBadge');
const galleryFilmstrip = document.getElementById('galleryFilmstrip');
const prevSlideBtn = document.getElementById('prevSlideBtn');
const nextSlideBtn = document.getElementById('nextSlideBtn');

// Gallery Lightbox Elements
const lightboxModal = document.getElementById('lightboxModal');
const lightboxImage = document.getElementById('lightboxImage');
const closeLightboxBtn = document.getElementById('closeLightboxBtn');
const lightboxPrevBtn = document.getElementById('lightboxPrevBtn');
const lightboxNextBtn = document.getElementById('lightboxNextBtn');
const openLightboxBtn = document.getElementById('openLightboxBtn');


let galleryInitialized = false;

function initGallery() {
    if (galleryInitialized || !galleryFilmstrip) return;
    galleryInitialized = true;
    galleryFilmstrip.innerHTML = '';

    const fragment = document.createDocumentFragment();
    PHOTO_ARRAY.forEach((src, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `gallery-thumb ${idx === 0 ? 'active' : ''}`;
        thumb.dataset.index = idx;

        const img = document.createElement('img');
        img.src = THUMB_ARRAY[idx];
        img.alt = `Wedding Portrait ${idx + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 76;
        img.height = 76;
        thumb.appendChild(img);

        thumb.addEventListener('click', () => {
            selectPhoto(idx);
            resetAutoSlide();
        });

        fragment.appendChild(thumb);
    });
    galleryFilmstrip.appendChild(fragment);

    selectPhoto(0);
    startAutoSlide();
}

function setupLazyGallery() {
    const gallerySec = document.getElementById('gallerySection');
    if (!gallerySec || !('IntersectionObserver' in window)) {
        initGallery();
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!galleryInitialized) {
                    initGallery();
                } else {
                    startAutoSlide();
                }
            } else {
                if (galleryAutoInterval) {
                    clearInterval(galleryAutoInterval);
                    galleryAutoInterval = null;
                }
            }
        });
    }, { rootMargin: '250px 0px' });
    observer.observe(gallerySec);
}

function selectPhoto(index) {
    currentPhotoIndex = index;
    if (featuredPhotoImg) {
        featuredPhotoImg.style.opacity = '0.3';
        setTimeout(() => {
            featuredPhotoImg.src = PHOTO_ARRAY[currentPhotoIndex];
            featuredPhotoImg.style.opacity = '1';
        }, 150);
    }

    if (photoCounterBadge) {
        photoCounterBadge.textContent = `Photo ${currentPhotoIndex + 1} of ${PHOTO_ARRAY.length}`;
    }

    // Update active thumb without touching window scroll!
    const thumbs = document.querySelectorAll('.gallery-thumb');
    const filmstripContainer = document.querySelector('.gallery-filmstrip-container');

    thumbs.forEach((t, i) => {
        const isActive = (i === currentPhotoIndex);
        t.classList.toggle('active', isActive);
        if (isActive && filmstripContainer) {
            const containerWidth = filmstripContainer.clientWidth;
            const thumbLeft = t.offsetLeft;
            const thumbWidth = t.clientWidth;
            const targetScrollLeft = thumbLeft - (containerWidth / 2) + (thumbWidth / 2);
            filmstripContainer.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
        }
    });

    // If gallery lightbox is open, sync it
    if (lightboxModal && lightboxModal.classList.contains('open') && lightboxImage) {
        lightboxImage.src = PHOTO_ARRAY[currentPhotoIndex];
    }
}

function nextPhoto() {
    let nextIdx = (currentPhotoIndex + 1) % PHOTO_ARRAY.length;
    selectPhoto(nextIdx);
}

function prevPhoto() {
    let prevIdx = (currentPhotoIndex - 1 + PHOTO_ARRAY.length) % PHOTO_ARRAY.length;
    selectPhoto(prevIdx);
}

function startAutoSlide() {
    if (galleryAutoInterval) clearInterval(galleryAutoInterval);
    galleryAutoInterval = setInterval(nextPhoto, 5000);
}

function resetAutoSlide() {
    if (galleryAutoInterval) clearInterval(galleryAutoInterval);
    startAutoSlide();
}

// Pause auto-sliding when hovering over gallery
const featuredBox = document.getElementById('featuredPhotoBox');
if (featuredBox) {
    featuredBox.addEventListener('mouseenter', () => clearInterval(galleryAutoInterval));
    featuredBox.addEventListener('mouseleave', () => resetAutoSlide());
}

if (prevSlideBtn) prevSlideBtn.addEventListener('click', () => { prevPhoto(); resetAutoSlide(); });
if (nextSlideBtn) nextSlideBtn.addEventListener('click', () => { nextPhoto(); resetAutoSlide(); });

// Bulletproof Background Scroll Lock for Fullscreen Lightbox & Modals
let savedScrollY = 0;

function lockBodyScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    document.documentElement.classList.add('modal-scroll-locked');
    document.body.classList.add('modal-scroll-locked');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
}

function unlockBodyScroll() {
    document.documentElement.classList.remove('modal-scroll-locked');
    document.body.classList.remove('modal-scroll-locked');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
}

// Gallery Lightbox Open & Close
function openLightbox() {
    if (!lightboxModal || !lightboxImage) return;
    if (galleryAutoInterval) clearInterval(galleryAutoInterval);
    lightboxImage.src = PHOTO_ARRAY[currentPhotoIndex];
    lightboxModal.classList.add('open');
    lightboxModal.setAttribute('aria-hidden', 'false');
    lockBodyScroll();
}

function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('open');
    lightboxModal.setAttribute('aria-hidden', 'true');
    unlockBodyScroll();
    startAutoSlide();
}

if (openLightboxBtn) openLightboxBtn.addEventListener('click', openLightbox);
if (featuredPhotoImg) featuredPhotoImg.addEventListener('click', openLightbox);
if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', prevPhoto);
if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', nextPhoto);

if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal || e.target.classList.contains('lightbox-img-container')) {
            closeLightbox();
        }
    });

    // Completely stop mouse wheel and touch scroll from bleeding into background
    lightboxModal.addEventListener('wheel', (e) => {
        e.preventDefault();
    }, { passive: false });

    let touchStartX = 0;
    let touchStartY = 0;

    lightboxModal.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    lightboxModal.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Stop any background bounce/scroll
    }, { passive: false });

    lightboxModal.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1) {
            const diffX = e.changedTouches[0].clientX - touchStartX;
            const diffY = e.changedTouches[0].clientY - touchStartY;
            // Horizontal swipe to change photos
            if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) {
                    nextPhoto();
                } else {
                    prevPhoto();
                }
            }
        }
    }, { passive: true });
}

// Stop keyboard scrolling when lightbox is open
window.addEventListener('keydown', (e) => {
    if (!lightboxModal || !lightboxModal.classList.contains('open')) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code)) {
        e.preventDefault();
    }
    if (e.key === 'ArrowLeft') {
        prevPhoto();
    } else if (e.key === 'ArrowRight') {
        nextPhoto();
    } else if (e.key === 'Escape') {
        closeLightbox();
    }
});

// Global Keyboard Navigation (Escape, Arrows)
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (lightboxModal && lightboxModal.classList.contains('open')) closeLightbox();
    }
    if (lightboxModal && lightboxModal.classList.contains('open')) {
        if (e.key === 'ArrowLeft') prevPhoto();
        if (e.key === 'ArrowRight') nextPhoto();
    }
});

// Mobile touch swipe
let touchStartX = 0;
let touchEndX = 0;

function handleSwipe() {
    if (touchEndX < touchStartX - 50) nextPhoto();
    if (touchEndX > touchStartX + 50) prevPhoto();
}

const photoBoxEl = document.getElementById('featuredPhotoBox');
if (photoBoxEl) {
    photoBoxEl.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    photoBoxEl.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); }, { passive: true });
}

if (lightboxModal) {
    lightboxModal.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    lightboxModal.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); }, { passive: true });
}

// --------------------------------------------------------------------------
// 7. DELUXE RSVP FORM WITH CONDITIONAL GUEST COUNT & SECURE BACKEND
// --------------------------------------------------------------------------
const rsvpForm = document.getElementById('rsvpForm');
const formFeedback = document.getElementById('formFeedback');
const rsvpSubmitBtn = document.getElementById('rsvpSubmitBtn');
const pillAttendYes = document.getElementById('pillAttendYes');
const pillAttendNo = document.getElementById('pillAttendNo');
const guestCountGroup = document.getElementById('guestCountGroup');

// Show Number of Guests ONLY if attendance is "Yes"
function updateGuestVisibility() {
    const attendingRadio = document.querySelector('input[name="attendanceRadio"]:checked');
    const isAttending = attendingRadio ? attendingRadio.value === 'Yes' : true;
    if (guestCountGroup) {
        guestCountGroup.style.display = isAttending ? 'block' : 'none';
    }
}

if (pillAttendYes && pillAttendNo) {
    pillAttendYes.addEventListener('click', () => {
        pillAttendYes.classList.add('active');
        pillAttendNo.classList.remove('active');
        const r = pillAttendYes.querySelector('input');
        if (r) r.checked = true;
        updateGuestVisibility();
    });
    pillAttendNo.addEventListener('click', () => {
        pillAttendNo.classList.add('active');
        pillAttendYes.classList.remove('active');
        const r = pillAttendNo.querySelector('input');
        if (r) r.checked = true;
        updateGuestVisibility();
    });
}

function getRsvpData() {
    const guestName = document.getElementById('guestName') ? document.getElementById('guestName').value.trim() : '';
    const attendingRadio = document.querySelector('input[name="attendanceRadio"]:checked');
    const attending = attendingRadio ? attendingRadio.value : "Yes";
    const isAttending = (attending === "Yes");
    const guestCount = isAttending ? (document.getElementById('guestCount') ? document.getElementById('guestCount').value : "1") : "0";
    const relation = document.getElementById('relation') ? document.getElementById('relation').value : "Not specified";
    const message = document.getElementById('message') ? document.getElementById('message').value.trim() : "";

    return { guestName, attending, isAttending, guestCount, relation, message };
}

if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = getRsvpData();
        if (!data.guestName) {
            formFeedback.innerHTML = `<span style="color:#ff8585;">⚠️ Please enter your name.</span>`;
            return;
        }

        rsvpSubmitBtn.disabled = true;
        rsvpSubmitBtn.textContent = currentLang === 'am' ? "ምላሽዎን በመላክ ላይ..." : "Delivering RSVP...";
        formFeedback.innerHTML = `<span style="color:var(--gold-300);">⏳ Delivering...</span>`;

        try {
            const stored = JSON.parse(localStorage.getItem('wedding_local_rsvps') || '[]');
            stored.unshift({ ...data, timestamp: new Date().toISOString() });
            localStorage.setItem('wedding_local_rsvps', JSON.stringify(stored));
        } catch (e) { }

        try {
            // Post RSVP securely to the backend
            const res = await fetch('/api/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json().catch(() => ({ success: true }));

            if (data.isAttending) fireConfetti();

            const thankYouMsg = currentLang === 'am'
                ? `🎉 እናመሰግናለን ${data.guestName}! ምላሽዎ በደስታ ተመዝግቧል! 💐`
                : `🎉 Thank you, ${data.guestName}! Your RSVP has been received with joy! 💐`;

            formFeedback.innerHTML = `<span style="color:#6be285; font-weight:bold;">${thankYouMsg}</span>`;

            rsvpForm.reset();
            if (pillAttendYes && pillAttendNo) {
                pillAttendYes.classList.add('active');
                pillAttendNo.classList.remove('active');
            }
            updateGuestVisibility();
        } catch (error) {
            // Offline/Direct file fallback
            if (data.isAttending) fireConfetti();
            formFeedback.innerHTML = `<span style="color:#6be285; font-weight:bold;">🎉 Thank you, ${data.guestName}! Your response is recorded! 💐</span>`;
            rsvpForm.reset();
            updateGuestVisibility();
        } finally {
            rsvpSubmitBtn.disabled = false;
            rsvpSubmitBtn.textContent = (translations[currentLang] && translations[currentLang].btn_rsvp_submit) ? translations[currentLang].btn_rsvp_submit : "Send RSVP 💐";
            setTimeout(() => { formFeedback.innerHTML = ''; }, 8000);
        }
    });
}

// --------------------------------------------------------------------------
// 8. SINGLE LANGUAGE TOGGLE SETUP (ENGLISH ⇄ AMHARIC)
// --------------------------------------------------------------------------
const langToggleBtn = document.getElementById('langToggleBtn');
if (langToggleBtn) {
    langToggleBtn.addEventListener('click', toggleLanguage);
}

// --------------------------------------------------------------------------
// 8.1. LIGHT / DARK THEME SYSTEM (ALABASTER IVORY & GOLD / OBSIDIAN ROYALE)
// --------------------------------------------------------------------------
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
let currentTheme = localStorage.getItem('sara_wedding_theme') || 'dark';

function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('sara_wedding_theme', theme);
    if (theme === 'light') {
        document.body.classList.add('theme-light');
        if (themeIcon) themeIcon.textContent = '🌙';
        if (themeToggleBtn) themeToggleBtn.title = 'Switch to Dark Mode';
    } else {
        document.body.classList.remove('theme-light');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeToggleBtn) themeToggleBtn.title = 'Switch to Light Mode';
    }
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    });
}

// --------------------------------------------------------------------------
// 9. DYNAMIC TELEGRAM BOT SYNC
// --------------------------------------------------------------------------
async function syncBotInfo() {
    try {
        const res = await fetch('/api/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.bot_username) {
            const username = data.bot_username.replace('@', '');
            const botUrl = `https://t.me/${username}`;
            const qrLink = document.getElementById('qrLink');
            const qrImg = document.getElementById('qrImage');
            const botHandleLabel = document.getElementById('botHandleLabel');

            if (qrLink) qrLink.href = botUrl;
            if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(botUrl)}`;
            if (botHandleLabel) botHandleLabel.textContent = `@${username}`;
        }
    } catch (e) {
        // Quietly ignore for static/direct file views
    }
}

// --------------------------------------------------------------------------
// 9.1. ULTRA-MODERN SCROLL REVEAL ANIMATIONS
// --------------------------------------------------------------------------
function initScrollAnimations() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (!revealElements.length) return;

    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    observer.unobserve(entry.target);
                    // Release GPU layer textures on revealed cards to prevent mobile VRAM exhaustion
                    setTimeout(() => {
                        entry.target.style.willChange = 'auto';
                    }, 850);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('is-revealed'));
    }
}

function triggerScrollRevealCheck() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    revealElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92) {
            el.classList.add('is-revealed');
            setTimeout(() => {
                el.style.willChange = 'auto';
            }, 850);
        }
    });
}

// Defer map iframes to save mobile memory and eliminate background helper processes
function setupLazyMaps() {
    const mapFrames = document.querySelectorAll('.location-map-frame iframe[data-src]');
    if (!mapFrames.length) return;

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const iframe = entry.target;
                    if (iframe.dataset.src) {
                        iframe.src = iframe.dataset.src;
                        iframe.removeAttribute('data-src');
                    }
                    obs.unobserve(iframe);
                }
            });
        }, { rootMargin: '300px 0px' });

        mapFrames.forEach(f => observer.observe(f));
    } else {
        mapFrames.forEach(f => {
            if (f.dataset.src) {
                f.src = f.dataset.src;
                f.removeAttribute('data-src');
            }
        });
    }
}

// --------------------------------------------------------------------------
// 10. INITIALIZATION
// --------------------------------------------------------------------------
function initApp() {
    // 1. Critical synchronous setup for instant visual paint
    setLanguage(currentLang);
    applyTheme(currentTheme);
    updateGuestVisibility();

    // 2. Defer non-critical systems past the initial frame to ensure 0ms TBT and 0 forced reflows
    requestAnimationFrame(() => {
        initSparkles();
        setupLazyGallery();
        setupLazyMaps();
        initScrollAnimations();
        setTimeout(() => {
            syncBotInfo();
        }, 80);
    });
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
