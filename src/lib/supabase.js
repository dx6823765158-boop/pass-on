import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ค่ามาจาก .env.local (ดู .env.example) — Expo อ่านตัวแปรที่ขึ้นต้นด้วย EXPO_PUBLIC_ ให้อัตโนมัติ
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

/** ไม่ได้ตั้งค่า → แอปกลับไปทำงานแบบเดโม (ล็อกอินด้วยรหัสนักศึกษา เก็บในเครื่อง) */
export const USE_SUPABASE = !!(url && key);

export const supabase = USE_SUPABASE
  ? createClient(url, key, {
      auth: {
        // ตอน export เว็บแบบ static (SSR) ไม่มี window — ใช้ storage ของ supabase เองแทน
        storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
