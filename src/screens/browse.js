/* ค้นหาวิชา → รุ่นพี่ที่แชร์ → โพสต์ของรุ่นพี่ */
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { INK, PASTEL } from '../theme';
import { COURSE_ICON, TERMS, TERM_INFO } from '../constants';
import { byCode, byNewest, courseColor, isRealTerm, termLabel, typesForMode } from '../utils';
import { useApp } from '../context';
import { Avatar, Breadcrumb, Btn, Card, Chip, Empty, Pill, SectionHead } from '../components/ui';
import { CourseGrid, PostCard } from '../components/content';
import { ProfileCard } from '../components/profile';

export function BrowseScreen({ mode }) {
  const { s, data, openModal, isAdmin } = useApp();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('all');
  const isProj = mode === 'project';
  const f = q.trim().toLowerCase();
  const list = [...data.courses]
    .sort(byCode)
    .filter((c) => term === 'all' || c.semester === term)
    .filter((c) => !f || (c.code || '').toLowerCase().includes(f) || (c.name || '').toLowerCase().includes(f));
  const extraTerms = [...new Set(data.courses.map((c) => c.semester).filter((t) => t && !TERMS.includes(t)))];
  const allTerms = [...TERMS, ...extraTerms].filter((t) => data.courses.some((c) => c.semester === t));
  const groups = allTerms.map((t) => ({ t, items: list.filter((c) => c.semester === t) })).filter((g) => g.items.length);
  const noTerm = list.filter((c) => !c.semester);
  return (
    <View>
      <Breadcrumb items={[{ label: 'หน้าแรก', go: 'home' }, { label: isProj ? 'Projects ของรุ่นพี่' : 'ค้นหาสรุปแนวข้อสอบ' }]} />
      <Text style={s.display2}>{isProj ? 'โปรเจ็กต์\nของรุ่นพี่' : 'ค้นหาสรุป\nแนวข้อสอบ'}</Text>
      <View style={[s.searchBox, { marginTop: 16 }]}>
        <Feather name="search" size={17} color="#9A9288" />
        <TextInput value={q} onChangeText={setQ} placeholder="รหัสหรือชื่อวิชา เช่น DX212, UX/UI" placeholderTextColor="#9A9288" style={s.searchInput} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <Chip label="ทุกชั้นปี" selected={term === 'all'} onPress={() => setTerm('all')} />
        {allTerms.map((t) => <Chip key={t} label={termLabel(t)} selected={term === t} onPress={() => setTerm(t)} />)}
      </ScrollView>
      <SectionHead
        title={`${list.length} รายวิชา`}
        style={{ marginTop: 12 }}
        right={isAdmin ? <Btn title="เพิ่มวิชา" icon="plus" variant="outline" small onPress={() => openModal({ type: 'newCourse' })} /> : null}
      />
      {!list.length ? <Empty text="ไม่พบรายวิชา — ลองเพิ่มรายวิชาใหม่ดูสิ" /> : null}
      {groups.map((g) => (
        <View key={g.t} style={{ marginBottom: 6 }}>
          <View style={s.termHead}>
            <Text style={s.termHeadTitle}>{termLabel(g.t)}</Text>
            {TERM_INFO[g.t] ? <Text style={s.termHeadSub}>{TERM_INFO[g.t].theme}{isRealTerm(g.t) ? ' · ' + g.t : ''}</Text> : null}
          </View>
          <CourseGrid courses={g.items} mode={mode} />
        </View>
      ))}
      {noTerm.length ? <CourseGrid courses={noTerm} mode={mode} /> : null}
    </View>
  );
}

export function ContributorsScreen({ courseId, mode }) {
  const { s, data, push, jump, openModal, nameOf, isAdmin } = useApp();
  const [sort, setSort] = useState('recent');
  const isProj = mode === 'project';
  const course = data.courses.find((c) => c.id === courseId);
  const posts = data.posts.filter((p) => p.courseId === courseId && typesForMode(mode).includes(p.type));

  const people = useMemo(() => {
    const by = {};
    posts.forEach((p) => {
      if (!by[p.authorId]) by[p.authorId] = { authorId: p.authorId, name: p.authorName, count: 0, likes: 0, latest: p.createdAt };
      const g = by[p.authorId];
      g.count += 1;
      g.likes += (p.likes || []).length;
      if (new Date(p.createdAt) > new Date(g.latest)) g.latest = p.createdAt;
    });
    const arr = Object.values(by);
    arr.sort((a, b) => (sort === 'popular' ? b.likes - a.likes : new Date(b.latest) - new Date(a.latest)));
    return arr;
  }, [posts, sort]);

  if (!course) return <Empty text="ไม่พบรายวิชา" />;
  const color = courseColor(course);
  return (
    <View>
      <Breadcrumb items={[
        { label: 'หน้าแรก', go: 'home' },
        { label: isProj ? 'Projects' : 'ค้นหาสรุป', go: 'browse', params: { mode } },
        { label: course.code },
      ]} />
      <View style={[s.hero, { backgroundColor: PASTEL[color].tile }]}>
        <View style={[s.blob, { backgroundColor: PASTEL[color].dot, right: -40, top: -50 }]} />
        <View style={s.rowBetween}>
          <View style={s.row}>
            <View style={s.tileIcon}><Feather name={COURSE_ICON[course.code] || 'book-open'} size={16} color={INK} /></View>
            <Text style={s.tileTerm}>{course.code} · {course.credits || 3} หน่วยกิต</Text>
          </View>
          <Pill label={termLabel(course.semester)} />
        </View>
        <Text style={s.heroTitle}>{course.name}</Text>
        <TouchableOpacity disabled={!isAdmin} onPress={() => openModal({ type: 'pickInstructor', courseId })} activeOpacity={0.8} style={[s.row, { marginTop: 10 }]}>
          <Feather name="user" size={13} color={INK} />
          <Text style={s.heroMeta}> {course.instructor || (isAdmin ? 'ยังไม่ระบุอาจารย์ผู้สอน — แตะเพื่อเลือก' : 'ยังไม่ระบุอาจารย์ผู้สอน')}</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.row, { marginTop: 14, marginBottom: 6 }]}>
        <Chip label="สรุป & ปัญหา" icon="file-text" selected={!isProj} onPress={() => jump('contributors', { courseId, mode: 'summary' })} />
        <Chip label="Projects" icon="folder" selected={isProj} onPress={() => jump('contributors', { courseId, mode: 'project' })} />
      </View>

      <SectionHead
        title={`รุ่นพี่ที่แชร์ (${people.length})`}
        style={{ marginTop: 6 }}
        right={<Btn title="อัปโหลด" icon="upload" small onPress={() => openModal({ type: 'upload', defaultType: isProj ? 'project' : 'summary', courseId })} />}
      />
      {!posts.length ? (
        <Empty text={'ยังไม่มีใครแชร์' + (isProj ? 'โปรเจ็กต์' : 'สรุป') + 'วิชานี้ — เป็นรุ่นพี่คนแรกเลย!'} />
      ) : (
        <>
          <View style={[s.row, { marginBottom: 10 }]}>
            <Chip label="ล่าสุด" selected={sort === 'recent'} onPress={() => setSort('recent')} />
            <Chip label="ยอดนิยม" selected={sort === 'popular'} onPress={() => setSort('popular')} />
          </View>
          {people.map((p) => {
            const u = data.users.find((x) => x.studentId === p.authorId);
            return (
              <Card key={p.authorId} style={s.personCard} onPress={() => push('person', { courseId, mode, personId: p.authorId })}>
                <Avatar sid={p.authorId} name={p.name} size={52} showEmoji />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={s.personName}>{nameOf(p.authorId, p.name)}</Text>
                  <Text style={s.meta} numberOfLines={1}>{u && u.bio ? u.bio : 'รหัส ' + p.authorId}</Text>
                  <View style={[s.row, { marginTop: 6 }]}>
                    <Pill label={`${p.count} รายการ`} color={isProj ? 'pink' : 'yellow'} style={{ marginRight: 6 }} />
                    <Pill icon="heart" label={String(p.likes)} color="lilac" />
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#B5ADA2" />
              </Card>
            );
          })}
        </>
      )}
    </View>
  );
}

export function PersonScreen({ courseId, mode, personId }) {
  const { s, data, push } = useApp();
  const course = data.courses.find((c) => c.id === courseId);
  const posts = data.posts.filter((p) => p.courseId === courseId && p.authorId === personId && typesForMode(mode).includes(p.type)).sort(byNewest);
  const u = data.users.find((x) => x.studentId === personId);
  const profile = u || { studentId: personId, name: posts[0] ? posts[0].authorName : 'ผู้ใช้' };
  return (
    <View>
      <Breadcrumb items={[
        { label: 'หน้าแรก', go: 'home' },
        { label: course ? course.code : 'รายวิชา', go: 'contributors', params: { courseId, mode } },
        { label: profile.name },
      ]} />
      <ProfileCard profile={profile} action={<Btn title="ดูโปรไฟล์" small variant="outline" onPress={() => push('profile', { sid: personId })} />} />
      <SectionHead title={`ใน ${course ? course.code : ''} (${posts.length})`} style={{ marginTop: 6 }} />
      {posts.length ? posts.map((p) => <PostCard key={p.id} p={p} />) : <Empty text="ไม่พบรายการ" />}
    </View>
  );
}
