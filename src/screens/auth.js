/* หน้าเข้าสู่ระบบ (อีเมล + OTP) และสร้างโปรไฟล์ครั้งแรก */
import { authErrorMessage } from '../api/profiles';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { LOGO, LOGO_RATIO, PASTEL } from '../theme';
import { OTP_RESEND_SEC } from '../constants';
import { notify, useApp } from '../context';
import { Btn, Card, Field, IconCircle } from '../components/ui';
import { ProfileForm } from '../components/profile';

/* ============================ auth: welcome / login / register ============================ */
export function AuthFlow() {
  const { s, c } = useApp();
  const [step, setStep] = useState('welcome');
  const [email, setEmail] = useState('');

  if (step === 'email') {
    return <EmailLoginScreen initialEmail={email} onBack={() => setStep('welcome')} onSent={(e) => { setEmail(e); setStep('verify'); }} />;
  }
  if (step === 'verify') return <VerifyCodeScreen email={email} onBack={() => setStep('email')} />;

  return (
    <ScrollView contentContainerStyle={s.welcome}>
      <View style={[s.blobBig, { backgroundColor: PASTEL.yellow.dot, right: -70, top: 40 }]} />
      <View style={[s.blob, { backgroundColor: PASTEL.mint.dot, left: -40, top: 260 }]} />
      <View style={[s.blobSm, { backgroundColor: PASTEL.pink.dot, right: 40, top: 330 }]} />
      <Image source={LOGO} style={{ width: 210, height: 210 / LOGO_RATIO, marginTop: 30 }} resizeMode="contain" />
      <Text style={s.display}>ส่งต่อความรู้{'\n'}จากรุ่นพี่{'\n'}ถึงรุ่นน้อง</Text>
      <Text style={[s.body, { color: c.muted, marginTop: 14, maxWidth: 320 }]}>
        คลังสรุปแนวข้อสอบ กระทู้ถาม-ตอบ และโปรเจ็กต์ของรุ่นพี่ หลักสูตร dX · วิทยาลัยนวัตกรรม มธ.
      </Text>
      <View style={{ marginTop: 'auto', paddingTop: 36 }}>
        <Btn title="เข้าสู่ระบบด้วยอีเมล มธ." arrow block onPress={() => setStep('email')} />
        <Text style={[s.hint, { textAlign: 'center', marginTop: 10 }]}>ครั้งแรกระบบจะสร้างบัญชีให้อัตโนมัติ</Text>
        <Text style={[s.hint, { textAlign: 'center', marginTop: 16 }]}>Digital Transformation & Innovation · CITU</Text>
      </View>
    </ScrollView>
  );
}

export function AuthHeader({ onBack, title, sub }) {
  const { s } = useApp();
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={s.rowBetween}>
        <IconCircle name="arrow-left" onPress={onBack} />
        <Image source={LOGO} style={{ width: 56, height: 56 / LOGO_RATIO }} resizeMode="contain" />
      </View>
      <Text style={[s.display, { fontSize: 30, lineHeight: 42, marginTop: 18 }]}>{title}</Text>
      {sub ? <Text style={[s.smallMuted, { marginTop: 4 }]}>{sub}</Text> : null}
    </View>
  );
}

export function EmailLoginScreen({ initialEmail, onBack, onSent }) {
  const { s } = useApp();
  const [email, setEmail] = useState(initialEmail || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setError('รูปแบบอีเมลไม่ถูกต้อง'); return; }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true } });
    setBusy(false);
    if (err) setError(authErrorMessage(err));
    else onSent(e);
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">
        <AuthHeader onBack={onBack} title="เข้าสู่ระบบ 👋" sub="กรอกอีเมลมหาวิทยาลัย ระบบจะส่งรหัสยืนยันไปให้" />
        <Field
          label="อีเมล"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          placeholder="ชื่อ.นามสกุล@dome.tu.ac.th"
          onSubmitEditing={submit}
        />
        {error ? (
          <Card style={[s.notice, { backgroundColor: PASTEL.pink.tile }]}><Text style={s.noticeTxt}>{error}</Text></Card>
        ) : null}
        <Btn title={busy ? 'กำลังส่งรหัส...' : 'ส่งรหัสยืนยัน'} arrow block disabled={busy} onPress={submit} style={{ marginTop: 6 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function VerifyCodeScreen({ email, onBack }) {
  const { s } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(OTP_RESEND_SEC);
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  const verify = async () => {
    const token = code.trim();
    if (!/^\d{6,8}$/.test(token)) { setError('กรอกรหัสตัวเลขจากอีเมล'); return; }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    if (err) setError(authErrorMessage(err));
    // สำเร็จ → onAuthStateChange ใน PassOnApp พาไปหน้าถัดไปเอง
  };
  const resend = async () => {
    setWait(OTP_RESEND_SEC);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (err) setError(authErrorMessage(err));
    else notify('ส่งรหัสใหม่แล้ว', 'ตรวจกล่องจดหมาย (และโฟลเดอร์ Junk/Spam) ของ ' + email);
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">
        <AuthHeader onBack={onBack} title="ใส่รหัสยืนยัน" sub={'ส่งรหัสไปที่ ' + email + ' แล้ว'} />
        <Field
          label="รหัสจากอีเมล"
          value={code}
          onChangeText={(v) => { setCode(v.replace(/\D/g, '')); setError(''); }}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={8}
          placeholder="เช่น 123456"
          onSubmitEditing={verify}
        />
        {error ? (
          <Card style={[s.notice, { backgroundColor: PASTEL.pink.tile }]}><Text style={s.noticeTxt}>{error}</Text></Card>
        ) : null}
        <Btn title={busy ? 'กำลังตรวจสอบ...' : 'ยืนยัน'} arrow block disabled={busy} onPress={verify} style={{ marginTop: 6 }} />
        <Btn
          title={wait > 0 ? `ขอรหัสใหม่ได้ใน ${wait} วินาที` : 'ขอรหัสใหม่'}
          variant="outline" block disabled={wait > 0} onPress={resend} style={{ marginTop: 10 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** ล็อกอินแล้วแต่ยังไม่มีแถวใน profiles → กรอกรหัสนักศึกษา + ตกแต่งโปรไฟล์ */
export function OnboardingScreen() {
  const { saveProfile, logout } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <ProfileForm
      initial={{ studentId: '', name: '', year: 'ปี 1', bio: '', color: 'yellow', emoji: '📚', photo: null, pattern: 'blobs', frame: 'clean', shape: 'circle' }}
      header={<AuthHeader onBack={logout} title="สร้างโปรไฟล์" sub="อีกขั้นเดียว! ตกแต่งโปรไฟล์ให้เป็นตัวเอง รุ่นพี่รุ่นน้องจะเห็นตอนคุณโพสต์" />}
      submitLabel={busy ? 'กำลังบันทึก...' : 'สร้างโปรไฟล์'}
      busy={busy}
      onSubmit={async (p) => {
        setBusy(true);
        await saveProfile(p);
        setBusy(false);
      }}
    />
  );
}
