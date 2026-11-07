<p align="center">
  <img src="assets/icon.png" width="140" alt="Pass On logo" />
</p>

# Pass On · รุ่นพี่สู่รุ่นน้อง

แอปส่งต่อความรู้จากรุ่นพี่สู่รุ่นน้อง สำหรับนักศึกษาหลักสูตร **dX — Digital Transformation & Innovation**
วิทยาลัยนวัตกรรม มหาวิทยาลัยธรรมศาสตร์ (CITU) · โปรเจ็กต์รายวิชา DX212

สร้างด้วย **Expo SDK 54 / React Native 0.81 + Supabase** (Auth, Postgres, Storage, Realtime) — รันได้ทั้ง Android, iOS และเว็บจากโค้ดชุดเดียว

## ฟีเจอร์

- **เข้าสู่ระบบด้วยอีเมล มธ.** (`@dome.tu.ac.th`) + รหัส OTP — ไม่มีรหัสผ่านให้จำ
- **สรุปแนวข้อสอบ / ปัญหาที่เจอ / โปรเจ็กต์รุ่นพี่** แยกตามรายวิชา dX 58 วิชา (มคอ.2 พ.ศ. 2566)
- **แนบรูปและไฟล์** (PDF, Word, PowerPoint, Excel) สูงสุด 5 ไฟล์ × 10 MB ต่อโพสต์
- **กระทู้ถาม-ตอบ** เจ้าของกระทู้เลือก "คำตอบที่ดีที่สุด" ได้ · ไลก์ · คอมเมนต์ · อัปเดตทันทีแบบ realtime
- **โปรไฟล์** รูป สถานะ ลายปก กรอบรูป ความสนใจ วิชาที่ถนัด เลเวล XP และเหรียญสะสม
- **วิชาที่กำลังเรียน** — เรียนจบแล้วแอปชวน "ส่งต่อสรุป" ให้รุ่นน้อง
- **นับถอยหลังสู่การสอบ** (ตารางจากแอดมิน + วันสอบส่วนตัว ซิงก์ทุกเครื่อง)
- **รายงานเนื้อหาไม่เหมาะสม** และ **แผงแอดมิน**: ตรวจรายงาน ซ่อนโพสต์ ตารางสอบ ประกาศ ภาพรวม
- สภาพอากาศ ฝุ่น PM2.5 และ UV ที่ มธ. ท่าพระจันทร์ · รายชื่ออาจารย์ · Dark mode · ฟอนต์ Prompt

## เริ่มใช้งาน (เครื่องตัวเอง)

ต้องมี [Node.js 20+](https://nodejs.org) และแอป **Expo Go** บนมือถือ

```bash
npm install
cp .env.example .env.local   # ใส่ URL + publishable key ของ Supabase
npx expo start
```

- สแกน QR ด้วย Expo Go (Android) หรือกล้อง (iOS) · กด `w` เพื่อเปิดบนเว็บ
- `npm test` — ทดสอบการแสดงผลทุกหน้า (jest-expo, mock เฉพาะชั้นข้อมูล)

## ตั้งค่า Supabase (ครั้งแรก)

โปรเจกต์ปัจจุบัน: `pass-on` (`mtqschdjrndgixqknzep`, Singapore) — ถ้าสร้างใหม่ ให้รัน SQL ใน [`supabase/migrations/`](supabase/migrations/) ตามลำดับชื่อไฟล์

ใน **Supabase Dashboard** ต้องตั้งเองอีก 3 อย่าง:

1. **Authentication → Email Templates** → *Magic Link* และ *Confirm signup*: ใส่รหัสในเนื้อหาอีเมล เช่น
   `<p>รหัสเข้าสู่ระบบ Pass On: <b>{{ .Token }}</b></p>` (ค่าเริ่มต้นส่งแค่ลิงก์)
2. **Authentication → SMTP Settings**: ตั้ง SMTP ของตัวเอง (เช่น Resend / Brevo) — อีเมลในตัวของ Supabase ส่งได้แค่ไม่กี่ฉบับต่อชั่วโมง
3. **ตั้งแอดมินคนแรก** (หลังสมัครและสร้างโปรไฟล์แล้ว) — SQL Editor:
   ```sql
   update profiles set role = 'admin' where student_id = '66xxxxxxxx';
   ```

สมัครได้เฉพาะโดเมนในตาราง `allowed_email_domains` (`dome.tu.ac.th`, `tu.ac.th`) — ทดสอบด้วย gmail ได้โดยเพิ่ม `gmail.com` ชั่วคราว

## ความปลอดภัย

- สิทธิ์ทั้งหมดบังคับที่ฐานข้อมูลด้วย **Row Level Security** — ไม่ใช่ในแอป (publishable key เปิดเผยได้)
- แก้/ลบได้เฉพาะเนื้อหาของตัวเอง · แอดมินดูจาก `profiles.role` · ผู้ใช้ตั้งตัวเองเป็นแอดมินหรือเปลี่ยนรหัสนักศึกษาเองไม่ได้
- ไฟล์แนบอยู่ใน bucket private เปิดด้วย signed URL · โพสต์ที่ถูกซ่อนจะเปิดไฟล์ไม่ได้ด้วย

## สร้าง APK / เว็บ

```bash
npm install -g eas-cli && eas login
eas build -p android --profile preview      # ได้ไฟล์ .apk (ค่า Supabase อยู่ใน eas.json)
```

เว็บ: workflow [`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml) deploy ขึ้น GitHub Pages ทุกครั้งที่ push `main`
ตั้งครั้งแรก: **Settings → Pages → Source: GitHub Actions** และ **Settings → Secrets and variables → Actions → Variables**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`

## โครงสร้างโปรเจ็กต์

```
App.js                    session, โหลดข้อมูล, navigation, actions ทั้งหมด (context)
src/lib/supabase.js       Supabase client
src/api/profiles.js       โปรไฟล์ + รูปโปรไฟล์ + วิชาที่ถนัด
src/api/content.js        โพสต์ ไฟล์แนบ ไลก์ คอมเมนต์ ตารางสอบ ประกาศ รายงาน realtime
src/screens/              หน้าจอ (auth, home, browse, post, qa, profile, admin)
src/components/           คอมโพเนนต์ (ui, content, profile, home)
src/modals.js             หน้าต่างลอย (อัปโหลด ตั้งกระทู้ วันสอบ ฯลฯ)
src/theme.js · constants.js · utils.js · context.js
src/types/database.ts     type ที่ generate จาก schema
supabase/migrations/      schema + RLS + storage + ข้อมูลวิชา/อาจารย์
__tests__/                ทดสอบการแสดงผล
docs/PLAN-supabase.md     แผนและบันทึกการย้ายจาก mockup
```
