/* โปรไฟล์ แก้ไขโปรไฟล์ และรายชื่ออาจารย์ */
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { INK, PASTEL } from '../theme';
import { CITU_URL } from '../constants';
import { byNewest, profileStats } from '../utils';
import { useApp } from '../context';
import { Breadcrumb, Btn, Card, Empty, SectionHead } from '../components/ui';
import { PostCard } from '../components/content';
import { BadgeShelf, LevelCard, ProfileCard, ProfileForm } from '../components/profile';

export function ProfileScreen({ sid }) {
  const { s, c, data, me, user, push, logout } = useApp();
  const isMe = !sid || sid === user.studentId;
  const id = isMe ? user.studentId : sid;
  const profile = isMe ? me : data.users.find((u) => u.studentId === id) || { studentId: id, name: 'ผู้ใช้' };
  const posts = data.posts.filter((p) => p.authorId === id).sort(byNewest);
  const st = profileStats(id, data, profile);
  return (
    <View>
      <ProfileCard
        profile={profile}
        action={isMe ? <Btn title="แต่งโปรไฟล์" icon="edit-2" small variant="outline" onPress={() => push('editProfile')} /> : null}
      />
      <LevelCard st={st} />
      <BadgeShelf st={st} />
      <SectionHead title={isMe ? 'โพสต์ของฉัน' : 'โพสต์ทั้งหมด'} style={{ marginTop: 8 }} />
      {posts.length ? posts.map((p) => <PostCard key={p.id} p={p} />) : <Empty text={isMe ? 'ยังไม่มีโพสต์ — แชร์สรุปแรกเพื่อรับเหรียญ ✍️ นักสรุป' : 'ยังไม่มีโพสต์'} />}
      {isMe ? (
        <>
          <Card style={[s.menuRow, { marginTop: 8 }]} onPress={() => push('instructors')}>
            <Feather name="users" size={18} color={c.text} />
            <Text style={s.menuTxt}>อาจารย์ประจำหลักสูตร dX</Text>
            <Feather name="chevron-right" size={18} color="#B5ADA2" />
          </Card>
          <Card style={s.menuRow} onPress={logout}>
            <Feather name="log-out" size={18} color={c.danger} />
            <Text style={[s.menuTxt, { color: c.danger }]}>ออกจากระบบ</Text>
            <View />
          </Card>
        </>
      ) : null}
    </View>
  );
}

export function EditProfileScreen() {
  const { s, me, saveProfile, back } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <ProfileForm
      initial={{ year: 'ปี 1', color: 'yellow', emoji: '📚', bio: '', photo: null, ...me }}
      header={<Text style={[s.display2, { marginBottom: 14 }]}>แต่งโปรไฟล์{'\n'}ให้เป็นตัวเอง ✨</Text>}
      lockId
      busy={busy}
      submitLabel={busy ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
      onSubmit={async (p) => {
        setBusy(true);
        const ok = await saveProfile({ ...p, updatedAt: new Date().toISOString() });
        setBusy(false);
        if (ok) back();
      }}
    />
  );
}

export function InstructorsScreen() {
  const { s, data } = useApp();
  const INSTRUCTORS = data.instructors;
  const groups = [...new Set(INSTRUCTORS.map((i) => i.group))];
  const colors = ['yellow', 'pink', 'mint', 'blue', 'lilac', 'peach'];
  return (
    <View>
      <Breadcrumb items={[{ label: 'หน้าแรก', go: 'home' }, { label: 'อาจารย์หลักสูตร dX' }]} />
      <Text style={s.display2}>อาจารย์{'\n'}หลักสูตร dX</Text>
      <Text style={[s.smallMuted, { marginTop: 8 }]}>
        ข้อมูลจากเว็บไซต์วิทยาลัยนวัตกรรม มธ. — <Text style={s.linkTxt} onPress={() => Linking.openURL(CITU_URL)}>citu.tu.ac.th</Text>
      </Text>
      {groups.map((g) => (
        <View key={g}>
          <SectionHead title={g} style={{ marginTop: 18 }} />
          {INSTRUCTORS.filter((i) => i.group === g).map((i, idx) => (
            <Card key={i.name} style={s.personCard}>
              <View style={[s.instAvatar, { backgroundColor: PASTEL[colors[(idx + g.length) % colors.length]].dot }]}>
                <Feather name="award" size={20} color={INK} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.personName}>{i.name}</Text>
                {i.en ? <Text style={s.meta}>{i.en}</Text> : null}
                <Text style={[s.meta, { marginTop: 3 }]}>{i.role}</Text>
              </View>
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}
