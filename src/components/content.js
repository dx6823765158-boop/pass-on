/* การ์ดโพสต์ คอมเมนต์ ไลก์ และไฟล์แนบ */
import * as api from '../api/content';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { INK, PASTEL } from '../theme';
import { COURSE_ICON, DOC_TYPES, MAX_ATTACH, MAX_FILE_MB } from '../constants';
import { b64Bytes, courseColor, fileKind, fmtSize, prepareImage, readAsBase64, relTime, termShort, typesForMode, uid } from '../utils';
import { notify, useApp } from '../context';
import { Avatar, AvatarStack, Card, Pill, TypeTag } from './ui';

export function LikeBtn({ post, withLabel }) {
  const { s, c, user, toggleLike } = useApp();
  const likes = post.likes || [];
  const liked = user && likes.includes(user.studentId);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => toggleLike(post.id)} style={[s.likeBtn, liked && s.likeBtnOn]}>
      <Feather name="heart" size={14} color={liked ? INK : c.muted} />
      <Text style={[s.likeTxt, liked && s.likeTxtOn]}>{withLabel ? ` ถูกใจ ${likes.length}` : ` ${likes.length}`}</Text>
    </TouchableOpacity>
  );
}

export function CommentItem({ item, postId, canAccept }) {
  const { s, nameOf, user, isAdmin, acceptAnswer, removeComment, report } = useApp();
  const pending = String(item.id).startsWith('tmp');
  const mine = user && item.authorId === user.studentId;
  const del = () => notify('ลบความคิดเห็นนี้?', item.text.slice(0, 80), [
    { text: 'ยกเลิก', style: 'cancel' }, { text: 'ลบ', style: 'destructive', onPress: () => removeComment(item.id) },
  ]);
  return (
    <View style={[s.commentItem, item.accepted && { backgroundColor: PASTEL.mint.tile, borderRadius: 14, paddingHorizontal: 8 }]}>
      <Avatar sid={item.authorId} name={item.author} size={32} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={s.commentAuthor}>
          {nameOf(item.authorId, item.author)}  <Text style={s.commentTime}>{pending ? 'กำลังส่ง...' : relTime(item.createdAt)}</Text>
        </Text>
        {item.accepted ? <Text style={[s.meta, { marginBottom: 2 }]}>✅ คำตอบที่ดีที่สุด</Text> : null}
        <Text style={s.commentText}>{item.text}</Text>
        {!pending ? (
          <View style={[s.row, { marginTop: 4 }]}>
            {canAccept && !mine ? (
              <Text style={[s.linkTxt, { marginRight: 14 }]} onPress={() => acceptAnswer(item.id, !item.accepted)}>
                {item.accepted ? 'ยกเลิกคำตอบที่ดีที่สุด' : 'เลือกเป็นคำตอบที่ดีที่สุด'}
              </Text>
            ) : null}
            {mine || isAdmin ? <Text style={[s.linkTxt, { marginRight: 14 }]} onPress={del}>ลบ</Text> : null}
            {!mine ? <Text style={s.linkTxt} onPress={() => report(postId, item.id)}>รายงาน</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function CommentBox({ title, items, emptyText, placeholder, onSubmit, postId, canAccept }) {
  const { s, c } = useApp();
  const [txt, setTxt] = useState('');
  const send = () => {
    const t = txt.trim();
    if (!t) return;
    onSubmit(t);
    setTxt('');
  };
  return (
    <Card style={{ padding: 18 }}>
      <Text style={s.h3}>{title} ({items.length})</Text>
      <View style={{ marginTop: 4 }}>
        {items.length ? items.map((it) => <CommentItem key={it.id} item={it} postId={postId} canAccept={canAccept} />) : <Text style={[s.smallMuted, { marginTop: 8 }]}>{emptyText}</Text>}
      </View>
      <View style={s.commentForm}>
        <TextInput
          value={txt}
          onChangeText={setTxt}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          multiline
          style={[s.input, { flex: 1, minHeight: 46, maxHeight: 120 }]}
        />
        <TouchableOpacity onPress={send} activeOpacity={0.85} style={s.sendBtn}>
          <Feather name="send" size={18} color={c.onInk} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

/* ============================ composite cards ============================ */
/** การ์ดรายวิชาโทนพาสเทล (ตามรูปที่ 1) */
export function CourseTile({ course, mode = 'summary', wide }) {
  const { s, data, push } = useApp();
  const types = typesForMode(mode);
  const posts = data.posts.filter((p) => p.courseId === course.id && types.includes(p.type));
  const authors = [...new Set(posts.map((p) => p.authorId))];
  const likes = posts.reduce((n, p) => n + (p.likes || []).length, 0);
  const color = courseColor(course);
  return (
    <Pressable
      onPress={() => push('contributors', { courseId: course.id, mode })}
      style={({ pressed }) => [s.tile, { backgroundColor: PASTEL[color].tile }, wide ? s.tileWide : s.tileHalf, pressed && s.pressed]}
    >
      <View style={s.rowBetween}>
        <View style={s.row}>
          <View style={s.tileIcon}><Feather name={COURSE_ICON[course.code] || 'book-open'} size={15} color={INK} /></View>
          <Text style={s.tileTerm}>{course.code}</Text>
        </View>
        <Pill icon="heart" label={String(likes)} />
      </View>
      <Text style={s.tileTitle} numberOfLines={3}>{course.name}</Text>
      <View style={[s.rowBetween, { marginTop: 'auto' }]}>
        <Text style={s.tileMeta} numberOfLines={1}>{posts.length} {mode === 'project' ? 'โปรเจ็กต์' : 'สรุป'} · {course.track || termShort(course.semester)}</Text>
        {authors.length ? <AvatarStack ids={authors} size={22} /> : null}
      </View>
    </Pressable>
  );
}

export function CourseGrid({ courses, mode }) {
  const { s } = useApp();
  return (
    <View style={s.grid}>
      {courses.map((c) => <CourseTile key={c.id} course={c} mode={mode} />)}
    </View>
  );
}

export function QaItem({ t }) {
  const { s, push, nameOf } = useApp();
  return (
    <Card style={s.qaItem} onPress={() => push('qaThread', { threadId: t.id })}>
      <Avatar sid={t.authorId} name={t.authorName} size={38} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.qaTitle}>{t.title}</Text>
        <View style={[s.metaRow, { marginTop: 6 }]}>
          {t.courseCode ? <Pill label={t.courseCode} color="yellow" style={{ marginRight: 8 }} /> : null}
          <Text style={s.meta}>{nameOf(t.authorId, t.authorName)}</Text>
          <Text style={s.meta}>💬 {(t.replies || []).length}{(t.replies || []).some((r) => r.accepted) ? ' · ✅ ตอบแล้ว' : ''}</Text>
          <Text style={s.meta}>{relTime(t.createdAt)}</Text>
        </View>
      </View>
    </Card>
  );
}

export function AttachSummary({ items }) {
  const { s } = useApp();
  if (!items || !items.length) return null;
  const imgs = items.filter((a) => fileKind(a.name, a.mime).key === 'image');
  const docs = items.length - imgs.length;
  return (
    <View style={[s.row, { marginTop: 8 }]}>
      {imgs.slice(0, 3).map((a) => <Image key={a.id} source={{ uri: a.thumb }} style={s.miniThumb} />)}
      {imgs.length > 3 ? <View style={[s.miniThumb, s.miniMore]}><Text style={s.miniMoreTxt}>+{imgs.length - 3}</Text></View> : null}
      {docs ? <Pill icon="paperclip" label={`${docs} ไฟล์`} color="pink" style={{ marginLeft: imgs.length ? 6 : 0 }} /> : null}
    </View>
  );
}

export function PostCard({ p }) {
  const { s, push } = useApp();
  return (
    <Card style={s.postCard} onPress={() => push('post', { postId: p.id })}>
      <View style={s.rowBetween}>
        <TypeTag type={p.type} />
        <Text style={s.meta}>{relTime(p.createdAt)}</Text>
      </View>
      <Text style={s.postTitle}>{p.title}</Text>
      {p.content ? <Text style={s.snippet} numberOfLines={2}>{p.content}</Text> : null}
      <AttachSummary items={p.attachments} />
      <View style={[s.rowBetween, { marginTop: 6 }]}>
        <LikeBtn post={p} />
        <Text style={s.meta}>💬 {(p.comments || []).length} · เทอม {p.semester || '-'}</Text>
      </View>
    </Card>
  );
}

/** ปุ่มลบ (เจ้าของ/แอดมิน) + รายงาน (คนอื่น) ใต้เนื้อหา */
export function ContentActions({ item, onDeleted }) {
  const { s, user, isAdmin, deletePost, report } = useApp();
  const mine = user && item.authorId === user.studentId;
  const del = () => notify('ลบโพสต์นี้?', 'ไฟล์แนบ ความคิดเห็น และไลก์จะถูกลบด้วย กู้คืนไม่ได้', [
    { text: 'ยกเลิก', style: 'cancel' },
    { text: 'ลบ', style: 'destructive', onPress: async () => { if (await deletePost(item)) onDeleted(); } },
  ]);
  return (
    <View style={[s.row, { justifyContent: 'flex-end', marginTop: -4, marginBottom: 12 }]}>
      {mine || isAdmin ? <Text style={[s.linkTxt, { marginLeft: 16 }]} onPress={del}>ลบ{mine ? 'โพสต์ของฉัน' : ''}</Text> : null}
      {!mine ? <Text style={[s.linkTxt, { marginLeft: 16 }]} onPress={() => report(item.id, null)}>รายงานเนื้อหาไม่เหมาะสม</Text> : null}
    </View>
  );
}

/** ส่วนเลือกไฟล์แนบในฟอร์มอัปโหลด */
export function AttachPicker({ items, setItems, busy }) {
  const { s, c } = useApp();
  const left = MAX_ATTACH - items.length;
  const tooBig = (bytes) => bytes > MAX_FILE_MB * 1024 * 1024;
  const add = (list) => setItems((prev) => [...prev, ...list].slice(0, MAX_ATTACH));

  const pickImages = async () => {
    if (left <= 0) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { notify('ต้องการสิทธิ์เข้าถึงรูปภาพ', 'อนุญาตการเข้าถึงคลังรูปเพื่อแนบรูป'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: left, quality: 1 });
      if (res.canceled || !res.assets) return;
      const out = [];
      for (const a of res.assets.slice(0, left)) {
        const img = await prepareImage(a.uri, a.width);
        const bytes = b64Bytes(img.b64);
        if (tooBig(bytes)) { notify('รูปใหญ่เกินไป', `รูปต้องไม่เกิน ${MAX_FILE_MB} MB หลังย่อขนาด`); continue; }
        out.push({ id: uid(), name: a.fileName || `image_${out.length + 1}.jpg`, mime: 'image/jpeg', size: bytes, b64: img.b64, thumb: img.thumb });
      }
      add(out);
    } catch (e) { notify('แนบรูปไม่สำเร็จ', 'ลองเลือกรูปอีกครั้ง'); }
  };

  const pickFiles = async () => {
    if (left <= 0) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, multiple: true, copyToCacheDirectory: true });
      if (res.canceled || !res.assets) return;
      const out = [];
      for (const a of res.assets.slice(0, left)) {
        const kind = fileKind(a.name, a.mimeType);
        if (kind.key === 'image') {
          const img = await prepareImage(a.uri, 0);
          out.push({ id: uid(), name: a.name, mime: 'image/jpeg', size: b64Bytes(img.b64), b64: img.b64, thumb: img.thumb });
          continue;
        }
        if (a.size && tooBig(a.size)) { notify('ไฟล์ใหญ่เกินไป', `"${a.name}" ใหญ่ ${fmtSize(a.size)} — จำกัดไม่เกิน ${MAX_FILE_MB} MB ต่อไฟล์`); continue; }
        const b64 = await readAsBase64(a);
        const bytes = b64Bytes(b64);
        if (tooBig(bytes)) { notify('ไฟล์ใหญ่เกินไป', `"${a.name}" ใหญ่ ${fmtSize(bytes)} — จำกัดไม่เกิน ${MAX_FILE_MB} MB ต่อไฟล์`); continue; }
        out.push({ id: uid(), name: a.name, mime: a.mimeType || 'application/octet-stream', size: bytes, b64 });
      }
      add(out);
    } catch (e) { notify('แนบไฟล์ไม่สำเร็จ', 'ลองเลือกไฟล์อีกครั้ง'); }
  };

  return (
    <View style={s.field}>
      <View style={s.rowBetween}>
        <Text style={s.label}>ไฟล์แนบ (ไม่บังคับ)</Text>
        <Text style={s.hint}>{items.length}/{MAX_ATTACH} · ไม่เกิน {MAX_FILE_MB} MB/ไฟล์</Text>
      </View>
      <View style={s.row}>
        <TouchableOpacity disabled={busy || left <= 0} activeOpacity={0.85} onPress={pickImages} style={[s.attachBtn, { backgroundColor: PASTEL.mint.tile }, left <= 0 && { opacity: 0.4 }]}>
          <Feather name="image" size={18} color={INK} />
          <Text style={s.attachBtnTxt}>รูปภาพ</Text>
        </TouchableOpacity>
        <View style={{ width: 8 }} />
        <TouchableOpacity disabled={busy || left <= 0} activeOpacity={0.85} onPress={pickFiles} style={[s.attachBtn, { backgroundColor: PASTEL.pink.tile }, left <= 0 && { opacity: 0.4 }]}>
          <Feather name="file-text" size={18} color={INK} />
          <Text style={s.attachBtnTxt}>PDF / เอกสาร</Text>
        </TouchableOpacity>
      </View>
      {items.length ? (
        <View style={{ marginTop: 10 }}>
          {items.map((it) => {
            const k = fileKind(it.name, it.mime);
            return (
              <View key={it.id} style={s.pendRow}>
                {it.thumb ? <Image source={{ uri: it.thumb }} style={s.pendThumb} /> : (
                  <View style={[s.pendThumb, { backgroundColor: PASTEL[k.color].tile, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={s.fileExt}>{k.label === 'ไฟล์' ? '📎' : k.label.slice(0, 3).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.nextTitle} numberOfLines={1}>{it.name}</Text>
                  <Text style={s.meta}>{k.label} · {fmtSize(it.size)}</Text>
                </View>
                {!busy ? (
                  <TouchableOpacity onPress={() => setItems((prev) => prev.filter((x) => x.id !== it.id))} style={{ padding: 6 }}>
                    <Feather name="x" size={18} color={c.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[s.hint, { marginTop: 8 }]}>แนบรูปสรุป สไลด์ หรือไฟล์ PDF ให้รุ่นน้องดาวน์โหลดได้</Text>
      )}
    </View>
  );
}

/** แสดงไฟล์แนบในหน้าโพสต์: รูปเป็นแกลเลอรี + เอกสารเป็นการ์ด */
export function AttachmentList({ items, flush }) {
  const { s, openModal } = useApp();
  const [opening, setOpening] = useState(null);
  if (!items || !items.length) return null;
  const images = items.filter((a) => fileKind(a.name, a.mime).key === 'image');
  const docs = items.filter((a) => fileKind(a.name, a.mime).key !== 'image');
  const open = async (att) => {
    setOpening(att.id);
    try { await api.openAttachment(att); }
    catch (e) { notify('เปิดไฟล์ไม่สำเร็จ', 'โหลดไฟล์ไม่ได้ ลองใหม่อีกครั้ง'); }
    finally { setOpening(null); }
  };
  return (
    <View style={{ marginTop: flush ? 0 : 16 }}>
      {images.length ? (
        <View style={s.gallery}>
          {images.map((a, i) => (
            <TouchableOpacity key={a.id} activeOpacity={0.9} onPress={() => openModal({ type: 'imageViewer', images, index: i })}
              style={[s.galleryItem, images.length === 1 && s.galleryOne]}>
              <Image source={{ uri: a.thumb }} style={s.galleryImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {docs.map((a) => {
        const k = fileKind(a.name, a.mime);
        return (
          <TouchableOpacity key={a.id} activeOpacity={0.85} onPress={() => open(a)} style={s.docCard}>
            <View style={[s.docIcon, { backgroundColor: PASTEL[k.color].tile }]}>
              <Text style={s.fileExt}>{k.label === 'ไฟล์' ? '📎' : k.label.slice(0, 3).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.nextTitle} numberOfLines={1}>{a.name}</Text>
              <Text style={s.meta}>{k.label} · {fmtSize(a.size)}</Text>
            </View>
            <View style={s.docOpen}>
              {opening === a.id ? <ActivityIndicator size="small" color="#fff" /> : <Feather name={Platform.OS === 'web' ? 'external-link' : 'download'} size={15} color="#fff" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
