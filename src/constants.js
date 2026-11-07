/* ค่าคงที่ของแอป (ตัวเลือกโปรไฟล์ หลักสูตร ข้อความ ฯลฯ) */


/* ============================ สภาพอากาศ ============================ */
export const CAMPUS = { name: 'มธ. ท่าพระจันทร์', lat: 13.7563, lon: 100.4903 };

export const WEATHER_REFRESH_MS = 15 * 60 * 1000;

/* ============================ constants ============================ */
export const TYPE_LABEL = { summary: 'สรุปเนื้อหา', problem: 'ปัญหาที่เจอ', project: 'โปรเจ็กต์' };

export const TYPE_COLOR = { summary: 'yellow', problem: 'blue', project: 'pink' };

export const YEARS = ['ปี 1', 'ปี 2', 'ปี 3', 'ปี 4', 'ศิษย์เก่า'];

export const EMOJIS = ['📚', '💡', '🚀', '🎨', '☕️', '🎧', '🌱', '⭐️', '🐣', '🔥', '🦄', '🐱', '🍀', '🎮', '🧋', '🌈'];

/* ---------- ตกแต่งโปรไฟล์ ---------- */
export const PATTERNS = [
  { key: 'blobs', label: 'บับเบิล' }, { key: 'dots', label: 'จุดน่ารัก' }, { key: 'stripes', label: 'ริ้วเฉียง' },
  { key: 'confetti', label: 'คอนเฟตติ' }, { key: 'waves', label: 'คลื่น' }, { key: 'plain', label: 'เรียบ ๆ' },
];

export const FRAMES = [
  { key: 'clean', label: 'ขาว' }, { key: 'ink', label: 'ขอบดำ' }, { key: 'rainbow', label: 'สายรุ้ง' },
  { key: 'dashed', label: 'เส้นประ' }, { key: 'gold', label: 'ทอง' },
];

export const SHAPES = [{ key: 'circle', label: 'วงกลม' }, { key: 'squircle', label: 'มุมมน' }, { key: 'blob', label: 'ก้อนเมฆ' }];

export const STATUS_PRESETS = [
  ['📖', 'กำลังอ่านสอบ'], ['💻', 'ปั่นโปรเจ็กต์'], ['🙋', 'ถามได้เลย!'], ['☕️', 'ขอกาแฟด่วน'],
  ['😴', 'ง่วงมาก'], ['🎉', 'สอบเสร็จแล้ว'], ['🏃', 'วิ่งไปเรียน'], ['🎧', 'โหมดโฟกัส'],
];

export const INTERESTS = ['Coding', 'Data', 'AI', 'UX/UI', 'Cyber', 'Marketing', 'Startup', 'Finance', 'Design', 'Content', 'Gaming', 'Music', 'Photo', 'Sport'];

export const MAX_INTERESTS = 5;

export const MAX_FAV = 3;

export const LEVEL_TITLES = ['น้องใหม่', 'รุ่นพี่ฝึกหัด', 'รุ่นพี่ใจดี', 'รุ่นพี่ตัวท็อป', 'ตำนาน dX'];

export const BADGES = [
  { key: 'hello', emoji: '🌱', label: 'มือใหม่', desc: 'สร้างโปรไฟล์', test: () => true },
  { key: 'writer', emoji: '✍️', label: 'นักสรุป', desc: 'แชร์สรุปแรก', test: (st) => st.summaries >= 1 },
  { key: 'builder', emoji: '🚀', label: 'สายโปรเจ็กต์', desc: 'แชร์โปรเจ็กต์แรก', test: (st) => st.projects >= 1 },
  { key: 'curious', emoji: '❓', label: 'ช่างสงสัย', desc: 'ตั้งกระทู้แรก', test: (st) => st.threads >= 1 },
  { key: 'helper', emoji: '🤝', label: 'ใจดีช่วยตอบ', desc: 'ตอบหรือคอมเมนต์ 3 ครั้ง', test: (st) => st.answers >= 3 },
  { key: 'stylish', emoji: '🎨', label: 'แต่งสวย', desc: 'มีรูป + แนะนำตัว + ความสนใจ', test: (st) => st.complete },
  { key: 'loved', emoji: '💖', label: 'ขวัญใจรุ่นน้อง', desc: 'ได้ 10 ไลก์', test: (st) => st.likes >= 10 },
  { key: 'library', emoji: '📚', label: 'คลังความรู้', desc: 'โพสต์ครบ 5 ชิ้น', test: (st) => st.posts >= 5 },
];

export const LINKS = [
  { key: 'ig', icon: 'instagram', label: 'Instagram', url: (h) => 'https://instagram.com/' + h, ph: 'ชื่อผู้ใช้ IG' },
  { key: 'gh', icon: 'github', label: 'GitHub', url: (h) => 'https://github.com/' + h, ph: 'ชื่อผู้ใช้ GitHub' },
  { key: 'li', icon: 'linkedin', label: 'LinkedIn', url: (h) => 'https://linkedin.com/in/' + h, ph: 'ลิงก์หรือชื่อ LinkedIn' },
];

/* ============================ courses (หลักสูตร dX) ============================
 * อ้างอิง: มคอ.2 หลักสูตร วท.บ. นวัตกรรมและการแปรรูปทางดิจิทัล (หลักสูตรปรับปรุง พ.ศ. 2566)
 * สำหรับนักศึกษารหัส 66–69 — ปี 1 ใช้ตามตารางเรียนจริงของรุ่น (รหัส 68)
 * semester: 'เทอม/ปี ค.ศ.' หรือ 'GE' (วิชาศึกษาทั่วไปให้เลือก) / 'FREE' (วิชาเลือกเสรีที่หลักสูตรเปิด)
 */
export const COURSE_LIST = [
  // ปี 1 เทอม 1
  ['TU109', 'Innovation and Entrepreneurial Mindset', '1/2025'],
  ['TU103', 'Life and Sustainability', '1/2025'],
  ['DX100', 'Digital Innovation', '1/2025'],
  ['EL105', 'English Communication Skills', '1/2025'],
  ['DE101', 'Financial Planning for Economic Stability in Life', '1/2025'],
  // ปี 1 เทอม 2
  ['DX110', 'Fundamental of Programming for Innovation', '2/2025'],
  ['DX111', 'Applied Statistics for Innovation', '2/2025'],
  ['TU100', 'Civic Engagement', '2/2025'],
  ['TU106', 'Creativity and Communication', '2/2025'],
  ['TU240', 'World Geopolitical Economy', '2/2025'],
  // ปี 2 เทอม 1 — Creative Problem Solving
  ['DX210', 'Principle of Programming', '1/2026'],
  ['DX211', 'Computer Software and Applications', '1/2026'],
  ['DX212', 'Mobile Programming', '1/2026'],
  ['DX213', 'Computer Science of Human Decisions', '1/2026'],
  ['DX214', 'Managing Digital Firm', '1/2026'],
  ['DX395', 'Innovation and Entrepreneurship', '1/2026'],
  // ปี 2 เทอม 2 — Business Analytics
  ['DX220', 'Data Exploration and Preprocessing', '2/2026'],
  ['DX221', 'Data Science Algorithms', '2/2026'],
  ['DX222', 'Business Intelligence', '2/2026'],
  ['DX223', 'Data Engineering', '2/2026'],
  ['DX224', 'Business Analytics Capstone Project', '2/2026'],
  // ปี 3 เทอม 1 — Business, Innovation & Design Thinking
  ['DX330', 'Principles of Design Thinking', '1/2027'],
  ['DX331', 'Innovation Management', '1/2027'],
  ['DX332', 'UX/UI Design', '1/2027'],
  ['DX333', 'Financial Management for Innovation', '1/2027'],
  ['DX334', 'Innovation Capstone Project', '1/2027'],
  // ปี 3 เทอม 2 — Applied Cybersecurity
  ['DX340', 'Cyber Security Fundamental', '2/2027'],
  ['DX341', 'Digital Forensic', '2/2027'],
  ['DX342', 'Business Continuity Management', '2/2027'],
  ['DX343', 'Network Security', '2/2027'],
  ['DX344', 'Critical Infrastructure', '2/2027'],
  // ปี 3 ภาคฤดูร้อน
  ['DX380', 'Internships for Digital Business (135 hrs.)', 'S/2027'],
  // ปี 4 เทอม 1 — Digital Transformation
  ['DX450', 'Emerging Technologies and Digital Business Model', '1/2028'],
  ['DX451', 'Digital Transformation Strategy', '1/2028'],
  ['DX452', 'Digital Organizational Behavior and Transformational Leadership', '1/2028'],
  ['DX453', 'Advanced Digital Technology Seminar', '1/2028'],
  ['DX454', 'Digital Transformation Capstone Project', '1/2028'],
  // ปี 4 เทอม 2 — วิชาเลือก 1 หมวด (15 หน่วยกิต)
  ['DX465', 'Digital Consumers Behavior', '2/2028', 'Digital Marketing'],
  ['DX466', 'Digital Branding and Engagement', '2/2028', 'Digital Marketing'],
  ['DX467', 'Digital Reputation Management', '2/2028', 'Digital Marketing'],
  ['DX468', 'Digital Marketing Strategy', '2/2028', 'Digital Marketing'],
  ['DX469', 'Strategic Brand Management', '2/2028', 'Digital Marketing'],
  ['DX475', 'Fundamental of Creative Media Programming', '2/2028', 'Creative Media'],
  ['DX476', 'Digital Technology for New Media Creation', '2/2028', 'Creative Media'],
  ['DX477', 'Gamification for Creative Media', '2/2028', 'Creative Media'],
  ['DX478', 'Research for Creative Media', '2/2028', 'Creative Media'],
  ['DX479', 'Creative Media Capstone Project', '2/2028', 'Creative Media'],
  // วิชาเลือกเสรีที่หลักสูตรเปิดสอน
  ['DX396', 'Economics and Business Condition Analysis', 'FREE', 'วิชาเลือกเสรี'],
  ['DX397', 'Business and Information Technology Laws', 'FREE', 'วิชาเลือกเสรี'],
  ['DX398', 'Project Management', 'FREE', 'วิชาเลือกเสรี'],
  ['DX399', 'Accounting and Finance', 'FREE', 'วิชาเลือกเสรี'],
  // วิชาศึกษาทั่วไปอื่น ๆ ที่เลือกเรียนได้
  ['TU101', 'Thailand, ASEAN, and the World', 'GE', 'ศึกษาทั่วไป'],
  ['TU107', 'Digital Skill and Problem Solving', 'GE', 'ศึกษาทั่วไป'],
  ['TU124', 'Society and Economy', 'GE', 'ศึกษาทั่วไป'],
  ['TU155', 'Elementary Statistics', 'GE', 'ศึกษาทั่วไป'],
  ['TU156', 'Introduction to Scientific Programming', 'GE', 'ศึกษาทั่วไป'],
  ['TU200', 'Self Design Civic Engagement', 'GE', 'ศึกษาทั่วไป'],
  ['TU243', 'Digital Skills for the Future', 'GE', 'ศึกษาทั่วไป'],
];

export const TERM_INFO = {
  '1/2025': { label: 'ปี 1 · เทอม 1', theme: 'ปูพื้นฐาน' },
  '2/2025': { label: 'ปี 1 · เทอม 2', theme: 'ปูพื้นฐาน' },
  '1/2026': { label: 'ปี 2 · เทอม 1', theme: 'Creative Problem Solving' },
  '2/2026': { label: 'ปี 2 · เทอม 2', theme: 'Business Analytics' },
  '1/2027': { label: 'ปี 3 · เทอม 1', theme: 'Business, Innovation & Design Thinking' },
  '2/2027': { label: 'ปี 3 · เทอม 2', theme: 'Applied Cybersecurity' },
  'S/2027': { label: 'ปี 3 · ฤดูร้อน', theme: 'ฝึกงาน' },
  '1/2028': { label: 'ปี 4 · เทอม 1', theme: 'Digital Transformation' },
  '2/2028': { label: 'ปี 4 · เทอม 2', theme: 'วิชาเลือก 1 หมวด (Digital Marketing / Creative Media)' },
  FREE: { label: 'วิชาเลือกเสรี', theme: 'เลือกเรียนอย่างน้อย 6 หน่วยกิต' },
  GE: { label: 'ศึกษาทั่วไป (เลือก)', theme: 'วิชา GE อื่น ๆ ในหลักสูตร' },
};

export const TERMS = Object.keys(TERM_INFO);

export const COURSE_ICON = {
  DE101: 'dollar-sign', DX100: 'zap', EL105: 'message-circle', TU103: 'sun', TU109: 'compass',
  DX110: 'code', DX111: 'bar-chart-2', TU100: 'users', TU106: 'pen-tool', TU240: 'globe',
  DX210: 'terminal', DX211: 'monitor', DX212: 'smartphone', DX213: 'cpu', DX214: 'briefcase', DX395: 'trending-up',
  DX220: 'database', DX221: 'git-branch', DX222: 'pie-chart', DX223: 'server', DX224: 'award',
  DX330: 'edit-3', DX331: 'trending-up', DX332: 'layout', DX333: 'dollar-sign', DX334: 'flag',
  DX340: 'shield', DX341: 'search', DX342: 'refresh-cw', DX343: 'wifi', DX344: 'layers',
  DX380: 'briefcase', DX450: 'zap', DX451: 'map', DX452: 'users', DX453: 'mic', DX454: 'flag',
  DX465: 'shopping-bag', DX466: 'tag', DX467: 'star', DX468: 'target', DX469: 'award',
  DX475: 'code', DX476: 'film', DX477: 'play-circle', DX478: 'book', DX479: 'flag',
  DX396: 'activity', DX397: 'file-text', DX398: 'clipboard', DX399: 'credit-card',
  TU101: 'globe', TU107: 'tool', TU124: 'users', TU155: 'bar-chart', TU156: 'terminal', TU200: 'heart', TU243: 'cpu',
};

export const CITU_URL = 'https://www.citu.tu.ac.th/university-personnel/';

/* ============================ ไฟล์แนบ (รูป / PDF / เอกสาร) ============================
 * เตรียมไฟล์ในเครื่อง (ย่อรูป + ภาพย่อ, อ่านเป็น base64) แล้วอัปโหลดเข้า Supabase Storage ผ่าน src/api/content.js
 */
export const MAX_ATTACH = 5;

export const MAX_FILE_MB = 10;

// ตรงกับ file_size_limit ของ bucket attachments
export const DOC_TYPES = [
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'image/*',
];

/* ============================ วันเวลา (เวลาไทย UTC+7 เสมอ) ============================ */
export const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export const BKK = 7 * 3600 * 1000;

export const EXAM_KINDS = [
  { key: 'midterm', label: 'สอบกลางภาค', emoji: '📝', color: 'yellow' },
  { key: 'final', label: 'สอบปลายภาค', emoji: '🎯', color: 'pink' },
  { key: 'quiz', label: 'ควิซ', emoji: '⚡️', color: 'peach' },
  { key: 'project', label: 'ส่งโปรเจ็กต์', emoji: '🚀', color: 'mint' },
  { key: 'other', label: 'อื่น ๆ', emoji: '📌', color: 'lilac' },
];

/* ============================ สภาพอากาศ / ฝุ่น / แดด ============================ */
export const WMO = {
  0: ['ท้องฟ้าแจ่มใส', '☀️', '🌙'], 1: ['ส่วนใหญ่แจ่มใส', '🌤️', '🌙'], 2: ['มีเมฆบางส่วน', '⛅', '☁️'], 3: ['เมฆมาก', '☁️', '☁️'],
  45: ['มีหมอก', '🌫️'], 48: ['หมอกจัด', '🌫️'],
  51: ['ฝนปรอยเล็กน้อย', '🌦️'], 53: ['ฝนปรอย', '🌦️'], 55: ['ฝนปรอยหนัก', '🌧️'], 56: ['ฝนปรอย', '🌧️'], 57: ['ฝนปรอย', '🌧️'],
  61: ['ฝนตกเล็กน้อย', '🌦️'], 63: ['ฝนตกปานกลาง', '🌧️'], 65: ['ฝนตกหนัก', '🌧️'], 66: ['ฝนตก', '🌧️'], 67: ['ฝนตกหนัก', '🌧️'],
  80: ['ฝนตกเป็นช่วง ๆ', '🌦️'], 81: ['ฝนตกเป็นช่วง ๆ', '🌧️'], 82: ['ฝนตกหนักเป็นช่วง ๆ', '⛈️'],
  95: ['พายุฝนฟ้าคะนอง', '⛈️'], 96: ['พายุฝนฟ้าคะนอง', '⛈️'], 99: ['พายุฝนฟ้าคะนองรุนแรง', '⛈️'],
};

/** ลายบนปกโปรไฟล์ — วาดด้วย View ล้วน ไม่ต้องใช้รูป */
export const CONFETTI = [
  [6, 18, 12, 'pink', 0], [16, 62, 9, 'blue', 1], [27, 26, 14, 'mint', 0], [38, 70, 10, 'yellow', 1], [47, 14, 8, 'lilac', 0],
  [56, 52, 13, 'peach', 1], [66, 24, 9, 'blue', 0], [74, 70, 12, 'pink', 1], [83, 36, 10, 'mint', 0], [92, 12, 8, 'yellow', 1],
  [12, 88, 8, 'lilac', 1], [60, 90, 9, 'mint', 1], [33, 92, 7, 'pink', 0], [88, 84, 11, 'blue', 0],
];

/* ---------- Supabase: ล็อกอินด้วยอีเมล + รหัส OTP ---------- */
export const OTP_RESEND_SEC = 60;

/* ---------- หัวข้อใหญ่ สลับคำให้กำลังใจ ---------- */
export const CHEERS = [
  { pre: 'ส่งต่อความรู้\n', hl: 'รุ่นพี่', post: ' สู่รุ่นน้อง' },
  { pre: 'รุ่นพี่ผ่านมาได้\n', hl: 'เราก็ผ่านได้', post: '' },
  { pre: 'อ่านวันละนิด\nดีกว่า', hl: 'อ่านคืนเดียว', post: '' },
  { pre: 'ทุกหน้าที่อ่าน\nคือ', hl: 'คะแนน', post: 'ที่เก็บ' },
  { pre: 'เหนื่อยก็พัก\n', hl: 'แต่อย่าหยุด', post: '' },
  { pre: 'ไม่เข้าใจตรงไหน\n', hl: 'ถามรุ่นพี่', post: 'ได้เลย' },
  { pre: 'นอนให้พอ\nสมอง', hl: 'จำได้ดีกว่า', post: '' },
  { pre: 'สู้ ๆ นะ dX\n', hl: 'เราทำได้!', post: '' },
];

export const CHEER_MS = 4500;

/* ---------- นับถอยหลังสู่การสอบ ---------- */
export const PREP_WINDOW = 30 * 86400000;

/* ---------- สภาพอากาศ ---------- */
export const PM_BANDS = [[0, 15, '#A9D3FF'], [15, 25, '#B7E1D1'], [25, 37.5, '#FFE59A'], [37.5, 75, '#F7CFA6'], [75, 150, '#FFB5C1']];

export const UV_BANDS = [[0, 3, '#B7E1D1'], [3, 6, '#FFE59A'], [6, 8, '#F7CFA6'], [8, 11, '#FFB5C1'], [11, 14, '#CFC6FA']];

/* ============================ main app ============================ */
export const TABS = [
  { key: 'home', icon: 'home', label: 'หน้าแรก', route: { name: 'home', params: {} } },
  { key: 'summary', icon: 'search', label: 'สรุป', route: { name: 'browse', params: { mode: 'summary' } } },
  { key: 'project', icon: 'folder', label: 'Projects', route: { name: 'browse', params: { mode: 'project' } } },
  { key: 'qa', icon: 'message-circle', label: 'ถาม-ตอบ', route: { name: 'qa', params: {} } },
  { key: 'me', icon: 'user', label: 'โปรไฟล์', route: { name: 'profile', params: {} } },
];
