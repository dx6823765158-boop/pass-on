/**
 * ทดสอบการแสดงผลทุกหน้าหลังล็อกอิน — mock เฉพาะชั้นข้อมูล (Supabase) ส่วน UI เป็นโค้ดจริงทั้งหมด
 * รัน: npm test
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

const NOW = Date.now();
const iso = (h) => new Date(NOW - h * 3600e3).toISOString();

const ME = {
  uid: 'u1', role: 'admin', studentId: '6612345678', name: 'พี่มิ้นท์', year: 'ปี 3', bio: 'ชอบสรุปเป็นภาพ', color: 'pink',
  emoji: '🎨', photo: null, avatarPath: null, pattern: 'confetti', frame: 'rainbow', shape: 'squircle',
  status: { emoji: '🙋', text: 'ถามได้เลย' }, interests: ['Design'], favCourses: ['dx212'], links: { gh: 'mint' }, createdAt: iso(900),
};
const OTHER = { ...ME, uid: 'u2', role: 'student', studentId: '6611111111', name: 'พี่บอส', favCourses: [], links: {} };

const DATA = () => ({
  courses: [
    { id: 'dx212', dbId: 1, code: 'DX212', name: 'Mobile Programming', nameTh: '', semester: '1/2026', track: '', credits: 3, instructor: 'อ.ทดสอบ', icon: 'smartphone' },
    { id: 'dx110', dbId: 2, code: 'DX110', name: 'Fundamental of Programming', nameTh: '', semester: '2/2025', track: '', credits: 3, instructor: '', icon: 'code' },
  ],
  instructors: [{ id: 1, name: 'อ.ทดสอบ', en: 'Test', role: 'อาจารย์ประจำหลักสูตร', group: 'อาจารย์ประจำหลักสูตร' }],
  users: [ME, OTHER],
  posts: [{
    id: '1', type: 'summary', courseId: 'dx212', title: 'สรุป Expo ก่อนสอบ', content: 'เนื้อหาสรุป', semester: '1/2026',
    authorId: OTHER.studentId, authorName: OTHER.name, createdAt: iso(5), hidden: false, views: 3,
    likes: [ME.studentId],
    comments: [{ id: '5', authorId: ME.studentId, author: ME.name, text: 'ขอบคุณครับ', createdAt: iso(4), accepted: false, parentId: null }],
    attachments: [{ id: '9', name: 'notes.pdf', mime: 'application/pdf', size: 2048, path: 'u2/1/notes.pdf', thumbPath: null, thumb: null }],
  }],
  threads: [{
    id: '2', title: 'Expo navigation ทำยังไง', body: 'ขอวิธีหน่อย', courseId: 'dx212', courseCode: 'DX212',
    authorId: ME.studentId, authorName: ME.name, createdAt: iso(3), hidden: false,
    replies: [{ id: '6', authorId: OTHER.studentId, author: OTHER.name, text: 'ใช้ stack แบบนี้', createdAt: iso(2), accepted: true, parentId: null }],
  }],
  events: [{ id: '3', title: 'Final DX212', kind: 'final', courseId: 'dx212', date: new Date(NOW + 5 * 86400e3).toISOString(), place: 'SC1001' }],
  myEvents: [],
  config: { home: { id: 1, text: 'ประกาศทดสอบจากแอดมิน', color: 'pink' } },
  enrollments: [{ id: '4', courseId: 'dx110', academicYear: 2026, term: 1, status: 'completed' }],
});

let mockSession = { user: { id: 'u1' } };
let mockProfile = ME;
jest.mock('../src/lib/supabase', () => ({
  USE_SUPABASE: true,
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: mockSession } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signOut: jest.fn(async () => ({})),
      signInWithOtp: jest.fn(async () => ({ error: null })),
      verifyOtp: jest.fn(async () => ({ error: null })),
    },
  },
}));
jest.mock('../src/api/profiles', () => ({
  fetchMyProfile: jest.fn(async () => mockProfile),
  isStudentIdTaken: jest.fn(async () => false),
  saveMyProfile: jest.fn(async (uid, p) => ({ ...p, uid, role: 'student' })),
  authErrorMessage: (e) => String((e && e.message) || e),
}));
jest.mock('../src/api/content', () => {
  const ok = () => jest.fn(async () => undefined);
  return {
    loadAll: jest.fn(), subscribeChanges: jest.fn(() => () => {}), loadReports: jest.fn(async () => [
      { id: '7', postId: '1', commentId: null, reporterId: '6611111111', reason: 'สแปม / โฆษณา', createdAt: new Date().toISOString() },
    ]),
    setLike: ok(), addComment: ok(), setAccepted: ok(), deleteComment: ok(), incrementView: ok(), createPost: jest.fn(async () => '10'),
    createThread: ok(), deletePost: ok(), setPostHidden: ok(), signedUrl: jest.fn(async () => 'https://example.test/x'), openAttachment: ok(),
    createCourse: ok(), setInstructor: ok(), saveSharedEvent: ok(), addMyEvent: ok(), deleteEvent: ok(), saveAnnouncement: ok(),
    addEnrollment: ok(), setEnrollmentStatus: ok(), removeEnrollment: ok(), reportContent: ok(), resolveReport: ok(),
  };
});
jest.mock('expo-font', () => ({ useFonts: () => [true, null], loadAsync: async () => {}, isLoaded: () => true, isLoading: () => false }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
// โมดูล native ของ Expo ไม่ถูกเรียกใน test นี้ — stub ไว้เพราะ jest-expo หา mock ไม่เจอเมื่อ path โฟลเดอร์มีวงเล็บ/ช่องว่าง
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn(), cacheDirectory: '/tmp/' }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const api = require('../src/api/content');
const App = require('../App').default;

beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { user: { id: 'u1' } };
  mockProfile = ME;
  api.loadAll.mockImplementation(async () => DATA());
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
});

const tab = (label) => fireEvent.press(screen.getAllByText(label).slice(-1)[0]);

test('ยังไม่ล็อกอิน → หน้าต้อนรับ → หน้ากรอกอีเมล', async () => {
  mockSession = null;
  await render(<App />);
  await fireEvent.press(await screen.findByText('เข้าสู่ระบบด้วยอีเมล มธ.'));
  expect(await screen.findByPlaceholderText('ชื่อ.นามสกุล@dome.tu.ac.th')).toBeTruthy();
});

test('ล็อกอินแล้วแต่ยังไม่มีโปรไฟล์ → หน้าสร้างโปรไฟล์', async () => {
  mockProfile = null;
  await render(<App />);
  expect((await screen.findAllByText('สร้างโปรไฟล์')).length).toBe(2); // หัวข้อ + ปุ่ม
  expect(screen.getByPlaceholderText('เช่น 6823765158')).toBeTruthy();
});

test('หน้าแรก: ประกาศ วิชาที่เรียน ชวนแชร์สรุป นับถอยหลัง', async () => {
  await render(<App />);
  expect(await screen.findByText(/สวัสดี, พี่มิ้นท์/)).toBeTruthy();
  expect(screen.getByText('ประกาศทดสอบจากแอดมิน')).toBeTruthy();
  expect(screen.getByText(/เรียน DX110 จบแล้ว/)).toBeTruthy();
  expect(screen.getAllByText(/Final DX212/).length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByText('เพิ่มวิชา'));
  expect(await screen.findByText('วิชาที่เรียนเทอมนี้')).toBeTruthy();
});

test('สรุป → วิชา → รุ่นพี่ → โพสต์: ไฟล์แนบ ไลก์ คอมเมนต์ รายงาน', async () => {
  await render(<App />);
  await screen.findByText(/สวัสดี/);
  await tab('สรุป');
  await fireEvent.press((await screen.findAllByText('DX212'))[0]);
  expect(await screen.findByText('รุ่นพี่ที่แชร์ (1)')).toBeTruthy();
  expect(screen.getByText(/อ.ทดสอบ/)).toBeTruthy();
  await fireEvent.press(screen.getAllByText('พี่บอส')[0]);
  await fireEvent.press(await screen.findByText('สรุป Expo ก่อนสอบ'));
  expect(await screen.findByText('notes.pdf')).toBeTruthy();
  expect(screen.getByText('ขอบคุณครับ')).toBeTruthy();
  await waitFor(() => expect(api.incrementView).toHaveBeenCalledWith('1'));
  await fireEvent.press(screen.getByText(/ถูกใจ 1/));
  await waitFor(() => expect(api.setLike).toHaveBeenCalledWith('u1', '1', false));
  await fireEvent.press(screen.getByText('รายงานเนื้อหาไม่เหมาะสม'));
  await fireEvent.press(await screen.findByText('สแปม / โฆษณา'));
  await waitFor(() => expect(api.reportContent).toHaveBeenCalledWith('1', null, 'สแปม / โฆษณา'));
});

test('กระทู้: คำตอบที่ดีที่สุด + เจ้าของยกเลิกได้', async () => {
  await render(<App />);
  await screen.findByText(/สวัสดี/);
  await tab('ถาม-ตอบ');
  await fireEvent.press(await screen.findByText('Expo navigation ทำยังไง'));
  expect(await screen.findByText('✅ คำตอบที่ดีที่สุด')).toBeTruthy();
  await fireEvent.press(screen.getByText('ยกเลิกคำตอบที่ดีที่สุด'));
  await waitFor(() => expect(api.setAccepted).toHaveBeenCalledWith('6', false));
});

test('โปรไฟล์ + แก้ไขโปรไฟล์ + อาจารย์', async () => {
  await render(<App />);
  await screen.findByText(/สวัสดี/);
  await tab('โปรไฟล์');
  expect(await screen.findByText('แต่งโปรไฟล์')).toBeTruthy();
  await fireEvent.press(screen.getByText('อาจารย์ประจำหลักสูตร dX'));
  expect(await screen.findByText('อ.ทดสอบ')).toBeTruthy();
  await tab('โปรไฟล์');
  await fireEvent.press(await screen.findByText('แต่งโปรไฟล์'));
  expect(await screen.findByText('บันทึกโปรไฟล์')).toBeTruthy();
});

test('แอดมิน: รายงาน ตารางสอบ ประกาศ เนื้อหา ภาพรวม', async () => {
  await render(<App />);
  await screen.findByText(/สวัสดี/);
  await fireEvent.press(screen.getByText('แอดมิน'));
  expect(await screen.findByText(/🚩 สแปม/)).toBeTruthy();
  await fireEvent.press(screen.getByText('ตารางสอบ'));
  expect(await screen.findByText(/Final DX212/)).toBeTruthy();
  await fireEvent.press(screen.getByText('ประกาศ'));
  expect(await screen.findByText('บันทึกประกาศ')).toBeTruthy();
  await fireEvent.press(screen.getByText('จัดการเนื้อหา'));
  expect(await screen.findByText('โพสต์ (1)')).toBeTruthy();
  await fireEvent.press(screen.getByText('ภาพรวม'));
  expect(await screen.findByText('ผู้ใช้')).toBeTruthy();
});

test('ผู้ใช้ทั่วไปไม่เห็นปุ่มแอดมินและเพิ่มวิชา', async () => {
  mockProfile = { ...ME, role: 'student' };
  api.loadAll.mockImplementation(async () => ({ ...DATA(), users: [{ ...ME, role: 'student' }, OTHER] }));
  await render(<App />);
  await screen.findByText(/สวัสดี/);
  expect(screen.queryByText('แอดมิน')).toBeNull();
  await tab('สรุป');
  await screen.findAllByText('DX212');
  expect(screen.queryByText('เพิ่มวิชา')).toBeNull();
});

test('ปุ่ม + เปิดฟอร์มอัปโหลด และส่งโพสต์ได้', async () => {
  await render(<App />);
  await screen.findByText(/สวัสดี/);
  await tab('สรุป');
  await fireEvent.press((await screen.findAllByText('DX212'))[0]);
  await fireEvent.press(await screen.findByText('อัปโหลด'));
  expect(await screen.findByText('แชร์สรุป / ปัญหาที่เจอ')).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText('เช่น สรุปบทที่ 3-5 ก่อนสอบกลางภาค'), 'สรุปใหม่');
  await fireEvent.changeText(screen.getByPlaceholderText(/พิมพ์สรุป ปัญหาที่เจอ/), 'เนื้อหา');
  await fireEvent.press(screen.getByText('โพสต์เลย'));
  await waitFor(() => expect(api.createPost).toHaveBeenCalled());
  expect(api.createPost.mock.calls[0][1]).toMatchObject({ type: 'summary', courseId: 'dx212', title: 'สรุปใหม่', semester: '1/2026' });
});
