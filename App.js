/**
 * Pass On (รุ่นพี่บอกต่อ) — React Native / Expo + Supabase
 * คลังสรุปแนวข้อสอบ กระทู้ถาม-ตอบ และโปรเจ็กต์ของรุ่นพี่ หลักสูตร dX · CITU
 *
 * ข้อมูลทั้งหมดอยู่ใน Supabase (ดู supabase/migrations และ docs/PLAN-supabase.md)
 * ตั้งค่าใน .env.local: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY (ดู .env.example)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Prompt_400Regular } from '@expo-google-fonts/prompt/400Regular';
import { Prompt_500Medium } from '@expo-google-fonts/prompt/500Medium';
import { Prompt_600SemiBold } from '@expo-google-fonts/prompt/600SemiBold';
import { Prompt_700Bold } from '@expo-google-fonts/prompt/700Bold';
import { USE_SUPABASE, supabase } from './src/lib/supabase';
import { authErrorMessage, fetchMyProfile, isStudentIdTaken, saveMyProfile } from './src/api/profiles';
import * as api from './src/api/content';
import { DARK, INK, LIGHT, LOGO, LOGO_RATIO, makeStyles } from './src/theme';
import { TABS } from './src/constants';
import { currentTermKey, uid } from './src/utils';
import { Ctx, notify, setDialogHandler } from './src/context';
import { Avatar, DialogBox, IconCircle } from './src/components/ui';
import { AuthFlow, OnboardingScreen } from './src/screens/auth';
import { HomeScreen } from './src/screens/home';
import { BrowseScreen, ContributorsScreen, PersonScreen } from './src/screens/browse';
import { PostScreen } from './src/screens/post';
import { QaScreen, QaThreadScreen } from './src/screens/qa';
import { EditProfileScreen, InstructorsScreen, ProfileScreen } from './src/screens/profile';
import { AdminScreen } from './src/screens/admin';
import { EnrollModal, EventFormModal, ImageViewer, NewCourseModal, NewThreadModal, PickInstructorModal, UploadModal } from './src/modals';

export default function App() {
  return (
    <SafeAreaProvider>
      <PassOnApp />
    </SafeAreaProvider>
  );
}

function PassOnApp() {
  const insets = useSafeAreaInsets();
  const safe = { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right };
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? DARK : LIGHT;
  const [fontsLoaded, fontError] = useFonts({ Prompt_400Regular, Prompt_500Medium, Prompt_600SemiBold, Prompt_700Bold });
  const fontsOk = !!fontsLoaded && !fontError;
  const s = useMemo(() => makeStyles(c, fontsOk), [c, fontsOk]);

  const EMPTY = { courses: [], instructors: [], posts: [], threads: [], users: [], events: [], myEvents: [], config: {}, enrollments: [] };
  const [user, setUser] = useState(null); // ผู้ใช้ที่ล็อกอิน (รูปแบบแอป มี uid, role)
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [stack, setStack] = useState([{ name: 'home', params: {} }]);
  const [modal, setModal] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  useEffect(() => { setDialogHandler(setDialog); return () => setDialogHandler(null); }, []);

  /* ---------- โหลดข้อมูลทั้งหมดจาก Supabase ---------- */
  const uidRef = React.useRef(null);
  const refresh = useCallback(async () => {
    const myUid = uidRef.current;
    if (!myUid) return;
    try {
      const next = await api.loadAll(myUid);
      setData(next);
      setDbError(null);
      const mine = next.users.find((u) => u.uid === myUid);
      if (mine) setUser(mine);
    } catch (e) {
      setDbError('โหลดข้อมูลไม่สำเร็จ — ' + authErrorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  /* ---------- session + โปรไฟล์ ---------- */
  const loadMe = useCallback(async (sess) => {
    uidRef.current = sess ? sess.user.id : null;
    if (!sess) { setUser(null); setNeedsProfile(false); setData(EMPTY); setLoaded(false); return; }
    try {
      const mine = await fetchMyProfile(sess.user.id);
      if (mine) { setUser(mine); setNeedsProfile(false); await refresh(); }
      else { setUser(null); setNeedsProfile(true); }
    } catch (e) {
      setDbError('โหลดโปรไฟล์ไม่สำเร็จ — ' + authErrorMessage(e));
      setLoaded(true);
    }
  }, [refresh]);

  useEffect(() => {
    if (!USE_SUPABASE) { setAuthChecked(true); return undefined; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      if (!alive) return;
      setSession(sess);
      await loadMe(sess);
      if (alive) setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      // ไม่ await ใน callback (supabase-js แนะนำ) — ส่งต่อไปทำนอก callback
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(() => loadMe(sess), 0);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [loadMe]);

  /* ---------- realtime: มีคนโพสต์/คอมเมนต์/ไลก์ → โหลดใหม่ ---------- */
  const signedIn = !!user;
  useEffect(() => {
    if (!signedIn) return undefined;
    return api.subscribeChanges(refresh);
  }, [signedIn, refresh]);

  /** ส่งขึ้น Supabase แล้วโหลดใหม่ — ถ้าพลาดแจ้งเตือน (optimistic: อัปเดตจอก่อนถ้าส่ง local มา) */
  const run = async (remote, local, failTitle = 'บันทึกไม่สำเร็จ') => {
    if (local) setData(local);
    try {
      const out = await remote();
      await refresh();
      return out === undefined ? true : out;
    } catch (e) {
      notify(failTitle, authErrorMessage(e));
      refresh();
      return false;
    }
  };

  /* ---------- navigation ---------- */
  const push = useCallback((name, params = {}) => setStack((st) => [...st, { name, params }]), []);
  const reset = useCallback((name, params = {}) => setStack([{ name, params }]), []);
  const back = useCallback(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), []);
  const jump = useCallback((name, params = {}) => {
    setStack((st) => {
      for (let i = st.length - 1; i >= 0; i--) {
        if (st[i].name === name) return [...st.slice(0, i), { name, params: { ...st[i].params, ...params } }];
      }
      if (['home', 'qa', 'browse', 'profile'].includes(name)) return [{ name, params }];
      return [...st, { name, params }];
    });
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dialog) { setDialog(null); return true; }
      if (modal) { setModal(null); return true; }
      if (stack.length > 1) { back(); return true; }
      if (stack[0].name !== 'home') { reset('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [dialog, modal, stack, back, reset]);

  /* ---------- profile / auth ---------- */
  const saveProfile = async (p) => {
    if (!session) return false;
    const uidNow = session.user.id;
    try {
      if (await isStudentIdTaken(p.studentId, uidNow)) {
        notify('รหัสนักศึกษานี้มีคนใช้แล้ว', 'ถ้าเป็นรหัสของคุณจริง ติดต่อแอดมินหลักสูตรเพื่อตรวจสอบ');
        return false;
      }
      const saved = await saveMyProfile(uidNow, p, user);
      setUser(saved);
      if (needsProfile) { setNeedsProfile(false); uidRef.current = uidNow; }
      await refresh();
      return true;
    } catch (e) {
      notify('บันทึกโปรไฟล์ไม่สำเร็จ', authErrorMessage(e));
      return false;
    }
  };
  const logout = () => {
    notify('ออกจากระบบ', 'ต้องการออกจากระบบใช่ไหม? ข้อมูลโปรไฟล์และโพสต์ของคุณยังอยู่ครบ เข้าสู่ระบบใหม่ด้วยอีเมลเดิมได้ทุกเมื่อ', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ', style: 'destructive', onPress: () => {
          supabase.auth.signOut().catch(() => {});
          setModal(null);
          setStack([{ name: 'home', params: {} }]);
          setNeedsProfile(false);
          setUser(null);
        },
      },
    ]);
  };
  const me = user ? data.users.find((u) => u.studentId === user.studentId) || user : null;
  const isAdmin = !!(user && user.role === 'admin');
  const nameOf = (sid, fallback) => {
    const u = data.users.find((x) => x.studentId === sid);
    return (u && u.name) || fallback || 'ผู้ใช้';
  };
  const adminOnly = () => { notify('เฉพาะแอดมิน', 'เพิ่มรายวิชาหรือแก้อาจารย์ผู้สอนได้เฉพาะแอดมินหลักสูตร — แจ้งแอดมินได้เลย'); return false; };

  /* ---------- content actions ---------- */
  const toggleLike = (postId) => {
    if (!user) return;
    const sid = user.studentId;
    const post = data.posts.find((p) => p.id === postId);
    const liked = !!(post && (post.likes || []).includes(sid));
    run(
      () => api.setLike(user.uid, postId, !liked),
      { ...data, posts: data.posts.map((p) => (p.id !== postId ? p : { ...p, likes: liked ? p.likes.filter((x) => x !== sid) : [...p.likes, sid] })) },
    );
  };
  const pendingComment = (text) => ({ id: 'tmp' + uid(), author: me.name, authorId: user.studentId, text, createdAt: new Date().toISOString() });
  const addComment = (postId, text) => run(
    () => api.addComment(postId, text),
    { ...data, posts: data.posts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, pendingComment(text)] } : p)) },
  );
  const addReply = (threadId, text) => run(
    () => api.addComment(threadId, text),
    { ...data, threads: data.threads.map((t) => (t.id === threadId ? { ...t, replies: [...t.replies, pendingComment(text)] } : t)) },
  );
  const acceptAnswer = (commentId, accepted) => run(() => api.setAccepted(commentId, accepted));
  const removeComment = (commentId) => run(() => api.deleteComment(commentId), null, 'ลบไม่สำเร็จ');
  const createCourse = (course) => (isAdmin ? run(() => api.createCourse(course)) : adminOnly());
  const setInstructor = (courseId, name) => (isAdmin ? run(() => api.setInstructor(courseId, name)) : adminOnly());
  /** คืน id โพสต์ใหม่ หรือ throw เพื่อให้ฟอร์มแสดง error เอง */
  const createPost = async (post, files, onProgress) => {
    const id = await api.createPost(user.uid, post, files, onProgress);
    await refresh();
    return id;
  };
  const createThread = (t) => run(() => api.createThread(t), null, 'ตั้งกระทู้ไม่สำเร็จ');
  const deletePost = (post) => run(() => api.deletePost(post), null, 'ลบไม่สำเร็จ');
  const viewPost = (postId) => { api.incrementView(postId).catch(() => {}); };
  const report = (postId, commentId) => {
    const send = (reason) => api.reportContent(postId, commentId, reason)
      .then(() => notify('ส่งรายงานแล้ว', 'ขอบคุณที่ช่วยดูแลชุมชน แอดมินจะตรวจสอบเร็ว ๆ นี้'))
      .catch((e) => notify('ส่งรายงานไม่สำเร็จ', authErrorMessage(e)));
    notify('รายงานเนื้อหานี้', 'เลือกเหตุผล', [
      { text: 'สแปม / โฆษณา', onPress: () => send('สแปม / โฆษณา') },
      { text: 'ไม่สุภาพ', onPress: () => send('ไม่สุภาพ / คุกคาม') },
      { text: 'ข้อมูลผิด / ทุจริตสอบ', onPress: () => send('ข้อมูลผิด / ทุจริตการสอบ') },
      { text: 'ยกเลิก', style: 'cancel' },
    ]);
  };

  /* ---------- วันสอบของฉัน + วิชาที่กำลังเรียน ---------- */
  const addMyEvent = (e) => run(() => api.addMyEvent(user.uid, e));
  const removeMyEvent = (id) => run(() => api.deleteEvent(id), { ...data, myEvents: data.myEvents.filter((e) => e.id !== id) }, 'ลบไม่สำเร็จ');
  const addEnrollment = (courseId) => {
    const t = currentTermKey();
    const m = /^([12S])\/(\d{4})$/.exec(t) || [null, '1', String(new Date().getFullYear())];
    return run(() => api.addEnrollment(user.uid, courseId, Number(m[2]), m[1] === 'S' ? 3 : Number(m[1])));
  };
  const setEnrollmentStatus = (id, status) => run(() => api.setEnrollmentStatus(id, status));
  const removeEnrollment = (id) => run(() => api.removeEnrollment(id), { ...data, enrollments: data.enrollments.filter((x) => x.id !== id) });

  /* ---------- admin actions (สิทธิ์ตรวจซ้ำที่ RLS ฝั่ง DB) ---------- */
  const adminUnlocked = isAdmin;
  const unlockAdmin = () => push('admin');
  const lockAdmin = () => reset('home');
  const saveEvent = (id, ev) => run(() => api.saveSharedEvent(id, ev));
  const deleteEvent = (id) => run(() => api.deleteEvent(id), { ...data, events: data.events.filter((e) => e.id !== id) }, 'ลบไม่สำเร็จ');
  const saveAnnouncement = async (text, color) => {
    const ok = await run(() => api.saveAnnouncement(text, color));
    if (ok) notify(text ? 'บันทึกประกาศแล้ว' : 'ลบประกาศแล้ว', text ? 'ประกาศจะแสดงบนหน้าแรกของทุกคน' : '');
  };
  const setHidden = (col, id, hidden) => run(
    () => api.setPostHidden(id, hidden),
    { ...data, [col]: data[col].map((x) => (x.id === id ? { ...x, hidden } : x)) },
  );
  const loadReports = () => api.loadReports();
  const resolveReport = (id) => run(() => api.resolveReport(id, user.uid));

  /** ผู้ใช้ทั่วไปไม่เห็นโพสต์/กระทู้ที่ซ่อน (RLS ซ่อนให้อยู่แล้ว ยกเว้นของตัวเองและแอดมิน) */
  const visibleData = useMemo(() => ({
    ...data,
    posts: data.posts.filter((p) => !p.hidden),
    threads: data.threads.filter((t) => !t.hidden),
  }), [data]);

  const ctx = {
    c, s, user, me, isAdmin, data: visibleData, rawData: data, push, reset, back, jump, nameOf,
    myEvents: data.myEvents, addMyEvent, removeMyEvent, adminUnlocked, unlockAdmin, lockAdmin, saveEvent, deleteEvent, saveAnnouncement, setHidden,
    loadReports, resolveReport, report, addEnrollment, setEnrollmentStatus, removeEnrollment,
    openModal: setModal, saveProfile, logout, refresh,
    toggleLike, addComment, addReply, acceptAnswer, removeComment, createCourse, setInstructor, createPost, createThread, deletePost, viewPost,
  };

  /* ---------- derived ---------- */
  const route = stack[stack.length - 1];
  const rootRoute = stack[0];
  const activeTab =
    rootRoute.name === 'browse' ? (rootRoute.params.mode === 'project' ? 'project' : 'summary')
      : rootRoute.name === 'qa' ? 'qa'
        : rootRoute.name === 'profile' && !rootRoute.params.sid ? 'me' : 'home';

  const currentMode = () => {
    for (let i = stack.length - 1; i >= 0; i--) {
      const r = stack[i];
      if (r.params && r.params.mode) return r.params.mode;
      if (r.name === 'post') {
        const p = data.posts.find((x) => x.id === r.params.postId);
        if (p) return p.type === 'project' ? 'project' : 'summary';
      }
    }
    return 'summary';
  };
  const currentCourseId = () => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].params && stack[i].params.courseId) return stack[i].params.courseId;
    return null;
  };

  const closeModal = (newCourseId, newMode) => {
    const wasThread = modal && modal.type === 'newThread';
    setModal(null);
    if (typeof newCourseId === 'string') {
      setStack([{ name: 'browse', params: { mode: newMode } }, { name: 'contributors', params: { courseId: newCourseId, mode: newMode } }]);
    } else if (wasThread && newCourseId === true) {
      reset('qa');
    }
  };

  /* ---------- render ---------- */
  const statusBar = <StatusBar barStyle={c.dark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />;

  if (!USE_SUPABASE) {
    return (
      <View style={[s.root, s.center, { padding: 24 }]}>
        {statusBar}
        <Image source={LOGO} style={{ width: 150, height: 150 / LOGO_RATIO, marginBottom: 20 }} resizeMode="contain" />
        <Text style={[s.h2, { textAlign: 'center' }]}>ยังไม่ได้ตั้งค่า Supabase</Text>
        <Text style={[s.smallMuted, { textAlign: 'center', marginTop: 8 }]}>คัดลอก .env.example เป็น .env.local แล้วใส่ URL และ publishable key ของโปรเจกต์ จากนั้นรัน npx expo start ใหม่</Text>
      </View>
    );
  }

  if (!authChecked || (user && !loaded) || (!fontsLoaded && !fontError)) {
    return (
      <View style={[s.root, s.center]}>
        {statusBar}
        <Image source={LOGO} style={{ width: 150, height: 150 / LOGO_RATIO, marginBottom: 20 }} resizeMode="contain" />
        <ActivityIndicator size="small" color={c.ink} />
      </View>
    );
  }

  if (!user) {
    return (
      <Ctx.Provider value={ctx}>
        <View style={[s.root, safe]}>
          {statusBar}
          <View style={s.shell}>
            {session && needsProfile ? <OnboardingScreen /> : <AuthFlow />}
          </View>
          <DialogBox dialog={dialog} onClose={() => setDialog(null)} />
        </View>
      </Ctx.Provider>
    );
  }

  const fullScreenForm = route.name === 'editProfile';
  let screen;
  switch (route.name) {
    case 'browse': screen = <BrowseScreen key={'b' + route.params.mode} mode={route.params.mode} />; break;
    case 'contributors': screen = <ContributorsScreen {...route.params} />; break;
    case 'person': screen = <PersonScreen {...route.params} />; break;
    case 'post': screen = <PostScreen {...route.params} />; break;
    case 'qa': screen = <QaScreen />; break;
    case 'qaThread': screen = <QaThreadScreen {...route.params} />; break;
    case 'profile': screen = <ProfileScreen {...route.params} />; break;
    case 'instructors': screen = <InstructorsScreen />; break;
    case 'admin': screen = isAdmin ? <AdminScreen /> : <HomeScreen />; break;
    default: screen = <HomeScreen />;
  }
  const showFab = !['profile', 'editProfile', 'instructors', 'admin'].includes(route.name);
  const onHome = route.name === 'home';

  return (
    <Ctx.Provider value={ctx}>
      <View style={[s.root, safe]}>
        {statusBar}
        <View style={s.shell}>
        {/* top bar */}
        <View style={s.topbar}>
          {stack.length > 1 ? (
            <IconCircle name="arrow-left" size={38} onPress={back} style={{ marginRight: 10 }} />
          ) : null}
          <TouchableOpacity onPress={() => reset('home')} activeOpacity={0.8}>
            <Image source={LOGO} style={{ width: 46, height: 46 / LOGO_RATIO }} resizeMode="contain" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {route.name === 'editProfile' ? <Text style={s.topTitle}>แก้ไขโปรไฟล์</Text> : null}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => reset('profile')} activeOpacity={0.8}>
            <Avatar sid={user.studentId} name={me.name} size={38} />
          </TouchableOpacity>
        </View>

        {dbError ? (
          <TouchableOpacity style={s.banner} activeOpacity={0.8} onPress={refresh}>
            <Text style={s.bannerTxt}>⚠️ {dbError} · แตะเพื่อลองใหม่</Text>
          </TouchableOpacity>
        ) : null}

        {fullScreenForm ? (
          <View style={{ flex: 1 }}><EditProfileScreen /></View>
        ) : (
          <ScrollView
            key={stack.length + route.name + JSON.stringify(route.params)}
            style={{ flex: 1 }}
            contentContainerStyle={s.main}
            keyboardShouldPersistTaps="handled"
          >
            {screen}
          </ScrollView>
        )}

        {showFab ? (
          <TouchableOpacity
            style={[s.fab, onHome && { bottom: 156 }]}
            activeOpacity={0.85}
            onPress={() =>
              route.name === 'qa' || route.name === 'qaThread'
                ? setModal({ type: 'newThread' })
                : setModal({ type: 'upload', defaultType: currentMode() === 'project' ? 'project' : 'summary', courseId: currentCourseId() })
            }
          >
            <Feather name="plus" size={26} color={INK} />
          </TouchableOpacity>
        ) : null}

        {onHome && isAdmin ? (
          <TouchableOpacity
            style={s.adminBtn}
            activeOpacity={0.85}
            onPress={() => push('admin')}
          >
            <Feather name="shield" size={16} color={c.onInk} />
            <Text style={s.adminBtnTxt}>แอดมิน</Text>
          </TouchableOpacity>
        ) : null}

        {/* bottom tabs — แท็บที่เลือกเป็นวงกลมดำ (ตามรูปที่ 1) */}
        <View style={s.tabbar}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity key={t.key} style={s.tab} activeOpacity={0.8} onPress={() => reset(t.route.name, t.route.params)}>
                <View style={[s.tabIcon, active && s.tabIconOn]}>
                  <Feather name={t.icon} size={19} color={active ? c.onInk : c.muted} />
                </View>
                <Text style={[s.tabLabel, active && s.tabLabelOn]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={s.overlay} onPress={() => setModal(null)} />
            {modal && modal.type === 'newCourse' && <NewCourseModal onClose={() => setModal(null)} />}
            {modal && modal.type === 'pickInstructor' && <PickInstructorModal courseId={modal.courseId} onClose={() => setModal(null)} />}
            {modal && modal.type === 'upload' && <UploadModal {...modal} onClose={closeModal} />}
            {modal && modal.type === 'newThread' && <NewThreadModal onClose={closeModal} />}
            {modal && modal.type === 'enroll' && <EnrollModal onClose={() => setModal(null)} />}
            {modal && modal.type === 'imageViewer' && <ImageViewer images={modal.images} index={modal.index} onClose={() => setModal(null)} />}
            {modal && modal.type === 'eventForm' && <EventFormModal scope={modal.scope} event={modal.event} onClose={() => setModal(null)} />}
            {modal ? <DialogBox dialog={dialog} onClose={() => setDialog(null)} /> : null}
          </KeyboardAvoidingView>
        </Modal>
        </View>
        {!modal ? <DialogBox dialog={dialog} onClose={() => setDialog(null)} /> : null}
      </View>
    </Ctx.Provider>
  );
}
