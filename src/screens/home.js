/* หน้าแรก */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { INK, PASTEL } from '../theme';
import { TERMS } from '../constants';
import { byCode, byNewest, termLabel } from '../utils';
import { useApp } from '../context';
import { Card, Chip, Empty, SectionHead, SeeAll } from '../components/ui';
import { CourseGrid, QaItem } from '../components/content';
import { AnnouncementBanner, ExamCountdown, HeroCheer, MyCourses, WeatherCard } from '../components/home';

/* ============================ main screens ============================ */
export function HomeScreen() {
  const { s, c, me, data, reset, push } = useApp();
  const [term, setTerm] = useState('all');
  const courses = useMemo(() => {
    const score = (course) => {
      const ps = data.posts.filter((p) => p.courseId === course.id);
      return ps.length * 3 + ps.reduce((n, p) => n + (p.likes || []).length, 0);
    };
    return data.courses
      .filter((x) => term === 'all' || x.semester === term)
      .sort((a, b) => score(b) - score(a) || byCode(a, b))
      .slice(0, 6);
  }, [data, term]);
  const threads = [...data.threads].sort(byNewest).slice(0, 4);
  const quick = [
    { icon: 'search', color: 'yellow', title: 'ค้นหาสรุป', sub: 'แนวข้อสอบตามวิชา', go: () => reset('browse', { mode: 'summary' }) },
    { icon: 'message-circle', color: 'blue', title: 'ถาม-ตอบ', sub: 'ถามรุ่นพี่ได้เลย', go: () => reset('qa') },
    { icon: 'folder', color: 'pink', title: 'Projects', sub: 'ไอเดียจากรุ่นพี่', go: () => reset('browse', { mode: 'project' }) },
  ];
  return (
    <View>
      <HeroCheer />

      <View>
        <AnnouncementBanner />
        <MyCourses />
        <ExamCountdown />
        <WeatherCard />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {quick.map((q) => (
          <Pressable key={q.title} onPress={q.go} style={({ pressed }) => [s.quick, { backgroundColor: PASTEL[q.color].tile }, pressed && s.pressed]}>
            <View style={s.tileIcon}><Feather name={q.icon} size={16} color={INK} /></View>
            <Text style={s.quickTitle}>{q.title}</Text>
            <Text style={s.quickSub}>{q.sub}</Text>
            <View style={s.quickArrow}><Feather name="arrow-right" size={14} color="#fff" /></View>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 22, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <Chip label="ทั้งหมด" icon="grid" selected={term === 'all'} onPress={() => setTerm('all')} />
        {TERMS.filter((t) => data.courses.some((x) => x.semester === t)).map((t) => <Chip key={t} label={termLabel(t)} icon="calendar" selected={term === t} onPress={() => setTerm(t)} />)}
      </ScrollView>

      <SectionHead title="วิชายอดนิยม" style={{ marginTop: 14 }} right={<SeeAll onPress={() => reset('browse', { mode: 'summary' })} />} />
      <CourseGrid courses={courses} mode="summary" />

      <SectionHead title="กระทู้ล่าสุด" style={{ marginTop: 8 }} right={<SeeAll onPress={() => reset('qa')} />} />
      {threads.length ? threads.map((t) => <QaItem key={t.id} t={t} />) : <Empty text="ยังไม่มีกระทู้ — เป็นคนแรกที่ตั้งคำถามสิ!" />}

      <Card style={[s.instructorBanner, { backgroundColor: PASTEL.mint.tile }]} onPress={() => push('instructors')}>
        <View style={{ flex: 1 }}>
          <Text style={s.bannerKicker}>CITU · dX</Text>
          <Text style={s.bannerTitle}>รู้จักอาจารย์{'\n'}ประจำหลักสูตร</Text>
        </View>
        <View style={s.bannerArrow}><Feather name="arrow-right" size={18} color={INK} /></View>
      </Card>
    </View>
  );
}
