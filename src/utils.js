/* ฟังก์ชันช่วย: เวลา ไฟล์ สภาพอากาศ สถิติโปรไฟล์ */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { INK, PASTEL, PASTEL_KEYS } from './theme';
import { BADGES, BKK, CAMPUS, COURSE_LIST, EXAM_KINDS, LEVEL_TITLES, TERM_INFO, TH_DAYS, TH_MONTHS, WMO } from './constants';

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const cleanHandle = (h) => String(h || '').trim().replace(/^https?:\/\/[^/]+\/(in\/)?/i, '').replace(/^@/, '').replace(/\/+$/, '');

/** สถิติ + เลเวล + เหรียญ ของผู้ใช้ */
export function profileStats(id, data, profile) {
  const posts = data.posts.filter((p) => p.authorId === id);
  const likes = posts.reduce((n, p) => n + (p.likes || []).length, 0);
  const threads = data.threads.filter((t) => t.authorId === id).length;
  const answers =
    data.posts.reduce((n, p) => n + (p.comments || []).filter((x) => x.authorId === id).length, 0) +
    data.threads.reduce((n, t) => n + (t.replies || []).filter((x) => x.authorId === id).length, 0);
  const complete = !!(profile && profile.photo && profile.bio && (profile.interests || []).length);
  const st = {
    posts: posts.length, likes, threads, answers, complete,
    summaries: posts.filter((p) => p.type !== 'project').length,
    projects: posts.filter((p) => p.type === 'project').length,
  };
  const xp = 20 + st.posts * 20 + likes * 5 + answers * 8 + threads * 10 + (complete ? 30 : 0);
  const level = Math.floor(xp / 100) + 1;
  return {
    ...st, xp, level, progress: xp % 100,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    badges: BADGES.map((b) => ({ ...b, earned: b.test(st) })),
  };
}

export function shapeRadius(shape, size) {
  if (shape === 'squircle') return { borderRadius: size * 0.3 };
  if (shape === 'blob') return { borderTopLeftRadius: size * 0.5, borderTopRightRadius: size * 0.36, borderBottomRightRadius: size * 0.5, borderBottomLeftRadius: size * 0.28 };
  return { borderRadius: size / 2 };
}

export function frameStyle(frame, bw, c) {
  switch (frame) {
    case 'ink': return { borderWidth: bw, borderColor: INK };
    case 'rainbow': return { borderWidth: bw + 1, borderTopColor: PASTEL.pink.dot, borderRightColor: PASTEL.yellow.dot, borderBottomColor: PASTEL.mint.dot, borderLeftColor: PASTEL.blue.dot };
    case 'dashed': return { borderWidth: Math.max(2, bw - 1), borderStyle: 'dashed', borderColor: INK };
    case 'gold': return { borderWidth: bw + 1, borderColor: '#F2C14E' };
    default: return { borderWidth: bw, borderColor: c.surface };
  }
}

export const typesForMode = (mode) => (mode === 'project' ? ['project'] : ['summary', 'problem']);

export const termLabel = (t) => (TERM_INFO[t] ? TERM_INFO[t].label : t ? 'เทอม ' + t : '-');

export const termShort = (t) => (TERM_INFO[t] ? TERM_INFO[t].label.replace(' · ', ' ') : t || '-');

export const isRealTerm = (t) => /^[12S]\/\d{4}$/.test(t || '');

/* ============================ utils ============================ */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const byNewest = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);

export const byOldest = (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0);

export const byCode = (a, b) => (a.code || '').localeCompare(b.code || '');

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function hashKey(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PASTEL_KEYS[h % PASTEL_KEYS.length];
}

export const courseColor = (course) => {
  if (!course) return 'yellow';
  const order = ['yellow', 'pink', 'lilac', 'mint', 'peach', 'blue'];
  const i = COURSE_LIST.findIndex(([code]) => code === course.code);
  return i >= 0 ? order[i % order.length] : hashKey(course.code);
};

export function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return Math.floor(diff / 60) + ' นาทีที่แล้ว';
  if (diff < 86400) return Math.floor(diff / 3600) + ' ชม.ที่แล้ว';
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + ' วันที่แล้ว';
  try { return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch (e) { return iso.slice(0, 10); }
}

export function fileKind(name, mime) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  const m = String(mime || '');
  if (m.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return { key: 'image', icon: 'image', label: 'รูปภาพ', color: 'mint' };
  if (m === 'application/pdf' || ext === 'pdf') return { key: 'pdf', icon: 'file-text', label: 'PDF', color: 'pink' };
  if (['doc', 'docx'].includes(ext) || m.includes('word')) return { key: 'doc', icon: 'file-text', label: 'Word', color: 'blue' };
  if (['ppt', 'pptx'].includes(ext) || m.includes('presentation') || m.includes('powerpoint')) return { key: 'ppt', icon: 'monitor', label: 'PowerPoint', color: 'peach' };
  if (['xls', 'xlsx'].includes(ext) || m.includes('sheet') || m.includes('excel')) return { key: 'xls', icon: 'grid', label: 'Excel', color: 'mint' };
  return { key: 'file', icon: 'paperclip', label: 'ไฟล์', color: 'lilac' };
}

export const b64Bytes = (b64) => Math.floor((b64 || '').length * 3 / 4);

export function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',').pop());
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** ตัด "data:...;base64," ออก — บนเว็บ expo-document-picker คืนค่าเป็น data URL */
export const stripDataUrl = (v) => String(v || '').replace(/^data:[^,]*,/, '');

/** อ่านไฟล์ที่เลือกเป็น base64 — รองรับทั้งเว็บและมือถือ */
export async function readAsBase64(asset) {
  if (asset.base64) return stripDataUrl(asset.base64);
  if (Platform.OS === 'web') {
    if (asset.file) return blobToBase64(asset.file);
    return blobToBase64(await (await fetch(asset.uri)).blob());
  }
  try { return await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' }); }
  catch (e) { return blobToBase64(await (await fetch(asset.uri)).blob()); }
}

/** ย่อรูปเพื่อประหยัดพื้นที่: ตัวเต็มกว้างไม่เกิน 1600px + ภาพย่อ 320px */
export async function prepareImage(uri, width) {
  const resize = width && width > 1600 ? [{ resize: { width: 1600 } }] : [];
  const full = await ImageManipulator.manipulateAsync(uri, resize, { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  const thumb = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 320 } }], { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  return { b64: full.base64, thumb: 'data:image/jpeg;base64,' + thumb.base64 };
}

export const pad2 = (n) => String(n).padStart(2, '0');

export function bkkParts(iso) {
  const d = new Date(new Date(iso).getTime() + BKK);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), hh: d.getUTCHours(), mi: d.getUTCMinutes() };
}

export function fmtThaiDate(iso, withTime = true) {
  const p = bkkParts(iso);
  const date = `${TH_DAYS[p.wd]} ${p.d} ${TH_MONTHS[p.m]} ${p.y + 543}`;
  return withTime ? `${date} · ${pad2(p.hh)}:${pad2(p.mi)} น.` : date;
}

export function useNow(ms) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export const kindOf = (k) => EXAM_KINDS.find((x) => x.key === k) || EXAM_KINDS[4];

export function wmoInfo(code, isDay) {
  const w = WMO[code] || ['สภาพอากาศไม่ทราบ', '🌡️'];
  return { label: w[0], emoji: !isDay && w[2] ? w[2] : w[1] };
}

/** เกณฑ์ PM2.5 ของกรมควบคุมมลพิษ (ปรับปรุง มิ.ย. 2566) */
export function pm25Info(v) {
  if (v == null) return null;
  if (v <= 15) return { label: 'ดีมาก', color: '#A9D3FF', tip: 'อากาศดีมาก เหมาะกับกิจกรรมกลางแจ้ง' };
  if (v <= 25) return { label: 'ดี', color: '#B7E1D1', tip: 'อากาศดี ทำกิจกรรมกลางแจ้งได้ตามปกติ' };
  if (v <= 37.5) return { label: 'ปานกลาง', color: '#FFE59A', tip: 'ผู้ที่ไวต่อฝุ่นควรลดเวลาอยู่กลางแจ้ง' };
  if (v <= 75) return { label: 'เริ่มมีผลต่อสุขภาพ', color: '#F7CFA6', tip: 'ควรใส่หน้ากาก N95 เมื่ออยู่กลางแจ้ง' };
  return { label: 'มีผลต่อสุขภาพ', color: '#FFB5C1', tip: 'เลี่ยงกิจกรรมกลางแจ้ง และใส่หน้ากาก N95' };
}

export function uvInfo(v) {
  if (v == null) return null;
  if (v < 3) return { label: 'ต่ำ', color: '#B7E1D1', tip: 'แดดอ่อน ออกไปข้างนอกได้สบาย' };
  if (v < 6) return { label: 'ปานกลาง', color: '#FFE59A', tip: 'ทาครีมกันแดดก่อนออกจากบ้าน' };
  if (v < 8) return { label: 'สูง', color: '#F7CFA6', tip: 'ทากันแดด SPF30+ และหลบแดดช่วงเที่ยง' };
  if (v < 11) return { label: 'สูงมาก', color: '#FFB5C1', tip: 'พกร่มหรือหมวก เลี่ยงแดด 10:00–15:00' };
  return { label: 'อันตราย', color: '#CFC6FA', tip: 'อยู่ในร่มให้มากที่สุด' };
}

export async function fetchWeather() {
  const q = `latitude=${CAMPUS.lat}&longitude=${CAMPUS.lon}&timezone=Asia%2FBangkok`;
  const [w, a] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?${q}&forecast_days=1&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=pm2_5,pm10,uv_index`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  ]);
  if (w.status !== 'fulfilled') throw new Error('weather');
  const cur = w.value.current || {};
  const day = w.value.daily || {};
  const aq = a.status === 'fulfilled' ? a.value.current || {} : {};
  const first = (arr) => (Array.isArray(arr) ? arr[0] : null);
  const hm = (t) => (t ? String(t).slice(11, 16) : '-');
  return {
    temp: cur.temperature_2m, feels: cur.apparent_temperature, humidity: cur.relative_humidity_2m, wind: cur.wind_speed_10m,
    code: cur.weather_code, isDay: cur.is_day !== 0,
    max: first(day.temperature_2m_max), min: first(day.temperature_2m_min), rain: first(day.precipitation_probability_max),
    uvMax: first(day.uv_index_max), uvNow: aq.uv_index, sunrise: hm(first(day.sunrise)), sunset: hm(first(day.sunset)),
    pm25: aq.pm2_5, pm10: aq.pm10, at: Date.now(),
  };
}

export function splitCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

// แถบความคืบหน้า = 30 วันสุดท้ายก่อนสอบ
export function cheerFor(days) {
  if (days <= 0) return 'โค้งสุดท้ายแล้ว ทบทวนจุดสำคัญ แล้วพักผ่อนให้พอนะ';
  if (days <= 3) return '🔥 เหลือไม่ถึง 3 วัน ทบทวนสรุปของรุ่นพี่กันเถอะ!';
  if (days <= 7) return 'สัปดาห์สุดท้าย ลองทำข้อสอบเก่าดูนะ';
  if (days <= 14) return 'อีก 2 สัปดาห์ ทยอยอ่านทีละบทยังทันสบาย ๆ';
  return 'ยังมีเวลาเหลือเฟือ เริ่มเร็วได้เปรียบ ✨';
}

export function bandPos(v, bands) {
  if (v == null) return 0;
  for (let i = 0; i < bands.length; i++) {
    const [lo, hi] = bands[i];
    if (v <= hi || i === bands.length - 1) return Math.min(100, (i + Math.min(1, Math.max(0, (v - lo) / (hi - lo)))) * (100 / bands.length));
  }
  return 100;
}

/** เทอมปัจจุบันตามปฏิทินไทย: ส.ค.–ธ.ค. = เทอม 1, ม.ค.–พ.ค. = เทอม 2 ของปีก่อน, มิ.ย.–ก.ค. = ฤดูร้อน */
export function currentTermKey() {
  const p = bkkParts(new Date().toISOString());
  if (p.m >= 7) return '1/' + p.y;
  if (p.m <= 4) return '2/' + (p.y - 1);
  return 'S/' + (p.y - 1);
}

export const partsToIso = (v) => new Date(Date.UTC(v.y, v.m, v.d, v.hh, v.mi) - BKK).toISOString();
