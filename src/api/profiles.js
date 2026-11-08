import { supabase } from '../lib/supabase';

/* แปลงระหว่างแถว profiles ใน Supabase ↔ รูปแบบผู้ใช้ที่ App.js ใช้อยู่เดิม
 * แอปยังอ้างอิงผู้ใช้ด้วย studentId ทุกที่ (authorId ของโพสต์ ฯลฯ) จึงเก็บ studentId เป็นตัวหลักต่อ
 * วิชาในแอป id = รหัสวิชาตัวเล็ก (เช่น 'dx212') ส่วนใน DB เป็น bigint → แปลงผ่าน course_code
 */

const AVATARS = 'avatars';

export function avatarUrl(path) {
  if (!path) return null;
  return supabase.storage.from(AVATARS).getPublicUrl(path).data.publicUrl;
}

/** แถวจาก DB (+ favorite_courses(courses(course_code))) → ผู้ใช้แบบแอป */
export function toAppUser(row) {
  return {
    uid: row.id,
    role: row.role,
    studentId: row.student_id,
    name: row.display_name,
    year: row.year_label || '',
    bio: row.bio || '',
    color: row.color || 'yellow',
    emoji: row.emoji || '📚',
    photo: avatarUrl(row.avatar_path),
    avatarPath: row.avatar_path || null,
    pattern: row.pattern || 'blobs',
    frame: row.frame || 'clean',
    shape: row.shape || 'circle',
    status: row.status || { emoji: '', text: '' },
    interests: row.interests || [],
    favCourses: (row.favorite_courses || [])
      .map((f) => f.courses && f.courses.course_code && f.courses.course_code.toLowerCase())
      .filter(Boolean),
    links: row.links || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = '*, favorite_courses(courses(course_code))';

export async function fetchMyProfile(uid) {
  const { data, error } = await supabase.from('profiles').select(SELECT).eq('id', uid).maybeSingle();
  if (error) throw error;
  return data ? toAppUser(data) : null;
}

export async function fetchAllProfiles() {
  const { data, error } = await supabase.from('profiles').select(SELECT);
  if (error) throw error;
  return data.map(toAppUser);
}

export async function isStudentIdTaken(studentId, exceptUid) {
  let q = supabase.from('profiles').select('id').eq('student_id', studentId);
  if (exceptUid) q = q.neq('id', exceptUid);
  const { data, error } = await q.limit(1);
  if (error) throw error;
  return data.length > 0;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** photo จากฟอร์ม: data URL = รูปใหม่ → อัปโหลด / URL เดิม = ไม่เปลี่ยน / null = ลบรูป */
async function syncAvatar(uid, photo, oldPath) {
  if (photo && !photo.startsWith('data:')) return oldPath || null;
  if (oldPath) await supabase.storage.from(AVATARS).remove([oldPath]).catch(() => {});
  if (!photo) return null;
  const b64 = photo.replace(/^data:[^,]*,/, '');
  const path = `${uid}/avatar-${Date.now()}.jpg`; // ชื่อใหม่ทุกครั้ง → ไม่ติด cache รูปเก่า
  const { error } = await supabase.storage.from(AVATARS).upload(path, base64ToBytes(b64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

async function syncFavorites(uid, codes) {
  const { error: delErr } = await supabase.from('favorite_courses').delete().eq('user_id', uid);
  if (delErr) throw delErr;
  if (!codes.length) return;
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, course_code')
    .in('course_code', codes.map((c) => c.toUpperCase()));
  if (error) throw error;
  if (!courses.length) return;
  const { error: insErr } = await supabase
    .from('favorite_courses')
    .insert(courses.map((c) => ({ user_id: uid, course_id: c.id })));
  if (insErr) throw insErr;
}

/** สร้าง/แก้โปรไฟล์ของผู้ใช้ที่ล็อกอินอยู่ — p เป็นรูปแบบผู้ใช้ของแอป */
export async function saveMyProfile(uid, p, previous) {
  const avatarPath = await syncAvatar(uid, p.photo, previous && previous.avatarPath);
  const row = {
    id: uid,
    student_id: p.studentId,
    display_name: p.name,
    year_label: p.year || null,
    bio: p.bio || null,
    avatar_path: avatarPath,
    color: p.color,
    emoji: p.emoji,
    pattern: p.pattern,
    frame: p.frame,
    shape: p.shape,
    status: p.status,
    interests: p.interests || [],
    links: p.links || {},
  };
  const { error } = await supabase.from('profiles').upsert(row);
  if (error) throw error;
  await syncFavorites(uid, p.favCourses || []);
  return fetchMyProfile(uid);
}

/** ข้อความผิดพลาดภาษาไทยสำหรับ error ที่เจอบ่อย */
export function authErrorMessage(e) {
  const msg = String((e && e.message) || e || '');
  if (/Database error saving new user|tu\.ac\.th/i.test(msg)) return 'สมัครได้เฉพาะอีเมลมหาวิทยาลัยธรรมศาสตร์ (@dome.tu.ac.th หรือ @...tu.ac.th)';
  if (/rate limit|too many|security purposes/i.test(msg)) return 'ขอรหัสบ่อยเกินไป รอสักครู่แล้วลองใหม่';
  if (/expired|invalid/i.test(msg)) return 'รหัสไม่ถูกต้องหรือหมดอายุ ลองขอรหัสใหม่';
  if (/profiles_student_id_key|duplicate key/i.test(msg)) return 'รหัสนักศึกษานี้มีคนใช้แล้ว';
  if (/network|fetch/i.test(msg)) return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้';
  return msg || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง';
}
