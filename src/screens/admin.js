/* แผงควบคุมแอดมิน */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { INK, PASTEL, PASTEL_KEYS } from '../theme';
import { byNewest, fmtThaiDate, kindOf, relTime } from '../utils';
import { notify, useApp } from '../context';
import { Btn, Card, Chip, Empty, Field, IconCircle, SectionHead } from '../components/ui';

/* ============================ แอดมิน ============================ */
export function AdminScreen() {
  const { s, c, rawData, openModal, deleteEvent, saveAnnouncement, setHidden, lockAdmin, loadReports, resolveReport, push, nameOf } = useApp();
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState(null);
  const reloadReports = useCallback(() => { loadReports().then(setReports).catch(() => setReports([])); }, []);
  useEffect(() => { reloadReports(); }, [reloadReports, rawData]);
  const findItem = (postId) => rawData.posts.find((p) => p.id === postId) || rawData.threads.find((t) => t.id === postId);
  const [text, setText] = useState((rawData.config && rawData.config.home && rawData.config.home.text) || '');
  const [color, setColor] = useState((rawData.config && rawData.config.home && rawData.config.home.color) || 'yellow');
  const events = [...(rawData.events || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const codeOf = (id) => (rawData.courses.find((x) => x.id === id) || {}).code;
  const comments = rawData.posts.reduce((n, p) => n + (p.comments || []).length, 0) + rawData.threads.reduce((n, t) => n + (t.replies || []).length, 0);
  const tabs = [['reports', `รายงาน${reports && reports.length ? ' (' + reports.length + ')' : ''}`, 'flag'], ['exams', 'ตารางสอบ', 'calendar'], ['announce', 'ประกาศ', 'volume-2'], ['content', 'จัดการเนื้อหา', 'eye-off'], ['stats', 'ภาพรวม', 'bar-chart-2']];
  return (
    <View>
      <View style={s.rowBetween}>
        <View>
          <Text style={s.miniHead}>ADMIN</Text>
          <Text style={s.display2}>แผงควบคุม</Text>
        </View>
        <Btn title="กลับหน้าแรก" icon="home" small variant="outline" onPress={lockAdmin} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {tabs.map(([k, l, i]) => <Chip key={k} label={l} icon={i} selected={tab === k} onPress={() => setTab(k)} />)}
      </ScrollView>

      {tab === 'reports' ? (
        <View style={{ marginTop: 8 }}>
          <SectionHead title="รายงานที่รอตรวจ" />
          {reports === null ? <ActivityIndicator color={c.ink} /> : reports.length ? reports.map((r) => {
            const item = findItem(r.postId);
            const isThread = item && item.body !== undefined;
            const comment = item && r.commentId ? (item.comments || item.replies || []).find((x) => x.id === r.commentId) : null;
            return (
              <Card key={r.id} style={[s.adminRow, { alignItems: 'flex-start' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.nextTitle} numberOfLines={2}>🚩 {r.reason}</Text>
                  <Text style={s.meta} numberOfLines={2}>
                    {comment ? 'คอมเมนต์: "' + comment.text.slice(0, 60) + '"' : item ? (isThread ? 'กระทู้: ' : 'โพสต์: ') + item.title : 'เนื้อหาถูกลบแล้ว'}
                  </Text>
                  <Text style={s.meta}>โดย {nameOf(r.reporterId)} · {relTime(r.createdAt)}{item && item.hidden ? ' · ซ่อนอยู่' : ''}</Text>
                  <View style={[s.row, { marginTop: 8, flexWrap: 'wrap' }]}>
                    {item ? <Btn title="เปิดดู" small variant="outline" style={{ marginRight: 6 }} onPress={() => push(isThread ? 'qaThread' : 'post', isThread ? { threadId: item.id } : { postId: item.id })} /> : null}
                    {item && !item.hidden ? <Btn title="ซ่อนโพสต์" icon="eye-off" small variant="outline" style={{ marginRight: 6 }} onPress={() => setHidden(isThread ? 'threads' : 'posts', item.id, true)} /> : null}
                    <Btn title="ปิดเรื่อง" icon="check" small onPress={async () => { await resolveReport(r.id); reloadReports(); }} />
                  </View>
                </View>
              </Card>
            );
          }) : <Empty text="ไม่มีรายงานค้าง 🎉" />}
        </View>
      ) : null}

      {tab === 'exams' ? (
        <View style={{ marginTop: 8 }}>
          <SectionHead title={`ตารางสอบ (${events.length})`} right={<Btn title="เพิ่มวันสอบ" icon="plus" small onPress={() => openModal({ type: 'eventForm', scope: 'shared' })} />} />
          <Text style={[s.smallMuted, { marginBottom: 10 }]}>ทุกคนจะเห็นการนับถอยหลังในหน้าแรก</Text>
          {events.length ? events.map((e) => {
            const k = kindOf(e.kind);
            const past = new Date(e.date).getTime() < Date.now();
            return (
              <Card key={e.id} style={[s.adminRow, past && { opacity: 0.5 }]}>
                <View style={[s.nextDot, { backgroundColor: PASTEL[k.color].dot }]}><Text>{k.emoji}</Text></View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.nextTitle}>{codeOf(e.courseId) ? codeOf(e.courseId) + ' · ' : ''}{e.title}</Text>
                  <Text style={s.meta}>{fmtThaiDate(e.date)}{e.place ? ' · ' + e.place : ''}{past ? ' · ผ่านไปแล้ว' : ''}</Text>
                </View>
                <IconCircle name="edit-2" size={32} bg={c.surface2} color={c.text} onPress={() => openModal({ type: 'eventForm', scope: 'shared', event: e })} />
                <IconCircle name="trash-2" size={32} bg={c.surface2} color={c.danger} style={{ marginLeft: 6 }}
                  onPress={() => notify('ลบวันสอบนี้?', e.title, [{ text: 'ยกเลิก', style: 'cancel' }, { text: 'ลบ', style: 'destructive', onPress: () => deleteEvent(e.id) }])} />
              </Card>
            );
          }) : <Empty text="ยังไม่มีตารางสอบ — กด เพิ่มวันสอบ ได้เลย" />}
        </View>
      ) : null}

      {tab === 'announce' ? (
        <View style={{ marginTop: 8 }}>
          <SectionHead title="ประกาศบนหน้าแรก" />
          <Field value={text} onChangeText={setText} multiline maxLength={200} placeholder="เช่น สัปดาห์หน้าสอบกลางภาค อ่านสรุปของรุ่นพี่ได้ในแท็บสรุป 📚" hint={`${text.length}/200`} />
          <View style={[s.wrapRow, { marginBottom: 12 }]}>
            {PASTEL_KEYS.map((k) => (
              <TouchableOpacity key={k} onPress={() => setColor(k)} style={[s.swatch, { backgroundColor: PASTEL[k].dot }, color === k && s.swatchOn]}>
                {color === k ? <Feather name="check" size={16} color={INK} /> : null}
              </TouchableOpacity>
            ))}
          </View>
          <Btn title="บันทึกประกาศ" arrow block onPress={() => saveAnnouncement(text.trim(), color)} />
          <Btn title="ลบประกาศ" variant="outline" block style={{ marginTop: 10 }} onPress={() => { setText(''); saveAnnouncement('', color); }} />
        </View>
      ) : null}

      {tab === 'content' ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[s.smallMuted, { marginBottom: 10 }]}>ซ่อนโพสต์หรือกระทู้ที่ไม่เหมาะสม — ผู้ใช้ทั่วไปจะไม่เห็น แต่กู้คืนได้</Text>
          <SectionHead title={`โพสต์ (${rawData.posts.length})`} />
          {[...rawData.posts].sort(byNewest).map((p) => (
            <Card key={p.id} style={[s.adminRow, p.hidden && { opacity: 0.55 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.nextTitle} numberOfLines={1}>{p.title}</Text>
                <Text style={s.meta} numberOfLines={1}>{codeOf(p.courseId) || '-'} · {p.authorName} · {relTime(p.createdAt)}{p.hidden ? ' · ซ่อนอยู่' : ''}</Text>
              </View>
              <Btn title={p.hidden ? 'แสดง' : 'ซ่อน'} icon={p.hidden ? 'eye' : 'eye-off'} small variant="outline" onPress={() => setHidden('posts', p.id, !p.hidden)} />
            </Card>
          ))}
          <SectionHead title={`กระทู้ (${rawData.threads.length})`} style={{ marginTop: 10 }} />
          {[...rawData.threads].sort(byNewest).map((t) => (
            <Card key={t.id} style={[s.adminRow, t.hidden && { opacity: 0.55 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.nextTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={s.meta} numberOfLines={1}>{t.authorName} · {relTime(t.createdAt)}{t.hidden ? ' · ซ่อนอยู่' : ''}</Text>
              </View>
              <Btn title={t.hidden ? 'แสดง' : 'ซ่อน'} icon={t.hidden ? 'eye' : 'eye-off'} small variant="outline" onPress={() => setHidden('threads', t.id, !t.hidden)} />
            </Card>
          ))}
        </View>
      ) : null}

      {tab === 'stats' ? (
        <View style={[s.grid, { marginTop: 12 }]}>
          {[
            ['ผู้ใช้', rawData.users.length, 'users', 'yellow'], ['โพสต์', rawData.posts.length, 'file-text', 'pink'],
            ['กระทู้', rawData.threads.length, 'message-circle', 'blue'], ['คอมเมนต์/คำตอบ', comments, 'message-square', 'mint'],
            ['รายวิชา', rawData.courses.length, 'book-open', 'lilac'], ['วันสอบ', events.length, 'calendar', 'peach'],
          ].map(([l, v, i, col]) => (
            <View key={l} style={[s.statTile, { backgroundColor: PASTEL[col].tile }]}>
              <View style={s.tileIcon}><Feather name={i} size={15} color={INK} /></View>
              <Text style={s.statTileNum}>{v}</Text>
              <Text style={s.statTileLabel}>{l}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
