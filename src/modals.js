/* หน้าต่างลอย (อัปโหลด ตั้งกระทู้ วันสอบ ฯลฯ) */
import * as api from './api/content';
import { authErrorMessage } from './api/profiles';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { INK } from './theme';
import { BKK, EXAM_KINDS, MAX_FILE_MB, TYPE_COLOR, TYPE_LABEL } from './constants';
import { bkkParts, byCode, currentTermKey, fmtThaiDate, isRealTerm, kindOf, partsToIso } from './utils';
import { notify, useApp } from './context';
import { Btn, Chip, CoursePicker, DateTimePicker, Field, IconCircle, ModalShell } from './components/ui';
import { AttachPicker } from './components/content';

export function EnrollModal({ onClose }) {
  const { s, data, addEnrollment } = useApp();
  const courses = [...data.courses].sort(byCode);
  const have = new Set((data.enrollments || []).filter((e) => e.status === 'studying').map((e) => e.courseId));
  const [picked, setPicked] = useState([]);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const save = async () => {
    for (const id of picked) if (!have.has(id)) await addEnrollment(id);
    onClose();
  };
  return (
    <ModalShell title="วิชาที่เรียนเทอมนี้" onClose={onClose}>
      <Text style={[s.smallMuted, { marginBottom: 10 }]}>เลือกได้หลายวิชา · บันทึกเป็นเทอม {currentTermKey()}</Text>
      <CoursePicker compact courses={courses.filter((c) => !have.has(c.id))} value={picked} multi onChange={toggle} />
      <Btn title={picked.length ? `เพิ่ม ${picked.length} วิชา` : 'เลือกวิชาก่อน'} arrow block disabled={!picked.length} onPress={save} style={{ marginTop: 12 }} />
    </ModalShell>
  );
}

export function NewCourseModal({ onClose }) {
  const { createCourse } = useApp();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [sem, setSem] = useState('');
  const submit = () => {
    if (!code.trim() || !name.trim()) { notify('กรอกข้อมูลไม่ครบ', 'กรุณากรอกรหัสวิชาและชื่อวิชา'); return; }
    createCourse({ code: code.trim().toUpperCase(), name: name.trim(), semester: sem.trim(), credits: 3, instructor: '' });
    onClose();
  };
  return (
    <ModalShell title="เพิ่มรายวิชาใหม่" onClose={onClose}>
      <Field label="รหัสวิชา" value={code} onChangeText={setCode} placeholder="เช่น DX310" autoCapitalize="characters" />
      <Field label="ชื่อวิชา" value={name} onChangeText={setName} placeholder="ชื่อวิชาภาษาอังกฤษ" />
      <Field label="ภาคการศึกษา" value={sem} onChangeText={setSem} placeholder="เช่น 2/2026" />
      <Btn title="เพิ่มรายวิชา" arrow block onPress={submit} />
    </ModalShell>
  );
}

export function PickInstructorModal({ courseId, onClose }) {
  const { s, data, setInstructor } = useApp();
  const INSTRUCTORS = data.instructors;
  const course = data.courses.find((c) => c.id === courseId);
  const [val, setVal] = useState((course && course.instructor) || '');
  const [custom, setCustom] = useState('');
  return (
    <ModalShell title={`อาจารย์ผู้สอน ${course ? course.code : ''}`} onClose={onClose}>
      <Text style={[s.smallMuted, { marginBottom: 10 }]}>เลือกจากรายชื่ออาจารย์หลักสูตร dX หรือพิมพ์ชื่อเอง</Text>
      <View style={s.wrapRow}>
        <Chip label="ไม่ระบุ" selected={!val} onPress={() => setVal('')} />
        {INSTRUCTORS.map((i) => <Chip key={i.name} label={i.name} selected={val === i.name} onPress={() => setVal(i.name)} />)}
      </View>
      <Field label="หรือพิมพ์ชื่ออาจารย์" value={custom} onChangeText={setCustom} placeholder="เช่น อาจารย์พิเศษ" />
      <Btn title="บันทึก" arrow block onPress={() => { setInstructor(courseId, custom.trim() || val); onClose(); }} />
    </ModalShell>
  );
}

/** ดูรูปเต็มจอ — โหลดรูปความละเอียดเต็มเมื่อเปิด */
export function ImageViewer({ images, index: start, onClose }) {
  const { s } = useApp();
  const [i, setI] = useState(start || 0);
  const [full, setFull] = useState({});
  const cur = images[i];
  useEffect(() => {
    let alive = true;
    if (cur && !full[cur.id]) {
      api.signedUrl(cur.path).then((url) => { if (alive) setFull((f) => ({ ...f, [cur.id]: url })); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [cur && cur.id]);
  if (!cur) return null;
  return (
    <View style={s.viewer}>
      <Image source={{ uri: full[cur.id] || cur.thumb }} style={s.viewerImg} resizeMode="contain" />
      {!full[cur.id] ? <ActivityIndicator color="#fff" style={{ position: 'absolute', top: '50%', alignSelf: 'center' }} /> : null}
      <View style={s.viewerTop}>
        <Text style={s.viewerTxt} numberOfLines={1}>{i + 1}/{images.length} · {cur.name}</Text>
        <IconCircle name="x" size={38} bg="rgba(255,255,255,0.9)" onPress={onClose} />
      </View>
      {images.length > 1 ? (
        <View style={s.viewerNav}>
          <IconCircle name="chevron-left" size={44} bg="rgba(255,255,255,0.9)" onPress={() => setI((i - 1 + images.length) % images.length)} />
          <IconCircle name="chevron-right" size={44} bg="rgba(255,255,255,0.9)" onPress={() => setI((i + 1) % images.length)} />
        </View>
      ) : null}
    </View>
  );
}

export function UploadModal({ defaultType, courseId: presetCourseId, onClose }) {
  const { s, data, createPost } = useApp();
  const typeOptions = defaultType === 'project' ? ['project'] : ['summary', 'problem'];
  const courses = [...data.courses].sort(byCode);
  const [type, setType] = useState(typeOptions[0]);
  const [courseId, setCourseId] = useState(presetCourseId || null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const presetCourse = courses.find((c) => c.id === presetCourseId);
  const [semester, setSemester] = useState(presetCourse && isRealTerm(presetCourse.semester) ? presetCourse.semester : '');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!courseId) { setError('ยังไม่ได้เลือกรายวิชา'); return; }
    if (!title.trim()) { setError('กรุณาใส่หัวข้อ'); return; }
    if (!content.trim() && !files.length) { setError('ใส่เนื้อหา หรือแนบไฟล์อย่างน้อย 1 ไฟล์'); return; }
    if (semester.trim() && !isRealTerm(semester.trim())) { setError('ภาคการศึกษาต้องเป็นรูปแบบ เทอม/ปี ค.ศ. เช่น 1/2026'); return; }
    setBusy(true);
    try {
      setProgress(files.length ? `กำลังอัปโหลดไฟล์ 1/${files.length}` : 'กำลังโพสต์...');
      await createPost(
        { type, courseId, title: title.trim(), content: content.trim(), semester: semester.trim() },
        files,
        (k, n) => setProgress(`กำลังอัปโหลดไฟล์ ${k + 1}/${n}`),
      );
      onClose(courseId, type === 'project' ? 'project' : 'summary');
    } catch (e) {
      setBusy(false);
      setProgress('');
      const msg = String((e && e.message) || '');
      setError(/size|too large|exceeded/i.test(msg)
        ? `ไฟล์ใหญ่เกินไป (ไม่เกิน ${MAX_FILE_MB} MB ต่อไฟล์)`
        : /mime|type/i.test(msg)
          ? 'ชนิดไฟล์นี้อัปโหลดไม่ได้ — ใช้รูป, PDF, Word, PowerPoint, Excel หรือ .txt'
          : 'อัปโหลดไม่สำเร็จ — ' + authErrorMessage(e));
    }
  };

  return (
    <ModalShell title={defaultType === 'project' ? 'แชร์โปรเจ็กต์' : 'แชร์สรุป / ปัญหาที่เจอ'} onClose={() => onClose()}>
      {typeOptions.length > 1 && (
        <View style={s.field}>
          <Text style={s.label}>ประเภทเนื้อหา</Text>
          <View style={s.wrapRow}>
            {typeOptions.map((t) => <Chip key={t} label={TYPE_LABEL[t]} dot={TYPE_COLOR[t]} selected={type === t} onPress={() => setType(t)} />)}
          </View>
        </View>
      )}
      <View style={s.field}>
        <Text style={s.label}>รายวิชา</Text>
        <CoursePicker compact courses={courses} value={courseId} onChange={(id) => {
          setCourseId(id);
          const c = courses.find((x) => x.id === id);
          if (c && !semester && isRealTerm(c.semester)) setSemester(c.semester);
        }} />
      </View>
      <Field label="หัวข้อ" value={title} onChangeText={setTitle} maxLength={200} placeholder="เช่น สรุปบทที่ 3-5 ก่อนสอบกลางภาค" />
      <Field label="เนื้อหา" value={content} onChangeText={setContent} multiline placeholder="พิมพ์สรุป ปัญหาที่เจอ หรือรายละเอียดโปรเจ็กต์ที่นี่... (ถ้าแนบไฟล์แล้ว จะเขียนสั้น ๆ ก็ได้)" />
      <Field label="ภาคการศึกษาที่เรียน" value={semester} onChangeText={setSemester} placeholder="เช่น 1/2026" />
      <AttachPicker items={files} setItems={setFiles} busy={busy} />
      {error ? <Text style={s.formError}>⚠️ {error}</Text> : null}
      {busy ? (
        <View style={[s.row, { marginBottom: 10 }]}>
          <ActivityIndicator size="small" color={INK} />
          <Text style={[s.smallMuted, { marginLeft: 8 }]}>{progress}</Text>
        </View>
      ) : null}
      <Btn title={busy ? 'กำลังอัปโหลด...' : files.length ? `โพสต์พร้อมไฟล์ ${files.length} ไฟล์` : 'โพสต์เลย'} arrow block disabled={busy} onPress={submit} />
    </ModalShell>
  );
}

export function EventFormModal({ scope, event, onClose }) {
  const { s, data, saveEvent, addMyEvent } = useApp();
  const initial = () => {
    if (event && event.date) { const p = bkkParts(event.date); return { y: p.y, m: p.m, d: p.d, hh: p.hh, mi: p.mi }; }
    const t = new Date(Date.now() + BKK + 7 * 86400000); // ค่าเริ่มต้น: อีก 1 สัปดาห์ 09:00
    return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), hh: 9, mi: 0 };
  };
  const [kind, setKind] = useState((event && event.kind) || 'midterm');
  const [title, setTitle] = useState((event && event.title) || '');
  const [courseId, setCourseId] = useState((event && event.courseId) || null);
  const [when, setWhen] = useState(initial);
  const [place, setPlace] = useState((event && event.place) || '');
  const [error, setError] = useState('');
  const courses = [...data.courses].sort(byCode);
  const iso = partsToIso(when);
  const course = courses.find((x) => x.id === courseId);
  const submit = () => {
    if (new Date(iso).getTime() <= Date.now()) { setError('เวลานี้ผ่านไปแล้ว — เลือกวันหรือเวลาในอนาคต'); return; }
    const t = title.trim() || kindOf(kind).label;
    const payload = { title: t, kind, courseId: courseId || null, date: iso, place: place.trim() };
    if (scope === 'shared') saveEvent(event ? event.id : null, payload);
    else addMyEvent(payload);
    onClose();
  };
  return (
    <ModalShell title={scope === 'shared' ? (event ? 'แก้ไขวันสอบ' : 'เพิ่มวันสอบ (ทุกคนเห็น)') : 'เพิ่มวันสอบของฉัน'} onClose={onClose}>
      <Text style={s.formSection}>1 · ประเภท</Text>
      <View style={[s.wrapRow, { marginBottom: 6 }]}>
        {EXAM_KINDS.map((k) => <Chip key={k.key} label={k.emoji + ' ' + k.label} selected={kind === k.key} onPress={() => setKind(k.key)} />)}
      </View>

      <Text style={s.formSection}>2 · วิชา (ไม่บังคับ)</Text>
      <View style={{ marginBottom: 10 }}>
        <CoursePicker courses={courses} value={courseId} onChange={setCourseId} allowNone compact />
      </View>

      <Text style={s.formSection}>3 · วันและเวลา</Text>
      <DateTimePicker value={when} onChange={(v) => { setWhen(v); setError(''); }} />

      <Text style={[s.formSection, { marginTop: 14 }]}>4 · รายละเอียดเพิ่มเติม (ไม่บังคับ)</Text>
      <Field value={title} onChangeText={setTitle} maxLength={80} placeholder={'ชื่อ เช่น ' + kindOf(kind).label + ' บทที่ 1–5'} />
      <Field value={place} onChangeText={setPlace} maxLength={60} placeholder="สถานที่ เช่น SC1001 / ออนไลน์" />

      <View style={s.summaryBox}>
        <Text style={s.summaryKicker}>จะนับถอยหลังถึง</Text>
        <Text style={s.summaryTxt}>{kindOf(kind).emoji} {course ? course.code + ' · ' : ''}{title.trim() || kindOf(kind).label}</Text>
        <Text style={s.summaryDate}>📅 {fmtThaiDate(iso)}</Text>
      </View>
      {error ? <Text style={s.formError}>⚠️ {error}</Text> : null}
      <Btn title="บันทึกและเริ่มนับถอยหลัง" arrow block onPress={submit} />
    </ModalShell>
  );
}

export function NewThreadModal({ onClose }) {
  const { s, data, createThread } = useApp();
  const courses = [...data.courses].sort(byCode);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [courseId, setCourseId] = useState(null);
  const submit = () => {
    if (!title.trim() || !body.trim()) { notify('กรอกข้อมูลไม่ครบ', 'กรุณากรอกหัวข้อและรายละเอียด'); return; }
    const c = courses.find((x) => x.id === courseId);
    createThread({ title: title.trim(), body: body.trim(), courseId: c ? c.id : null, courseCode: c ? c.code : null });
    onClose(true);
  };
  return (
    <ModalShell title="ตั้งกระทู้ใหม่" onClose={() => onClose()}>
      <Field label="หัวข้อคำถาม" value={title} onChangeText={setTitle} maxLength={200} placeholder="เช่น DX212 ใช้ Expo ทำ navigation ยังไง" />
      <Field label="รายละเอียด" value={body} onChangeText={setBody} multiline placeholder="อธิบายคำถามของคุณให้ละเอียด..." />
      <View style={{ marginBottom: 14 }}>
        <Text style={s.label}>เกี่ยวกับวิชา (ถ้ามี)</Text>
        <CoursePicker compact courses={courses} value={courseId} onChange={setCourseId} allowNone />
      </View>
      <Btn title="ตั้งกระทู้" arrow block onPress={submit} />
    </ModalShell>
  );
}
