/* การ์ดโปรไฟล์ เลเวล เหรียญ และฟอร์มโปรไฟล์ */
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { INK, PASTEL, PASTEL_KEYS } from '../theme';
import { CONFETTI, COURSE_ICON, EMOJIS, FRAMES, INTERESTS, LINKS, MAX_FAV, MAX_INTERESTS, PATTERNS, SHAPES, STATUS_PRESETS, YEARS } from '../constants';
import { byCode, cleanHandle, courseColor, pick } from '../utils';
import { notify, useApp } from '../context';
import { Btn, Card, Chip, CoursePicker, Field, PhotoBox, Pill } from './ui';

export function CoverPattern({ pattern, color }) {
  const { c } = useApp();
  const dot = PASTEL[color] ? PASTEL[color].dot : PASTEL.yellow.dot;
  if (pattern === 'plain') return null;
  if (pattern === 'dots') {
    return (
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 5 }).map((_, r) => (
          <View key={r} style={{ flexDirection: 'row', marginTop: r ? 12 : 10, marginLeft: r % 2 ? 22 : 8 }}>
            {Array.from({ length: 16 }).map((__, i) => (
              <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot, marginRight: 20 }} />
            ))}
          </View>
        ))}
      </View>
    );
  }
  if (pattern === 'stripes') {
    return (
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={i} style={{ position: 'absolute', top: -60, left: i * 44 - 40, width: 16, height: 260, backgroundColor: dot, transform: [{ rotate: '28deg' }] }} />
        ))}
      </View>
    );
  }
  if (pattern === 'confetti') {
    return (
      <View style={StyleSheet.absoluteFill}>
        {CONFETTI.map(([x, y, sz, col, sq], i) => (
          <View key={i} style={{
            position: 'absolute', left: x + '%', top: y + '%', width: sz, height: sq ? sz : sz * 0.45,
            borderRadius: sq ? 3 : sz, backgroundColor: col === color ? '#fff' : PASTEL[col].dot, transform: [{ rotate: (i * 37) % 180 + 'deg' }],
          }} />
        ))}
      </View>
    );
  }
  if (pattern === 'waves') {
    return (
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={'a' + i} style={{ position: 'absolute', bottom: -52, left: i * 64 - 20, width: 86, height: 86, borderRadius: 43, backgroundColor: dot }} />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={'b' + i} style={{ position: 'absolute', bottom: -64, left: i * 64 + 12, width: 80, height: 80, borderRadius: 40, backgroundColor: c.surface, opacity: 0.45 }} />
        ))}
      </View>
    );
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', width: 140, height: 130, borderRadius: 70, backgroundColor: dot, right: -30, top: -40 }} />
      <View style={{ position: 'absolute', width: 54, height: 50, borderRadius: 27, backgroundColor: c.surface, right: 70, top: 22 }} />
      <View style={{ position: 'absolute', width: 70, height: 64, borderRadius: 35, backgroundColor: dot, left: -20, bottom: -26 }} />
    </View>
  );
}

/** การ์ดโปรไฟล์ — ปก + ลาย + รูป + สถานะ + ความสนใจ + วิชาที่ถนัด + ช่องทางติดต่อ */
export function ProfileCard({ profile, action }) {
  const { s, data, push } = useApp();
  const color = PASTEL[profile.color] ? profile.color : 'yellow';
  const status = profile.status && (profile.status.text || profile.status.emoji) ? profile.status : null;
  const favs = (profile.favCourses || []).map((id) => data.courses.find((x) => x.id === id)).filter(Boolean);
  const links = LINKS.filter((l) => profile.links && cleanHandle(profile.links[l.key]));
  return (
    <Card style={{ overflow: 'hidden', padding: 0 }}>
      <View style={[s.cover, { backgroundColor: PASTEL[color].tile }]}>
        <CoverPattern pattern={profile.pattern || 'blobs'} color={color} />
        {status ? (
          <View style={s.statusBubble}>
            <Text style={s.statusTxt} numberOfLines={1}>{status.emoji ? status.emoji + ' ' : ''}{status.text}</Text>
          </View>
        ) : null}
        <Text style={s.coverEmoji}>{profile.emoji || '📚'}</Text>
      </View>
      <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
        <View style={[s.rowBetween, { marginTop: -40, alignItems: 'flex-end' }]}>
          <PhotoBox profile={profile} size={88} />
          {action}
        </View>
        <Text style={[s.h1, { marginTop: 10 }]}>{profile.name || 'ชื่อของคุณ'}</Text>
        <View style={[s.metaRow, { marginTop: 4 }]}>
          <Text style={s.meta}>รหัส {profile.studentId || '—'}</Text>
          {profile.year ? <Pill label={profile.year} color={color} /> : null}
        </View>
        {profile.bio ? <Text style={[s.body, { marginTop: 10 }]}>{profile.bio}</Text> : null}
        {(profile.interests || []).length ? (
          <View style={[s.wrapRow, { marginTop: 12 }]}>
            {profile.interests.map((it, i) => (
              <View key={it} style={[s.interestTag, { backgroundColor: PASTEL[PASTEL_KEYS[i % PASTEL_KEYS.length]].tile }]}>
                <Text style={s.interestTxt}>#{it}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {favs.length ? (
          <View style={{ marginTop: 12 }}>
            <Text style={s.miniHead}>วิชาที่ถนัด · ถามได้เลย</Text>
            <View style={s.wrapRow}>
              {favs.map((co) => (
                <TouchableOpacity key={co.id} activeOpacity={0.85} onPress={() => push('contributors', { courseId: co.id, mode: 'summary' })}
                  style={[s.favChip, { backgroundColor: PASTEL[courseColor(co)].tile }]}>
                  <Feather name={COURSE_ICON[co.code] || 'book-open'} size={13} color={INK} />
                  <Text style={s.favTxt}>{co.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
        {links.length ? (
          <View style={[s.row, { marginTop: 12 }]}>
            {links.map((l) => (
              <TouchableOpacity key={l.key} activeOpacity={0.85} style={s.linkBtn} onPress={() => Linking.openURL(l.url(cleanHandle(profile.links[l.key])))}>
                <Feather name={l.icon} size={16} color={INK} />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

/** เลเวล + แถบ XP */
export function LevelCard({ st }) {
  const { s } = useApp();
  const items = [{ label: 'โพสต์', value: st.posts }, { label: 'ได้ไลก์', value: st.likes }, { label: 'ช่วยตอบ', value: st.answers }, { label: 'กระทู้', value: st.threads }];
  return (
    <Card style={{ padding: 18 }}>
      <View style={s.rowBetween}>
        <View>
          <Text style={s.miniHead}>เลเวล {st.level}</Text>
          <Text style={s.h2}>{st.title}</Text>
        </View>
        <View style={s.levelBadge}><Text style={s.levelNum}>{st.level}</Text></View>
      </View>
      <View style={s.xpTrack}><View style={[s.xpFill, { width: Math.max(4, st.progress) + '%' }]} /></View>
      <Text style={[s.meta, { marginTop: 6 }]}>{st.xp} XP · อีก {100 - st.progress} XP จะเลื่อนเป็นเลเวล {st.level + 1}</Text>
      <View style={s.statsRow}>
        {items.map((it) => (
          <View key={it.label} style={s.statBox}>
            <Text style={s.statNum}>{it.value}</Text>
            <Text style={s.statLabel}>{it.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** ชั้นวางเหรียญ */
export function BadgeShelf({ st }) {
  const { s } = useApp();
  const got = st.badges.filter((b) => b.earned).length;
  return (
    <Card style={{ padding: 18 }}>
      <View style={s.rowBetween}>
        <Text style={s.h3}>เหรียญสะสม</Text>
        <Pill label={`${got}/${st.badges.length}`} color="yellow" />
      </View>
      <View style={[s.wrapRow, { marginTop: 12, justifyContent: 'space-between' }]}>
        {st.badges.map((b) => (
          <View key={b.key} style={[s.badge, !b.earned && s.badgeOff]}>
            <Text style={{ fontSize: 24, opacity: b.earned ? 1 : 0.35 }}>{b.earned ? b.emoji : '🔒'}</Text>
            <Text style={s.badgeLabel} numberOfLines={1}>{b.label}</Text>
            <Text style={s.badgeDesc} numberOfLines={2}>{b.desc}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** ฟอร์มโปรไฟล์ — ใช้ทั้งตอนลงทะเบียนและแก้ไข */
export function ProfileForm({ initial, header, submitLabel, onSubmit, busy, lockId }) {
  const { s, c, data } = useApp();
  const [p, setP] = useState({ status: { emoji: '', text: '' }, interests: [], favCourses: [], links: {}, pattern: 'blobs', frame: 'clean', shape: 'circle', ...initial });
  const [picking, setPicking] = useState(false);
  const [showCourses, setShowCourses] = useState(false);
  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }));
  const toggleIn = (k, v, max) => setP((prev) => {
    const cur = prev[k] || [];
    if (cur.includes(v)) return { ...prev, [k]: cur.filter((x) => x !== v) };
    if (cur.length >= max) { notify('เลือกได้สูงสุด ' + max + ' อย่าง', 'เอาอันเดิมออกก่อนแล้วค่อยเลือกใหม่นะ'); return prev; }
    return { ...prev, [k]: [...cur, v] };
  });

  const randomize = () => setP((prev) => ({
    ...prev,
    color: pick(PASTEL_KEYS), pattern: pick(PATTERNS).key, frame: pick(FRAMES).key, shape: pick(SHAPES).key, emoji: pick(EMOJIS),
  }));

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { notify('ต้องการสิทธิ์เข้าถึงรูปภาพ', 'อนุญาตการเข้าถึงคลังรูปเพื่ออัปโหลดรูปโปรไฟล์'); return; }
      const canResize = typeof ImageManipulator.manipulateAsync === 'function';
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: canResize ? 0.8 : 0.15, base64: !canResize,
      });
      if (res.canceled || !res.assets || !res.assets[0]) return;
      setPicking(true);
      if (canResize) {
        // ย่อรูปเหลือ 256px ก่อนอัปโหลดเข้า bucket avatars
        const out = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 256 } }], {
          compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true,
        });
        set('photo', 'data:image/jpeg;base64,' + out.base64);
      } else if (res.assets[0].base64) {
        set('photo', 'data:image/jpeg;base64,' + res.assets[0].base64);
      }
    } catch (e) {
      notify('อัปโหลดรูปไม่สำเร็จ', 'ลองเลือกรูปอีกครั้ง');
    } finally {
      setPicking(false);
    }
  };

  const submit = () => {
    const sid = (p.studentId || '').trim();
    const name = (p.name || '').trim();
    if (!/^\d{10}$/.test(sid)) { notify('รหัสนักศึกษาไม่ถูกต้อง', 'กรุณากรอกรหัสนักศึกษา 10 หลัก'); return; }
    if (!name) { notify('ยังไม่ได้ตั้งชื่อ', 'กรุณาตั้งชื่อที่จะใช้แสดงในระบบ'); return; }
    const links = {};
    LINKS.forEach((l) => { const h = cleanHandle(p.links && p.links[l.key]); if (h) links[l.key] = h; });
    onSubmit({
      ...p, studentId: sid, name, bio: (p.bio || '').trim(), links,
      status: { emoji: (p.status && p.status.emoji) || '', text: ((p.status && p.status.text) || '').trim() },
    });
  };

  const status = p.status || { emoji: '', text: '' };
  const courses = [...data.courses].sort(byCode);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">
        {header}

        {/* live preview */}
        <ProfileCard
          profile={p}
          action={
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={s.photoBtn}>
              {picking ? <ActivityIndicator size="small" color={c.onInk} /> : <Feather name="camera" size={15} color={c.onInk} />}
              <Text style={s.photoBtnTxt}>{p.photo ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</Text>
            </TouchableOpacity>
          }
        />
        <View style={[s.rowBetween, { marginBottom: 14 }]}>
          {p.photo ? <Text style={s.linkTxt} onPress={() => set('photo', null)}>ลบรูปโปรไฟล์</Text> : <View />}
          <Btn title="สุ่มลุค 🎲" small variant="outline" onPress={randomize} />
        </View>

        <Text style={s.formSection}>ข้อมูลพื้นฐาน</Text>
        <Field
          label="รหัสนักศึกษา"
          value={p.studentId}
          editable={!lockId}
          onChangeText={(v) => set('studentId', v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="เช่น 6823765158"
          style={lockId ? { opacity: 0.6 } : null}
          hint={lockId ? 'รหัสนักศึกษาแก้ไขไม่ได้' : null}
        />
        <Field label="ชื่อที่ใช้แสดง" value={p.name} onChangeText={(v) => set('name', v)} maxLength={40} placeholder="เช่น พี่มิ้นท์, Wakin" />
        <View style={s.field}>
          <Text style={s.label}>ชั้นปี</Text>
          <View style={s.wrapRow}>
            {YEARS.map((y) => <Chip key={y} label={y} selected={p.year === y} onPress={() => set('year', y)} />)}
          </View>
        </View>
        <Field label="แนะนำตัว" value={p.bio} onChangeText={(v) => set('bio', v)} multiline maxLength={160}
          placeholder="เช่น ถนัดสรุปวิชาโปรแกรมมิ่ง ถามได้ทุกเรื่อง DX212" hint={`${(p.bio || '').length}/160`} />

        <Text style={s.formSection}>สถานะวันนี้</Text>
        <View style={s.wrapRow}>
          {STATUS_PRESETS.map(([e, t]) => (
            <Chip key={t} label={e + ' ' + t} selected={status.text === t} onPress={() => set('status', status.text === t ? { emoji: '', text: '' } : { emoji: e, text: t })} />
          ))}
        </View>
        <Field value={status.text} onChangeText={(v) => set('status', { ...status, text: v })} maxLength={30} placeholder="หรือพิมพ์สถานะเอง (ไม่เกิน 30 ตัวอักษร)" />

        <Text style={s.formSection}>ตกแต่งโปรไฟล์</Text>
        <View style={s.field}>
          <Text style={s.label}>สีปก</Text>
          <View style={s.wrapRow}>
            {PASTEL_KEYS.map((k) => (
              <TouchableOpacity key={k} onPress={() => set('color', k)} activeOpacity={0.85}
                style={[s.swatch, { backgroundColor: PASTEL[k].dot }, p.color === k && s.swatchOn]}>
                {p.color === k ? <Feather name="check" size={16} color={INK} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.field}>
          <Text style={s.label}>ลายปก</Text>
          <View style={s.wrapRow}>
            {PATTERNS.map((pt) => (
              <TouchableOpacity key={pt.key} activeOpacity={0.85} onPress={() => set('pattern', pt.key)} style={[s.optTile, p.pattern === pt.key && s.optTileOn]}>
                <View style={[s.optCover, { backgroundColor: PASTEL[p.color || 'yellow'].tile }]}>
                  <CoverPattern pattern={pt.key} color={p.color || 'yellow'} />
                </View>
                <Text style={s.optLabel}>{pt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.field}>
          <Text style={s.label}>กรอบรูป</Text>
          <View style={s.wrapRow}>
            {FRAMES.map((fr) => (
              <TouchableOpacity key={fr.key} activeOpacity={0.85} onPress={() => set('frame', fr.key)} style={[s.optSmall, p.frame === fr.key && s.optTileOn]}>
                <PhotoBox profile={{ ...p, frame: fr.key }} size={40} />
                <Text style={s.optLabel}>{fr.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.field}>
          <Text style={s.label}>ทรงรูปโปรไฟล์</Text>
          <View style={s.wrapRow}>
            {SHAPES.map((sh) => (
              <TouchableOpacity key={sh.key} activeOpacity={0.85} onPress={() => set('shape', sh.key)} style={[s.optSmall, p.shape === sh.key && s.optTileOn]}>
                <PhotoBox profile={{ ...p, shape: sh.key }} size={40} />
                <Text style={s.optLabel}>{sh.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.field}>
          <Text style={s.label}>สติกเกอร์ประจำตัว</Text>
          <View style={s.wrapRow}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => set('emoji', e)} activeOpacity={0.85} style={[s.emojiOpt, p.emoji === e && s.emojiOptOn]}>
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={s.formSection}>ความสนใจ ({(p.interests || []).length}/{MAX_INTERESTS})</Text>
        <View style={[s.wrapRow, { marginBottom: 8 }]}>
          {INTERESTS.map((it) => (
            <Chip key={it} label={'#' + it} selected={(p.interests || []).includes(it)} onPress={() => toggleIn('interests', it, MAX_INTERESTS)} />
          ))}
        </View>

        <Text style={s.formSection}>วิชาที่ถนัด ({(p.favCourses || []).length}/{MAX_FAV})</Text>
        <Text style={[s.smallMuted, { marginTop: -4, marginBottom: 8 }]}>รุ่นน้องจะรู้ว่าวิชาไหนถามคุณได้</Text>
        {showCourses ? (
          <CoursePicker courses={courses} value={p.favCourses || []} multi onChange={(id) => toggleIn('favCourses', id, MAX_FAV)} />
        ) : (
          <Btn title={(p.favCourses || []).length ? 'แก้ไขวิชาที่ถนัด' : 'เลือกวิชาที่ถนัด'} icon="book-open" variant="outline" small
            style={{ alignSelf: 'flex-start', marginBottom: 14 }} onPress={() => setShowCourses(true)} />
        )}

        <Text style={s.formSection}>ช่องทางติดต่อ (ไม่บังคับ)</Text>
        {LINKS.map((l) => (
          <View key={l.key} style={[s.row, s.field]}>
            <View style={[s.linkBtn, { marginRight: 10 }]}><Feather name={l.icon} size={16} color={INK} /></View>
            <TextInput
              value={(p.links && p.links[l.key]) || ''}
              onChangeText={(v) => set('links', { ...(p.links || {}), [l.key]: v })}
              placeholder={l.ph}
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[s.input, { flex: 1 }]}
            />
          </View>
        ))}

        <Btn title={submitLabel} arrow block disabled={busy} onPress={submit} style={{ marginTop: 8 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
