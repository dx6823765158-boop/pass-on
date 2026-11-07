import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { fetchAllProfiles } from './profiles';

/* ข้อมูลเนื้อหาทั้งหมดจาก Supabase → รูปแบบเดียวกับที่หน้าจอเดิมใช้ (data.posts / data.threads / ...)
 * - id ของโพสต์/คอมเมนต์ในแอปเป็น string ของเลข bigint
 * - id วิชาในแอป = รหัสวิชาตัวเล็ก (เช่น 'dx212'); ใน DB เป็น bigint → แปลงผ่าน courseIndex
 * - ผู้ใช้อ้างอิงด้วย studentId; ใน DB เป็น uuid → แปลงผ่าน profiles
 */

const ATTACH = 'attachments';
const SIGNED_TTL = 60 * 60; // วินาที
const QUESTION = 'question';

let index = {
  courseByDbId: {}, // 12 → course แบบแอป
  courseDbId: {},   // 'dx212' → 12
  catBySlug: {},    // 'summary' → 1
  slugByCat: {},    // 1 → 'summary'
  sidByUid: {},     // uuid → '6612345678'
};

/* ---------- แปลงค่า ---------- */
export function toSemester(year, term) {
  if (!year || !term) return '';
  return `${term === 3 ? 'S' : term}/${year}`;
}
export function fromSemester(sem) {
  const m = /^([12S])\/(\d{4})$/.exec(String(sem || '').trim());
  if (!m) return { academic_year: null, term: null };
  return { academic_year: Number(m[2]), term: m[1] === 'S' ? 3 : Number(m[1]) };
}
const appCourseId = (dbId) => (index.courseByDbId[dbId] ? index.courseByDbId[dbId].id : null);
export const dbCourseId = (appId) => (appId ? index.courseDbId[appId] || null : null);

function toCourse(r) {
  return {
    id: r.course_code.toLowerCase(), dbId: r.id, code: r.course_code, name: r.name_en, nameTh: r.name_th || '',
    semester: r.semester || '', track: r.track || '', credits: r.credits || 3, instructor: r.instructor || '', icon: r.icon || '',
  };
}

function toComment(r, nameBySid) {
  const sid = index.sidByUid[r.user_id] || '';
  return {
    id: String(r.id), authorId: sid, author: nameBySid[sid] || 'ผู้ใช้', text: r.content, createdAt: r.created_at,
    accepted: !!r.is_accepted, parentId: r.parent_comment_id ? String(r.parent_comment_id) : null,
  };
}

function toAttachment(r, signed) {
  return {
    id: String(r.id), name: r.file_name, mime: r.file_type, size: (r.file_size_kb || 0) * 1024,
    path: r.storage_path, thumbPath: r.thumb_path, thumb: signed[r.thumb_path] || null,
  };
}

/* ---------- โหลดทั้งหมด ---------- */
export async function loadAll(myUid) {
  const [coursesR, catsR, instR, postsR, eventsR, annR, enrR, users] = await Promise.all([
    supabase.from('courses').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('instructors').select('*').order('sort_order'),
    supabase
      .from('posts')
      .select('*, likes(user_id), comments(id, user_id, parent_comment_id, content, is_accepted, created_at), attachments(*)')
      .order('created_at', { ascending: false }),
    supabase.from('exam_events').select('*').order('starts_at'),
    supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1),
    supabase.from('enrollments').select('*').eq('user_id', myUid),
    fetchAllProfiles(),
  ]);
  for (const r of [coursesR, catsR, instR, postsR, eventsR, annR, enrR]) if (r.error) throw r.error;

  const courses = coursesR.data.map(toCourse);
  index = {
    courseByDbId: Object.fromEntries(courses.map((c) => [c.dbId, c])),
    courseDbId: Object.fromEntries(courses.map((c) => [c.id, c.dbId])),
    catBySlug: Object.fromEntries(catsR.data.map((c) => [c.slug, c.id])),
    slugByCat: Object.fromEntries(catsR.data.map((c) => [c.id, c.slug])),
    sidByUid: Object.fromEntries(users.map((u) => [u.uid, u.studentId])),
  };
  const nameBySid = Object.fromEntries(users.map((u) => [u.studentId, u.name]));

  // ภาพย่อของไฟล์แนบ (bucket private) → signed URL ทีเดียวทั้งชุด
  const thumbPaths = postsR.data.flatMap((p) => p.attachments.map((a) => a.thumb_path).filter(Boolean));
  const signed = {};
  if (thumbPaths.length) {
    const { data: urls, error } = await supabase.storage.from(ATTACH).createSignedUrls(thumbPaths, SIGNED_TTL);
    if (error) throw error;
    urls.forEach((u) => { if (u.signedUrl) signed[u.path] = u.signedUrl; });
  }

  const posts = [];
  const threads = [];
  for (const p of postsR.data) {
    const sid = index.sidByUid[p.user_id] || '';
    const course = index.courseByDbId[p.course_id];
    const base = {
      id: String(p.id), courseId: course ? course.id : null, title: p.title, authorId: sid,
      authorName: nameBySid[sid] || 'ผู้ใช้', createdAt: p.created_at, hidden: p.status === 'hidden', views: p.view_count,
    };
    const comments = p.comments.map((c) => toComment(c, nameBySid));
    if (index.slugByCat[p.category_id] === QUESTION) {
      threads.push({ ...base, body: p.content || '', courseCode: course ? course.code : null, replies: comments });
    } else {
      const slug = index.slugByCat[p.category_id];
      posts.push({
        ...base, type: slug === 'exam_tip' ? 'summary' : slug, content: p.content || '',
        semester: toSemester(p.academic_year, p.term),
        likes: p.likes.map((l) => index.sidByUid[l.user_id]).filter(Boolean),
        comments,
        attachments: p.attachments.sort((a, b) => a.id - b.id).map((a) => toAttachment(a, signed)),
      });
    }
  }

  const toEvent = (e) => ({
    id: String(e.id), title: e.title, kind: e.kind, courseId: appCourseId(e.course_id), date: e.starts_at, place: e.place || '',
  });
  const ann = annR.data[0];
  return {
    courses,
    instructors: instR.data.map((i) => ({ id: i.id, name: i.name, en: i.name_en || '', role: i.role || '', group: i.group_name || '' })),
    posts,
    threads,
    users,
    events: eventsR.data.filter((e) => !e.owner_id).map(toEvent),
    myEvents: eventsR.data.filter((e) => e.owner_id === myUid).map(toEvent),
    config: { home: ann ? { id: ann.id, text: ann.text, color: ann.color, updatedAt: ann.created_at } : null },
    enrollments: enrR.data.map((r) => ({
      id: String(r.id), courseId: appCourseId(r.course_id), academicYear: r.academic_year, term: r.term, status: r.status,
    })),
  };
}

/* ---------- เขียนข้อมูล ---------- */
const must = ({ error, data }) => { if (error) throw error; return data; };

export async function setLike(myUid, postId, liked) {
  if (liked) must(await supabase.from('likes').insert({ user_id: myUid, post_id: Number(postId) }));
  else must(await supabase.from('likes').delete().eq('user_id', myUid).eq('post_id', Number(postId)));
}

export async function addComment(postId, text, parentId) {
  must(await supabase.from('comments').insert({ post_id: Number(postId), content: text, parent_comment_id: parentId ? Number(parentId) : null }));
}

export async function setAccepted(commentId, accepted) {
  must(await supabase.from('comments').update({ is_accepted: accepted }).eq('id', Number(commentId)));
}

export async function deleteComment(commentId) {
  must(await supabase.from('comments').delete().eq('id', Number(commentId)));
}

export async function incrementView(postId) {
  await supabase.rpc('increment_view', { p_post_id: Number(postId) });
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const safeName = (name) => String(name || 'file').replace(/[^\w.\-]+/g, '_').slice(-80) || 'file';

/** สร้างโพสต์ + อัปโหลดไฟล์แนบ — ถ้าไฟล์ไหนพลาด ลบโพสต์และไฟล์ที่อัปไปแล้วทิ้ง */
export async function createPost(myUid, post, files, onProgress) {
  const sem = fromSemester(post.semester);
  const row = must(await supabase.from('posts').insert({
    category_id: index.catBySlug[post.type], course_id: dbCourseId(post.courseId), title: post.title,
    content: post.content || null, academic_year: sem.academic_year, term: sem.term,
  }).select('id').single());
  const uploaded = [];
  try {
    for (let k = 0; k < files.length; k++) {
      const f = files[k];
      if (onProgress) onProgress(k, files.length);
      const stamp = Date.now().toString(36) + k;
      const path = `${myUid}/${row.id}/${stamp}-${safeName(f.name)}`;
      must(await supabase.storage.from(ATTACH).upload(path, base64ToBytes(f.b64), { contentType: f.mime }));
      uploaded.push(path);
      let thumbPath = null;
      if (f.thumb) {
        thumbPath = `${myUid}/${row.id}/${stamp}-thumb.jpg`;
        must(await supabase.storage.from(ATTACH).upload(thumbPath, base64ToBytes(f.thumb.replace(/^data:[^,]*,/, '')), { contentType: 'image/jpeg' }));
        uploaded.push(thumbPath);
      }
      must(await supabase.from('attachments').insert({
        post_id: row.id, file_name: f.name, storage_path: path, thumb_path: thumbPath,
        file_type: f.mime, file_size_kb: Math.ceil(f.size / 1024),
      }));
    }
  } catch (e) {
    await supabase.from('posts').delete().eq('id', row.id);
    if (uploaded.length) await supabase.storage.from(ATTACH).remove(uploaded);
    throw e;
  }
  return String(row.id);
}

export async function createThread(t) {
  const row = must(await supabase.from('posts').insert({
    category_id: index.catBySlug[QUESTION], course_id: dbCourseId(t.courseId), title: t.title, content: t.body,
  }).select('id').single());
  return String(row.id);
}

/** ลบโพสต์ของตัวเอง (หรือแอดมิน) พร้อมไฟล์ใน storage */
export async function deletePost(post) {
  const paths = (post.attachments || []).flatMap((a) => [a.path, a.thumbPath]).filter(Boolean);
  // ลบไฟล์ก่อน: storage ต้องเห็นแถว attachments (SELECT policy) ถึงจะลบได้ — ลบโพสต์ก่อนแถวจะหายไปตาม cascade
  if (paths.length) must(await supabase.storage.from(ATTACH).remove(paths));
  must(await supabase.from('posts').delete().eq('id', Number(post.id)));
}

export async function setPostHidden(postId, hidden) {
  must(await supabase.from('posts').update({ status: hidden ? 'hidden' : 'published' }).eq('id', Number(postId)));
}

/** URL ชั่วคราวของไฟล์จริง (รูปเต็ม / เอกสาร) */
export async function signedUrl(path, ttl = 600) {
  return must(await supabase.storage.from(ATTACH).createSignedUrl(path, ttl)).signedUrl;
}

/** เปิดไฟล์: เว็บ = แท็บใหม่ / มือถือ = ดาวน์โหลดลงแคชแล้วเลือกแอปที่จะเปิด */
export async function openAttachment(att) {
  const url = await signedUrl(att.path);
  if (Platform.OS === 'web') {
    const w = window.open(url, '_blank');
    if (!w) window.location.href = url;
    return;
  }
  const local = FileSystem.cacheDirectory + att.id + '_' + safeName(att.name);
  await FileSystem.downloadAsync(url, local);
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
  await Sharing.shareAsync(local, { mimeType: att.mime, dialogTitle: att.name, UTI: /pdf/i.test(att.mime) ? 'com.adobe.pdf' : undefined });
}

/* ---------- วิชา (แอดมิน) ---------- */
export async function createCourse(c) {
  const sem = String(c.semester || '').trim();
  const m = /^[12S]\/(\d{4})$/.exec(sem);
  must(await supabase.from('courses').insert({
    course_code: c.code, name_en: c.name, credits: c.credits || 3, semester: sem || null,
    year_level: m ? Math.min(4, Math.max(1, Number(m[1]) - 2024)) : null,
  }));
  return c.code.toLowerCase();
}
export async function setInstructor(courseId, name) {
  // อ้างด้วยรหัสวิชา (ไม่พึ่ง index ที่อาจยังไม่รีโหลดหลังเพิ่มวิชาใหม่)
  must(await supabase.from('courses').update({ instructor: name || null }).eq('course_code', String(courseId).toUpperCase()));
}

/* ---------- ตารางสอบ ---------- */
const eventRow = (ev) => ({ title: ev.title, kind: ev.kind, course_id: dbCourseId(ev.courseId), starts_at: ev.date, place: ev.place || null });
export async function saveSharedEvent(id, ev) {
  if (id) must(await supabase.from('exam_events').update(eventRow(ev)).eq('id', Number(id)));
  else must(await supabase.from('exam_events').insert({ ...eventRow(ev), owner_id: null }));
}
export async function addMyEvent(myUid, ev) {
  must(await supabase.from('exam_events').insert({ ...eventRow(ev), owner_id: myUid }));
}
export async function deleteEvent(id) {
  must(await supabase.from('exam_events').delete().eq('id', Number(id)));
}

/* ---------- ประกาศ ---------- */
export async function saveAnnouncement(text, color) {
  must(await supabase.from('announcements').update({ is_active: false }).eq('is_active', true));
  if (text) must(await supabase.from('announcements').insert({ text, color }));
}

/* ---------- วิชาที่กำลังเรียน ---------- */
export async function addEnrollment(myUid, courseId, academicYear, term) {
  must(await supabase.from('enrollments').upsert(
    { user_id: myUid, course_id: dbCourseId(courseId), academic_year: academicYear, term, status: 'studying' },
    { onConflict: 'user_id,course_id,academic_year,term', ignoreDuplicates: true },
  ));
}
export async function setEnrollmentStatus(id, status) {
  must(await supabase.from('enrollments').update({ status }).eq('id', Number(id)));
}
export async function removeEnrollment(id) {
  must(await supabase.from('enrollments').delete().eq('id', Number(id)));
}

/* ---------- รายงานเนื้อหา ---------- */
export async function reportContent(postId, commentId, reason) {
  const { error } = await supabase.from('reports').insert({ post_id: Number(postId), comment_id: commentId ? Number(commentId) : null, reason });
  if (error && error.code !== '23505') throw error; // 23505 = รายงานซ้ำ → ถือว่าสำเร็จ
}
export async function loadReports() {
  const rows = must(await supabase.from('reports').select('*').eq('status', 'open').order('created_at', { ascending: false }));
  return rows.map((r) => ({
    id: String(r.id), postId: String(r.post_id), commentId: r.comment_id ? String(r.comment_id) : null,
    reporterId: index.sidByUid[r.reporter_id] || '', reason: r.reason, createdAt: r.created_at,
  }));
}
export async function resolveReport(id, myUid) {
  must(await supabase.from('reports').update({ status: 'resolved', resolved_by: myUid, resolved_at: new Date().toISOString() }).eq('id', Number(id)));
}

/* ---------- realtime: มีอะไรเปลี่ยน → เรียก onChange (หน่วงรวมเป็นครั้งเดียว) ---------- */
export function subscribeChanges(onChange) {
  let t = null;
  const fire = () => { clearTimeout(t); t = setTimeout(onChange, 400); };
  const ch = supabase.channel('passon-content');
  ['posts', 'comments', 'likes', 'attachments', 'exam_events', 'announcements', 'reports', 'profiles', 'courses'].forEach((table) => {
    ch.on('postgres_changes', { event: '*', schema: 'public', table }, fire);
  });
  ch.subscribe();
  return () => { clearTimeout(t); supabase.removeChannel(ch); };
}
