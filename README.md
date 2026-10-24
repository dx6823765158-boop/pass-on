<p align="center">
  <img src="assets/icon.png" width="140" alt="Pass On logo" />
</p>

# Pass On · รุ่นพี่สู่รุ่นน้อง

แอปส่งต่อความรู้จากรุ่นพี่สู่รุ่นน้อง สำหรับนักศึกษาหลักสูตร **dX — Digital Transformation & Innovation**
วิทยาลัยนวัตกรรม มหาวิทยาลัยธรรมศาสตร์ (CITU) · โปรเจ็กต์รายวิชา DX212

สร้างด้วย **Expo SDK 54 / React Native 0.81** — รันได้ทั้ง Android, iOS และเว็บจากโค้ดชุดเดียว

## ฟีเจอร์

- **สรุปแนวข้อสอบ / ปัญหาที่เจอ / โปรเจ็กต์รุ่นพี่** แยกตามรายวิชา dX ครบ 4 ปี (58 วิชา ตาม มคอ.2 พ.ศ. 2566)
- **แนบรูปและไฟล์** (PDF, Word, PowerPoint, Excel) สูงสุด 5 ไฟล์/โพสต์ ดูรูปเต็มจอ เปิดไฟล์ได้ทันที
- **กระทู้ถาม-ตอบ** ไลก์ คอมเมนต์
- **โปรไฟล์** รูปโปรไฟล์ สถานะ ลายปก กรอบรูป ความสนใจ วิชาที่ถนัด เลเวล XP และเหรียญสะสม
- **นับถอยหลังสู่การสอบ** (ตารางจากแอดมิน + วันสอบส่วนตัว) พร้อมคำให้กำลังใจที่สลับไปเรื่อย ๆ
- **สภาพอากาศ ฝุ่น PM2.5 และ UV** ที่ มธ. ท่าพระจันทร์ (Open-Meteo) + "วันนี้ควรพก"
- **โหมดแอดมิน** จัดการตารางสอบ ประกาศหน้าแรก ซ่อนเนื้อหา ดูภาพรวม
- รายชื่ออาจารย์หลักสูตร dX จาก citu.tu.ac.th · Dark mode · ฟอนต์ Prompt

## เริ่มใช้งาน (เครื่องตัวเอง)

ต้องมี [Node.js 20+](https://nodejs.org) และแอป **Expo Go** บนมือถือ

```bash
git clone <repo-url>
cd pass-on
npm install
npx expo start
```

- สแกน QR ด้วย Expo Go (Android) หรือกล้อง (iOS) → แอปเปิดบนมือถือ
- กด `w` เพื่อเปิดเวอร์ชันเว็บในเบราว์เซอร์

## ตั้งค่า Firebase (แชร์ข้อมูลกับทุกคน)

ถ้าไม่ตั้งค่า แอปจะทำงานแบบ **เก็บข้อมูลในเครื่อง** (เหมาะกับเดโม)

1. สร้างโปรเจ็กต์ที่ [console.firebase.google.com](https://console.firebase.google.com) → เพิ่ม Web app → คัดลอก `firebaseConfig`
2. **Build → Firestore Database → Create database** (แนะนำ `asia-southeast1`)
3. แท็บ **Rules** → วางเนื้อหาไฟล์ [`firestore.rules`](firestore.rules) → **Publish**
4. วางค่าลงใน `firebaseConfig` ด้านบนของ `App.js`

> แอปคุยกับ Firestore ผ่าน REST API โดยตรง (ไม่ใช้ Firebase SDK) และเก็บไฟล์แนบเป็นชิ้นใน Firestore
> จึงใช้ได้กับ **แพ็กเกจฟรี (Spark)** ไม่ต้องเปิด Firebase Storage

## สร้างไฟล์ APK สำหรับติดตั้งบน Android

```bash
npm install -g eas-cli
eas login            # ใช้บัญชี expo.dev (สมัครฟรี)
eas build -p android --profile preview
```

เมื่อ build เสร็จจะได้ลิงก์ดาวน์โหลดไฟล์ `.apk` ส่งให้เพื่อนติดตั้งได้เลย

## เวอร์ชันเว็บบน GitHub Pages

มี workflow ที่ [`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml) build เว็บและ deploy ให้อัตโนมัติทุกครั้งที่ push ขึ้น `main`
เปิดใช้ครั้งแรก: **Settings → Pages → Source: GitHub Actions** แล้วเว็บจะอยู่ที่ `https://<username>.github.io/<repo>/`

## ตั้งค่าอื่น ๆ (ใน `App.js`)

| ค่า | ใช้ทำอะไร |
|---|---|
| `firebaseConfig` | เชื่อม Firestore |
| `ADMIN_PIN` | PIN เข้าโหมดแอดมิน (ค่าเริ่มต้น `2569` — เปลี่ยนก่อนใช้จริง) |
| `COURSE_LIST` | รายวิชาในหลักสูตร |
| `CHEERS` | คำให้กำลังใจบนหน้าแรก |
| `CAMPUS` | พิกัดสำหรับสภาพอากาศ |

## ข้อควรรู้ด้านความปลอดภัย

ตอนนี้ล็อกอินด้วยรหัสนักศึกษาที่พิมพ์เอง และ PIN แอดมินตรวจในแอปเท่านั้น — เหมาะกับเดโมในรายวิชา
ถ้าจะเปิดใช้จริง ควรเพิ่ม **Firebase Authentication** (เช่น ล็อกอินด้วยอีเมลมหาวิทยาลัย) และกำหนดสิทธิ์แอดมินใน Security Rules

## โครงสร้างโปรเจ็กต์

```
App.js                 แอปทั้งหมด (หน้าจอ, ข้อมูล, สไตล์)
app.json               ชื่อแอป ไอคอน สิทธิ์การเข้าถึงรูป
app.config.js          ตั้ง baseUrl ตอน build เว็บ
eas.json               โปรไฟล์ build APK / production
firestore.rules        Security Rules ของ Firestore
assets/                ไอคอนและ splash จากโลโก้ Pass On
.github/workflows/     deploy เว็บขึ้น GitHub Pages
```
