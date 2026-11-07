# แผนปรับ Pass On จาก mockup เป็นแอปจริง (Expo + Supabase)

> สถานะ: แผน — ยังไม่ได้แก้โค้ด · อ้างอิง `App.js` (commit `f6281b5`) และ `PassOn Database Design-2.pdf` (22 ต.ค. 2569)

## 1. ตอนนี้แอปเป็นแบบไหน

| เรื่อง | ตอนนี้ (mockup) | ปัญหาถ้าใช้จริง |
|---|---|---|
| โค้ด | `App.js` ไฟล์เดียว 3,815 บรรทัด (UI + ข้อมูล + สไตล์) | แก้ยาก ทำงานเป็นทีมแล้วชนกัน |
| ฐานข้อมูล | Firestore ผ่าน REST หรือ AsyncStorage + `SEED` | ข้อมูลเป็นก้อน JSON ไม่ตรงกับ ER Diagram |
| ล็อกอิน | พิมพ์รหัสนักศึกษาเอง ไม่มีรหัสผ่าน | ใครก็สวมรอยเป็นใครก็ได้ |
| แอดมิน | `ADMIN_PIN = '2569'` ตรวจในแอป | ดู PIN ได้จากโค้ดเว็บ |
| ไลก์ / คอมเมนต์ | เก็บเป็น array ในเอกสารโพสต์ (`likes`, `comments`, `replies`) | แก้พร้อมกันแล้วข้อมูลหาย, rules อนุญาตให้แก้ array ของคนอื่น |
| ไฟล์แนบ | base64 หั่นเป็นชิ้น 700 KB ใน collection `files` | ช้า เปลืองโควตา จำกัด 5 MB |
| อัปเดตข้อมูล | poll ทุก 5 วินาที (`POLL_MS`) | เปลือง request, ไม่ real-time จริง |
| XP / เหรียญ | คำนวณในเครื่องจากข้อมูลทั้งหมด (`BADGES`, บรรทัด ~240) | ต้องโหลดทุกโพสต์มาก่อนถึงจะนับได้ |

สิ่งที่เก็บไว้ได้เกือบทั้งหมด: หน้าจอ, คอมโพเนนต์ UI, ธีม/ฟอนต์ Prompt, `COURSE_LIST` 58 วิชา, การ์ดสภาพอากาศ (Open-Meteo), workflow deploy เว็บ, EAS build

## 2. ภาพเป้าหมาย

```
Expo (iOS / Android / Web)
  ├─ expo-router           แยกหน้าจอเป็นไฟล์
  ├─ @tanstack/react-query  cache + โหลดข้อมูล
  └─ @supabase/supabase-js
        ├─ Auth      อีเมล @dome.tu.ac.th (OTP 6 หลัก)
        ├─ Postgres  ตารางตาม ER Diagram + RLS
        ├─ Storage   bucket avatars / attachments
        └─ Realtime  โพสต์ คอมเมนต์ ไลก์ใหม่
```

## 3. ฐานข้อมูล: ER Diagram + สิ่งที่แอปมีเพิ่ม

ใช้ 8 ตารางจากเอกสารออกแบบเป็นแกน แล้วปรับให้เข้ากับ Supabase และฟีเจอร์ที่ mockup มีแต่เอกสารยังไม่ได้ครอบคลุม

### 3.1 ปรับจากเอกสารออกแบบ

| ในเอกสาร | ใน Supabase | เหตุผล |
|---|---|---|
| `users` + `password_hash` | `profiles` (PK `id uuid` → `auth.users.id`) ไม่มี password_hash | Supabase Auth เก็บรหัสผ่าน/OTP ให้ |
| `INT AUTO_INCREMENT` | `uuid` สำหรับผู้ใช้, `bigint generated always as identity` สำหรับตารางอื่น | ผูกกับ `auth.uid()` ใน RLS |
| `ENUM` | Postgres `enum` type หรือ `check` | เหมือนเดิม |
| `attachments.file_url` | `storage_path` (path ใน bucket) | สร้าง URL ตอนแสดง (signed/public) |
| `DATETIME` | `timestamptz default now()` | เวลาไทยแปลงตอนแสดง (มี `BKK` ในโค้ดอยู่แล้ว) |

### 3.2 ตารางที่ต้องเพิ่ม (มีในแอป ไม่มีในเอกสาร)

| ตาราง | มาจากฟีเจอร์ |
|---|---|
| `profiles` คอลัมน์เพิ่ม: `display_name, year_label, bio, color, emoji, pattern, frame, shape, status jsonb, interests text[], links jsonb` | หน้าโปรไฟล์แต่งได้ |
| `favorite_courses (user_id, course_id)` | "วิชาที่ถนัด" (`favCourses`) |
| `exam_events` (`owner_id` null = ตารางกลางจากแอดมิน, มีค่า = วันสอบส่วนตัว) | นับถอยหลังสอบ (`events` + `myEvents` ที่ตอนนี้อยู่ใน AsyncStorage) |
| `announcements` | ประกาศหน้าแรก (`config/home`) |
| `courses.instructor`, `courses.track`, `courses.semester` | หน้า Browse / เลือกอาจารย์ |
| `categories` seed: `summary, exam_tip, question, project` | เอกสารกำหนด — **กระทู้ถาม-ตอบ (`threads`) ย้ายมาเป็น posts หมวด `question`** และ `replies` กลายเป็น `comments` (มี `is_accepted` ให้เลือกคำตอบดีที่สุด) |

`enrollments` ทำไว้ในสคีมาเลย แต่ใส่ UI "วิชาที่กำลังเรียน" ในเฟส 4

### 3.3 ตัวนับ / XP

- view `post_stats` → `like_count`, `comment_count` ต่อโพสต์
- view `user_stats` → posts, summaries, projects, questions, answers, likes_received → ใช้คำนวณ XP/เลเวล/เหรียญแบบเดียวกับ `BADGES` ปัจจุบัน
- เพิ่ม `view_count` ผ่าน RPC `increment_view(post_id)` (security definer) ไม่ให้ client update ตรง

### 3.4 Row Level Security (แทน `firestore.rules`)

| ตาราง | อ่าน | เขียน |
|---|---|---|
| profiles | ผู้ล็อกอินทุกคน | แก้ได้แค่แถวตัวเอง, `role` แก้ไม่ได้ |
| posts | `status = 'published'` หรือเป็นเจ้าของ หรือแอดมิน | insert: `user_id = auth.uid()` · update/delete: เจ้าของ · ซ่อน: แอดมิน |
| comments | ตามโพสต์ | insert ของตัวเอง · ลบของตัวเอง · `is_accepted`: เจ้าของโพสต์ |
| likes | ทุกคน | insert/delete แถวที่ `user_id = auth.uid()` เท่านั้น |
| attachments | ตามโพสต์ | เจ้าของโพสต์ |
| courses, categories | ทุกคน | แอดมิน |
| exam_events | ตารางกลาง + ของตัวเอง | ของตัวเอง; ตารางกลาง = แอดมิน |
| announcements | ทุกคน | แอดมิน |

ฟังก์ชัน `is_admin()` (security definer อ่าน `profiles.role`) ใช้ในทุก policy — **ลบ `ADMIN_PIN` ทิ้ง**

Storage policy: `attachments/{user_id}/{post_id}/{file}` เขียนได้เฉพาะโฟลเดอร์ของตัวเอง, `avatars/{user_id}.jpg` เหมือนกัน

## 4. ล็อกอิน

1. ผู้ใช้กรอกอีเมล `@dome.tu.ac.th` → Supabase ส่ง OTP 6 หลัก (ใช้ OTP ไม่ใช้ magic link เพราะ deep link บน Expo Go/เว็บ GitHub Pages ยุ่งกว่า)
2. ตรวจโดเมนฝั่งเซิร์ฟเวอร์ด้วย Auth Hook (before user created) — ไม่พึ่งแค่การเช็กในแอป
3. ครั้งแรก → หน้า `ProfileForm` เดิม กรอกรหัสนักศึกษา 10 หลัก (unique) + ชื่อ + ตกแต่งโปรไฟล์ → insert `profiles`
4. session เก็บใน AsyncStorage (`supabase-js` รองรับ) — ไม่ต้องล็อกอินใหม่ทุกครั้ง
5. ตั้งแอดมินคนแรกด้วย SQL: `update profiles set role = 'admin' where student_id = '...'`

> หมายเหตุ: อีเมลยืนยันว่าเป็นคน มธ. แต่รหัสนักศึกษายังเป็นค่าที่ผู้ใช้กรอกเอง ถ้าต้องผูกแน่น ๆ ต้องมีรายชื่อจากหลักสูตรมาเทียบ

## 5. โครงสร้างโค้ดใหม่

```
app/                       expo-router
  _layout.tsx              Provider: Supabase session, React Query, Theme, Fonts
  (auth)/login.tsx, verify.tsx, onboarding.tsx
  (tabs)/_layout.tsx       แท็บล่าง (แทน TABS + stack ที่ทำมือ)
  (tabs)/index.tsx         Home
  (tabs)/browse.tsx
  (tabs)/qa.tsx
  (tabs)/profile.tsx
  post/[id].tsx, course/[id].tsx, person/[id].tsx, admin.tsx ...
src/
  lib/supabase.ts          createClient + AsyncStorage
  api/posts.ts, comments.ts, likes.ts, profiles.ts, files.ts, events.ts
  hooks/usePosts.ts ...    useQuery / useMutation + realtime invalidate
  components/              Card, Btn, Avatar, PostCard, CommentBox ... (ย้ายจาก App.js)
  theme/                   PASTEL, LIGHT, DARK, styles
  constants/               COURSE_LIST, CHEERS, BADGES, CAMPUS, INSTRUCTORS
supabase/
  migrations/0001_init.sql, 0002_rls.sql, 0003_storage.sql
  seed.sql                 categories + 58 วิชา + อาจารย์
```

แนะนำให้ย้ายเป็น TypeScript ไปพร้อมกัน เพราะ `supabase gen types typescript` สร้าง type จากตารางให้อัตโนมัติ ช่วยจับชื่อคอลัมน์ผิดได้

ค่าลับ: `.env` → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ใส่ใน GitHub Actions secrets สำหรับ build เว็บ และ `eas.json` env สำหรับ APK) — anon key เปิดเผยได้ ความปลอดภัยอยู่ที่ RLS

## 6. ขั้นตอนทำงาน

### เฟส 0 — เตรียม ✅ (7 พ.ย. 2569)
- [x] สร้าง Supabase project `pass-on` (ref `mtqschdjrndgixqknzep`, `ap-southeast-1`, Free)
- [x] migrations ใน `supabase/migrations/` — schema, RLS, storage, ข้อมูลอ้างอิง (58 วิชา · 14 อาจารย์ · 5 หมวด), ย้าย `is_admin()` ไป schema `private`
- [x] smoke test RLS 11 ข้อผ่าน (สมัครด้วย gmail ไม่ได้, ตั้งตัวเองเป็นแอดมินไม่ได้, แก้โพสต์คนอื่นไม่ได้, ฯลฯ)
- [x] `src/types/database.ts`, `.env.local` / `.env.example`
- [ ] ยังไม่ได้ติดตั้ง Supabase CLI สำหรับรัน local (ใช้ project บน cloud ไปก่อน)

ตัดสินใจระหว่างทำ (ต่างจากเอกสารออกแบบ):
- หมวดมี 5 แบบ: `summary, exam_tip, problem, question, project` — แอปแยก "ปัญหาที่เจอ" (โพสต์) กับ "กระทู้ถาม-ตอบ" อยู่แล้ว
- `courses.name_en` เป็นช่องหลัก (มคอ.2 เป็นภาษาอังกฤษ), `name_th` ว่างได้
- `posts.course_id` ว่างได้เฉพาะหมวด `question` (trigger `validate_post` ตรวจ)
- เพิ่ม/แก้วิชาและอาจารย์ผู้สอน = แอดมินเท่านั้น (mockup เดิมให้ทุกคนแก้ได้)
- สมัครได้เฉพาะโดเมนในตาราง `allowed_email_domains` (`dome.tu.ac.th`, `tu.ac.th`) — แอดมินเพิ่ม `gmail.com` ชั่วคราวเพื่อทดสอบได้

### เฟส 1 — แยกไฟล์ ✅ (7 พ.ย. 2569 — ทำหลังเฟส 3–5)
- [x] แยก `App.js` (3,800 บรรทัด) เป็น 17 โมดูลด้วยสคริปต์ Babel: คำนวณ import ของแต่ละไฟล์จาก scope analysis, ตรวจไม่มี import วน
- [x] ตรวจไม่มีตัวแปรที่อ้างถึงแต่ไม่มีการประกาศ + bundle เว็บผ่าน + render test ผ่าน
- **ตัดสินใจ: ไม่ย้ายไป expo-router** — คง navigation แบบ stack ที่ทำเองไว้ เพราะเปลี่ยนแล้วต้องเขียนการนำทางใหม่ทั้งหมดโดยผู้ใช้ไม่เห็นความต่าง; ย้ายภายหลังได้ถ้าต้องการ deep link / URL ต่อหน้า
- ยังเป็น JavaScript (มี `src/types/database.ts` + TypeScript ติดตั้งไว้แล้ว ย้ายทีละไฟล์ได้)

### เฟส 2 — Auth + โปรไฟล์ ✅ (7 พ.ย. 2569 — ทำก่อนเฟส 1 ตามที่ตกลง)
- [x] `src/lib/supabase.js` (client + AsyncStorage), `src/api/profiles.js` (แปลงแถว ↔ ผู้ใช้แบบแอป, บันทึกโปรไฟล์/รูป/วิชาที่ถนัด)
- [x] หน้า อีเมล → รหัส OTP → สร้างโปรไฟล์ (`EmailLoginScreen`, `VerifyCodeScreen`, `OnboardingScreen`) — ถ้าไม่มี `.env.local` แอปกลับไปโหมดเดโมเดิม
- [x] แก้โปรไฟล์ / ออกจากระบบ / จำ session ข้ามการเปิดแอป
- [x] ทดสอบผ่าน API ด้วย JWT จริง 14 ข้อ + ทดสอบบนเว็บว่าอีเมลนอก มธ. ถูกปฏิเสธ
- [x] แก้บั๊ก: ลบรูปโปรไฟล์เก่าไม่ได้ (ขาด SELECT policy) → migration `0600`
- [x] ล็อกรหัสนักศึกษาฝั่ง DB (แก้ได้เฉพาะแอดมิน) → migration `0700`
- [ ] **ต้องทำใน Supabase Dashboard เอง** (MCP ตั้งค่า Auth ไม่ได้):
  1. Authentication → Email Templates → **Magic Link** และ **Confirm signup**: ใส่ `{{ .Token }}` ในเนื้อหา เช่น `<p>รหัสเข้าสู่ระบบ Pass On: <b>{{ .Token }}</b></p>` — ค่าเริ่มต้นส่งแค่ลิงก์ ไม่มีรหัส
  2. อีเมลในตัวของ Supabase ส่งได้ไม่กี่ฉบับต่อชั่วโมง — ก่อนให้เพื่อนใช้ ตั้ง Custom SMTP (Authentication → SMTP Settings เช่น Resend / Brevo ฟรี)
- [ ] ผู้ใช้ตัวอย่าง (SEED) ยังแสดงคู่กับผู้ใช้จริงจนกว่าโพสต์จะย้ายในเฟส 3
- [ ] โหมดแอดมินยังใช้ PIN เดิม — เปลี่ยนเป็น `role` ในเฟส 4

### เฟส 3 — โพสต์ ไฟล์ ไลก์ คอมเมนต์ ✅ (7 พ.ย. 2569)
- [x] `src/api/content.js`: โหลดทุกอย่างเป็นรูปแบบ `data` เดิม → หน้าจอแทบไม่ต้องแก้
- [x] ไฟล์แนบเข้า Storage (bucket private + signed URL) แทน base64 เป็นชิ้น, จำกัด 10 MB/ไฟล์, ลบโพสต์ = ลบไฟล์
- [x] ไลก์/คอมเมนต์เป็นแถวในตาราง (optimistic update), ลบคอมเมนต์ของตัวเองได้
- [x] กระทู้ = posts หมวด `question`; เจ้าของเลือก/ยกเลิก "คำตอบที่ดีที่สุด" ได้
- [x] Realtime แทน poll 5 วินาที, นับยอดวิวผ่าน `increment_view`
- [x] ลบโพสต์ของตัวเองได้

### เฟส 4 — แอดมิน + ส่วนเสริม ✅ (7 พ.ย. 2569)
- [x] แอดมิน = `profiles.role` (ลบ PIN) — ปุ่มแอดมินแสดงเฉพาะแอดมิน, RLS ตรวจซ้ำฝั่ง DB
- [x] ตารางสอบกลาง + วันสอบส่วนตัวใน `exam_events` (ซิงก์ข้ามเครื่อง), ประกาศใน `announcements` (มีสี)
- [x] "วิชาที่กำลังเรียน" บนหน้าแรก + ชวนแชร์สรุปเมื่อเรียนจบ
- [x] รายงานเนื้อหา (`reports`) + แท็บรายงานในแผงแอดมิน (เปิดดู / ซ่อน / ปิดเรื่อง)
- [x] เพิ่มวิชา / แก้อาจารย์ผู้สอน = แอดมินเท่านั้น, รายชื่ออาจารย์อ่านจากตาราง `instructors`

### เฟส 5 — ปล่อยใช้ ✅ บางส่วน (7 พ.ย. 2569)
- [x] ลบ Firestore client, `firestore.rules`, `firebaseConfig`, `SEED`, โหมดเก็บในเครื่อง, PIN แอดมิน, ล็อกอินด้วยรหัสนักศึกษา
- [x] Advisors: เหลือ 2 คำเตือนที่ตั้งใจ (`increment_view` เรียกจากแอป, leaked-password ไม่เกี่ยวเพราะใช้ OTP)
- [x] index ตามเอกสารออกแบบ (+ index ของ foreign key ทุกตัว)
- [x] GitHub Pages workflow ส่ง env, `eas.json` มีค่า Supabase, README ใหม่
- [x] ทดสอบ: data layer ตัวจริงกับ Supabase 27 ข้อ (ผู้ใช้ทดสอบ 2 คน) + render test 9 ข้อ (`npm test`) + ทดสอบบนเว็บ (ส่วนก่อนล็อกอิน)
- [x] แก้บั๊กที่เจอจากการทดสอบ: แอดมินลบโพสต์คนอื่นแล้วไฟล์ค้าง, ตั้งแอดมินจาก SQL Editor ไม่ได้ (migration `1000`)
- [ ] **ต้องทำเอง**: ตั้ง Email Template ให้มี `{{ .Token }}`, ตั้ง Custom SMTP, ตั้งแอดมินคนแรก, ตั้ง GitHub Variables (ดู README)
- [ ] **ยังไม่ได้ทดสอบจริง**: ล็อกอินด้วย OTP จากอีเมลจริง, เปิดบนมือถือ (Expo Go / APK), อัปโหลดไฟล์จากมือถือ
- [ ] ทดลองกับเพื่อน dX 5–10 คน เก็บ feedback

## 7. ความเสี่ยงที่ควรรู้

- **โควตาแพ็กเกจฟรี Supabase**: DB 500 MB, Storage 1 GB, project หยุดเองถ้าไม่มีคนใช้ 7 วัน — พอสำหรับรายวิชา ถ้ามีไฟล์ PDF เยอะควรจำกัดขนาด (เช่น 10 MB/ไฟล์) และย่อรูปเหมือนเดิม
- **เว็บบน GitHub Pages + OTP**: ใช้ได้เพราะ OTP ไม่ต้อง redirect ถ้าอนาคตใช้ magic link/Google ต้องตั้ง redirect URL ให้ครบทุก platform
- **ข้อมูลเดิมใน Firestore**: ถ้ามีข้อมูลจริงที่อยากเก็บ ต้องเขียนสคริปต์ย้าย (ผู้ใช้เดิมไม่มีอีเมล ต้องให้สมัครใหม่แล้วจับคู่ด้วยรหัสนักศึกษา) ถ้าเป็นแค่ข้อมูลเดโม ข้ามได้
- **ขนาดงานเฟส 1**: แยก 3,800 บรรทัดเป็นงานที่ใหญ่ที่สุด ทำทีละหน้าและ commit บ่อย ๆ
