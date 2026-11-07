/* กระทู้ถาม-ตอบ */
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { PASTEL } from '../theme';
import { byNewest, byOldest, relTime } from '../utils';
import { useApp } from '../context';
import { Avatar, Breadcrumb, Btn, Card, Chip, Empty, Pill } from '../components/ui';
import { CommentBox, ContentActions, QaItem } from '../components/content';

export function QaScreen() {
  const { s, data, openModal } = useApp();
  const [course, setCourse] = useState('all');
  const list = [...data.threads].sort(byNewest).filter((t) => course === 'all' || t.courseId === course);
  const used = [...new Set(data.threads.map((t) => t.courseId).filter(Boolean))];
  const codeOf = (id) => (data.courses.find((c) => c.id === id) || {}).code || id;
  return (
    <View>
      <Breadcrumb items={[{ label: 'หน้าแรก', go: 'home' }, { label: 'กระทู้ถาม-ตอบ' }]} />
      <Text style={s.display2}>ถามรุ่นพี่{'\n'}ได้ทุกเรื่อง</Text>
      <Btn title="ตั้งกระทู้ใหม่" arrow style={{ alignSelf: 'flex-start', marginTop: 14 }} onPress={() => openModal({ type: 'newThread' })} />
      {used.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <Chip label="ทั้งหมด" selected={course === 'all'} onPress={() => setCourse('all')} />
          {used.map((id) => <Chip key={id} label={codeOf(id)} selected={course === id} onPress={() => setCourse(id)} />)}
        </ScrollView>
      ) : null}
      <View style={{ height: 12 }} />
      {list.length ? list.map((t) => <QaItem key={t.id} t={t} />) : <Empty text="ยังไม่มีกระทู้ — ตั้งคำถามแรกได้เลย" />}
    </View>
  );
}

export function QaThreadScreen({ threadId }) {
  const { s, data, addReply, push, back, nameOf, user } = useApp();
  const t = data.threads.find((x) => x.id === threadId);
  if (!t) return <Empty text="ไม่พบกระทู้นี้" />;
  // คำตอบที่ดีที่สุดขึ้นก่อน แล้วเรียงตามเวลา
  const replies = [...(t.replies || [])].sort((a, b) => (b.accepted ? 1 : 0) - (a.accepted ? 1 : 0) || byOldest(a, b));
  return (
    <View>
      <Breadcrumb items={[{ label: 'หน้าแรก', go: 'home' }, { label: 'ถาม-ตอบ', go: 'qa' }, { label: t.title }]} />
      <View style={[s.hero, { backgroundColor: PASTEL.blue.tile }]}>
        <View style={[s.blob, { backgroundColor: PASTEL.blue.dot, right: -40, top: -50 }]} />
        <View style={s.rowBetween}>
          {t.courseCode ? <Pill label={t.courseCode} /> : <View />}
          <Text style={s.heroMeta}>{relTime(t.createdAt)}</Text>
        </View>
        <Text style={s.heroTitle}>{t.title}</Text>
      </View>
      <Card style={s.authorRow} onPress={() => push('profile', { sid: t.authorId })}>
        <Avatar sid={t.authorId} name={t.authorName} size={40} showEmoji />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.personName}>{nameOf(t.authorId, t.authorName)}</Text>
          <Text style={s.meta}>ผู้ตั้งกระทู้</Text>
        </View>
      </Card>
      <Card style={{ padding: 20 }}>
        <Text style={s.detailContent}>{t.body}</Text>
      </Card>
      <ContentActions item={t} onDeleted={back} />
      <CommentBox
        title="คำตอบ"
        items={replies}
        postId={t.id}
        canAccept={!!user && t.authorId === user.studentId}
        emptyText="ยังไม่มีคำตอบ เป็นคนแรกที่ช่วยตอบสิ!"
        placeholder="เขียนคำตอบของคุณ..."
        onSubmit={(txt) => addReply(t.id, txt)}
      />
    </View>
  );
}
