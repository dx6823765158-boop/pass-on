/* วิดเจ็ตหน้าแรก: ประกาศ วิชาที่เรียน นับถอยหลังสอบ สภาพอากาศ */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { INK, PASTEL } from '../theme';
import { CAMPUS, CHEERS, CHEER_MS, PM_BANDS, PREP_WINDOW, UV_BANDS, WEATHER_REFRESH_MS } from '../constants';
import { bandPos, cheerFor, courseColor, fetchWeather, fmtThaiDate, kindOf, pad2, pm25Info, splitCountdown, useNow, uvInfo, wmoInfo } from '../utils';
import { notify, useApp } from '../context';
import { Btn, Card, Chip, SectionHead, SeeAll } from './ui';

/* ============================ widgets หน้าแรก ============================ */
export function AnnouncementBanner() {
  const { s, data } = useApp();
  const a = data.config && data.config.home;
  if (!a || !a.text) return null;
  const color = PASTEL[a.color] ? a.color : 'yellow';
  return (
    <View style={[s.announce, { backgroundColor: PASTEL[color].tile }]}>
      <View style={s.announceIcon}><Feather name="volume-2" size={16} color={INK} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.announceKicker}>ประกาศจากแอดมิน</Text>
        <Text style={s.announceTxt}>{a.text}</Text>
      </View>
    </View>
  );
}

/** รวมวันสอบที่ยังไม่ผ่าน (ตารางแอดมิน + ของฉัน) เรียงจากใกล้สุด */
export function useUpcoming(now) {
  const { data, myEvents } = useApp();
  return [
    ...(data.events || []).map((e) => ({ ...e, mine: false })),
    ...(myEvents || []).map((e) => ({ ...e, mine: true })),
  ].filter((e) => e.date && new Date(e.date).getTime() + 3 * 3600 * 1000 > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function HeroCheer() {
  const { s, me, data } = useApp();
  const now = useNow(60000);
  const next = useUpcoming(now)[0];
  const phrases = useMemo(() => {
    const list = [...CHEERS];
    if (next) {
      const days = Math.max(0, Math.ceil((new Date(next.date).getTime() - now) / 86400000));
      const code = (data.courses.find((x) => x.id === next.courseId) || {}).code;
      list.splice(1, 0, days > 0
        ? { pre: `อีก ${days} วันถึง${code ? ' ' + code : 'วันสอบ'}\n`, hl: 'เริ่มวันนี้ ทันแน่นอน', post: '' }
        : { pre: 'วันนี้วันสอบ\n', hl: 'สู้ ๆ นะ!', post: ' 💪' });
    }
    return list;
  }, [next && next.id, next && next.date, Math.floor(now / 86400000)]);
  const [i, setI] = useState(0);
  const fade = React.useRef(new Animated.Value(1)).current;
  const nativeDriver = Platform.OS !== 'web';
  const go = useCallback((dir = 1) => {
    Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: nativeDriver }).start(() => {
      setI((v) => (v + dir + phrases.length) % phrases.length);
      Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: nativeDriver }).start();
    });
  }, [fade, phrases.length, nativeDriver]);
  useEffect(() => {
    const t = setInterval(() => go(1), CHEER_MS);
    return () => clearInterval(t);
  }, [go]);
  const p = phrases[i % phrases.length];
  return (
    <Pressable onPress={() => go(1)} style={s.hero2}>
      <View style={s.row}>
        <Text style={s.heroBrand}>Pass On</Text>
        <View style={s.heroDot} />
        <Text style={s.heroBrandSub}>รุ่นพี่สู่รุ่นน้อง</Text>
      </View>
      <Text style={s.hello}>สวัสดี, {me.name} {me.emoji || '👋'}</Text>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <Text style={s.cheer}>
          {p.pre}<Text style={s.cheerHl}>{' ' + p.hl + ' '}</Text>{p.post}
        </Text>
      </Animated.View>
      <View style={[s.row, { marginTop: 14 }]}>
        {phrases.map((_, k) => <View key={k} style={[s.cheerDot, k === i % phrases.length && s.cheerDotOn]} />)}
      </View>
    </Pressable>
  );
}

export function ExamCountdown() {
  const { s, c, data, openModal, removeMyEvent } = useApp();
  const now = useNow(1000);
  const all = useUpcoming(now);
  const next = all[0];
  const rest = all.slice(1, 4);
  const codeOf = (id) => (data.courses.find((x) => x.id === id) || {}).code;
  const addMine = () => openModal({ type: 'eventForm', scope: 'mine' });

  if (!next) {
    return (
      <View style={[s.countCard, { backgroundColor: PASTEL.lilac.tile }]}>
        <View style={[s.blob, { backgroundColor: PASTEL.lilac.dot, right: -40, top: -50 }]} />
        <View style={s.kindPill}><Text style={s.kindPillTxt}>⏳ นับถอยหลังสู่การสอบ</Text></View>
        <Text style={[s.countTitle, { marginTop: 12 }]}>ยังไม่มีวันสอบ{'\n'}ที่กำลังจะมาถึง</Text>
        <Text style={[s.countSub, { marginTop: 6 }]}>เพิ่มวันสอบหรือควิซของคุณ แล้วเราจะนับถอยหลังให้ทุกวินาที</Text>
        <Btn title="เพิ่มวันสอบของฉัน" arrow small style={{ alignSelf: 'flex-start', marginTop: 16 }} onPress={addMine} />
      </View>
    );
  }
  const k = kindOf(next.kind);
  const diff = new Date(next.date).getTime() - now;
  const cd = splitCountdown(diff);
  const started = diff <= 0;
  const progress = Math.round(Math.min(1, Math.max(0, 1 - diff / PREP_WINDOW)) * 100);
  const code = codeOf(next.courseId);
  const lessThanDay = cd.d === 0;
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={[s.countCard, { backgroundColor: PASTEL[k.color].tile }]}>
        <View style={[s.blob, { backgroundColor: PASTEL[k.color].dot, right: -46, top: -56 }]} />
        <View style={[s.blobSm, { backgroundColor: '#fff', opacity: 0.6, right: 64, top: 26 }]} />
        <View style={s.rowBetween}>
          <View style={s.kindPill}><Text style={s.kindPillTxt}>{k.emoji} {k.label}</Text></View>
          <Text style={s.ownerTag}>{next.mine ? 'ของฉัน' : '🛡 ตารางจากแอดมิน'}</Text>
        </View>

        <View style={[s.row, { marginTop: 16, alignItems: 'center' }]}>
          <View style={s.bigDays}>
            <Text style={s.bigDaysNum}>{started ? '0' : lessThanDay ? cd.h : cd.d}</Text>
            <Text style={s.bigDaysUnit}>{lessThanDay ? 'ชั่วโมง' : 'วัน'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            {code ? <Text style={s.countCode}>{code}</Text> : null}
            <Text style={s.countTitle} numberOfLines={2}>{next.title}</Text>
            <Text style={s.countSub}>{fmtThaiDate(next.date)}</Text>
            {next.place ? <Text style={s.countSub}>📍 {next.place}</Text> : null}
          </View>
        </View>

        {started ? (
          <View style={s.timeStrip}><Text style={s.timeStripNow}>กำลังสอบอยู่ตอนนี้ สู้ ๆ นะ! 💪</Text></View>
        ) : (
          <View style={s.timeStrip}>
            {(lessThanDay ? [[cd.m, 'นาที'], [cd.s, 'วินาที']] : [[cd.h, 'ชั่วโมง'], [cd.m, 'นาที'], [cd.s, 'วินาที']]).map(([v, l], idx, arr) => (
              <React.Fragment key={l}>
                <View style={s.timeCell}>
                  <Text style={s.timeNum}>{pad2(v)}</Text>
                  <Text style={s.timeLbl}>{l}</Text>
                </View>
                {idx < arr.length - 1 ? <Text style={s.timeColon}>:</Text> : null}
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={[s.rowBetween, { marginTop: 14 }]}>
          <Text style={s.progLabel}>ความพร้อม 30 วันสุดท้าย</Text>
          <Text style={s.progLabel}>{progress}%</Text>
        </View>
        <View style={s.progTrack}><View style={[s.progFill, { width: Math.max(3, progress) + '%' }]} /></View>
        <Text style={s.countCheer}>{cheerFor(cd.d)}</Text>
      </View>

      {rest.length ? (
        <View style={s.nextList}>
          <Text style={[s.miniHead, { marginBottom: 4 }]}>ถัดไป</Text>
          {rest.map((e, idx) => {
            const kk = kindOf(e.kind);
            const days = Math.ceil((new Date(e.date).getTime() - now) / 86400000);
            return (
              <View key={(e.mine ? 'm' : 's') + e.id} style={[s.nextRow, idx > 0 && s.nextRowLine]}>
                <View style={[s.nextDot, { backgroundColor: PASTEL[kk.color].dot }]}><Text>{kk.emoji}</Text></View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.nextTitle} numberOfLines={1}>{codeOf(e.courseId) ? codeOf(e.courseId) + ' · ' : ''}{e.title}</Text>
                  <Text style={s.meta}>{fmtThaiDate(e.date)}{e.mine ? ' · ของฉัน' : ''}</Text>
                </View>
                <View style={s.daysBadge}><Text style={s.daysBadgeNum}>{Math.max(0, days)}</Text><Text style={s.daysBadgeLbl}>วัน</Text></View>
                {e.mine ? (
                  <TouchableOpacity onPress={() => removeMyEvent(e.id)} style={{ marginLeft: 4, padding: 4 }}>
                    <Feather name="x" size={16} color={c.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
      <TouchableOpacity activeOpacity={0.85} onPress={addMine} style={s.addEventBtn}>
        <Feather name="plus" size={15} color={c.text} />
        <Text style={s.addEventTxt}>เพิ่มวันสอบ / ควิซของฉัน</Text>
      </TouchableOpacity>
    </View>
  );
}

export function Gauge({ title, value, unit, info, bands }) {
  const { s } = useApp();
  const pos = bandPos(value, bands);
  return (
    <View style={s.gaugeCard}>
      <Text style={s.gaugeTitle}>{title}</Text>
      <View style={[s.row, { alignItems: 'flex-end', marginTop: 4 }]}>
        <Text style={s.gaugeVal}>{value == null ? '–' : Math.round(value)}</Text>
        <Text style={s.gaugeUnit}>{unit}</Text>
      </View>
      <View style={[s.levelChip, { backgroundColor: info ? info.color : '#EEE' }]}>
        <Text style={s.levelChipTxt}>{info ? info.label : 'ไม่มีข้อมูล'}</Text>
      </View>
      <View style={s.gaugeTrack}>
        {bands.map(([, , col], i) => <View key={i} style={[s.gaugeSeg, { backgroundColor: col }, i === 0 && s.gaugeSegFirst, i === bands.length - 1 && s.gaugeSegLast]} />)}
        {value != null ? <View style={[s.gaugeMarker, { left: `${pos}%` }]} /> : null}
      </View>
      {info ? <Text style={s.gaugeTip}>{info.tip}</Text> : null}
    </View>
  );
}

export function WeatherCard() {
  const { s } = useApp();
  const [w, setW] = useState(null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setW(await fetchWeather()); setErr(false); }
    catch (e) { setErr(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, WEATHER_REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  if (!w) {
    return (
      <Card style={[s.wxEmpty]} onPress={err ? load : undefined}>
        {loading ? <ActivityIndicator color={INK} /> : <Text style={s.smallMuted}>โหลดสภาพอากาศไม่ได้ — แตะเพื่อลองใหม่</Text>}
      </Card>
    );
  }
  const info = wmoInfo(w.code, w.isDay);
  const pm = pm25Info(w.pm25);
  const uvVal = w.isDay && w.uvNow != null ? w.uvNow : w.uvMax;
  const uv = uvInfo(uvVal);
  const r1 = (v) => (v == null ? '–' : Math.round(v));
  const bring = [
    w.rain != null && w.rain >= 50 ? ['☂️', 'ร่ม'] : null,
    w.pm25 != null && w.pm25 > 37.5 ? ['😷', 'หน้ากาก N95'] : null,
    uvVal != null && uvVal >= 6 ? ['🧴', 'ครีมกันแดด'] : null,
    w.feels != null && w.feels >= 38 ? ['💧', 'น้ำเปล่า'] : null,
  ].filter(Boolean);
  return (
    <View style={s.wxCard}>
      <View style={s.wxTop}>
        <View style={[s.blob, { backgroundColor: PASTEL.blue.dot, right: -50, top: -60 }]} />
        <View style={s.rowBetween}>
          <View style={s.kindPill}><Text style={s.kindPillTxt}>📍 {CAMPUS.name} · วันนี้</Text></View>
          <TouchableOpacity onPress={load} style={s.wxRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {loading ? <ActivityIndicator size="small" color={INK} /> : <Feather name="refresh-cw" size={14} color={INK} />}
          </TouchableOpacity>
        </View>
        <View style={[s.row, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.wxTemp}>{r1(w.temp)}°</Text>
            <Text style={s.wxDesc}>{info.label}</Text>
            <Text style={s.wxFeels}>รู้สึกเหมือน {r1(w.feels)}° · สูง {r1(w.max)}° ต่ำ {r1(w.min)}°</Text>
          </View>
          <View style={s.wxEmojiBox}><Text style={{ fontSize: 50 }}>{info.emoji}</Text></View>
        </View>
        <View style={[s.wrapRow, { marginTop: 14 }]}>
          {[['☔', `ฝน ${r1(w.rain)}%`], ['💧', `ชื้น ${r1(w.humidity)}%`], ['🌅', w.sunrise], ['🌇', w.sunset]].map(([e, t]) => (
            <View key={e} style={s.wxChip}><Text style={s.wxChipTxt}>{e} {t}</Text></View>
          ))}
        </View>
      </View>

      <View style={s.wxBottom}>
        <View style={s.row}>
          <Gauge title="ฝุ่น PM2.5" value={w.pm25} unit=" µg/m³" info={pm} bands={PM_BANDS} />
          <View style={{ width: 10 }} />
          <Gauge title={w.isDay ? 'แดด · UV ตอนนี้' : 'แดด · UV สูงสุดวันนี้'} value={uvVal} unit=" / 11+" info={uv} bands={UV_BANDS} />
        </View>
        {bring.length ? (
          <View style={s.bringRow}>
            <Text style={s.bringLabel}>วันนี้ควรพก</Text>
            <View style={[s.wrapRow, { flex: 1 }]}>
              {bring.map(([e, t]) => <View key={t} style={s.bringChip}><Text style={s.bringTxt}>{e} {t}</Text></View>)}
            </View>
          </View>
        ) : null}
        <Text style={s.weatherSrc}>ข้อมูล Open-Meteo · ฝุ่นเป็นค่าประมาณจากแบบจำลอง · เกณฑ์ PM2.5 ตามกรมควบคุมมลพิษ</Text>
      </View>
    </View>
  );
}

/* ---------- วิชาที่กำลังเรียน (enrollments) ---------- */
export function MyCourses() {
  const { s, data, push, openModal, setEnrollmentStatus, removeEnrollment, user } = useApp();
  const list = (data.enrollments || []).map((e) => ({ ...e, course: data.courses.find((c) => c.id === e.courseId) })).filter((e) => e.course);
  const studying = list.filter((e) => e.status === 'studying');
  // เรียนจบแล้วแต่ยังไม่เคยแชร์อะไรในวิชานั้น → ชวนส่งต่อสรุป
  const nudge = list.find((e) => e.status === 'completed'
    && !data.posts.some((p) => p.courseId === e.courseId && p.authorId === user.studentId));
  const manage = (e) => notify(e.course.code + ' · ' + e.course.name, e.status === 'studying' ? 'กำลังเรียนวิชานี้' : 'เรียนจบแล้ว', [
    { text: 'ดูสรุปวิชานี้', onPress: () => push('contributors', { courseId: e.courseId, mode: 'summary' }) },
    e.status === 'studying'
      ? { text: 'เรียนจบแล้ว 🎓', onPress: () => setEnrollmentStatus(e.id, 'completed') }
      : { text: 'ยังเรียนอยู่', onPress: () => setEnrollmentStatus(e.id, 'studying') },
    { text: 'เอาออก', style: 'destructive', onPress: () => removeEnrollment(e.id) },
    { text: 'ปิด', style: 'cancel' },
  ]);
  return (
    <View style={{ marginBottom: 14 }}>
      <SectionHead title={`วิชาที่กำลังเรียน (${studying.length})`} right={<SeeAll label="เพิ่มวิชา" onPress={() => openModal({ type: 'enroll' })} />} />
      {studying.length ? (
        <View style={s.wrapRow}>
          {studying.map((e) => <Chip key={e.id} label={e.course.code} dot={courseColor(e.course)} onPress={() => manage(e)} />)}
        </View>
      ) : (
        <Text style={s.smallMuted}>เพิ่มวิชาที่เรียนเทอมนี้ เพื่อเข้าถึงสรุปของรุ่นพี่ได้เร็วขึ้น</Text>
      )}
      {list.some((e) => e.status === 'completed') ? (
        <View style={[s.wrapRow, { marginTop: 4 }]}>
          {list.filter((e) => e.status === 'completed').map((e) => <Chip key={e.id} label={'🎓 ' + e.course.code} onPress={() => manage(e)} />)}
        </View>
      ) : null}
      {nudge ? (
        <Card style={[s.notice, { backgroundColor: PASTEL.peach.tile, marginTop: 8 }]}>
          <Text style={s.noticeTxt}>เรียน {nudge.course.code} จบแล้ว 🎉 ส่งต่อสรุปให้รุ่นน้องหน่อยไหม?</Text>
          <Btn title="แชร์สรุป" small arrow style={{ marginTop: 10, alignSelf: 'flex-start' }}
            onPress={() => openModal({ type: 'upload', defaultType: 'summary', courseId: nudge.courseId })} />
        </Card>
      ) : null}
    </View>
  );
}
