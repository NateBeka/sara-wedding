// ==========================================================================
// DR. SARA AYELE & ENG. TEWODROS BELAY - ROYAL WEDDING EXPERIENCE
// Pure Trilingual Localization, Dual Audio, WhatsApp & Robust UI
// ==========================================================================

const WEDDING_DATE = new Date(2026, 8, 20, 12, 0, 0); // Sept 20, 2026 12:00 PM

// 29 Real Couple Photos
const PHOTO_ARRAY = [
    "images/photo_8_2026-09-02_22-34-57.jpg",
    "images/photo_1_2026-09-02_22-34-57.jpg",
    "images/photo_24_2026-09-02_22-34-57.jpg",
    "images/photo_2_2026-09-02_22-34-57.jpg",
    "images/photo_3_2026-09-02_22-34-57.jpg",
    "images/photo_4_2026-09-02_22-34-57.jpg",
    "images/photo_5_2026-09-02_22-34-57.jpg",
    "images/photo_6_2026-09-02_22-34-57.jpg",
    "images/photo_7_2026-09-02_22-34-57.jpg",
    "images/photo_9_2026-09-02_22-34-57.jpg",
    "images/photo_10_2026-09-02_22-34-57.jpg",
    "images/photo_11_2026-09-02_22-34-57.jpg",
    "images/photo_12_2026-09-02_22-34-57.jpg",
    "images/photo_13_2026-09-02_22-34-57.jpg",
    "images/photo_14_2026-09-02_22-34-57.jpg",
    "images/photo_15_2026-09-02_22-34-57.jpg",
    "images/photo_16_2026-09-02_22-34-57.jpg",
    "images/photo_17_2026-09-02_22-34-57.jpg",
    "images/photo_18_2026-09-02_22-34-57.jpg",
    "images/photo_19_2026-09-02_22-34-57.jpg",
    "images/photo_20_2026-09-02_22-34-57.jpg",
    "images/photo_21_2026-09-02_22-34-57.jpg",
    "images/photo_22_2026-09-02_22-34-57.jpg",
    "images/photo_23_2026-09-02_22-34-57.jpg",
    "images/photo_25_2026-09-02_22-34-57.jpg",
    "images/photo_26_2026-09-02_22-34-57.jpg",
    "images/photo_27_2026-09-02_22-34-57.jpg",
    "images/photo_28_2026-09-02_22-34-57.jpg",
    "images/photo_29_2026-09-02_22-34-57.jpg"
];

// Pure Trilingual Localization Dictionaries (Zero mixed-language)
const translations = {
    en: {
        music_label: "Play Song",
        music_playing: "Playing",
        splash_subtitle: "Royal Wedding Invitation",
        splash_title: "Dr. Sara & Eng. Tewodros",
        splash_tap: "✨ Open Invitation ✨",
        middle_date_main: "Sunday, September 20, 2026",
        fancy_title: "DR. SARA AYELE & ENG. TEWODROS BELAY",
        hero_tagline: "Eternal Love & Blessings",
        hero_meta: "📅 September 20, 2026 &nbsp;•&nbsp; 📍 Hawassa, Ethiopia",
        btn_rsvp_hero: "💌 Send RSVP",
        btn_view_program: "📅 View Program ↓",
        save_date_badge: "Save The Date",
        save_date_title: "Join Our Celebration",
        save_date_subtitle: "Sunday, September 20, 2026",
        countdown_heading: "Countdown to the Joyous Day",
        countdown_header: "⏳ Countdown",
        timer_label: "Days until our wedding",
        unit_days: "Days",
        unit_hrs: "Hours",
        unit_min: "Mins",
        unit_sec: "Secs",
        btn_add_ics: "📅 Add to Calendar (.ics)",
        btn_google_cal: "Google Calendar",
        calendar_header: "September 2026",
        cal_badge_day: "Sept 20",
        day_sun: "Sun", day_mon: "Mon", day_tue: "Tue", day_wed: "Wed", day_thu: "Thu", day_fri: "Fri", day_sat: "Sat",
        card_tag: "Official Invitation",
        card_header: "📜 The Official Invitation Card",
        scripture: '"For every house is built by someone, but God is the builder of everything." — Hebrews 3:4',
        hint_inspect: "🔍 Tap to inspect",
        btn_download_card: "📥 Download Invitation Card",
        timeline_tag: "Full Program",
        timeline_heading: "📅 Event Schedule",
        timeline_subtitle: "Wedding Day Schedule & Procession",
        timeline_1_time: "10:00 AM - 12:00 PM",
        timeline_1_title: "Journey to Bride's Residence",
        timeline_1_desc: "Departure of the wedding entourage to the Bride's residence in Bulala",
        timeline_2_time: "12:00 PM - 12:15 PM",
        timeline_2_title: "Arrival at Bride's Residence",
        timeline_2_desc: "Arrival and warm welcoming reception at the Bride's family residence",
        timeline_3_time: "12:15 PM - 03:00 PM",
        timeline_3_title: "Blessings & Luncheon at Bride's House",
        timeline_3_desc: "Parental blessings, wedding feast, luncheon, and portraits at Bulala",
        timeline_4_time: "03:00 PM - 05:00 PM",
        timeline_4_title: "Grand Procession to Hawassa",
        timeline_4_desc: "Joyous convoy and motorcade procession traveling to Hawassa",
        timeline_5_time: "05:00 PM - 06:00 PM",
        timeline_5_title: "Rest & Hotel Refreshment",
        timeline_5_desc: "Hotel check-in, rest, and preparation for the evening celebration",
        timeline_6_time: "06:00 PM - 09:00 PM",
        timeline_6_title: "Gala Celebration at Central Hotel Hawassa",
        timeline_6_desc: "Dinner reception, ceremonial cake-cutting, and dancing celebration at Central Hotel Hawassa!",
        locations_tag: "Directions",
        locations_heading: "📍 Event Locations",
        locations_subtitle: "Easily find your way with interactive maps and navigation",
        loc_badge_day: "Morning & Luncheon",
        loc_bulala_title: "🏠 Bride's Residence",
        loc_bulala_desc: "Near Bulala Branch School, Bulala, Ethiopia",
        loc_badge_night: "Evening Reception & Banquet",
        loc_central_title: "🏨 Central Hotel",
        loc_central_desc: "Central Hotel, Hawassa, Ethiopia",
        btn_maps: "📍 Open in Google Maps",
        gallery_tag: "Memories",
        photos_heading: "✨ Our Wedding Moments in Photos ✨",
        photos_subtitle: "A cherished collection of 29 portraits and love-filled memories",
        btn_view_fullscreen: "🔍 View in Fullscreen Lightbox",
        rsvp_tag: "RSVP",
        rsvp_heading: "💌 Will You Attend?",
        rsvp_subtitle: "Kindly let us know so we can reserve your seat",
        lbl_name: "Full Name *",
        lbl_attendance: "Attendance *",
        opt_attend_yes: "💐 Yes, Delighted!",
        opt_attend_no: "💌 Unfortunately No",
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
        btn_rsvp_submit: "Send RSVP 💐",
        btn_whatsapp_rsvp: "💬 Send via WhatsApp",
        share_tag: "Live Upload",
        qr_title: "📸 Share Your Moments & Photos",
        qr_subtitle: "Capture high-res memories during the celebration and send them directly to our Telegram Bot or WhatsApp!",
        btn_telegram: "📱 Open Telegram Bot",
        btn_whatsapp_share: "💬 Share on WhatsApp",
        footer_text: "Dr. Sara Ayele & Eng. Tewodros Belay — Eternal Love | September 20, 2026 | Hawassa, Ethiopia",
        footer_credits: "Celebrated with heartfelt joy, faith, and blessings 💛"
    },
    am: {
        music_label: "ሙዚቃ አጫውት",
        music_playing: "እየተጫወተ ነው",
        splash_subtitle: "የክብር የጋብቻ ጥሪ",
        splash_title: "ዶ/ር ሳራ እና ኢ/ር ቴዎድሮስ",
        splash_tap: "✨ ጥሪውን ይክፈቱ ✨",
        middle_date_main: "እሑድ መስከረም 10 ቀን 2018 ዓ.ም",
        fancy_title: "ዶ/ር ሳራ አየለ እና ኢ/ር ቴዎድሮስ በላይ",
        hero_tagline: "ዘላለማዊ ፍቅርና በረከት",
        hero_meta: "📅 እሑድ መስከረም 10 ቀን 2018 ዓ.ም &nbsp;•&nbsp; 📍 ቡላላ እና ሀዋሳ",
        btn_rsvp_hero: "💌 ምላሽ ይላኩ",
        btn_view_program: "📅 ፕሮግራሙን ይመልከቱ ↓",
        save_date_badge: "ቀኑን ያስቀምጡ",
        save_date_title: "በደስታችን አብረውን ይሁኑ",
        save_date_subtitle: "እሑድ መስከረም 10 ቀን 2018 ዓ.ም",
        countdown_heading: "ወደ ደማቁ የሠርግ ቀን ቆጠራ",
        countdown_header: "⏳ የሠርግ ቆጠራ",
        timer_label: "ወደ ሠርጋችን የሚቀረው ጊዜ",
        unit_days: "ቀናት",
        unit_hrs: "ሰዓታት",
        unit_min: "ደቂቃዎች",
        unit_sec: "ሰከንዶች",
        btn_add_ics: "📅 ወደ ካላንደር አስገባ",
        btn_google_cal: "ጎግል ካላንደር",
        calendar_header: "መስከረም 2018 ዓ.ም",
        cal_badge_day: "መስከረም 10",
        day_sun: "እሑድ", day_mon: "ሰኞ", day_tue: "ማክሰ", day_wed: "ረቡዕ", day_thu: "ሐሙስ", day_fri: "ዓርብ", day_sat: "ቅዳሜ",
        card_tag: "የጥሪ ካርድ",
        card_header: "📜 ኦፊሴላዊ የጥሪ ካርድ",
        scripture: '"ሁሉን ያዘጋጀ ግን እግዚአብሔር ነው::" — ዕብ 3:4',
        hint_inspect: "🔍 ለመመልከት ይጫኑ",
        btn_download_card: "📥 የጥሪ ካርዱን አውርድ",
        timeline_tag: "የቀኑ መርሐ-ግብር",
        timeline_heading: "📅 የአጁቢዎች ፕሮግራም",
        timeline_subtitle: "የሠርጉ ቀን ዝግጅትና የጉዞ መርሐ-ግብር",
        timeline_1_time: "ከጠዋቱ 4:00 - 6:00",
        timeline_1_title: "ጉዞ ወደ ሙሽሪት ቤት",
        timeline_1_desc: "የአጁቢዎች ጉዞ ወደ ሙሽሪት መኖሪያ ቤት (ቡላላ)",
        timeline_2_time: "ቀን 6:00 - 6:15",
        timeline_2_title: "ሙሽሪት ቤት መድረስ",
        timeline_2_desc: "ሙሽሪት ቤት በደስታ መድረስ እና አቀባበል",
        timeline_3_time: "ቀን 6:15 - 9:00",
        timeline_3_title: "ቆይታ በሙሽሪት ቤትና የምሳ ግብዣ",
        timeline_3_desc: "የወላጆች ምርቃት፣ የምሳ ግብዣና የፎቶ ፕሮግራም በቡላላ",
        timeline_4_time: "ከቀኑ 9:00 - 11:00",
        timeline_4_title: "ጉዞ ወደ ሀዋሳ",
        timeline_4_desc: "ጥንዶቹን በማጀብ በደማቅ ሰልፍ ወደ ሀዋሳ ከተማ የሚደረግ ጉዞ",
        timeline_5_time: "ከቀኑ 11:00 - 12:00",
        timeline_5_title: "ዕረፍትና ዝግጅት",
        timeline_5_desc: "የሆቴል ዕረፍት፣ መታደስ እና ለምሽቱ ፕሮግራም ዝግጅት",
        timeline_6_time: "ከምሽቱ 12:00 - 3:00",
        timeline_6_title: "ቆይታ በ ሴንትራል ሆቴል",
        timeline_6_desc: "የምሽት የእራት ግብዣ፣ ኬክ መቁረጥና ጭፈራ በሴንትራል ሆቴል!",
        locations_tag: "የቦታ መመሪያ",
        locations_heading: "📍 የዝግጅቱ ቦታዎች",
        locations_subtitle: "በቀላሉ ወደ ቦታዎቹ ለመድረስ የካርታ መመሪያዎችን ይጠቀሙ",
        loc_badge_day: "የጠዋትና የምሳ ዝግጅት",
        loc_bulala_title: "🏠 የሙሽሪት መኖሪያ ቤት (ቡላላ)",
        loc_bulala_desc: "ቡላላ ቅርንጫፍ ት/ቤት አጠገብ ፣ ቡላላ ፣ ኢትዮጵያ",
        loc_badge_night: "የምሽት የእራት ግብዣ",
        loc_central_title: "🏨 ሴንትራል ሆቴል",
        loc_central_desc: "ሴንትራል ሆቴል ፣ ሀዋሳ ፣ ኢትዮጵያ",
        btn_maps: "📍 በጎግል ካርታ ክፈት",
        gallery_tag: "ትዝታዎች",
        photos_heading: "✨ የሠርጋችን ፎቶዎች ✨",
        photos_subtitle: "ልዩ የፍቅርና የደስታ አፍታዎች ስብስብ (29 ፎቶዎች)",
        btn_view_fullscreen: "🔍 በሙሉ ገጽ ይመልከቱ",
        rsvp_tag: "የግብዣ ምላሽ",
        rsvp_heading: "💌 በሰርጋችን ላይ ይገኛሉ?",
        rsvp_subtitle: "ክብርዎን እንድንጠብቅ እባክዎ መገኘትዎን ያሳውቁን",
        lbl_name: "ሙሉ ስም *",
        lbl_attendance: "መገኘት *",
        opt_attend_yes: "💐 በደስታ እገኛለሁ",
        opt_attend_no: "💌 አልችልም",
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
        btn_rsvp_submit: "ምላሽዎን ይላኩ 💐",
        btn_whatsapp_rsvp: "💬 በ WhatsApp ይላኩ",
        share_tag: "ቀጥታ ይላኩ",
        qr_title: "📸 ፎቶዎችን ያጋሩ",
        qr_subtitle: "በሠርጉ ላይ የሚያነሷቸውን ልዩ ፎቶዎችና ቪዲዮዎች ለቴሌግራም ቦቱ ወይም በዋትስአፕ በቀጥታ ይላኩ!",
        btn_telegram: "📱 የቴሌግራም ቦት ክፈት",
        btn_whatsapp_share: "💬 በ WhatsApp ያጋሩ",
        footer_text: "ዶ/ር ሳራ አየለ እና ኢ/ር ቴዎድሮስ በላይ — ዘላለማዊ ፍቅር | እሑድ መስከረም 10 ቀን 2018 ዓ.ም | ሀዋሳ ፣ ኢትዮጵያ",
        footer_credits: "በታላቅ ደስታና ፍቅር የተዘጋጀ 💛"
    },
    ao: {
        music_label: "Muuziqaa Taphachiisi",
        music_playing: "Taphachaa jira",
        splash_subtitle: "Waraqaa Waamicha Cidhaa",
        splash_title: "Dr. Saaraa & Inj. Tewodros",
        splash_tap: "✨ Kaardii Banaa ✨",
        middle_date_main: "Dilbata, Fulbaana 10, 2018 A.L.I",
        fancy_title: "DR. SAARAA AYYALEE & INJ. TEWODROS BELAAY",
        hero_tagline: "Jaalala Barabaraa fi Eebba",
        hero_meta: "📅 Dilbata, Fulbaana 10, 2018 &nbsp;•&nbsp; 📍 Bulaalaa fi Hawaasaa",
        btn_rsvp_hero: "💌 Deebii Ergaa",
        btn_view_program: "📅 Sagantaa Ilaalaa ↓",
        save_date_badge: "Guyyaa Qabadhaa",
        save_date_title: "Gammachuu Keenya Qooddhadhaa",
        save_date_subtitle: "Dilbata, Fulbaana 10, 2018 A.L.I",
        countdown_heading: "Lakkoofsa Guyyaa Gammachuu",
        countdown_header: "⏳ Lakkoofsa Cidhaa",
        timer_label: "Hanga Guyyaa Cidhaatti",
        unit_days: "Guyyoota",
        unit_hrs: "Sa'aatii",
        unit_min: "Daqiiqaa",
        unit_sec: "Sekondii",
        btn_add_ics: "📅 Kaalaandariitti Dabali",
        btn_google_cal: "Google Kaalaandarii",
        calendar_header: "Fulbaana 2018",
        cal_badge_day: "Fulbaana 10",
        day_sun: "Dil", day_mon: "Wix", day_tue: "Kib", day_wed: "Rob", day_thu: "Kam", day_fri: "Jim", day_sat: "San",
        card_tag: "Kaardii Waamichaa",
        card_header: "📜 Kaardii Waamicha Cidhaa",
        scripture: '"Wanti hundi namaan ijaarama, hundumaa kan ijaare garuu Waaqayyodha." — Ibroota 3:4',
        hint_inspect: "🔍 Ilaaluuf Tuqaa",
        btn_download_card: "📥 Kaardii Waamichaa Buufadhaa",
        timeline_tag: "Sagantaa Guutuu",
        timeline_heading: "📅 Sagantaa Ajuubii",
        timeline_subtitle: "Sagantaa guutuu qophii fi imala cidha misirrootaa",
        timeline_1_time: "Sa'aatii 4:00 - 6:00",
        timeline_1_title: "Gara Mana Misirrootti Imaluu",
        timeline_1_desc: "Ajuubiin gara mana maatii misirroo Bulaalaatti imala eegalu",
        timeline_2_time: "Sa'aatii 6:00 - 6:15",
        timeline_2_title: "Mana Misirroo Ga'uu",
        timeline_2_desc: "Gammachuun mana misirroo ga'uu fi simannaa",
        timeline_3_time: "Sa'aatii 6:15 - 9:00",
        timeline_3_title: "Qophii fi Affeerraa Mana Misirroo",
        timeline_3_desc: "Eebba maatii, affeerraa irbaataa fi suuraa Bulaalaatti",
        timeline_4_time: "Sa'aatii 9:00 - 11:00",
        timeline_4_title: "Imala Gara Hawaasaa",
        timeline_4_desc: "Misirroota hordofanii gara magaalaa Hawaasaatti imaluu",
        timeline_5_time: "Sa'aatii 11:00 - 12:00",
        timeline_5_title: "Boqonnaa fi Qophii",
        timeline_5_desc: "Hoteelatti boqochuu fi qophii galgalaaf taasisamu",
        timeline_6_time: "Sa'aatii 12:00 - 3:00",
        timeline_6_title: "Qophii Hoteela Seentiraal",
        timeline_6_desc: "Affeerraa galgalaa guddaa fi sirba Hoteela Seentiraalitti!",
        locations_tag: "Qajeelfama Iddoo",
        locations_heading: "📍 Iddoowwan Qophii",
        locations_subtitle: "Kaartaa fayyadamuun iddoowwan qophii salphatti argadhaa",
        loc_badge_day: "Qophii Ganamaa fi Laaqanaa",
        loc_bulala_title: "🏠 Mana Misirroo (Bulaalaa)",
        loc_bulala_desc: "Mana Barumsaa Damee Bulaalaa Cinaa, Bulaalaa",
        loc_badge_night: "Irbaata Galgalaa fi Sirba",
        loc_central_title: "🏨 Hoteela Seentiraal",
        loc_central_desc: "Central Hotel, Hawaasaa, Itoophiyaa",
        btn_maps: "📍 Google Maps irratti Bani",
        gallery_tag: "Yaadannoo",
        photos_heading: "✨ Suuraalee Cidha Keenyaa ✨",
        photos_subtitle: "Kuusaa suuraalee jaalalaa fi gammachuu (Suuraalee 29)",
        btn_view_fullscreen: "🔍 Suuraalee Bal'inaan Ilaalaa",
        rsvp_tag: "Deebii Waamichaa",
        rsvp_heading: "💌 Cidha Keenya irratti Ni Argamtuu?",
        rsvp_subtitle: "Teessoo kabajaa isiniif qopheessuuf deebii keessan nuuf ergaa",
        lbl_name: "Maqaa Guutuu *",
        lbl_attendance: "Argamuu *",
        opt_attend_yes: "💐 Eeyyee, Gammachuun Dhufa!",
        opt_attend_no: "💌 Hin Danda'u",
        lbl_guests: "Baay'ina Keessummootaa",
        guest_1: "Nama 1 (Kophaa koo)",
        guest_2: "Nama 2 (+ Hiriyaa)",
        guest_3: "Nama 3 (Maatii)",
        guest_4: "Nama 4+",
        opt_rel_hint: "Firooma Misirrootaaf Qabdan",
        opt_rel_bride: "Maatii Misirroo",
        opt_rel_groom: "Maatii Misirrichaa",
        opt_rel_both: "Michuu Lamaanii",
        opt_rel_fam: "Maatii",
        opt_rel_col: "Hiriyaa Hojii",
        lbl_wishes: "Dhaamsa Eebbaa fi Hawwii Gaarii",
        btn_rsvp_submit: "Deebii Ergaa 💐",
        btn_whatsapp_rsvp: "💬 WhatsApp irratti Ergaa",
        share_tag: "Kallattiin Ergaa",
        qr_title: "📸 Suuraa fi Viidiyoo Qoodaa",
        qr_subtitle: "Suuraalee fi viidiyoowwan qophii irratti kaastan Telegram Bot irratti nuuf ergaa!",
        btn_telegram: "📱 Telegram Bot Bani",
        btn_whatsapp_share: "💬 WhatsApp irratti Qoodaa",
        footer_text: "Dr. Saaraa Ayyalee & Inj. Tewodros Belaay — Jaalala Barabaraa | Fulbaana 10, 2018 | Hawaasaa",
        footer_credits: "Gammachuu fi jaalala guddaadhaan qophaa'e 💛"
    }
};

let currentLang = localStorage.getItem('sara_wedding_lang') || 'en';

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('sara_wedding_lang', lang);
    document.body.className = `lang-${lang}`;

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    renderCalendarForCurrentLanguage();
    updateTimer();
    updateMusicLabel();
    updateGuestVisibility();
}

// --------------------------------------------------------------------------
// 1. FLOATING PARTICLES & GOLDEN BOKEH CANVAS
// --------------------------------------------------------------------------
const sparkleCanvas = document.getElementById('sparkleCanvas');
let sparkleCtx = null;
let sparkles = [];

function initSparkles() {
    if (!sparkleCanvas) return;
    sparkleCtx = sparkleCanvas.getContext('2d');
    resizeSparkleCanvas();
    window.addEventListener('resize', resizeSparkleCanvas);

    const count = window.innerWidth < 768 ? 30 : 60;
    sparkles = [];
    for (let i = 0; i < count; i++) {
        sparkles.push({
            x: Math.random() * sparkleCanvas.width,
            y: Math.random() * sparkleCanvas.height,
            size: Math.random() * 2.2 + 0.8,
            speedY: Math.random() * 0.35 + 0.12,
            speedX: (Math.random() - 0.5) * 0.25,
            alpha: Math.random() * 0.7 + 0.2,
            alphaChange: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
            color: Math.random() > 0.3 ? '245, 215, 127' : '255, 244, 208'
        });
    }

    requestAnimationFrame(renderSparkles);
}

function resizeSparkleCanvas() {
    if (!sparkleCanvas) return;
    sparkleCanvas.width = window.innerWidth;
    sparkleCanvas.height = window.innerHeight;
}

function renderSparkles() {
    if (!sparkleCtx) return;
    sparkleCtx.clearRect(0, 0, sparkleCanvas.width, sparkleCanvas.height);

    for (let s of sparkles) {
        s.y -= s.speedY;
        s.x += s.speedX;
        s.alpha += s.alphaChange;

        if (s.alpha > 0.85 || s.alpha < 0.15) {
            s.alphaChange = -s.alphaChange;
        }

        if (s.y < -10) {
            s.y = sparkleCanvas.height + 10;
            s.x = Math.random() * sparkleCanvas.width;
        }
        if (s.x < -10) s.x = sparkleCanvas.width + 10;
        if (s.x > sparkleCanvas.width + 10) s.x = -10;

        sparkleCtx.beginPath();
        sparkleCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        sparkleCtx.fillStyle = `rgba(${s.color}, ${Math.max(0, s.alpha)})`;
        sparkleCtx.shadowBlur = 6;
        sparkleCtx.shadowColor = `rgba(${s.color}, 0.7)`;
        sparkleCtx.fill();
    }

    requestAnimationFrame(renderSparkles);
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
        } catch (e) {}
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

function unveilInvitation() {
    if (hasOpened) return;
    hasOpened = true;

    ensureAudioUnlocked();
    startMusic();

    if (royalSplash) {
        royalSplash.classList.add('hide');
        setTimeout(() => {
            royalSplash.style.display = 'none';
            if (mainContent) mainContent.classList.add('show');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 600);
    } else {
        if (mainContent) mainContent.classList.add('show');
    }
}

if (openSealBtn) {
    openSealBtn.addEventListener('click', unveilInvitation);
    openSealBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') unveilInvitation();
    });
}
if (openInvitationBtn) {
    openInvitationBtn.addEventListener('click', unveilInvitation);
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
            else if (currentLang === 'ao') timerLabel.textContent = "Guyyoota gaa'ela keessa jiraanne";
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

// Add to Calendar .ics file generator
const downloadIcsBtn = document.getElementById('downloadIcsBtn');
if (downloadIcsBtn) {
    downloadIcsBtn.addEventListener('click', () => {
        const icsContent = 
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dr Sara and Eng Tewodros//Wedding Invitation//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
SUMMARY:Wedding of Dr. Sara Ayele & Eng. Tewodros Belay
DESCRIPTION:Joyous celebration of the wedding of Dr. Sara Ayele and Eng. Tewodros Belay. Ceremony and dinner reception in Hawassa, Ethiopia.
LOCATION:Central Hotel, Hawassa, Ethiopia
DTSTART:20260920T070000Z
DTEND:20260920T180000Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', 'Dr_Sara_and_Eng_Tewodros_Wedding.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

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

// Dedicated Invitation Card Modal Elements (Completely isolated from gallery!)
const cardModal = document.getElementById('cardModal');
const closeCardModalBtn = document.getElementById('closeCardModalBtn');
const invitationCardPreview = document.getElementById('invitationCardPreview');
const zoomCardBtn = document.getElementById('zoomCardBtn');

function initGallery() {
    if (!galleryFilmstrip) return;
    galleryFilmstrip.innerHTML = '';

    PHOTO_ARRAY.forEach((src, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `gallery-thumb ${idx === 0 ? 'active' : ''}`;
        thumb.dataset.index = idx;
        
        const img = document.createElement('img');
        img.src = src;
        img.alt = `Wedding Portrait ${idx + 1}`;
        img.loading = 'lazy';
        thumb.appendChild(img);

        thumb.addEventListener('click', () => {
            selectPhoto(idx);
            resetAutoSlide();
        });

        galleryFilmstrip.appendChild(thumb);
    });

    selectPhoto(0);
    startAutoSlide();
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

// Gallery Lightbox Open & Close
function openLightbox() {
    if (!lightboxModal || !lightboxImage) return;
    if (galleryAutoInterval) clearInterval(galleryAutoInterval);
    lightboxImage.src = PHOTO_ARRAY[currentPhotoIndex];
    lightboxModal.classList.add('open');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('open');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
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
}

// DEDICATED INVITATION CARD MODAL (Completely decoupled from gallery)
function openCardModal() {
    if (!cardModal) return;
    cardModal.classList.add('open');
    cardModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeCardModal() {
    if (!cardModal) return;
    cardModal.classList.remove('open');
    cardModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

if (invitationCardPreview) {
    invitationCardPreview.addEventListener('click', (e) => {
        e.preventDefault();
        openCardModal();
    });
    invitationCardPreview.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openCardModal();
        }
    });
}
if (zoomCardBtn) {
    zoomCardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openCardModal();
    });
}
if (closeCardModalBtn) {
    closeCardModalBtn.addEventListener('click', closeCardModal);
}
if (cardModal) {
    cardModal.addEventListener('click', (e) => {
        if (e.target === cardModal) closeCardModal();
    });
}

// Global Keyboard Navigation (Escape, Arrows)
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (cardModal && cardModal.classList.contains('open')) closeCardModal();
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
const whatsappRsvpBtn = document.getElementById('whatsappRsvpBtn');
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
        rsvpSubmitBtn.textContent = currentLang === 'am' ? "ምላሽዎን በመላክ ላይ..." : (currentLang === 'ao' ? "Deebii ergaa jira..." : "Delivering RSVP...");
        formFeedback.innerHTML = `<span style="color:var(--gold-300);">⏳ Delivering...</span>`;

        try {
            // Post RSVP securely to the local backend
            const res = await fetch('/api/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json().catch(() => ({ success: true }));

            if (data.isAttending) fireConfetti();

            const thankYouMsg = currentLang === 'am' 
                ? `🎉 እናመሰግናለን ${data.guestName}! ምላሽዎ በደስታ ተመዝግቧል! 💐` 
                : (currentLang === 'ao' ? `🎉 Galatoomaa ${data.guestName}! Deebiin keessan qaqqabeera! 💐` : `🎉 Thank you, ${data.guestName}! Your RSVP has been received with joy! 💐`);

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

// WhatsApp RSVP Button Listener
if (whatsappRsvpBtn) {
    whatsappRsvpBtn.addEventListener('click', () => {
        const data = getRsvpData();
        if (!data.guestName) {
            formFeedback.innerHTML = `<span style="color:#ff8585;">⚠️ Please enter your name first.</span>`;
            return;
        }

        if (data.isAttending) fireConfetti();

        const msg = 
`👑 *ROYAL WEDDING RSVP* 👑\n
👤 *Guest:* ${data.guestName}
✅ *Attending:* ${data.attending}
${data.isAttending ? `👥 *Guests:* ${data.guestCount}\n` : ''}💑 *Relation:* ${data.relation}
💌 *Wishes:* "${data.message || 'Heartfelt congratulations!'}"

📅 *Dr. Sara Ayele & Eng. Tewodros Belay Wedding*
*Sunday, September 20, 2026 (መስከረም 10, 2018)*
*Hawassa, Ethiopia*`;

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');

        formFeedback.innerHTML = `<span style="color:#6be285; font-weight:bold;">💬 Opening WhatsApp with your RSVP... 💐</span>`;
        setTimeout(() => { formFeedback.innerHTML = ''; }, 6000);
    });
}

// --------------------------------------------------------------------------
// 8. LANGUAGE SELECTOR SETUP
// --------------------------------------------------------------------------
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
});

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
            const tgLink = document.getElementById('telegramLink');
            const qrLink = document.getElementById('qrLink');
            const qrImg = document.getElementById('qrImage');
            const botHandleLabel = document.getElementById('botHandleLabel');

            if (tgLink) tgLink.href = botUrl;
            if (qrLink) qrLink.href = botUrl;
            if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(botUrl)}`;
            if (botHandleLabel) botHandleLabel.textContent = `@${username}`;
        }
    } catch (e) {
        // Quietly ignore for static/direct file views
    }
}

// --------------------------------------------------------------------------
// 10. INITIALIZATION
// --------------------------------------------------------------------------
function initApp() {
    initSparkles();
    initGallery();
    setLanguage(currentLang);
    updateGuestVisibility();
    syncBotInfo();
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
