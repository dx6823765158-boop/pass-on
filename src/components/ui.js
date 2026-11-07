/* คอมโพเนนต์พื้นฐาน (ปุ่ม การ์ด ชิป ฟอร์ม ตัวเลือกวิชา/วันเวลา) */
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { INK, LOGO, LOGO_RATIO, PASTEL } from '../theme';
import { BKK, TERMS, TH_DAYS, TH_MONTHS, TYPE_COLOR, TYPE_LABEL } from '../constants';
import { bkkParts, courseColor, currentTermKey, frameStyle, hashKey, initials, pad2, shapeRadius, termLabel } from '../utils';
import { useApp } from '../context';

export function DialogBox({ dialog, onClose }) {
  const { s } = useApp();
  if (!dialog) return null;
  const press = (b) => { onClose(); if (b.onPress) setTimeout(b.onPress, 0); };
  return (
    <View style={s.dialogLayer}>
      <View style={s.dialogWrap}>
        <Pressable style={s.overlay} onPress={onClose} />
        <View style={s.dialog}>
          <Text style={s.h2}>{dialog.title}</Text>
          {dialog.message ? <Text style={[s.body, { marginTop: 8 }]}>{dialog.message}</Text> : null}
          <View style={[s.row, { marginTop: 20, justifyContent: 'flex-end', flexWrap: 'wrap' }]}>
            {dialog.buttons.map((b, i) => (
              <TouchableOpacity key={i} activeOpacity={0.85} onPress={() => press(b)}
                style={[s.dialogBtn, b.style === 'cancel' ? s.dialogBtnCancel : b.style === 'destructive' ? s.dialogBtnDanger : s.dialogBtnOk]}>
                <Text style={[s.dialogBtnTxt, b.style === 'cancel' ? s.dialogBtnTxtCancel : s.dialogBtnTxtOk]}>{b.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ============================ primitives ============================ */
export function Card({ style, children, onPress }) {
  const { s } = useApp();
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

/** ปุ่มแบบ pill — primary = ดำ + วงกลมเหลืองลูกศร (ตาม UI kit รูปที่ 2) */
export function Btn({ title, onPress, variant = 'primary', small, block, arrow, icon, disabled, style }) {
  const { s, c } = useApp();
  const primary = variant === 'primary';
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[s.btn, s['btn_' + variant], small && s.btnSm, arrow && { paddingRight: small ? 6 : 8 }, block && s.btnBlock, disabled && { opacity: 0.5 }, style]}
    >
      {icon ? <Feather name={icon} size={small ? 14 : 16} color={primary ? c.onInk : c.text} style={{ marginRight: 6 }} /> : null}
      <Text style={[s.btnTxt, s['btnTxt_' + variant], small && s.btnTxtSm, arrow && { marginRight: 12 }]}>{title}</Text>
      {arrow ? (
        <View style={[s.btnArrow, small && s.btnArrowSm]}>
          <Feather name="arrow-right" size={small ? 12 : 14} color={INK} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function IconCircle({ name, size = 36, bg, color, onPress, style }) {
  const { c } = useApp();
  const body = (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg || c.surface, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Feather name={name} size={size * 0.46} color={color || INK} />
    </View>
  );
  return onPress ? <TouchableOpacity activeOpacity={0.8} onPress={onPress}>{body}</TouchableOpacity> : body;
}

/** รูปโปรไฟล์ตามทรง + กรอบที่ผู้ใช้เลือก */
export function PhotoBox({ profile, size, frame = true, ring }) {
  const { s, c } = useApp();
  const p = profile || {};
  const colorKey = PASTEL[p.color] ? p.color : hashKey(p.studentId || p.name);
  const bw = Math.max(2, Math.round(size * 0.05));
  const border = frame ? frameStyle(p.frame || 'clean', bw, c) : ring ? { borderWidth: bw, borderColor: ring } : null;
  return (
    <View style={[{ width: size, height: size, overflow: 'hidden', backgroundColor: PASTEL[colorKey].dot, alignItems: 'center', justifyContent: 'center' }, shapeRadius(p.shape, size), border]}>
      {p.photo ? (
        <Image source={{ uri: p.photo }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Text style={[s.avatarTxt, { fontSize: size * 0.34 }]}>{initials(p.name)}</Text>
      )}
    </View>
  );
}

export function Avatar({ sid, name, size = 40, ring, showEmoji }) {
  const { s, data } = useApp();
  const u = sid ? data.users.find((x) => x.studentId === sid) : null;
  const profile = u || { studentId: sid, name };
  const fancy = !!(u && u.frame && u.frame !== 'clean' && size >= 30);
  return (
    <View style={{ width: size, height: size }}>
      <PhotoBox profile={profile} size={size} frame={fancy} ring={ring} />
      {showEmoji && u && u.emoji ? (
        <View style={[s.emojiBadge, { width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2 }]}>
          <Text style={{ fontSize: size * 0.21 }}>{u.emoji}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function AvatarStack({ ids, size = 24 }) {
  const { c } = useApp();
  return (
    <View style={{ flexDirection: 'row' }}>
      {ids.slice(0, 3).map((id, i) => (
        <View key={id} style={{ marginLeft: i ? -size * 0.35 : 0 }}>
          <Avatar sid={id} size={size} ring={c.surface} />
        </View>
      ))}
    </View>
  );
}

export function Pill({ label, color, icon, style }) {
  const { s } = useApp();
  return (
    <View style={[s.pill, { backgroundColor: color ? PASTEL[color].tile : 'rgba(255,255,255,0.75)' }, style]}>
      {icon ? <Feather name={icon} size={11} color={INK} style={{ marginRight: 4 }} /> : null}
      <Text style={s.pillTxt}>{label}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress, icon, dot }) {
  const { s, c } = useApp();
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[s.chip, selected && s.chipSel]}>
      {icon ? <Feather name={icon} size={14} color={selected ? c.onInk : c.text} style={{ marginRight: 6 }} /> : null}
      {dot ? <View style={[s.chipDot, { backgroundColor: PASTEL[dot].dot }]} /> : null}
      <Text style={[s.chipTxt, selected && s.chipTxtSel]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Breadcrumb({ items }) {
  const { s, jump } = useApp();
  return (
    <View style={s.breadcrumb}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <View key={i} style={s.row}>
            {i > 0 && <Feather name="chevron-right" size={12} color="#B5ADA2" style={{ marginHorizontal: 3 }} />}
            {last ? (
              <Text style={s.crumbCurrent} numberOfLines={1}>{it.label}</Text>
            ) : (
              <Text style={s.crumbLink} onPress={() => it.go && jump(it.go, it.params || {})}>{it.label}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

export function SectionHead({ title, right, style }) {
  const { s } = useApp();
  return (
    <View style={[s.sectionHead, style]}>
      <Text style={s.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function SeeAll({ onPress, label = 'ดูทั้งหมด' }) {
  const { s } = useApp();
  return (
    <TouchableOpacity onPress={onPress} style={s.row} activeOpacity={0.8}>
      <Text style={s.seeAll}>{label}</Text>
      <View style={s.seeAllDot}><Feather name="arrow-right" size={11} color={INK} /></View>
    </TouchableOpacity>
  );
}

export function Empty({ text }) {
  const { s } = useApp();
  return (
    <View style={s.empty}>
      <Image source={LOGO} style={{ width: 64, height: 64 / LOGO_RATIO, opacity: 0.85, marginBottom: 10 }} resizeMode="contain" />
      <Text style={s.emptyTxt}>{text}</Text>
    </View>
  );
}

export function Field({ label, hint, style, multiline, ...props }) {
  const { s, c } = useApp();
  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={c.muted}
        multiline={multiline}
        style={[s.input, multiline && s.textarea, style]}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function TypeTag({ type }) {
  return <Pill label={TYPE_LABEL[type]} color={TYPE_COLOR[type]} />;
}

/* ============================ modals ============================ */
export function ModalShell({ title, onClose, children }) {
  const { s, c } = useApp();
  return (
    <View style={s.sheet}>
      <View style={s.sheetHandle} />
      <View style={s.sheetHead}>
        <Text style={s.h2}>{title}</Text>
        <IconCircle name="x" size={34} bg={c.surface2} color={c.text} onPress={onClose} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

export function CoursePicker({ courses, value, onChange, allowNone, multi, compact }) {
  const isSel = (id) => (multi ? (value || []).includes(id) : value === id);
  const { s, c } = useApp();
  const terms = [...new Set(courses.map((x) => x.semester || '-'))].sort((a, b) => {
    const ia = TERMS.indexOf(a); const ib = TERMS.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const selCourse = !multi && value ? courses.find((x) => x.id === value) : null;
  const startTerm = selCourse ? selCourse.semester || '-' : terms.includes(currentTermKey()) ? currentTermKey() : terms[0];
  const [term, setTerm] = useState(startTerm);
  const [q, setQ] = useState('');
  if (compact) {
    const f = q.trim().toLowerCase();
    const list = courses.filter((x) => (f
      ? (x.code || '').toLowerCase().includes(f) || (x.name || '').toLowerCase().includes(f)
      : (x.semester || '-') === term));
    return (
      <View>
        <View style={[s.searchBox, { marginBottom: 8 }]}>
          <Feather name="search" size={15} color="#9A9288" />
          <TextInput value={q} onChangeText={setQ} placeholder="ค้นหาวิชา เช่น DX332, UX/UI" placeholderTextColor="#9A9288" style={[s.searchInput, { paddingVertical: 8 }]} />
        </View>
        {!f ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {terms.map((t) => <Chip key={t} label={termLabel(t)} selected={term === t} onPress={() => setTerm(t)} />)}
          </ScrollView>
        ) : null}
        <View style={s.wrapRow}>
          {allowNone ? <Chip label="ไม่ระบุวิชา" selected={!value} onPress={() => onChange(null)} /> : null}
          {list.map((x) => (
            <Chip key={x.id} label={x.code} dot={courseColor(x)} selected={isSel(x.id)} onPress={() => onChange(x.id)} />
          ))}
          {!list.length ? <Text style={[s.smallMuted, { paddingVertical: 8 }]}>ไม่พบวิชา</Text> : null}
        </View>
        {selCourse ? (
          <View style={[s.row, { marginTop: 2 }]}>
            <Feather name="check-circle" size={14} color={c.text} />
            <Text style={[s.smallMuted, { marginLeft: 6, flex: 1 }]} numberOfLines={1}>{selCourse.code} · {selCourse.name}</Text>
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View>
      {allowNone ? <View style={s.wrapRow}><Chip label="ไม่ระบุวิชา" selected={!value} onPress={() => onChange(null)} /></View> : null}
      {terms.map((t) => (
        <View key={t} style={{ marginBottom: 4 }}>
          <Text style={s.termLabel}>{termLabel(t)}</Text>
          <View style={s.wrapRow}>
            {courses.filter((c) => (c.semester || '-') === t).map((c) => (
              <Chip key={c.id} label={c.code} dot={courseColor(c)} selected={isSel(c.id)} onPress={() => onChange(c.id)} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** ปฏิทินเลือกวัน + เวลา (เวลาไทย) — ไม่ต้องพิมพ์ ไม่ต้องติดตั้งแพ็กเกจเพิ่ม */
export function DateTimePicker({ value, onChange }) {
  const { s, c } = useApp();
  const today = bkkParts(new Date().toISOString());
  const [view, setView] = useState({ y: value.y, m: value.m });
  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const isPast = (d) => view.y < today.y || (view.y === today.y && (view.m < today.m || (view.m === today.m && d < today.d)));
  const shift = (n) => setView((v) => { const m = v.m + n; return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; });
  const quick = (addDays) => {
    const t = new Date(Date.now() + BKK + addDays * 86400000);
    const nv = { ...value, y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
    onChange(nv); setView({ y: nv.y, m: nv.m });
  };
  const setHour = (n) => onChange({ ...value, hh: (value.hh + n + 24) % 24 });
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <Chip label="พรุ่งนี้" onPress={() => quick(1)} />
        <Chip label="อีก 1 สัปดาห์" onPress={() => quick(7)} />
        <Chip label="อีก 2 สัปดาห์" onPress={() => quick(14)} />
        <Chip label="อีก 1 เดือน" onPress={() => quick(30)} />
      </ScrollView>
      <View style={s.calBox}>
        <View style={s.rowBetween}>
          <IconCircle name="chevron-left" size={32} bg={c.surface2} color={c.text} onPress={() => shift(-1)} />
          <Text style={s.h3}>{TH_MONTHS[view.m]} {view.y + 543}</Text>
          <IconCircle name="chevron-right" size={32} bg={c.surface2} color={c.text} onPress={() => shift(1)} />
        </View>
        <View style={[s.calRow, { marginTop: 8 }]}>
          {TH_DAYS.map((d) => <Text key={d} style={s.calHead}>{d}</Text>)}
        </View>
        {Array.from({ length: cells.length / 7 }).map((_, r) => (
          <View key={r} style={s.calRow}>
            {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
              if (!d) return <View key={i} style={s.calCell} />;
              const sel = value.y === view.y && value.m === view.m && value.d === d;
              const isToday = today.y === view.y && today.m === view.m && today.d === d;
              const past = isPast(d);
              return (
                <TouchableOpacity key={i} disabled={past} activeOpacity={0.8} style={s.calCell}
                  onPress={() => onChange({ ...value, y: view.y, m: view.m, d })}>
                  <View style={[s.calDay, isToday && s.calToday, sel && s.calSel]}>
                    <Text style={[s.calDayTxt, past && { opacity: 0.3 }, sel && { color: c.onInk, fontWeight: '700' }]}>{d}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      <View style={[s.rowBetween, { marginTop: 12 }]}>
        <Text style={s.label}>เวลา</Text>
        <View style={s.row}>
          <IconCircle name="minus" size={32} bg={c.surface2} color={c.text} onPress={() => setHour(-1)} />
          <Text style={s.timeTxt}>{pad2(value.hh)}:{pad2(value.mi)} น.</Text>
          <IconCircle name="plus" size={32} bg={c.surface2} color={c.text} onPress={() => setHour(1)} />
        </View>
      </View>
      <View style={[s.wrapRow, { marginTop: 8 }]}>
        {[0, 15, 30, 45].map((mi) => <Chip key={mi} label={':' + pad2(mi)} selected={value.mi === mi} onPress={() => onChange({ ...value, mi })} />)}
        {[[9, 0], [13, 0], [13, 30], [16, 30]].map(([hh, mi]) => (
          <Chip key={hh + ':' + mi} label={pad2(hh) + ':' + pad2(mi)} selected={value.hh === hh && value.mi === mi} onPress={() => onChange({ ...value, hh, mi })} />
        ))}
      </View>
    </View>
  );
}
