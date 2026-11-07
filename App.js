/**
 * Pass On (รุ่นพี่บอกต่อ) — React Native / Expo
 * คลังสรุปแนวข้อสอบ กระทู้ถาม-ตอบ และโปรเจ็กต์ของรุ่นพี่ หลักสูตร dX · CITU
 *
 * วิธีใช้ใน Snack (snack.expo.dev):
 *   1) ลบโค้ดเดิมใน App.js ให้ว่างทั้งไฟล์ (Cmd/Ctrl + A → Delete) แล้ววางไฟล์นี้
 *   2) กด "Add dependency" ให้ครบทุกตัวที่ Snack ถามถึง:
 *      @react-native-async-storage/async-storage, expo-image-picker,
 *      expo-image-manipulator, @expo-google-fonts/prompt, expo-font,
 *      expo-document-picker, expo-file-system, expo-sharing, react-native-safe-area-context
 *      (ไม่ต้องติดตั้ง firebase — แอปคุยกับ Firestore ผ่าน REST API โดยตรง)
 *   3) เลือกแท็บ Android หรือสแกน QR ด้วย Expo Go
 *
 * ข้อมูล:
 *   - ใส่ firebaseConfig ด้านล่าง → ทุกเครื่องเห็นข้อมูลเดียวกัน (Firestore, รีเฟรชอัตโนมัติทุก 5 วินาที)
 *   - ปล่อย config ว่าง → เก็บในเครื่องนี้เท่านั้น (AsyncStorage)
 */
import React, { useEffect, useMemo, useState, useCallback, createContext, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, Modal, Image,
  StyleSheet, StatusBar, useColorScheme, BackHandler, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, Linking, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFonts } from 'expo-font';
// นำเข้าเฉพาะ 4 น้ำหนักที่ใช้ — ลดขนาดแอป (แพ็กเกจเต็มมี 18 น้ำหนัก)
import { Prompt_400Regular } from '@expo-google-fonts/prompt/400Regular';
import { Prompt_500Medium } from '@expo-google-fonts/prompt/500Medium';
import { Prompt_600SemiBold } from '@expo-google-fonts/prompt/600SemiBold';
import { Prompt_700Bold } from '@expo-google-fonts/prompt/700Bold';
import { supabase, USE_SUPABASE } from './src/lib/supabase';
import { fetchMyProfile, fetchAllProfiles, isStudentIdTaken, saveMyProfile, authErrorMessage } from './src/api/profiles';

/* ============================ Firebase config ============================
 * วางค่าจาก Firebase Console → Project settings → Your apps → Web app
 * ถ้าปล่อยว่าง แอปจะทำงานแบบ "เก็บในเครื่อง" อัตโนมัติ
 */
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
const USE_FIREBASE = !!(firebaseConfig.apiKey && firebaseConfig.projectId);
const POLL_MS = 5000;

/* ============================ แอดมิน ============================
 * PIN เข้าโหมดแอดมิน — เปลี่ยนเป็นเลขของทีมก่อนใช้งานจริง
 * หมายเหตุ: PIN ตรวจในแอปเท่านั้น ยังไม่ใช่ระบบความปลอดภัยจริง (ต้องใช้ Firebase Auth)
 */
const ADMIN_PIN = '2569';

/* ============================ สภาพอากาศ ============================ */
const CAMPUS = { name: 'มธ. ท่าพระจันทร์', lat: 13.7563, lon: 100.4903 };
const WEATHER_REFRESH_MS = 15 * 60 * 1000;

/* ============================ Firestore REST client ============================
 * ใช้ fetch เรียก Firestore REST API แทน Firebase SDK (Snack bundle แพ็กเกจ firebase ไม่ได้)
 * Security Rules ใน firestore.rules ยังมีผลเหมือนเดิมทุกข้อ
 */
const FS_DOCS = `projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const FS_BASE = `https://firestore.googleapis.com/v1/${FS_DOCS}`;

function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  switch (typeof v) {
    case 'string': return { stringValue: v };
    case 'boolean': return { booleanValue: v };
    case 'number': return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    case 'object': return { mapValue: { fields: toFields(v, true) } };
    default: return { nullValue: null };
  }
}
/** nested = true → เก็บช่อง id ไว้ด้วย (เช่น id ของคอมเมนต์); ระดับบนสุด id คือชื่อเอกสารอยู่แล้ว */
function toFields(obj, nested) {
  const f = {};
  Object.keys(obj).forEach((k) => { if (obj[k] !== undefined && (nested || k !== 'id')) f[k] = toFs(obj[k]); });
  return f;
}
function fromFs(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFs);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return null;
}
function fromFields(fields) {
  const o = {};
  Object.keys(fields || {}).forEach((k) => { o[k] = fromFs(fields[k]); });
  return o;
}
async function fsReq(path, opts = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(FS_BASE + path + sep + 'key=' + encodeURIComponent(firebaseConfig.apiKey), {
    ...opts, headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = new Error('Firestore ' + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
const fs = {
  async list(col) {
    const out = [];
    let token = '';
    do {
      const j = await fsReq(`/${col}?pageSize=300${token ? '&pageToken=' + encodeURIComponent(token) : ''}`);
      (j.documents || []).forEach((d) => out.push({ ...fromFields(d.fields), id: d.name.split('/').pop() }));
      token = j.nextPageToken || '';
    } while (token);
    return out;
  },
  async get(col, id) {
    try {
      const d = await fsReq(`/${col}/${encodeURIComponent(id)}`);
      return { ...fromFields(d.fields), id };
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  },
  /** สร้างหรือเขียนทับทั้งเอกสาร */
  set(col, id, data) {
    return fsReq(`/${col}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ fields: toFields(data) }) });
  },
  /** แก้เฉพาะบางช่อง */
  patch(col, id, data) {
    const mask = Object.keys(data).map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    return fsReq(`/${col}/${encodeURIComponent(id)}?${mask}&currentDocument.exists=true`, { method: 'PATCH', body: JSON.stringify({ fields: toFields(data) }) });
  },
  /** arrayUnion / arrayRemove แบบ atomic (กดพร้อมกันหลายเครื่องก็ไม่ทับกัน) */
  arrayOp(col, id, field, values, remove) {
    const t = { fieldPath: field };
    t[remove ? 'removeAllFromArray' : 'appendMissingElements'] = { values: values.map(toFs) };
    return fsReq(':commit', {
      method: 'POST',
      body: JSON.stringify({ writes: [{ transform: { document: `${FS_DOCS}/${col}/${id}`, fieldTransforms: [t] }, currentDocument: { exists: true } }] }),
    });
  },
  del(col, id) {
    return fsReq(`/${col}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  /** เขียนหลายเอกสารพร้อมกัน — items: [{ col, id, data }] */
  batchSet(items) {
    if (!items.length) return Promise.resolve();
    return fsReq(':commit', {
      method: 'POST',
      body: JSON.stringify({ writes: items.map(({ col, id, data }) => ({ update: { name: `${FS_DOCS}/${col}/${id}`, fields: toFields(data) } })) }),
    });
  },
};

/* ============================ brand ============================ */
const LOGO = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWgAAAEeCAMAAACQQH87AAABIFBMVEXzzKTo3dnmqZ9mVDLWqWSt39ppaGRNTEqko6CpjlVd7obOYlj33dvBIRZtbWn20bbx5+ojHx7//3+LdUmJtu8+jvSqqKSm8rX71Wm7KB7ERDlFOSb10sVT63b/AAD30DL//wBqneGEbTw9PTqVk492dgCm32nOzrj10rpAPjyEgn11kbuBfXoAfwA77nR/AABVVVXFv7kAAAAlJSX49e7+zWVGk/f+yQE993LDFgj+/v7+1G0aGho1NDPW1M9C9XVhYV35yo1MTEhDQ0NCjvG7DADLy8Vvpu3789L/f3+5FQgdHiDQ+NSMiod/f3/77LH07Of65ZEeICBBQD6YlpP21s0qJBtt8ZL41Uu61fQ5NTD2zbD55/WQ86rW5/b4zSnFio8wAAAAYHRSTlPi///+/v//lf/+//9P/2idJvwC////Of/+////j/8B/wH//7pJAv8kdrRJ/1QC/wIDLAD+//7/////B/7+zf//cPWW////////Av/+/0MC/////6z/cP7//v/+sC////8aMvoFAAAW8ElEQVR42u2di1/TSNfHE9pKKRRaRFovgLi67u6z7/s+T0sRk0qscim00tYFW5HC//9fvLlnksw1TUafzJx1Bbn4kS+H3/zOmTMTpSWDSygSgQSdS9Da1ZsrltBoQyKWGf1zMnr7y/YX+thmyGiZ1ADot8tttvhAG+uStA9aa2m/tTMLSRoE/aEtSf/Xg5akeYGWpHmBlqR5gZakeYGWpHmBFp40N9DtdZnRfEC3X0vQfEB/2JaguYAWmzRP0EKT5gpaZNJ8QQtMmjNocUnzBi0sae6gRSXNH7SgpH8CaDFJ/wzQQpL+KaBFJP1zQAtI+ieBbte3JWiZ07kCLRrpnwfaIv3mivTve6MxhgQNIf1LULnKP+j28uu/0htblRm9YNqzxW+f2GJ9fVuC5hR8tuclaHvkRILmslRI0BK0BC1BS9AStAQtQUvQErQELUFL0BK0BC1BS9AStAQtQUvQErQELUFL0BK0BC03ZyXo7OOLBC1BS9ASdALQ2r/D83svM5jrk6Db7b9kRvOJ11rNytdazf6thsxcmdELxm1kInUZFZ+2JWheyS9B84kPd0kFRIJmi48yo3/xcl2C/uVBd/1od78OBl+d/8MvBtgXX7EvgI9ud38Z0LWkp7iSg37kx+3nzIMD6i4mgo6qxn0xvD3gGcdnmUe5fI2I8vXnwcId1aSgu48OxgfCxGcvp7cTn/9MDLosDuYDxeP8W2LlSC4dqkCgr7uL78UkBG0qh0DxqOtX4G94gxZJOY79Ajy5ciSWjmMRlWOZe5tUUOX4wh+0SMqh+spRW6D3nxC0IhDocjcoCzlndPezkMqx0KBNMtAiSfT4tr1wWZgYdFlE5fhHW2R7NhHo27FUDh6gxTJ3KTSUEoMWSTnO0igLk0rHsYgSveAUdQLQgirH68WuIkwCWjaUOEnHmYjK8UnjLR2CloV/c58mFUqiVUA5rniDLguqHBpn0LIs5ANa0IZSbdF7ptlBy4YSJ+lQRQS9+JlPVtC/lHL0vWA2E0PKsnDgN5S4g74O/hlL+FBUXPKr34mB+fT+aKLPZnsPVuw97M1m+mRE8aM2LM3n0+m0YoX5cjpvlHDIz+ruV/3nwsrBLh1BQ0l9enqJjadPV1eXEF/+/eHJyeGh+ct6ab8KvrD+Ozw5R0HWZw/vIDHTR5jcHjYaU8M4ioYxnZdQn7KSUkMpAWiwLFy6fE+K09PLp6tLsK+hZDHGx5MtKObJ7B06ZhMEs1Kl4oINWBuG8wej0iCYuy/8Qa8E/4zV0/c0cXq5CtkzPydyPjyBZFpff3iHjxlsg75RMYkChIHfnVcrpSwbSglA14MvY1ytvqeL06expP5OTujDQzWezSTMZjyMYqIxPSKEcWRAkvo6ReVgBQ2MnyuX76njMkr6nAb0feSTRrN3NBElPd85MsikdxoZloXMoEFzt3RKD/r9UyWyFFJEdC2kSWdHPcAlcVixE/aIGJWo/1BvgwmlK96ggbJwtcoA+nQ19DVsPaGQ6AjoyTvqmIQ4GxSUrQ9qIDexUpBoVulQAXP3niVC4kGV0BHT0aTnDKT0sHJEHTvDDJWDDXRIOS6ZQIdSukSj0GHTwZDPZngq3a/QiIZnQRqIhtJ2Gg8uYwNdZjZ3XlRX2bxdxHSMmDh72tFvHIVsHd53HM0zVA5G6QDKwmr1PRtplc3bhUxHf48NtO7+GOzQJrSNegpXjo8t3tLBWBZGfIfK5u1CpkN/lwT06PcjhoiADpTjSyqPPGQCDShH8RRacZuBIu2DVuNQ989jNuTJPlE4HvYecKD7zR2IEBuV6bQCz/MQ6LNuimUhK2gFK9GXVatnt1q9JIDeiif0fdzvAWthH1aoPOijfr8/0tGgJ7/HhWNnPhxa/SXoIjnNYkIpCWhgtxBm7k6LzruKl1iNjnu7k62D/fgbv2MT2iv/oN8EG3Rf30GXf3NiRn9OsaHECJpUFvpWGWpIfNClePKq91jTMcPVJDrKdUx+jxaEgK9oQPqlIddxlsrBlYSgCebORwlbKKtV78chLsfnB+oJxnSMcCUJPKNHTkIbyCp7HqsXjTDo69TmDBJIB1AWVnElCQy0/964tzPVGFLBnGNrQh27Tj70LcsR73AE2jCFGelhZmVhAPq3xcvCoMjGgoZ4u3vI+niyj10KdWzFaOX7aOcIDXoIM9hgV8lvRddrKT3PWnFeLC+uHIFRxgm4ClsKIXISmI4RrpuBXgsVSMvORzmPfROM8FqYclkYgP7ENn7+rIqrsXHfBkjfTj0YH2JMxwTXzVAfUBIN8XZHhqfCFRe0YWuzI9f/O89SOehBg8qhXiLNHWLrpfoM5e2enMO7eSq+beemdH8CCWuLFioOfkqXGqV49GFl4Vv+oK8J5k7Bbb14El2CLYXQ5sc9ofzW8cMcJXiHbko30FFO4SaUxKDxZWE1aBoVMRK9DyUat9aA6UD1OfCkG4j2Ph3p9JWDGvQAaChBy8JVrIC734Z46trtfUgBvkVuKM1wpEsGvOcc37HCHlzZTslz0IOmN3c45YA0or9D3wx0OibvkpAeGnDtMGhI+xNKH1JTDnrQ1OZuFa0cKrwZeo/dXsH0/PdGaNAV5E5KpUQCvZLKfQbJQAMNJZir8FJ2DE3o6rMxom9nA1WxnQ5c0/8BTXqK6vmbOd2gVY4vrf/hDBpUDqg2eMoxfoZ+7z1iG6V0gt1e0Sk3vCEijRBqY87nyFsS0CRz52agCu3cubpSgi+FsAY1uL2iYuc5muiURm0Xmm/Fkr5OvSxkkI5jrES7yqEuVaEbL0Wkt1Ph7Y+TLfodcJTNKxmYDW+soc7A3NGCDpWFUHO3tLRUXK2e4rYLUS26cdx0PAmtV/0Z/WASOArGNpgEUY5ai/diCHoO+CjYJXq70NNvlIm7x3U6aDbBUaSnR4ZhoM3HkFQWpqkctNJxlnigw7ccKmqi4Dt5kHSEH7tD2LwhVqaRNi8T5aADHSoLWQc6vFJmC7EUwgrw+CDpHuOork/aQA/bwUmr6U4oMYHuPk4+0OGthDCBUBGd0yfxQxXqLAlpr/FsIAz1kE9DiR40aaCDYuYO7eHOqQ5VEFbEPdSKaOCmwmCkH6U8Z8ACGjyVzCbRp6vup46RZTbkPU9gP9N9PdGK2DBw6jGNf4KvHK+5gyaZOxxnFTNAeo9aJCOmg85PN5HHhHAjpHOkcnxIVTnoQBPNHSmfcUXJ9xPyWkhDGtn3GFYw1sMYopTjU4t7Rt+qiZQDPCMEo6micx11gQLW5s0wnTz01P8U1VBa5w46mXKcXq6q2LMU58RVEkYa18pDtqcxhjq6Hp61s1EOKtDXzObu1MRMOEvhd5zPD/GdDnrzMUF/2hxBOqbSqd2hlEQ6jhmUo1o1S/HLZ8VwabeF1uF7upOcNKR1zKfNd+i041FGykEBug6UheNnsBYpePy7WoWc/x5jjgLBpqWxFxiiSc9wnzZHiccU2lBqv02zLKQCDZaF0IGOVQW4z0AdUx78xvi+ffw9BUjSD308aVjlEikPs2koUYJW6Hr+mDjHjBNAVKWsOpcYQALbzLNBDyGBGmx0UA95KAcFaEJZePqMeJkVxNsFMgwZuysjd7DcnJ2gQTd2jFi4OTvcIdqOcTYNJSrQ5J4/OaExJck4vu2yv4RM2xlmNN3pd0wxKjyHqnRFzbyhRAe6TDvQgQqYr9jCvLPcQ04ZTLAl4swe54hM+QNnj0sG6eRKRg0lKtCkhlKVKNGwg9+le/XeDPW+FH/fioKcbVSwsx46ZBLMAEQYVouH5vwD5fiLO2hQOXADHUwJjY19x4PPsAcqHhD5DpvmwM35H4XO2isZNZSoQF+HBjoukQMd6Cm4EzbQ/7JBq9gGHRy0Cp9PmmNBg0fty9kpB1k6jvHm7ilROc4ZM/q6iFThEf4UAHTEwDBKwDyegZXoFB7EmRR06A5j9EAHm7fDx0oRpRzBLsoEke9xXwH29qGDj3PYbGMtdeUggi4f0BziZPR22Cj2UNqg46fERvDDVvPQzHSU9Y4Kn1DintFnlIc401oKzbVQIZk7xEoJT9lAOaBDYhUuZSEZdMjcVXFz/gzejmItnGBbGahvQwOiHEGFDasMwSurgoZS6mUhEfTC5o45oZ84oHUsaB0h4DCJrmBGxAy4cvyZvrkjgl60LGT1dmZdWEQ16Py1EKkrU9wxTYj1M0J3sGWqHCTpUPEDHURzx+rtXHeHLEiQG4f2d2EKyWivIIFxDvU5wAkl3qBDdxg/S2DuYGN1J0HA9PsaaTpM2zEZjRBXk07cc5rxAtyYl4bDBmSHJXKpYDnDspAI+ppg7pYSeLtzMCDSoaBBk8ZnKtA7qY7ge+DWQOmYT0OJLB3HtIc46ft2+wQJt7dXmEGP3JPHBmx0A4LaiF10NwYmlK44gx6QykJSzx+yexIeQoKYv/1xglvBJoQDQhRXNy5lqxxY0CHlSGDu7okXjp4fIgZJZ0yc9QPsZhUi5ogJJY27dITKwgTmrnRCmCRAbwk02QUafoEPeupuiri38e8Wb9D152PaQ5zsW1jI+cYS882NwE2kDKArB4gJpbtMJBoHGpwzgB3wJikHpG8XGXwuoTVcT8CZdD4I4q7j5u6fbCQaC7pMGOhYYk7oyDzuFvpQhUK7HOp9ioPJ8evvDjjNNtKABodIE/T8VfLd2+eYQdIRlcOLzurag6MG6VrdaWzmzFeO9n+yUQ4M6FBZmKDnD0nX6FDdPu5bMdpjTGc/pwlKXZlzO7hCB5pUFhbZ+3b39HMI5CdUPOjQemleCT+c4ij8WJDKfMjtyBuldITLwlMwqqfVKsHcmQntP8LGfYxN9AzQ9ydO68P/kOjpFVVHZvXDbIKatBvOp1DE9gWw8IsNVKAV/X+cQYeUY+nps2hUV/ESvXUej8hnlMgf0h9NZrHHCD3gHyFksW7Mp5WQVhvGdDovEQ/LfshKOTCgwcfpjcfmLzAOOD49st8fjSaTSVPX9WZzMhmpdM8gGw5LpUZjbkWjURoOqe5QWtb4S4dAz0oGL+XmDVqoZyVzUA40aJGeeJp1QwkLWqQnnmZeFmJAi/SsZHBC6YozaKGUYyWzgysUoIVUjo8t/tIh0LOSs51QwoMWSjmus25F40CLpByPeCgHSjqOxeEcNJS+ZKgccNCyLOQFWsiycLnFXTq6iogNpXX+oEUqC0HluOIMWtiG0kveoMtSOfhIhyqgcmRaFsJBy4YSL9DXshUND03TUpUOgcrCM6Ch9IaG10V6oMUsCykmlLRWrWZ+lJYaaCEbSus0yXyjvKi1Eko5RDoEmjMAG0oUEr2h95QbLRnqOGhRy0KycmiK3un0fty1WpspgDbN3Vg85VimUY67ngm601FemDWktjhoISeU/iJXK5uttV7Hjt6PNfOP2qLSUS5fR6N8nJMYo5SDYs5gt7VhYzazWu+xKzXEdUCinZO4/RwKP6GXqST6h97xwkxqrXWhLdrryG8g8ofC3JkuWglAm6gZnZ5goBFBoRyaL9EeaWWNpXyRoClvQjHLlTBoSz9q9DW5C3pdaNAfaZQDlGgvrPJlV6MHfdXaFhr0WxrlgIHWbadHpR9uRmsCp3SdpkNqlitKHLS9KGpU+qF4r2yv/5M4/lxeX//4XxrrX2o0CbkZXQvDiyJZP5RQWztptHIfV60/EKCtpL4jJ7XSEj5otgptiW4iSVuLIqH9IWJGa3Rf64V2YcWm9dvbixpcou2YOT09TciM3t20wyZls/Lj5e7Ll7utXca/bw2pHEFS41CLLB3YfK5ptdpd7e7O/t+MFzoWdNN0ene4SjG3oGu1NSdurP/MsH+z4sUL89eLDTB+AKH8ULzogWHC7ODDTuoLsUBbbswLG5jFrdPrKFaVYeemzhgdirCd3pUmEuiL1o3dObZ+Kz4uWLFSNG1Ds5Nt2D29C6GkY8PN25XCt+5gUB/Uu/UVvZN52IsirFGdT9DuRqqZzoXuV6/U/vqNB2kd4fSU3Eq0bjqBTqEONjUKHECbayLU6Sl5leiek8/h/lGRC+mO7fQuBADt9jT1xxHO30zQgY2wnISeDflevKen5DOhrYJZL35zL7PtBqD14qvHVrwq6kXbi3QyQq2stUKLopJXiTaz1RWOb4XHtwHogrUrW+8+7zw23Ui92y1k6vS0vGe05aLdhO6+0hUX+XMzjW/d60C9CfTsTF+4/ZFH0LvWOGJHd1E+93O7WzBttSsnj775N7Bmt0D2Ntb8bd88gnZddGHgg3z+1X3Vk5O2PzvTzdLzOUmdW9CbrVrPVw5TGvRiYDqee3y954+ZypId6Kbt9LT8ZrTpovWVuq8cjs37+jwwIsEC2c24XFRM+3GRT9CaI9G+Lnfc+tCS6FeOctQtERn4aZ5x8WLLtJJTifbthaUcThpbrY5CO1ggB+6rmYHW3R51XqXDmhj3lcOyzq79uC36js9aIAv2AjnItP/hNKhbuQV9Azq6ppu7g4KP3K4Qv2Vro/VIzaLkU6I9e2E5ukBE3CZTvRD0QbKUaEs2NvNbGVoS7dsLWzn8V4tAjeIskBkqR2TWNH+gN22Jdh1dwReRQcGvFetF31pnZ+56kSNFeczom17TKwutaiQQkUJQlK9kqRxNt3mX6zapI9GBowNExENe0IE0z4bzi9geSx5BK4GjC5WFrlhbcuE38TJRDuvQ1lXet7IsidZDZaHXW/I3XIIFMpO9LfjubO5AX5kuGlUW+iVKoNapg9Z78IO1Sg4l2l/q7Nyt+z3/QDm8vmn65s5eBTch/7AcglbAhhLQ83/MoSy0ZAM+/Z830M7ReN/RdWJl4QAoC2/TlmhLNhBTjnkDvdlaC5eFdU9EQmVhN9WyUPdk406gaVLLRYNl4SBSFgLKkWZZqMdrwVyDdlw0uFvo72cFRiObstCebkT/y5S8KYcp0a4uW3SDrrQn1mBZqKfcQsIdYskZaGvoLvAUzaJv47wSZZBNWWjJxq5Ah4VcF+2WfYXHDmdbl1951hrcfElzI4VwNC13oBUfpJmz7uxdwd+56mZQFuq9DYqrO5ScKYe9XfgtPERqrX+hstAb6GimtwqyHFHOBei1YOguNKybWVlIPsqZR9DuBVOh+XP7QIXr+KyZf78spFAOd5K6h5GNG8q7lZScSbQ9gF785h9c6T4v2m9ps8wZuKPq9qm5Hz82bm4UpGys0d5BkyvQm+4dgPrK83p3MBh06/XHHecN3UHXOpxlKUfdfM/gK6wsdPPXOZa4sbG2tnZnn3TXoOfAm7Z5pr1qUMmXRLv3HumdFWuc/9VK0T29uVJ4ZL/BftUJ29yBBzYtvmb+/nGzVrurAWeNdxEH7vXQOIFQoF+2/tBDP/z+ERXgj+BpWCd5f9jHlP389f+2C23TubvBvSsz2SqYQ9Che49i1q3ZbLqYOw5gSPLaPxYXF5sh4Jp9lg62kXLBfu9djnrRQN8yurrZ6mCK783N2t0dKA7mr5ebm9oF9O4RyEVsxBZS3kFHLtUABcLUhxtHHcDkdbVhdxfrGV8orC2kvPvoDedcsg9YcVc3K3/B1c26MIX63pxd91x5ZCMl2W27eWl0KPZpStuc3TiLG7BUWvl7wXwvkTPXnsw85xb0C6u6qIXzt3Vh3fiT/OKnsI1uMt/+ms/uHWDOXm7a7mx30b8zfLWgzrwK5hK0u8BdpHlxWchGO5eht4QHvZvBxXDBHY5Nio0UcTI6u7reWgW1ZOksQdOB1t0Dx3et5A8uk6DJcuS4O/sg28IPJZNBsNH20xMWWQEkaDLoH/oiq6AEzVBv+udfJehsQa8t8CBDCZo2amtaCgZdgqazeC0JmgPmNOpNCZpTSNASdL7i/wESjsy+ZWRmdQAAAABJRU5ErkJggg==' };
const LOGO_RATIO = 360 / 286;

/* ============================ theme (pastel) ============================ */
const INK = '#111111';
const PASTEL = {
  yellow: { tile: '#FFE7A3', dot: '#FFE59A', label: 'เหลือง' },
  pink:   { tile: '#F7C9CF', dot: '#FFB5C1', label: 'ชมพู' },
  mint:   { tile: '#BFE8D6', dot: '#B7E1D1', label: 'มิ้นต์' },
  blue:   { tile: '#C9E2FF', dot: '#A9D3FF', label: 'ฟ้า' },
  lilac:  { tile: '#D9D3FA', dot: '#CFC6FA', label: 'ม่วง' },
  peach:  { tile: '#F9DDBE', dot: '#F7CFA6', label: 'พีช' },
};
const PASTEL_KEYS = Object.keys(PASTEL);
const LIGHT = {
  bg: '#F4F0EA', surface: '#FFFDFA', surface2: '#EFEAE3', text: INK, muted: '#857E75',
  border: '#E6E0D8', ink: INK, onInk: '#FFFFFF', accent: '#FFD64D', danger: '#D94A5C',
  overlay: 'rgba(17,17,17,0.45)', dark: false,
};
const DARK = {
  bg: '#141311', surface: '#1E1C1A', surface2: '#2A2724', text: '#F5F1EB', muted: '#A39B90',
  border: '#36322D', ink: '#F5F1EB', onInk: '#111111', accent: '#FFD64D', danger: '#F07A89',
  overlay: 'rgba(0,0,0,0.6)', dark: true,
};

/* ============================ constants ============================ */
const TYPE_LABEL = { summary: 'สรุปเนื้อหา', problem: 'ปัญหาที่เจอ', project: 'โปรเจ็กต์' };
const TYPE_COLOR = { summary: 'yellow', problem: 'blue', project: 'pink' };
const DATA_KEY = 'passon_data_v2';
const USER_KEY = 'passon_user_v2';
const YEARS = ['ปี 1', 'ปี 2', 'ปี 3', 'ปี 4', 'ศิษย์เก่า'];
const EMOJIS = ['📚', '💡', '🚀', '🎨', '☕️', '🎧', '🌱', '⭐️', '🐣', '🔥', '🦄', '🐱', '🍀', '🎮', '🧋', '🌈'];

/* ---------- ตกแต่งโปรไฟล์ ---------- */
const PATTERNS = [
  { key: 'blobs', label: 'บับเบิล' }, { key: 'dots', label: 'จุดน่ารัก' }, { key: 'stripes', label: 'ริ้วเฉียง' },
  { key: 'confetti', label: 'คอนเฟตติ' }, { key: 'waves', label: 'คลื่น' }, { key: 'plain', label: 'เรียบ ๆ' },
];
const FRAMES = [
  { key: 'clean', label: 'ขาว' }, { key: 'ink', label: 'ขอบดำ' }, { key: 'rainbow', label: 'สายรุ้ง' },
  { key: 'dashed', label: 'เส้นประ' }, { key: 'gold', label: 'ทอง' },
];
const SHAPES = [{ key: 'circle', label: 'วงกลม' }, { key: 'squircle', label: 'มุมมน' }, { key: 'blob', label: 'ก้อนเมฆ' }];
const STATUS_PRESETS = [
  ['📖', 'กำลังอ่านสอบ'], ['💻', 'ปั่นโปรเจ็กต์'], ['🙋', 'ถามได้เลย!'], ['☕️', 'ขอกาแฟด่วน'],
  ['😴', 'ง่วงมาก'], ['🎉', 'สอบเสร็จแล้ว'], ['🏃', 'วิ่งไปเรียน'], ['🎧', 'โหมดโฟกัส'],
];
const INTERESTS = ['Coding', 'Data', 'AI', 'UX/UI', 'Cyber', 'Marketing', 'Startup', 'Finance', 'Design', 'Content', 'Gaming', 'Music', 'Photo', 'Sport'];
const MAX_INTERESTS = 5;
const MAX_FAV = 3;
const LEVEL_TITLES = ['น้องใหม่', 'รุ่นพี่ฝึกหัด', 'รุ่นพี่ใจดี', 'รุ่นพี่ตัวท็อป', 'ตำนาน dX'];
const BADGES = [
  { key: 'hello', emoji: '🌱', label: 'มือใหม่', desc: 'สร้างโปรไฟล์', test: () => true },
  { key: 'writer', emoji: '✍️', label: 'นักสรุป', desc: 'แชร์สรุปแรก', test: (st) => st.summaries >= 1 },
  { key: 'builder', emoji: '🚀', label: 'สายโปรเจ็กต์', desc: 'แชร์โปรเจ็กต์แรก', test: (st) => st.projects >= 1 },
  { key: 'curious', emoji: '❓', label: 'ช่างสงสัย', desc: 'ตั้งกระทู้แรก', test: (st) => st.threads >= 1 },
  { key: 'helper', emoji: '🤝', label: 'ใจดีช่วยตอบ', desc: 'ตอบหรือคอมเมนต์ 3 ครั้ง', test: (st) => st.answers >= 3 },
  { key: 'stylish', emoji: '🎨', label: 'แต่งสวย', desc: 'มีรูป + แนะนำตัว + ความสนใจ', test: (st) => st.complete },
  { key: 'loved', emoji: '💖', label: 'ขวัญใจรุ่นน้อง', desc: 'ได้ 10 ไลก์', test: (st) => st.likes >= 10 },
  { key: 'library', emoji: '📚', label: 'คลังความรู้', desc: 'โพสต์ครบ 5 ชิ้น', test: (st) => st.posts >= 5 },
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const cleanHandle = (h) => String(h || '').trim().replace(/^https?:\/\/[^/]+\/(in\/)?/i, '').replace(/^@/, '').replace(/\/+$/, '');
const LINKS = [
  { key: 'ig', icon: 'instagram', label: 'Instagram', url: (h) => 'https://instagram.com/' + h, ph: 'ชื่อผู้ใช้ IG' },
  { key: 'gh', icon: 'github', label: 'GitHub', url: (h) => 'https://github.com/' + h, ph: 'ชื่อผู้ใช้ GitHub' },
  { key: 'li', icon: 'linkedin', label: 'LinkedIn', url: (h) => 'https://linkedin.com/in/' + h, ph: 'ลิงก์หรือชื่อ LinkedIn' },
];

/** สถิติ + เลเวล + เหรียญ ของผู้ใช้ */
function profileStats(id, data, profile) {
  const posts = data.posts.filter((p) => p.authorId === id);
  const likes = posts.reduce((n, p) => n + (p.likes || []).length, 0);
  const threads = data.threads.filter((t) => t.authorId === id).length;
  const answers =
    data.posts.reduce((n, p) => n + (p.comments || []).filter((x) => x.authorId === id).length, 0) +
    data.threads.reduce((n, t) => n + (t.replies || []).filter((x) => x.authorId === id).length, 0);
  const complete = !!(profile && profile.photo && profile.bio && (profile.interests || []).length);
  const st = {
    posts: posts.length, likes, threads, answers, complete,
    summaries: posts.filter((p) => p.type !== 'project').length,
    projects: posts.filter((p) => p.type === 'project').length,
  };
  const xp = 20 + st.posts * 20 + likes * 5 + answers * 8 + threads * 10 + (complete ? 30 : 0);
  const level = Math.floor(xp / 100) + 1;
  return {
    ...st, xp, level, progress: xp % 100,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    badges: BADGES.map((b) => ({ ...b, earned: b.test(st) })),
  };
}
function shapeRadius(shape, size) {
  if (shape === 'squircle') return { borderRadius: size * 0.3 };
  if (shape === 'blob') return { borderTopLeftRadius: size * 0.5, borderTopRightRadius: size * 0.36, borderBottomRightRadius: size * 0.5, borderBottomLeftRadius: size * 0.28 };
  return { borderRadius: size / 2 };
}
function frameStyle(frame, bw, c) {
  switch (frame) {
    case 'ink': return { borderWidth: bw, borderColor: INK };
    case 'rainbow': return { borderWidth: bw + 1, borderTopColor: PASTEL.pink.dot, borderRightColor: PASTEL.yellow.dot, borderBottomColor: PASTEL.mint.dot, borderLeftColor: PASTEL.blue.dot };
    case 'dashed': return { borderWidth: Math.max(2, bw - 1), borderStyle: 'dashed', borderColor: INK };
    case 'gold': return { borderWidth: bw + 1, borderColor: '#F2C14E' };
    default: return { borderWidth: bw, borderColor: c.surface };
  }
}
const typesForMode = (mode) => (mode === 'project' ? ['project'] : ['summary', 'problem']);

/* ============================ courses (หลักสูตร dX) ============================
 * อ้างอิง: มคอ.2 หลักสูตร วท.บ. นวัตกรรมและการแปรรูปทางดิจิทัล (หลักสูตรปรับปรุง พ.ศ. 2566)
 * สำหรับนักศึกษารหัส 66–69 — ปี 1 ใช้ตามตารางเรียนจริงของรุ่น (รหัส 68)
 * semester: 'เทอม/ปี ค.ศ.' หรือ 'GE' (วิชาศึกษาทั่วไปให้เลือก) / 'FREE' (วิชาเลือกเสรีที่หลักสูตรเปิด)
 */
const COURSE_LIST = [
  // ปี 1 เทอม 1
  ['TU109', 'Innovation and Entrepreneurial Mindset', '1/2025'],
  ['TU103', 'Life and Sustainability', '1/2025'],
  ['DX100', 'Digital Innovation', '1/2025'],
  ['EL105', 'English Communication Skills', '1/2025'],
  ['DE101', 'Financial Planning for Economic Stability in Life', '1/2025'],
  // ปี 1 เทอม 2
  ['DX110', 'Fundamental of Programming for Innovation', '2/2025'],
  ['DX111', 'Applied Statistics for Innovation', '2/2025'],
  ['TU100', 'Civic Engagement', '2/2025'],
  ['TU106', 'Creativity and Communication', '2/2025'],
  ['TU240', 'World Geopolitical Economy', '2/2025'],
  // ปี 2 เทอม 1 — Creative Problem Solving
  ['DX210', 'Principle of Programming', '1/2026'],
  ['DX211', 'Computer Software and Applications', '1/2026'],
  ['DX212', 'Mobile Programming', '1/2026'],
  ['DX213', 'Computer Science of Human Decisions', '1/2026'],
  ['DX214', 'Managing Digital Firm', '1/2026'],
  ['DX395', 'Innovation and Entrepreneurship', '1/2026'],
  // ปี 2 เทอม 2 — Business Analytics
  ['DX220', 'Data Exploration and Preprocessing', '2/2026'],
  ['DX221', 'Data Science Algorithms', '2/2026'],
  ['DX222', 'Business Intelligence', '2/2026'],
  ['DX223', 'Data Engineering', '2/2026'],
  ['DX224', 'Business Analytics Capstone Project', '2/2026'],
  // ปี 3 เทอม 1 — Business, Innovation & Design Thinking
  ['DX330', 'Principles of Design Thinking', '1/2027'],
  ['DX331', 'Innovation Management', '1/2027'],
  ['DX332', 'UX/UI Design', '1/2027'],
  ['DX333', 'Financial Management for Innovation', '1/2027'],
  ['DX334', 'Innovation Capstone Project', '1/2027'],
  // ปี 3 เทอม 2 — Applied Cybersecurity
  ['DX340', 'Cyber Security Fundamental', '2/2027'],
  ['DX341', 'Digital Forensic', '2/2027'],
  ['DX342', 'Business Continuity Management', '2/2027'],
  ['DX343', 'Network Security', '2/2027'],
  ['DX344', 'Critical Infrastructure', '2/2027'],
  // ปี 3 ภาคฤดูร้อน
  ['DX380', 'Internships for Digital Business (135 hrs.)', 'S/2027'],
  // ปี 4 เทอม 1 — Digital Transformation
  ['DX450', 'Emerging Technologies and Digital Business Model', '1/2028'],
  ['DX451', 'Digital Transformation Strategy', '1/2028'],
  ['DX452', 'Digital Organizational Behavior and Transformational Leadership', '1/2028'],
  ['DX453', 'Advanced Digital Technology Seminar', '1/2028'],
  ['DX454', 'Digital Transformation Capstone Project', '1/2028'],
  // ปี 4 เทอม 2 — วิชาเลือก 1 หมวด (15 หน่วยกิต)
  ['DX465', 'Digital Consumers Behavior', '2/2028', 'Digital Marketing'],
  ['DX466', 'Digital Branding and Engagement', '2/2028', 'Digital Marketing'],
  ['DX467', 'Digital Reputation Management', '2/2028', 'Digital Marketing'],
  ['DX468', 'Digital Marketing Strategy', '2/2028', 'Digital Marketing'],
  ['DX469', 'Strategic Brand Management', '2/2028', 'Digital Marketing'],
  ['DX475', 'Fundamental of Creative Media Programming', '2/2028', 'Creative Media'],
  ['DX476', 'Digital Technology for New Media Creation', '2/2028', 'Creative Media'],
  ['DX477', 'Gamification for Creative Media', '2/2028', 'Creative Media'],
  ['DX478', 'Research for Creative Media', '2/2028', 'Creative Media'],
  ['DX479', 'Creative Media Capstone Project', '2/2028', 'Creative Media'],
  // วิชาเลือกเสรีที่หลักสูตรเปิดสอน
  ['DX396', 'Economics and Business Condition Analysis', 'FREE', 'วิชาเลือกเสรี'],
  ['DX397', 'Business and Information Technology Laws', 'FREE', 'วิชาเลือกเสรี'],
  ['DX398', 'Project Management', 'FREE', 'วิชาเลือกเสรี'],
  ['DX399', 'Accounting and Finance', 'FREE', 'วิชาเลือกเสรี'],
  // วิชาศึกษาทั่วไปอื่น ๆ ที่เลือกเรียนได้
  ['TU101', 'Thailand, ASEAN, and the World', 'GE', 'ศึกษาทั่วไป'],
  ['TU107', 'Digital Skill and Problem Solving', 'GE', 'ศึกษาทั่วไป'],
  ['TU124', 'Society and Economy', 'GE', 'ศึกษาทั่วไป'],
  ['TU155', 'Elementary Statistics', 'GE', 'ศึกษาทั่วไป'],
  ['TU156', 'Introduction to Scientific Programming', 'GE', 'ศึกษาทั่วไป'],
  ['TU200', 'Self Design Civic Engagement', 'GE', 'ศึกษาทั่วไป'],
  ['TU243', 'Digital Skills for the Future', 'GE', 'ศึกษาทั่วไป'],
];
const TERM_INFO = {
  '1/2025': { label: 'ปี 1 · เทอม 1', theme: 'ปูพื้นฐาน' },
  '2/2025': { label: 'ปี 1 · เทอม 2', theme: 'ปูพื้นฐาน' },
  '1/2026': { label: 'ปี 2 · เทอม 1', theme: 'Creative Problem Solving' },
  '2/2026': { label: 'ปี 2 · เทอม 2', theme: 'Business Analytics' },
  '1/2027': { label: 'ปี 3 · เทอม 1', theme: 'Business, Innovation & Design Thinking' },
  '2/2027': { label: 'ปี 3 · เทอม 2', theme: 'Applied Cybersecurity' },
  'S/2027': { label: 'ปี 3 · ฤดูร้อน', theme: 'ฝึกงาน' },
  '1/2028': { label: 'ปี 4 · เทอม 1', theme: 'Digital Transformation' },
  '2/2028': { label: 'ปี 4 · เทอม 2', theme: 'วิชาเลือก 1 หมวด (Digital Marketing / Creative Media)' },
  FREE: { label: 'วิชาเลือกเสรี', theme: 'เลือกเรียนอย่างน้อย 6 หน่วยกิต' },
  GE: { label: 'ศึกษาทั่วไป (เลือก)', theme: 'วิชา GE อื่น ๆ ในหลักสูตร' },
};
const TERMS = Object.keys(TERM_INFO);
const termLabel = (t) => (TERM_INFO[t] ? TERM_INFO[t].label : t ? 'เทอม ' + t : '-');
const termShort = (t) => (TERM_INFO[t] ? TERM_INFO[t].label.replace(' · ', ' ') : t || '-');
const isRealTerm = (t) => /^[12S]\/\d{4}$/.test(t || '');
const COURSE_ICON = {
  DE101: 'dollar-sign', DX100: 'zap', EL105: 'message-circle', TU103: 'sun', TU109: 'compass',
  DX110: 'code', DX111: 'bar-chart-2', TU100: 'users', TU106: 'pen-tool', TU240: 'globe',
  DX210: 'terminal', DX211: 'monitor', DX212: 'smartphone', DX213: 'cpu', DX214: 'briefcase', DX395: 'trending-up',
  DX220: 'database', DX221: 'git-branch', DX222: 'pie-chart', DX223: 'server', DX224: 'award',
  DX330: 'edit-3', DX331: 'trending-up', DX332: 'layout', DX333: 'dollar-sign', DX334: 'flag',
  DX340: 'shield', DX341: 'search', DX342: 'refresh-cw', DX343: 'wifi', DX344: 'layers',
  DX380: 'briefcase', DX450: 'zap', DX451: 'map', DX452: 'users', DX453: 'mic', DX454: 'flag',
  DX465: 'shopping-bag', DX466: 'tag', DX467: 'star', DX468: 'target', DX469: 'award',
  DX475: 'code', DX476: 'film', DX477: 'play-circle', DX478: 'book', DX479: 'flag',
  DX396: 'activity', DX397: 'file-text', DX398: 'clipboard', DX399: 'credit-card',
  TU101: 'globe', TU107: 'tool', TU124: 'users', TU155: 'bar-chart', TU156: 'terminal', TU200: 'heart', TU243: 'cpu',
};

/* ============================ อาจารย์หลักสูตร dX (จาก citu.tu.ac.th) ============================ */
const INSTRUCTORS = [
  { name: 'ผศ.ดร.นพพล ตั้งจิตพรหม', en: 'Asst.Prof. Nopphon Tangjitprom, Ph.D.', role: 'ผู้อำนวยการหลักสูตรปริญญาตรี dX', group: 'ผู้บริหารหลักสูตร' },
  { name: 'อ.ดร.ปรีชญา ชวลิตธำรง', en: 'Preechaya Chavalittumrong, Ph.D.', role: 'อาจารย์ประจำหลักสูตร · ผู้อำนวยการหลักสูตร dXI', group: 'ผู้บริหารหลักสูตร' },
  { name: 'ผศ.ดร.ภูมิพร ธรรมสถิตย์เดช', en: 'Asst.Prof. Poomporn Thamsatitdej, D.B.A.', role: 'อาจารย์ประจำหลักสูตร', group: 'อาจารย์ประจำหลักสูตร' },
  { name: 'รศ.ดร.จิรพล สังข์โพธิ์', en: 'Assoc.Prof. Jirapon Sunkpho, Ph.D.', role: 'อาจารย์ประจำหลักสูตร', group: 'อาจารย์ประจำหลักสูตร' },
  { name: 'รศ.ดร.ศราวุธ แรมจันทร์', en: 'Assoc.Prof. Sarawut Ramjan, Ph.D.', role: 'อาจารย์ประจำหลักสูตร', group: 'อาจารย์ประจำหลักสูตร' },
  { name: 'ผศ.ดร.อัจฉรา ภูอ่าง', en: 'Asst.Prof. Ajchara Phu-ang, Ph.D.', role: 'อาจารย์ประจำหลักสูตร', group: 'อาจารย์ประจำหลักสูตร' },
  { name: 'รศ.ดร.วริษฐ์ วิปุลานุสาสน์', en: 'Assoc.Prof. Warit Wipulanusat, Ph.D.', role: 'อาจารย์ประจำรายวิชา', group: 'อาจารย์ประจำรายวิชา / อัตราจ้าง' },
  { name: 'Prof. Dr. Toshio Obi', en: 'Professor Emeritus, Waseda University', role: 'อาจารย์หลักสูตร dX', group: 'อาจารย์ประจำรายวิชา / อัตราจ้าง' },
  { name: 'Dr. Anderson Ngelambong', en: 'International Program', role: 'อาจารย์หลักสูตร dX (นานาชาติ)', group: 'อาจารย์ประจำรายวิชา / อัตราจ้าง' },
  { name: 'อ.ดร.รัฐศาสตร์ กรสูต', en: '', role: 'อาจารย์หลักสูตร dX', group: 'อาจารย์ประจำรายวิชา / อัตราจ้าง' },
  { name: 'อ.จิรพล ทับทิมหิน', en: '', role: 'อาจารย์หลักสูตร dX', group: 'อาจารย์ประจำรายวิชา / อัตราจ้าง' },
  { name: 'อ.ดร.อรชร อิงคานุวัฒน์', en: '', role: 'อาจารย์หลักสูตร dX', group: 'อาจารย์ประจำรายวิชา / อัตราจ้าง' },
  { name: 'อ.ดร.อำพล ตังคนาวนิชย์', en: '', role: 'อาจารย์หลักสูตร dX', group: 'อาจารย์ประจำรายวิชา / อัตราจ้าง' },
  { name: 'อ.ดร.พชรพร พิจารณากุล', en: '', role: 'อาจารย์หลักสูตร dX', group: 'อาจารย์ประจำรายวิชา / อัตราจ้าง' },
];
const CITU_URL = 'https://www.citu.tu.ac.th/university-personnel/';

/* ============================ seed data (ตัวอย่าง) ============================ */
const ago = (hours) => new Date(Date.now() - hours * 3600 * 1000).toISOString();
const SEED = {
  courses: COURSE_LIST.map(([code, name, term, track]) => ({ id: code.toLowerCase(), code, name, semester: term, track: track || '', credits: 3, instructor: '' })),
  users: [
    { studentId: '6612345678', name: 'พี่มิ้นท์', year: 'ปี 3', bio: 'ชอบสรุปเป็นภาพ อ่านแล้วจำง่าย 📒', color: 'pink', emoji: '🎨', photo: null, createdAt: ago(900),
      pattern: 'confetti', frame: 'rainbow', shape: 'squircle', status: { emoji: '🙋', text: 'ถามได้เลย!' }, interests: ['UX/UI', 'Design', 'Content'], favCourses: ['dx110', 'dx100'], links: {} },
    { studentId: '6611111111', name: 'พี่บอส', year: 'ปี 3', bio: 'สาย dev มือถือ ถามเรื่อง Expo ได้', color: 'blue', emoji: '🚀', photo: null, createdAt: ago(900),
      pattern: 'stripes', frame: 'ink', shape: 'circle', status: { emoji: '💻', text: 'ปั่นโปรเจ็กต์' }, interests: ['Coding', 'Startup'], favCourses: ['dx212', 'tu109'], links: {} },
    { studentId: '6622222222', name: 'พี่เจ', year: 'ปี 2', bio: 'Stats + coffee', color: 'yellow', emoji: '☕️', photo: null, createdAt: ago(900),
      pattern: 'dots', frame: 'gold', shape: 'blob', status: { emoji: '☕️', text: 'ขอกาแฟด่วน' }, interests: ['Data', 'Finance'], favCourses: ['dx111'], links: {} },
  ],
  posts: [
    {
      id: 'p1', type: 'summary', courseId: 'dx110', title: 'สรุป Python พื้นฐานก่อนสอบกลางภาค',
      content: 'ตัวแปร & ชนิดข้อมูล — int, float, str, bool, list, dict\nเงื่อนไข — if / elif / else\nวนซ้ำ — for กับ range(), while\nฟังก์ชัน — def, return, ค่าเริ่มต้นของพารามิเตอร์\n\nทริค: ข้อสอบชอบให้ trace โค้ดแล้วตอบค่าที่ print ออกมา ฝึกไล่โค้ดบนกระดาษเยอะ ๆ',
      semester: '2/2025', authorId: '6612345678', authorName: 'พี่มิ้นท์', createdAt: ago(30), likes: ['6600000001', '6600000002'],
      comments: [{ id: 'cm1', author: 'น้องเอิร์ธ', authorId: '6823000001', text: 'ขอบคุณครับ ส่วน trace โค้ดช่วยได้มาก', createdAt: ago(20) }],
    },
    {
      id: 'p2', type: 'problem', courseId: 'dx212', title: 'Expo Go เปิดแอปไม่ขึ้น ค้างหน้า Loading',
      content: 'สาเหตุที่เจอบ่อย:\n1) มือถือกับคอมไม่ได้อยู่ Wi-Fi เดียวกัน → ลองใช้ Tunnel\n2) เวอร์ชัน Expo Go ไม่ตรงกับ SDK ของโปรเจ็กต์\n3) import แพ็กเกจที่ยังไม่ได้ติดตั้ง\n\nลองเช็กทีละข้อ ส่วนใหญ่จะหายตั้งแต่ข้อ 1',
      semester: '1/2026', authorId: '6611111111', authorName: 'พี่บอส', createdAt: ago(80), likes: ['6612345678'], comments: [],
    },
    {
      id: 'p3', type: 'project', courseId: 'dx100', title: 'โปรเจ็กต์: แอปจองห้องอ่านหนังสือในคณะ',
      content: 'ทีม 5 คน ใช้ Design Thinking + Scrum\n- Empathize: สัมภาษณ์เพื่อน 12 คน\n- Prototype: Figma 3 รอบ\n- Pitch: นำเสนอปลายภาคพร้อม demo\n\nสิ่งที่ได้เรียนรู้: เขียน user story ให้ชัดตั้งแต่แรก จะทะเลาะกันน้อยลงมาก',
      semester: '1/2025', authorId: '6612345678', authorName: 'พี่มิ้นท์', createdAt: ago(200), likes: [], comments: [],
    },
    {
      id: 'p4', type: 'summary', courseId: 'dx111', title: 'Cheat sheet สถิติ อ่าน 10 นาที',
      content: 'Mean / Median / Mode — ค่ากลาง\nSD — การกระจายตัว\nNormal distribution — 68 / 95 / 99.7\nt-test — เทียบค่าเฉลี่ย 2 กลุ่ม\nCorrelation ≠ Causation !!',
      semester: '2/2025', authorId: '6622222222', authorName: 'พี่เจ', createdAt: ago(5), likes: ['6612345678', '6611111111', '6600000003'], comments: [],
    },
    {
      id: 'p5', type: 'project', courseId: 'tu109', title: 'Pitch ไอเดียธุรกิจ: ตู้กดน้ำรีฟิลในมหาลัย',
      content: 'Problem — ขวดพลาสติกเยอะมาก\nSolution — ตู้รีฟิลสแกนจ่ายผ่าน QR\nBusiness model — ค่าบริการต่อแก้ว + สปอนเซอร์\nได้คะแนน pitch สูงสุดในเซค 🎉',
      semester: '1/2025', authorId: '6611111111', authorName: 'พี่บอส', createdAt: ago(400), likes: ['6622222222'], comments: [],
    },
  ],
  threads: [
    {
      id: 't1', title: 'DX111 มีเทคนิคจำสูตรสถิติไหมคะ', body: 'สับสนระหว่าง t-test กับ z-test ตลอดเลย มีวิธีจำง่าย ๆ ไหมคะ',
      courseId: 'dx111', courseCode: 'DX111', authorId: '6823000002', authorName: 'น้องฟ้า', createdAt: ago(3),
      replies: [{ id: 'r1', author: 'พี่เจ', authorId: '6622222222', text: 'รู้ SD ของประชากร → z / ไม่รู้ ใช้ SD ตัวอย่าง → t ไปดู cheat sheet พี่ในวิชา DX111 ได้นะ', createdAt: ago(2) }],
    },
    {
      id: 't2', title: 'DX212 ใช้ Expo หรือ React Native CLI ดีครับ', body: 'ทำโปรเจ็กต์ปลายภาค ควรเริ่มจากอะไรดีครับ',
      courseId: 'dx212', courseCode: 'DX212', authorId: '6823000001', authorName: 'น้องเอิร์ธ', createdAt: ago(26), replies: [],
    },
  ],
};

/** ใส่รายวิชาที่ยังไม่มี + ข้อมูลตัวอย่าง (เฉพาะตอนฐานข้อมูลยังว่าง) — ใช้ id คงที่ จึงไม่ซ้ำ */
async function seedFirestore(current) {
  const items = [];
  const have = new Set(current.courses.map((c) => c.id));
  SEED.courses.forEach(({ id, ...rest }) => { if (!have.has(id)) items.push({ col: 'courses', id, data: rest }); });
  if (!current.posts.length && !current.threads.length) {
    SEED.posts.forEach(({ id, ...rest }) => items.push({ col: 'posts', id, data: rest }));
    SEED.threads.forEach(({ id, ...rest }) => items.push({ col: 'threads', id, data: rest }));
    SEED.users.forEach((u) => items.push({ col: 'users', id: u.studentId, data: u }));
  }
  await fs.batchSet(items);
  return items.length;
}

/* ============================ utils ============================ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const byNewest = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
const byOldest = (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
const byCode = (a, b) => (a.code || '').localeCompare(b.code || '');
function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function hashKey(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PASTEL_KEYS[h % PASTEL_KEYS.length];
}
const courseColor = (course) => {
  if (!course) return 'yellow';
  const order = ['yellow', 'pink', 'lilac', 'mint', 'peach', 'blue'];
  const i = COURSE_LIST.findIndex(([code]) => code === course.code);
  return i >= 0 ? order[i % order.length] : hashKey(course.code);
};
function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return Math.floor(diff / 60) + ' นาทีที่แล้ว';
  if (diff < 86400) return Math.floor(diff / 3600) + ' ชม.ที่แล้ว';
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + ' วันที่แล้ว';
  try { return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch (e) { return iso.slice(0, 10); }
}

/* ============================ ไฟล์แนบ (รูป / PDF / เอกสาร) ============================
 * เก็บไฟล์ใน Firestore แบบแบ่งเป็นชิ้น (collection "files") — ใช้ได้กับแพ็กเกจฟรี ไม่ต้องใช้ Firebase Storage
 * โหมดเก็บในเครื่อง: เก็บใน AsyncStorage (จำกัดขนาดเล็กกว่า)
 */
const MAX_ATTACH = 5;
const MAX_FILE_MB = USE_FIREBASE ? 5 : 2;
const CHUNK = 700000; // ตัวอักษร base64 ต่อเอกสาร (Firestore จำกัด ~1 MB ต่อเอกสาร)
const DOC_TYPES = [
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'image/*',
];
function fileKind(name, mime) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  const m = String(mime || '');
  if (m.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return { key: 'image', icon: 'image', label: 'รูปภาพ', color: 'mint' };
  if (m === 'application/pdf' || ext === 'pdf') return { key: 'pdf', icon: 'file-text', label: 'PDF', color: 'pink' };
  if (['doc', 'docx'].includes(ext) || m.includes('word')) return { key: 'doc', icon: 'file-text', label: 'Word', color: 'blue' };
  if (['ppt', 'pptx'].includes(ext) || m.includes('presentation') || m.includes('powerpoint')) return { key: 'ppt', icon: 'monitor', label: 'PowerPoint', color: 'peach' };
  if (['xls', 'xlsx'].includes(ext) || m.includes('sheet') || m.includes('excel')) return { key: 'xls', icon: 'grid', label: 'Excel', color: 'mint' };
  return { key: 'file', icon: 'paperclip', label: 'ไฟล์', color: 'lilac' };
}
const b64Bytes = (b64) => Math.floor((b64 || '').length * 3 / 4);
function fmtSize(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',').pop());
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
/** ตัด "data:...;base64," ออก — บนเว็บ expo-document-picker คืนค่าเป็น data URL */
const stripDataUrl = (v) => String(v || '').replace(/^data:[^,]*,/, '');
/** อ่านไฟล์ที่เลือกเป็น base64 — รองรับทั้งเว็บและมือถือ */
async function readAsBase64(asset) {
  if (asset.base64) return stripDataUrl(asset.base64);
  if (Platform.OS === 'web') {
    if (asset.file) return blobToBase64(asset.file);
    return blobToBase64(await (await fetch(asset.uri)).blob());
  }
  try { return await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' }); }
  catch (e) { return blobToBase64(await (await fetch(asset.uri)).blob()); }
}
/** ย่อรูปเพื่อประหยัดพื้นที่: ตัวเต็มกว้างไม่เกิน 1600px + ภาพย่อ 320px */
async function prepareImage(uri, width) {
  const resize = width && width > 1600 ? [{ resize: { width: 1600 } }] : [];
  const full = await ImageManipulator.manipulateAsync(uri, resize, { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  const thumb = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 320 } }], { compress: 0.55, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  return { b64: full.base64, thumb: 'data:image/jpeg;base64,' + thumb.base64 };
}
const fileCache = {};
async function saveFileData(id, b64, onProgress) {
  if (!USE_FIREBASE) {
    await AsyncStorage.setItem('passon_file_' + id, b64);
    if (onProgress) onProgress(1);
    return 1;
  }
  const n = Math.max(1, Math.ceil(b64.length / CHUNK));
  for (let i = 0; i < n; i++) {
    await fs.set('files', `${id}_${i}`, { fileId: id, i, n, data: b64.slice(i * CHUNK, (i + 1) * CHUNK) });
    if (onProgress) onProgress((i + 1) / n);
  }
  return n;
}
async function loadFileData(att) {
  if (fileCache[att.id]) return fileCache[att.id];
  let b64 = '';
  if (!USE_FIREBASE) b64 = (await AsyncStorage.getItem('passon_file_' + att.id)) || '';
  else {
    const parts = await Promise.all(Array.from({ length: att.chunks || 1 }, (_, i) => fs.get('files', `${att.id}_${i}`)));
    if (parts.some((x) => !x)) throw new Error('missing');
    b64 = parts.map((x) => x.data).join('');
  }
  b64 = stripDataUrl(b64);
  if (!b64) throw new Error('missing');
  fileCache[att.id] = b64;
  return b64;
}
function b64ToBlob(b64, mime) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime || 'application/octet-stream' });
}
/** เปิดไฟล์: เว็บ = แท็บใหม่ / มือถือ = เลือกแอปที่จะเปิด (เช่น Drive PDF Viewer) */
async function openAttachment(att) {
  const b64 = await loadFileData(att);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(b64ToBlob(b64, att.mime));
    const w = window.open(url, '_blank');
    if (!w) {
      const a = document.createElement('a');
      a.href = url; a.download = att.name; document.body.appendChild(a); a.click(); a.remove();
    }
    return;
  }
  const safe = String(att.name || 'file').replace(/[^\w.\-ก-๙]+/g, '_');
  const path = FileSystem.cacheDirectory + att.id + '_' + safe;
  await FileSystem.writeAsStringAsync(path, b64, { encoding: 'base64' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: att.mime, dialogTitle: att.name, UTI: fileKind(att.name, att.mime).key === 'pdf' ? 'com.adobe.pdf' : undefined });
  } else {
    notify('เปิดไฟล์ไม่ได้', 'อุปกรณ์นี้ไม่รองรับการเปิดไฟล์');
  }
}

/* ============================ วันเวลา (เวลาไทย UTC+7 เสมอ) ============================ */
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const BKK = 7 * 3600 * 1000;
const pad2 = (n) => String(n).padStart(2, '0');
function bkkParts(iso) {
  const d = new Date(new Date(iso).getTime() + BKK);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), hh: d.getUTCHours(), mi: d.getUTCMinutes() };
}
function fmtThaiDate(iso, withTime = true) {
  const p = bkkParts(iso);
  const date = `${TH_DAYS[p.wd]} ${p.d} ${TH_MONTHS[p.m]} ${p.y + 543}`;
  return withTime ? `${date} · ${pad2(p.hh)}:${pad2(p.mi)} น.` : date;
}
function useNow(ms) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
const EXAM_KINDS = [
  { key: 'midterm', label: 'สอบกลางภาค', emoji: '📝', color: 'yellow' },
  { key: 'final', label: 'สอบปลายภาค', emoji: '🎯', color: 'pink' },
  { key: 'quiz', label: 'ควิซ', emoji: '⚡️', color: 'peach' },
  { key: 'project', label: 'ส่งโปรเจ็กต์', emoji: '🚀', color: 'mint' },
  { key: 'other', label: 'อื่น ๆ', emoji: '📌', color: 'lilac' },
];
const kindOf = (k) => EXAM_KINDS.find((x) => x.key === k) || EXAM_KINDS[4];

/* ============================ สภาพอากาศ / ฝุ่น / แดด ============================ */
const WMO = {
  0: ['ท้องฟ้าแจ่มใส', '☀️', '🌙'], 1: ['ส่วนใหญ่แจ่มใส', '🌤️', '🌙'], 2: ['มีเมฆบางส่วน', '⛅', '☁️'], 3: ['เมฆมาก', '☁️', '☁️'],
  45: ['มีหมอก', '🌫️'], 48: ['หมอกจัด', '🌫️'],
  51: ['ฝนปรอยเล็กน้อย', '🌦️'], 53: ['ฝนปรอย', '🌦️'], 55: ['ฝนปรอยหนัก', '🌧️'], 56: ['ฝนปรอย', '🌧️'], 57: ['ฝนปรอย', '🌧️'],
  61: ['ฝนตกเล็กน้อย', '🌦️'], 63: ['ฝนตกปานกลาง', '🌧️'], 65: ['ฝนตกหนัก', '🌧️'], 66: ['ฝนตก', '🌧️'], 67: ['ฝนตกหนัก', '🌧️'],
  80: ['ฝนตกเป็นช่วง ๆ', '🌦️'], 81: ['ฝนตกเป็นช่วง ๆ', '🌧️'], 82: ['ฝนตกหนักเป็นช่วง ๆ', '⛈️'],
  95: ['พายุฝนฟ้าคะนอง', '⛈️'], 96: ['พายุฝนฟ้าคะนอง', '⛈️'], 99: ['พายุฝนฟ้าคะนองรุนแรง', '⛈️'],
};
function wmoInfo(code, isDay) {
  const w = WMO[code] || ['สภาพอากาศไม่ทราบ', '🌡️'];
  return { label: w[0], emoji: !isDay && w[2] ? w[2] : w[1] };
}
/** เกณฑ์ PM2.5 ของกรมควบคุมมลพิษ (ปรับปรุง มิ.ย. 2566) */
function pm25Info(v) {
  if (v == null) return null;
  if (v <= 15) return { label: 'ดีมาก', color: '#A9D3FF', tip: 'อากาศดีมาก เหมาะกับกิจกรรมกลางแจ้ง' };
  if (v <= 25) return { label: 'ดี', color: '#B7E1D1', tip: 'อากาศดี ทำกิจกรรมกลางแจ้งได้ตามปกติ' };
  if (v <= 37.5) return { label: 'ปานกลาง', color: '#FFE59A', tip: 'ผู้ที่ไวต่อฝุ่นควรลดเวลาอยู่กลางแจ้ง' };
  if (v <= 75) return { label: 'เริ่มมีผลต่อสุขภาพ', color: '#F7CFA6', tip: 'ควรใส่หน้ากาก N95 เมื่ออยู่กลางแจ้ง' };
  return { label: 'มีผลต่อสุขภาพ', color: '#FFB5C1', tip: 'เลี่ยงกิจกรรมกลางแจ้ง และใส่หน้ากาก N95' };
}
function uvInfo(v) {
  if (v == null) return null;
  if (v < 3) return { label: 'ต่ำ', color: '#B7E1D1', tip: 'แดดอ่อน ออกไปข้างนอกได้สบาย' };
  if (v < 6) return { label: 'ปานกลาง', color: '#FFE59A', tip: 'ทาครีมกันแดดก่อนออกจากบ้าน' };
  if (v < 8) return { label: 'สูง', color: '#F7CFA6', tip: 'ทากันแดด SPF30+ และหลบแดดช่วงเที่ยง' };
  if (v < 11) return { label: 'สูงมาก', color: '#FFB5C1', tip: 'พกร่มหรือหมวก เลี่ยงแดด 10:00–15:00' };
  return { label: 'อันตราย', color: '#CFC6FA', tip: 'อยู่ในร่มให้มากที่สุด' };
}
async function fetchWeather() {
  const q = `latitude=${CAMPUS.lat}&longitude=${CAMPUS.lon}&timezone=Asia%2FBangkok`;
  const [w, a] = await Promise.allSettled([
    fetch(`https://api.open-meteo.com/v1/forecast?${q}&forecast_days=1&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&current=pm2_5,pm10,uv_index`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  ]);
  if (w.status !== 'fulfilled') throw new Error('weather');
  const cur = w.value.current || {};
  const day = w.value.daily || {};
  const aq = a.status === 'fulfilled' ? a.value.current || {} : {};
  const first = (arr) => (Array.isArray(arr) ? arr[0] : null);
  const hm = (t) => (t ? String(t).slice(11, 16) : '-');
  return {
    temp: cur.temperature_2m, feels: cur.apparent_temperature, humidity: cur.relative_humidity_2m, wind: cur.wind_speed_10m,
    code: cur.weather_code, isDay: cur.is_day !== 0,
    max: first(day.temperature_2m_max), min: first(day.temperature_2m_min), rain: first(day.precipitation_probability_max),
    uvMax: first(day.uv_index_max), uvNow: aq.uv_index, sunrise: hm(first(day.sunrise)), sunset: hm(first(day.sunset)),
    pm25: aq.pm2_5, pm10: aq.pm10, at: Date.now(),
  };
}

/* ============================ app context ============================ */
const Ctx = createContext(null);

/** กล่องแจ้งเตือน/ยืนยันของแอปเอง — ใช้แทน Alert.alert ซึ่งไม่ทำงานบน Snack Web */
let dialogHandler = null;
function notify(title, message, buttons) {
  if (dialogHandler) dialogHandler({ title, message, buttons: buttons && buttons.length ? buttons : [{ text: 'ตกลง' }] });
  else Alert.alert(title, message, buttons);
}

function DialogBox({ dialog, onClose }) {
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
const useApp = () => useContext(Ctx);

/* ============================ primitives ============================ */
function Card({ style, children, onPress }) {
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
function Btn({ title, onPress, variant = 'primary', small, block, arrow, icon, disabled, style }) {
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

function IconCircle({ name, size = 36, bg, color, onPress, style }) {
  const { c } = useApp();
  const body = (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg || c.surface, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Feather name={name} size={size * 0.46} color={color || INK} />
    </View>
  );
  return onPress ? <TouchableOpacity activeOpacity={0.8} onPress={onPress}>{body}</TouchableOpacity> : body;
}

/** รูปโปรไฟล์ตามทรง + กรอบที่ผู้ใช้เลือก */
function PhotoBox({ profile, size, frame = true, ring }) {
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

function Avatar({ sid, name, size = 40, ring, showEmoji }) {
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

function AvatarStack({ ids, size = 24 }) {
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

function Pill({ label, color, icon, style }) {
  const { s } = useApp();
  return (
    <View style={[s.pill, { backgroundColor: color ? PASTEL[color].tile : 'rgba(255,255,255,0.75)' }, style]}>
      {icon ? <Feather name={icon} size={11} color={INK} style={{ marginRight: 4 }} /> : null}
      <Text style={s.pillTxt}>{label}</Text>
    </View>
  );
}

function Chip({ label, selected, onPress, icon, dot }) {
  const { s, c } = useApp();
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[s.chip, selected && s.chipSel]}>
      {icon ? <Feather name={icon} size={14} color={selected ? c.onInk : c.text} style={{ marginRight: 6 }} /> : null}
      {dot ? <View style={[s.chipDot, { backgroundColor: PASTEL[dot].dot }]} /> : null}
      <Text style={[s.chipTxt, selected && s.chipTxtSel]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Breadcrumb({ items }) {
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

function SectionHead({ title, right, style }) {
  const { s } = useApp();
  return (
    <View style={[s.sectionHead, style]}>
      <Text style={s.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

function SeeAll({ onPress, label = 'ดูทั้งหมด' }) {
  const { s } = useApp();
  return (
    <TouchableOpacity onPress={onPress} style={s.row} activeOpacity={0.8}>
      <Text style={s.seeAll}>{label}</Text>
      <View style={s.seeAllDot}><Feather name="arrow-right" size={11} color={INK} /></View>
    </TouchableOpacity>
  );
}

function Empty({ text }) {
  const { s } = useApp();
  return (
    <View style={s.empty}>
      <Image source={LOGO} style={{ width: 64, height: 64 / LOGO_RATIO, opacity: 0.85, marginBottom: 10 }} resizeMode="contain" />
      <Text style={s.emptyTxt}>{text}</Text>
    </View>
  );
}

function Field({ label, hint, style, multiline, ...props }) {
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

function TypeTag({ type }) {
  return <Pill label={TYPE_LABEL[type]} color={TYPE_COLOR[type]} />;
}

function LikeBtn({ post, withLabel }) {
  const { s, c, user, toggleLike } = useApp();
  const likes = post.likes || [];
  const liked = user && likes.includes(user.studentId);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => toggleLike(post.id)} style={[s.likeBtn, liked && s.likeBtnOn]}>
      <Feather name="heart" size={14} color={liked ? INK : c.muted} />
      <Text style={[s.likeTxt, liked && s.likeTxtOn]}>{withLabel ? ` ถูกใจ ${likes.length}` : ` ${likes.length}`}</Text>
    </TouchableOpacity>
  );
}

function CommentItem({ item }) {
  const { s, nameOf } = useApp();
  return (
    <View style={s.commentItem}>
      <Avatar sid={item.authorId} name={item.author} size={32} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={s.commentAuthor}>
          {nameOf(item.authorId, item.author)}  <Text style={s.commentTime}>{relTime(item.createdAt)}</Text>
        </Text>
        <Text style={s.commentText}>{item.text}</Text>
      </View>
    </View>
  );
}

function CommentBox({ title, items, emptyText, placeholder, onSubmit }) {
  const { s, c } = useApp();
  const [txt, setTxt] = useState('');
  const send = () => {
    const t = txt.trim();
    if (!t) return;
    onSubmit(t);
    setTxt('');
  };
  return (
    <Card style={{ padding: 18 }}>
      <Text style={s.h3}>{title} ({items.length})</Text>
      <View style={{ marginTop: 4 }}>
        {items.length ? items.map((it) => <CommentItem key={it.id} item={it} />) : <Text style={[s.smallMuted, { marginTop: 8 }]}>{emptyText}</Text>}
      </View>
      <View style={s.commentForm}>
        <TextInput
          value={txt}
          onChangeText={setTxt}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          multiline
          style={[s.input, { flex: 1, minHeight: 46, maxHeight: 120 }]}
        />
        <TouchableOpacity onPress={send} activeOpacity={0.85} style={s.sendBtn}>
          <Feather name="send" size={18} color={c.onInk} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

/* ============================ composite cards ============================ */
/** การ์ดรายวิชาโทนพาสเทล (ตามรูปที่ 1) */
function CourseTile({ course, mode = 'summary', wide }) {
  const { s, data, push } = useApp();
  const types = typesForMode(mode);
  const posts = data.posts.filter((p) => p.courseId === course.id && types.includes(p.type));
  const authors = [...new Set(posts.map((p) => p.authorId))];
  const likes = posts.reduce((n, p) => n + (p.likes || []).length, 0);
  const color = courseColor(course);
  return (
    <Pressable
      onPress={() => push('contributors', { courseId: course.id, mode })}
      style={({ pressed }) => [s.tile, { backgroundColor: PASTEL[color].tile }, wide ? s.tileWide : s.tileHalf, pressed && s.pressed]}
    >
      <View style={s.rowBetween}>
        <View style={s.row}>
          <View style={s.tileIcon}><Feather name={COURSE_ICON[course.code] || 'book-open'} size={15} color={INK} /></View>
          <Text style={s.tileTerm}>{course.code}</Text>
        </View>
        <Pill icon="heart" label={String(likes)} />
      </View>
      <Text style={s.tileTitle} numberOfLines={3}>{course.name}</Text>
      <View style={[s.rowBetween, { marginTop: 'auto' }]}>
        <Text style={s.tileMeta} numberOfLines={1}>{posts.length} {mode === 'project' ? 'โปรเจ็กต์' : 'สรุป'} · {course.track || termShort(course.semester)}</Text>
        {authors.length ? <AvatarStack ids={authors} size={22} /> : null}
      </View>
    </Pressable>
  );
}

function CourseGrid({ courses, mode }) {
  const { s } = useApp();
  return (
    <View style={s.grid}>
      {courses.map((c) => <CourseTile key={c.id} course={c} mode={mode} />)}
    </View>
  );
}

function QaItem({ t }) {
  const { s, push, nameOf } = useApp();
  return (
    <Card style={s.qaItem} onPress={() => push('qaThread', { threadId: t.id })}>
      <Avatar sid={t.authorId} name={t.authorName} size={38} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.qaTitle}>{t.title}</Text>
        <View style={[s.metaRow, { marginTop: 6 }]}>
          {t.courseCode ? <Pill label={t.courseCode} color="yellow" style={{ marginRight: 8 }} /> : null}
          <Text style={s.meta}>{nameOf(t.authorId, t.authorName)}</Text>
          <Text style={s.meta}>💬 {(t.replies || []).length}</Text>
          <Text style={s.meta}>{relTime(t.createdAt)}</Text>
        </View>
      </View>
    </Card>
  );
}

function AttachSummary({ items }) {
  const { s } = useApp();
  if (!items || !items.length) return null;
  const imgs = items.filter((a) => fileKind(a.name, a.mime).key === 'image');
  const docs = items.length - imgs.length;
  return (
    <View style={[s.row, { marginTop: 8 }]}>
      {imgs.slice(0, 3).map((a) => <Image key={a.id} source={{ uri: a.thumb }} style={s.miniThumb} />)}
      {imgs.length > 3 ? <View style={[s.miniThumb, s.miniMore]}><Text style={s.miniMoreTxt}>+{imgs.length - 3}</Text></View> : null}
      {docs ? <Pill icon="paperclip" label={`${docs} ไฟล์`} color="pink" style={{ marginLeft: imgs.length ? 6 : 0 }} /> : null}
    </View>
  );
}

function PostCard({ p }) {
  const { s, push } = useApp();
  return (
    <Card style={s.postCard} onPress={() => push('post', { postId: p.id })}>
      <View style={s.rowBetween}>
        <TypeTag type={p.type} />
        <Text style={s.meta}>{relTime(p.createdAt)}</Text>
      </View>
      <Text style={s.postTitle}>{p.title}</Text>
      {p.content ? <Text style={s.snippet} numberOfLines={2}>{p.content}</Text> : null}
      <AttachSummary items={p.attachments} />
      <View style={[s.rowBetween, { marginTop: 6 }]}>
        <LikeBtn post={p} />
        <Text style={s.meta}>💬 {(p.comments || []).length} · เทอม {p.semester || '-'}</Text>
      </View>
    </Card>
  );
}

/** ลายบนปกโปรไฟล์ — วาดด้วย View ล้วน ไม่ต้องใช้รูป */
const CONFETTI = [
  [6, 18, 12, 'pink', 0], [16, 62, 9, 'blue', 1], [27, 26, 14, 'mint', 0], [38, 70, 10, 'yellow', 1], [47, 14, 8, 'lilac', 0],
  [56, 52, 13, 'peach', 1], [66, 24, 9, 'blue', 0], [74, 70, 12, 'pink', 1], [83, 36, 10, 'mint', 0], [92, 12, 8, 'yellow', 1],
  [12, 88, 8, 'lilac', 1], [60, 90, 9, 'mint', 1], [33, 92, 7, 'pink', 0], [88, 84, 11, 'blue', 0],
];
function CoverPattern({ pattern, color }) {
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
function ProfileCard({ profile, action }) {
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
function LevelCard({ st }) {
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
function BadgeShelf({ st }) {
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

/* ============================ auth: welcome / login / register ============================ */
function AuthFlow({ initialStep = 'welcome' }) {
  const { s, c } = useApp();
  const [step, setStep] = useState(initialStep);
  const [prefillId, setPrefillId] = useState('');

  const [email, setEmail] = useState('');

  if (USE_SUPABASE) {
    if (step === 'email' || step === 'login' || step === 'register') {
      return <EmailLoginScreen initialEmail={email} onBack={() => setStep('welcome')} onSent={(e) => { setEmail(e); setStep('verify'); }} />;
    }
    if (step === 'verify') return <VerifyCodeScreen email={email} onBack={() => setStep('email')} />;
  }
  if (step === 'login') return <LoginScreen onBack={() => setStep('welcome')} onRegister={(sid) => { setPrefillId(sid); setStep('register'); }} />;
  if (step === 'register') return <RegisterScreen prefillId={prefillId} onBack={() => setStep('welcome')} onLogin={() => setStep('login')} />;

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
        {USE_SUPABASE ? (
          <>
            <Btn title="เข้าสู่ระบบด้วยอีเมล มธ." arrow block onPress={() => setStep('email')} />
            <Text style={[s.hint, { textAlign: 'center', marginTop: 10 }]}>ครั้งแรกระบบจะสร้างบัญชีให้อัตโนมัติ</Text>
          </>
        ) : (
          <>
            <Btn title="สร้างโปรไฟล์ใหม่" arrow block onPress={() => setStep('register')} />
            <Btn title="มีโปรไฟล์แล้ว · เข้าสู่ระบบ" variant="outline" block style={{ marginTop: 10 }} onPress={() => setStep('login')} />
          </>
        )}
        <Text style={[s.hint, { textAlign: 'center', marginTop: 16 }]}>Digital Transformation & Innovation · CITU</Text>
      </View>
    </ScrollView>
  );
}

function AuthHeader({ onBack, title, sub }) {
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

/* ---------- Supabase: ล็อกอินด้วยอีเมล + รหัส OTP ---------- */
const OTP_RESEND_SEC = 60;

function EmailLoginScreen({ initialEmail, onBack, onSent }) {
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

function VerifyCodeScreen({ email, onBack }) {
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
function OnboardingScreen() {
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

function LoginScreen({ onBack, onRegister }) {
  const { s, findProfile, signIn } = useApp();
  const [sid, setSid] = useState('');
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const submit = async () => {
    const id = sid.trim();
    if (!/^\d{10}$/.test(id)) { notify('รหัสนักศึกษาไม่ถูกต้อง', 'กรุณากรอกรหัสนักศึกษา 10 หลัก'); return; }
    setBusy(true);
    const p = await findProfile(id);
    setBusy(false);
    if (p) signIn(p);
    else setNotFound(true);
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">
        <AuthHeader onBack={onBack} title="ยินดีต้อนรับกลับ 👋" sub="กรอกรหัสนักศึกษาเพื่อเข้าสู่ระบบ" />
        <Field label="รหัสนักศึกษา" value={sid} onChangeText={(v) => { setSid(v.replace(/\D/g, '')); setNotFound(false); }} keyboardType="number-pad" maxLength={10} placeholder="เช่น 6823765158" />
        {notFound ? (
          <Card style={[s.notice, { backgroundColor: PASTEL.yellow.tile }]}>
            <Text style={s.noticeTxt}>ยังไม่มีโปรไฟล์สำหรับรหัสนี้ — สร้างโปรไฟล์ใหม่ได้เลย</Text>
            <Btn title="สร้างโปรไฟล์" small arrow style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => onRegister(sid.trim())} />
          </Card>
        ) : null}
        <Btn title={busy ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'} arrow block disabled={busy} onPress={submit} style={{ marginTop: 6 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RegisterScreen({ prefillId, onBack, onLogin }) {
  const { s, findProfile, saveProfile, signIn } = useApp();
  const [busy, setBusy] = useState(false);
  const submit = async (profile) => {
    setBusy(true);
    const existing = await findProfile(profile.studentId);
    if (existing) {
      setBusy(false);
      notify('มีโปรไฟล์อยู่แล้ว', 'รหัสนักศึกษานี้ลงทะเบียนไว้แล้ว เข้าสู่ระบบแทนได้เลย', [
        { text: 'ยกเลิก', style: 'cancel' }, { text: 'เข้าสู่ระบบ', onPress: onLogin },
      ]);
      return;
    }
    const full = { ...profile, createdAt: new Date().toISOString() };
    const ok = await saveProfile(full);
    setBusy(false);
    if (ok) signIn(full);
  };
  return (
    <ProfileForm
      initial={{ studentId: prefillId || '', name: '', year: 'ปี 1', bio: '', color: 'yellow', emoji: '📚', photo: null, pattern: 'blobs', frame: 'clean', shape: 'circle' }}
      header={<AuthHeader onBack={onBack} title="สร้างโปรไฟล์" sub="ตกแต่งโปรไฟล์ให้เป็นตัวเอง รุ่นพี่รุ่นน้องจะเห็นตอนคุณโพสต์" />}
      submitLabel={busy ? 'กำลังบันทึก...' : 'สร้างโปรไฟล์'}
      busy={busy}
      onSubmit={submit}
    />
  );
}

/** ฟอร์มโปรไฟล์ — ใช้ทั้งตอนลงทะเบียนและแก้ไข */
function ProfileForm({ initial, header, submitLabel, onSubmit, busy, lockId }) {
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
        // ย่อรูปเหลือ 256px เพื่อให้เก็บใน Firestore ได้ (ไม่ต้องใช้ Firebase Storage)
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

/* ============================ widgets หน้าแรก ============================ */
function AnnouncementBanner() {
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

function splitCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/** รวมวันสอบที่ยังไม่ผ่าน (ตารางแอดมิน + ของฉัน) เรียงจากใกล้สุด */
function useUpcoming(now) {
  const { data, myEvents } = useApp();
  return [
    ...(data.events || []).map((e) => ({ ...e, mine: false })),
    ...(myEvents || []).map((e) => ({ ...e, mine: true })),
  ].filter((e) => e.date && new Date(e.date).getTime() + 3 * 3600 * 1000 > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/* ---------- หัวข้อใหญ่ สลับคำให้กำลังใจ ---------- */
const CHEERS = [
  { pre: 'ส่งต่อความรู้\n', hl: 'รุ่นพี่', post: ' สู่รุ่นน้อง' },
  { pre: 'รุ่นพี่ผ่านมาได้\n', hl: 'เราก็ผ่านได้', post: '' },
  { pre: 'อ่านวันละนิด\nดีกว่า', hl: 'อ่านคืนเดียว', post: '' },
  { pre: 'ทุกหน้าที่อ่าน\nคือ', hl: 'คะแนน', post: 'ที่เก็บ' },
  { pre: 'เหนื่อยก็พัก\n', hl: 'แต่อย่าหยุด', post: '' },
  { pre: 'ไม่เข้าใจตรงไหน\n', hl: 'ถามรุ่นพี่', post: 'ได้เลย' },
  { pre: 'นอนให้พอ\nสมอง', hl: 'จำได้ดีกว่า', post: '' },
  { pre: 'สู้ ๆ นะ dX\n', hl: 'เราทำได้!', post: '' },
];
const CHEER_MS = 4500;

function HeroCheer() {
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

/* ---------- นับถอยหลังสู่การสอบ ---------- */
const PREP_WINDOW = 30 * 86400000; // แถบความคืบหน้า = 30 วันสุดท้ายก่อนสอบ
function cheerFor(days) {
  if (days <= 0) return 'โค้งสุดท้ายแล้ว ทบทวนจุดสำคัญ แล้วพักผ่อนให้พอนะ';
  if (days <= 3) return '🔥 เหลือไม่ถึง 3 วัน ทบทวนสรุปของรุ่นพี่กันเถอะ!';
  if (days <= 7) return 'สัปดาห์สุดท้าย ลองทำข้อสอบเก่าดูนะ';
  if (days <= 14) return 'อีก 2 สัปดาห์ ทยอยอ่านทีละบทยังทันสบาย ๆ';
  return 'ยังมีเวลาเหลือเฟือ เริ่มเร็วได้เปรียบ ✨';
}

function ExamCountdown() {
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

/* ---------- สภาพอากาศ ---------- */
const PM_BANDS = [[0, 15, '#A9D3FF'], [15, 25, '#B7E1D1'], [25, 37.5, '#FFE59A'], [37.5, 75, '#F7CFA6'], [75, 150, '#FFB5C1']];
const UV_BANDS = [[0, 3, '#B7E1D1'], [3, 6, '#FFE59A'], [6, 8, '#F7CFA6'], [8, 11, '#FFB5C1'], [11, 14, '#CFC6FA']];
function bandPos(v, bands) {
  if (v == null) return 0;
  for (let i = 0; i < bands.length; i++) {
    const [lo, hi] = bands[i];
    if (v <= hi || i === bands.length - 1) return Math.min(100, (i + Math.min(1, Math.max(0, (v - lo) / (hi - lo)))) * (100 / bands.length));
  }
  return 100;
}

function Gauge({ title, value, unit, info, bands }) {
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

function WeatherCard() {
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

/* ============================ แอดมิน ============================ */
function AdminScreen() {
  const { s, c, rawData, openModal, deleteEvent, saveAnnouncement, setHidden, lockAdmin } = useApp();
  const [tab, setTab] = useState('exams');
  const [text, setText] = useState((rawData.config && rawData.config.home && rawData.config.home.text) || '');
  const [color, setColor] = useState((rawData.config && rawData.config.home && rawData.config.home.color) || 'yellow');
  const events = [...(rawData.events || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  const codeOf = (id) => (rawData.courses.find((x) => x.id === id) || {}).code;
  const comments = rawData.posts.reduce((n, p) => n + (p.comments || []).length, 0) + rawData.threads.reduce((n, t) => n + (t.replies || []).length, 0);
  const tabs = [['exams', 'ตารางสอบ', 'calendar'], ['announce', 'ประกาศ', 'volume-2'], ['content', 'จัดการเนื้อหา', 'eye-off'], ['stats', 'ภาพรวม', 'bar-chart-2']];
  return (
    <View>
      <View style={s.rowBetween}>
        <View>
          <Text style={s.miniHead}>ADMIN</Text>
          <Text style={s.display2}>แผงควบคุม</Text>
        </View>
        <Btn title="ออกจากโหมดแอดมิน" icon="lock" small variant="outline" onPress={lockAdmin} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {tabs.map(([k, l, i]) => <Chip key={k} label={l} icon={i} selected={tab === k} onPress={() => setTab(k)} />)}
      </ScrollView>

      {tab === 'exams' ? (
        <View style={{ marginTop: 8 }}>
          <SectionHead title={`ตารางสอบ (${events.length})`} right={<Btn title="เพิ่มวันสอบ" icon="plus" small onPress={() => openModal({ type: 'eventForm', scope: 'shared' })} />} />
          <Text style={[s.smallMuted, { marginBottom: 10 }]}>ทุกคนจะเห็นการนับถอยหลังในหน้าแรก</Text>
          {events.length ? events.map((e) => {
            const k = kindOf(e.kind);
            const past = new Date(e.date).getTime() < Date.now();
            return (
              <Card key={e.id} style={[s.adminRow, past && { opacity: 0.5 }]}>
                <View style={[s.nextDot, { backgroundColor: PASTEL[k.color].dot }]}><Text>{k.emoji}</Text></View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.nextTitle}>{codeOf(e.courseId) ? codeOf(e.courseId) + ' · ' : ''}{e.title}</Text>
                  <Text style={s.meta}>{fmtThaiDate(e.date)}{e.place ? ' · ' + e.place : ''}{past ? ' · ผ่านไปแล้ว' : ''}</Text>
                </View>
                <IconCircle name="edit-2" size={32} bg={c.surface2} color={c.text} onPress={() => openModal({ type: 'eventForm', scope: 'shared', event: e })} />
                <IconCircle name="trash-2" size={32} bg={c.surface2} color={c.danger} style={{ marginLeft: 6 }}
                  onPress={() => notify('ลบวันสอบนี้?', e.title, [{ text: 'ยกเลิก', style: 'cancel' }, { text: 'ลบ', style: 'destructive', onPress: () => deleteEvent(e.id) }])} />
              </Card>
            );
          }) : <Empty text="ยังไม่มีตารางสอบ — กด เพิ่มวันสอบ ได้เลย" />}
        </View>
      ) : null}

      {tab === 'announce' ? (
        <View style={{ marginTop: 8 }}>
          <SectionHead title="ประกาศบนหน้าแรก" />
          <Field value={text} onChangeText={setText} multiline maxLength={200} placeholder="เช่น สัปดาห์หน้าสอบกลางภาค อ่านสรุปของรุ่นพี่ได้ในแท็บสรุป 📚" hint={`${text.length}/200`} />
          <View style={[s.wrapRow, { marginBottom: 12 }]}>
            {PASTEL_KEYS.map((k) => (
              <TouchableOpacity key={k} onPress={() => setColor(k)} style={[s.swatch, { backgroundColor: PASTEL[k].dot }, color === k && s.swatchOn]}>
                {color === k ? <Feather name="check" size={16} color={INK} /> : null}
              </TouchableOpacity>
            ))}
          </View>
          <Btn title="บันทึกประกาศ" arrow block onPress={() => saveAnnouncement(text.trim(), color)} />
          <Btn title="ลบประกาศ" variant="outline" block style={{ marginTop: 10 }} onPress={() => { setText(''); saveAnnouncement('', color); }} />
        </View>
      ) : null}

      {tab === 'content' ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[s.smallMuted, { marginBottom: 10 }]}>ซ่อนโพสต์หรือกระทู้ที่ไม่เหมาะสม — ผู้ใช้ทั่วไปจะไม่เห็น แต่กู้คืนได้</Text>
          <SectionHead title={`โพสต์ (${rawData.posts.length})`} />
          {[...rawData.posts].sort(byNewest).map((p) => (
            <Card key={p.id} style={[s.adminRow, p.hidden && { opacity: 0.55 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.nextTitle} numberOfLines={1}>{p.title}</Text>
                <Text style={s.meta} numberOfLines={1}>{codeOf(p.courseId) || '-'} · {p.authorName} · {relTime(p.createdAt)}{p.hidden ? ' · ซ่อนอยู่' : ''}</Text>
              </View>
              <Btn title={p.hidden ? 'แสดง' : 'ซ่อน'} icon={p.hidden ? 'eye' : 'eye-off'} small variant="outline" onPress={() => setHidden('posts', p.id, !p.hidden)} />
            </Card>
          ))}
          <SectionHead title={`กระทู้ (${rawData.threads.length})`} style={{ marginTop: 10 }} />
          {[...rawData.threads].sort(byNewest).map((t) => (
            <Card key={t.id} style={[s.adminRow, t.hidden && { opacity: 0.55 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.nextTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={s.meta} numberOfLines={1}>{t.authorName} · {relTime(t.createdAt)}{t.hidden ? ' · ซ่อนอยู่' : ''}</Text>
              </View>
              <Btn title={t.hidden ? 'แสดง' : 'ซ่อน'} icon={t.hidden ? 'eye' : 'eye-off'} small variant="outline" onPress={() => setHidden('threads', t.id, !t.hidden)} />
            </Card>
          ))}
        </View>
      ) : null}

      {tab === 'stats' ? (
        <View style={[s.grid, { marginTop: 12 }]}>
          {[
            ['ผู้ใช้', rawData.users.length, 'users', 'yellow'], ['โพสต์', rawData.posts.length, 'file-text', 'pink'],
            ['กระทู้', rawData.threads.length, 'message-circle', 'blue'], ['คอมเมนต์/คำตอบ', comments, 'message-square', 'mint'],
            ['รายวิชา', rawData.courses.length, 'book-open', 'lilac'], ['วันสอบ', events.length, 'calendar', 'peach'],
          ].map(([l, v, i, col]) => (
            <View key={l} style={[s.statTile, { backgroundColor: PASTEL[col].tile }]}>
              <View style={s.tileIcon}><Feather name={i} size={15} color={INK} /></View>
              <Text style={s.statTileNum}>{v}</Text>
              <Text style={s.statTileLabel}>{l}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ============================ main screens ============================ */
function HomeScreen() {
  const { s, c, me, data, reset, push } = useApp();
  const [term, setTerm] = useState('all');
  const courses = useMemo(() => {
    const score = (course) => {
      const ps = data.posts.filter((p) => p.courseId === course.id);
      return ps.length * 3 + ps.reduce((n, p) => n + (p.likes || []).length, 0);
    };
    return data.courses
      .filter((x) => term === 'all' || x.semester === term)
      .sort((a, b) => score(b) - score(a) || byCode(a, b))
      .slice(0, 6);
  }, [data, term]);
  const threads = [...data.threads].sort(byNewest).slice(0, 4);
  const quick = [
    { icon: 'search', color: 'yellow', title: 'ค้นหาสรุป', sub: 'แนวข้อสอบตามวิชา', go: () => reset('browse', { mode: 'summary' }) },
    { icon: 'message-circle', color: 'blue', title: 'ถาม-ตอบ', sub: 'ถามรุ่นพี่ได้เลย', go: () => reset('qa') },
    { icon: 'folder', color: 'pink', title: 'Projects', sub: 'ไอเดียจากรุ่นพี่', go: () => reset('browse', { mode: 'project' }) },
  ];
  return (
    <View>
      <HeroCheer />

      <View>
        <AnnouncementBanner />
        <ExamCountdown />
        <WeatherCard />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {quick.map((q) => (
          <Pressable key={q.title} onPress={q.go} style={({ pressed }) => [s.quick, { backgroundColor: PASTEL[q.color].tile }, pressed && s.pressed]}>
            <View style={s.tileIcon}><Feather name={q.icon} size={16} color={INK} /></View>
            <Text style={s.quickTitle}>{q.title}</Text>
            <Text style={s.quickSub}>{q.sub}</Text>
            <View style={s.quickArrow}><Feather name="arrow-right" size={14} color="#fff" /></View>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 22, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <Chip label="ทั้งหมด" icon="grid" selected={term === 'all'} onPress={() => setTerm('all')} />
        {TERMS.filter((t) => data.courses.some((x) => x.semester === t)).map((t) => <Chip key={t} label={termLabel(t)} icon="calendar" selected={term === t} onPress={() => setTerm(t)} />)}
      </ScrollView>

      <SectionHead title="วิชายอดนิยม" style={{ marginTop: 14 }} right={<SeeAll onPress={() => reset('browse', { mode: 'summary' })} />} />
      <CourseGrid courses={courses} mode="summary" />

      <SectionHead title="กระทู้ล่าสุด" style={{ marginTop: 8 }} right={<SeeAll onPress={() => reset('qa')} />} />
      {threads.length ? threads.map((t) => <QaItem key={t.id} t={t} />) : <Empty text="ยังไม่มีกระทู้ — เป็นคนแรกที่ตั้งคำถามสิ!" />}

      <Card style={[s.instructorBanner, { backgroundColor: PASTEL.mint.tile }]} onPress={() => push('instructors')}>
        <View style={{ flex: 1 }}>
          <Text style={s.bannerKicker}>CITU · dX</Text>
          <Text style={s.bannerTitle}>รู้จักอาจารย์{'\n'}ประจำหลักสูตร</Text>
        </View>
        <View style={s.bannerArrow}><Feather name="arrow-right" size={18} color={INK} /></View>
      </Card>
    </View>
  );
}

function BrowseScreen({ mode }) {
  const { s, data, openModal } = useApp();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('all');
  const isProj = mode === 'project';
  const f = q.trim().toLowerCase();
  const list = [...data.courses]
    .sort(byCode)
    .filter((c) => term === 'all' || c.semester === term)
    .filter((c) => !f || (c.code || '').toLowerCase().includes(f) || (c.name || '').toLowerCase().includes(f));
  const extraTerms = [...new Set(data.courses.map((c) => c.semester).filter((t) => t && !TERMS.includes(t)))];
  const allTerms = [...TERMS, ...extraTerms].filter((t) => data.courses.some((c) => c.semester === t));
  const groups = allTerms.map((t) => ({ t, items: list.filter((c) => c.semester === t) })).filter((g) => g.items.length);
  const noTerm = list.filter((c) => !c.semester);
  return (
    <View>
      <Breadcrumb items={[{ label: 'หน้าแรก', go: 'home' }, { label: isProj ? 'Projects ของรุ่นพี่' : 'ค้นหาสรุปแนวข้อสอบ' }]} />
      <Text style={s.display2}>{isProj ? 'โปรเจ็กต์\nของรุ่นพี่' : 'ค้นหาสรุป\nแนวข้อสอบ'}</Text>
      <View style={[s.searchBox, { marginTop: 16 }]}>
        <Feather name="search" size={17} color="#9A9288" />
        <TextInput value={q} onChangeText={setQ} placeholder="รหัสหรือชื่อวิชา เช่น DX212, UX/UI" placeholderTextColor="#9A9288" style={s.searchInput} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <Chip label="ทุกชั้นปี" selected={term === 'all'} onPress={() => setTerm('all')} />
        {allTerms.map((t) => <Chip key={t} label={termLabel(t)} selected={term === t} onPress={() => setTerm(t)} />)}
      </ScrollView>
      <SectionHead
        title={`${list.length} รายวิชา`}
        style={{ marginTop: 12 }}
        right={<Btn title="เพิ่มวิชา" icon="plus" variant="outline" small onPress={() => openModal({ type: 'newCourse' })} />}
      />
      {!list.length ? <Empty text="ไม่พบรายวิชา — ลองเพิ่มรายวิชาใหม่ดูสิ" /> : null}
      {groups.map((g) => (
        <View key={g.t} style={{ marginBottom: 6 }}>
          <View style={s.termHead}>
            <Text style={s.termHeadTitle}>{termLabel(g.t)}</Text>
            {TERM_INFO[g.t] ? <Text style={s.termHeadSub}>{TERM_INFO[g.t].theme}{isRealTerm(g.t) ? ' · ' + g.t : ''}</Text> : null}
          </View>
          <CourseGrid courses={g.items} mode={mode} />
        </View>
      ))}
      {noTerm.length ? <CourseGrid courses={noTerm} mode={mode} /> : null}
    </View>
  );
}

function ContributorsScreen({ courseId, mode }) {
  const { s, data, push, jump, openModal, nameOf } = useApp();
  const [sort, setSort] = useState('recent');
  const isProj = mode === 'project';
  const course = data.courses.find((c) => c.id === courseId);
  const posts = data.posts.filter((p) => p.courseId === courseId && typesForMode(mode).includes(p.type));

  const people = useMemo(() => {
    const by = {};
    posts.forEach((p) => {
      if (!by[p.authorId]) by[p.authorId] = { authorId: p.authorId, name: p.authorName, count: 0, likes: 0, latest: p.createdAt };
      const g = by[p.authorId];
      g.count += 1;
      g.likes += (p.likes || []).length;
      if (new Date(p.createdAt) > new Date(g.latest)) g.latest = p.createdAt;
    });
    const arr = Object.values(by);
    arr.sort((a, b) => (sort === 'popular' ? b.likes - a.likes : new Date(b.latest) - new Date(a.latest)));
    return arr;
  }, [posts, sort]);

  if (!course) return <Empty text="ไม่พบรายวิชา" />;
  const color = courseColor(course);
  return (
    <View>
      <Breadcrumb items={[
        { label: 'หน้าแรก', go: 'home' },
        { label: isProj ? 'Projects' : 'ค้นหาสรุป', go: 'browse', params: { mode } },
        { label: course.code },
      ]} />
      <View style={[s.hero, { backgroundColor: PASTEL[color].tile }]}>
        <View style={[s.blob, { backgroundColor: PASTEL[color].dot, right: -40, top: -50 }]} />
        <View style={s.rowBetween}>
          <View style={s.row}>
            <View style={s.tileIcon}><Feather name={COURSE_ICON[course.code] || 'book-open'} size={16} color={INK} /></View>
            <Text style={s.tileTerm}>{course.code} · {course.credits || 3} หน่วยกิต</Text>
          </View>
          <Pill label={termLabel(course.semester)} />
        </View>
        <Text style={s.heroTitle}>{course.name}</Text>
        <TouchableOpacity onPress={() => openModal({ type: 'pickInstructor', courseId })} activeOpacity={0.8} style={[s.row, { marginTop: 10 }]}>
          <Feather name="user" size={13} color={INK} />
          <Text style={s.heroMeta}> {course.instructor || 'ยังไม่ระบุอาจารย์ผู้สอน — แตะเพื่อเลือก'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.row, { marginTop: 14, marginBottom: 6 }]}>
        <Chip label="สรุป & ปัญหา" icon="file-text" selected={!isProj} onPress={() => jump('contributors', { courseId, mode: 'summary' })} />
        <Chip label="Projects" icon="folder" selected={isProj} onPress={() => jump('contributors', { courseId, mode: 'project' })} />
      </View>

      <SectionHead
        title={`รุ่นพี่ที่แชร์ (${people.length})`}
        style={{ marginTop: 6 }}
        right={<Btn title="อัปโหลด" icon="upload" small onPress={() => openModal({ type: 'upload', defaultType: isProj ? 'project' : 'summary', courseId })} />}
      />
      {!posts.length ? (
        <Empty text={'ยังไม่มีใครแชร์' + (isProj ? 'โปรเจ็กต์' : 'สรุป') + 'วิชานี้ — เป็นรุ่นพี่คนแรกเลย!'} />
      ) : (
        <>
          <View style={[s.row, { marginBottom: 10 }]}>
            <Chip label="ล่าสุด" selected={sort === 'recent'} onPress={() => setSort('recent')} />
            <Chip label="ยอดนิยม" selected={sort === 'popular'} onPress={() => setSort('popular')} />
          </View>
          {people.map((p) => {
            const u = data.users.find((x) => x.studentId === p.authorId);
            return (
              <Card key={p.authorId} style={s.personCard} onPress={() => push('person', { courseId, mode, personId: p.authorId })}>
                <Avatar sid={p.authorId} name={p.name} size={52} showEmoji />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={s.personName}>{nameOf(p.authorId, p.name)}</Text>
                  <Text style={s.meta} numberOfLines={1}>{u && u.bio ? u.bio : 'รหัส ' + p.authorId}</Text>
                  <View style={[s.row, { marginTop: 6 }]}>
                    <Pill label={`${p.count} รายการ`} color={isProj ? 'pink' : 'yellow'} style={{ marginRight: 6 }} />
                    <Pill icon="heart" label={String(p.likes)} color="lilac" />
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#B5ADA2" />
              </Card>
            );
          })}
        </>
      )}
    </View>
  );
}

function PersonScreen({ courseId, mode, personId }) {
  const { s, data, push } = useApp();
  const course = data.courses.find((c) => c.id === courseId);
  const posts = data.posts.filter((p) => p.courseId === courseId && p.authorId === personId && typesForMode(mode).includes(p.type)).sort(byNewest);
  const u = data.users.find((x) => x.studentId === personId);
  const profile = u || { studentId: personId, name: posts[0] ? posts[0].authorName : 'ผู้ใช้' };
  return (
    <View>
      <Breadcrumb items={[
        { label: 'หน้าแรก', go: 'home' },
        { label: course ? course.code : 'รายวิชา', go: 'contributors', params: { courseId, mode } },
        { label: profile.name },
      ]} />
      <ProfileCard profile={profile} action={<Btn title="ดูโปรไฟล์" small variant="outline" onPress={() => push('profile', { sid: personId })} />} />
      <SectionHead title={`ใน ${course ? course.code : ''} (${posts.length})`} style={{ marginTop: 6 }} />
      {posts.length ? posts.map((p) => <PostCard key={p.id} p={p} />) : <Empty text="ไม่พบรายการ" />}
    </View>
  );
}

function PostScreen({ postId }) {
  const { s, data, addComment, push, nameOf } = useApp();
  const p = data.posts.find((x) => x.id === postId);
  if (!p) return <Empty text="ไม่พบเนื้อหานี้" />;
  const course = data.courses.find((c) => c.id === p.courseId);
  const mode = p.type === 'project' ? 'project' : 'summary';
  const comments = [...(p.comments || [])].sort(byOldest);
  const color = TYPE_COLOR[p.type];
  return (
    <View>
      <Breadcrumb items={[
        { label: 'หน้าแรก', go: 'home' },
        { label: course ? course.code : 'รายวิชา', go: 'contributors', params: { courseId: p.courseId, mode } },
        { label: p.title },
      ]} />
      <View style={[s.hero, { backgroundColor: PASTEL[color].tile }]}>
        <View style={[s.blob, { backgroundColor: PASTEL[color].dot, right: -40, top: -50 }]} />
        <View style={s.rowBetween}>
          <Pill label={TYPE_LABEL[p.type]} />
          <Text style={s.heroMeta}>{relTime(p.createdAt)}</Text>
        </View>
        <Text style={s.heroTitle}>{p.title}</Text>
        <View style={[s.row, { marginTop: 10, flexWrap: 'wrap' }]}>
          <Text style={s.heroMeta}>📘 {course ? course.code : ''}   📅 เทอม {p.semester || '-'}</Text>
        </View>
      </View>

      <Card style={[s.authorRow]} onPress={() => push('profile', { sid: p.authorId })}>
        <Avatar sid={p.authorId} name={p.authorName} size={40} showEmoji />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.personName}>{nameOf(p.authorId, p.authorName)}</Text>
          <Text style={s.meta}>แตะเพื่อดูโปรไฟล์</Text>
        </View>
        <LikeBtn post={p} withLabel />
      </Card>

      <Card style={{ padding: 20 }}>
        {p.content ? <Text style={s.detailContent}>{p.content}</Text> : null}
        <AttachmentList items={p.attachments} flush={!p.content} />
      </Card>

      <CommentBox
        title="ความคิดเห็น"
        items={comments}
        emptyText="ยังไม่มีความคิดเห็น"
        placeholder="แสดงความคิดเห็น หรือถามเพิ่มเติม..."
        onSubmit={(t) => addComment(p.id, t)}
      />
    </View>
  );
}

function QaScreen() {
  const { s, data, openModal } = useApp();
  const [course, setCourse] = useState('all');
  const list = [...data.threads].sort(byNewest).filter((t) => course === 'all' || t.courseId === course);
  const used = [...new Set(data.threads.map((t) => t.courseId).filter(Boolean))];
  const codeOf = (id) => (data.courses.find((c) => c.id === id) || {}).code || id;
  return (
    <View>
      <Breadcrumb items={[{ label: 'หน้าแรก', go: 'home' }, { label: 'กระทู้ถาม-ตอบ' }]} />
      <Text style={s.display2}>ถามรุ่นพี่{'\n'}ได้ทุกเรื่อง</Text>
      <Btn title="ตั้งกระทู้ใหม่" arrow style={{ alignSelf: 'flex-start', marginTop: 14 }} onPress={() => openModal({ type: 'newThread' })} />
      {used.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <Chip label="ทั้งหมด" selected={course === 'all'} onPress={() => setCourse('all')} />
          {used.map((id) => <Chip key={id} label={codeOf(id)} selected={course === id} onPress={() => setCourse(id)} />)}
        </ScrollView>
      ) : null}
      <View style={{ height: 12 }} />
      {list.length ? list.map((t) => <QaItem key={t.id} t={t} />) : <Empty text="ยังไม่มีกระทู้ — ตั้งคำถามแรกได้เลย" />}
    </View>
  );
}

function QaThreadScreen({ threadId }) {
  const { s, data, addReply, push, nameOf } = useApp();
  const t = data.threads.find((x) => x.id === threadId);
  if (!t) return <Empty text="ไม่พบกระทู้นี้" />;
  const replies = [...(t.replies || [])].sort(byOldest);
  return (
    <View>
      <Breadcrumb items={[{ label: 'หน้าแรก', go: 'home' }, { label: 'ถาม-ตอบ', go: 'qa' }, { label: t.title }]} />
      <View style={[s.hero, { backgroundColor: PASTEL.blue.tile }]}>
        <View style={[s.blob, { backgroundColor: PASTEL.blue.dot, right: -40, top: -50 }]} />
        <View style={s.rowBetween}>
          {t.courseCode ? <Pill label={t.courseCode} /> : <View />}
          <Text style={s.heroMeta}>{relTime(t.createdAt)}</Text>
        </View>
        <Text style={s.heroTitle}>{t.title}</Text>
      </View>
      <Card style={s.authorRow} onPress={() => push('profile', { sid: t.authorId })}>
        <Avatar sid={t.authorId} name={t.authorName} size={40} showEmoji />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.personName}>{nameOf(t.authorId, t.authorName)}</Text>
          <Text style={s.meta}>ผู้ตั้งกระทู้</Text>
        </View>
      </Card>
      <Card style={{ padding: 20 }}>
        <Text style={s.detailContent}>{t.body}</Text>
      </Card>
      <CommentBox
        title="คำตอบ"
        items={replies}
        emptyText="ยังไม่มีคำตอบ เป็นคนแรกที่ช่วยตอบสิ!"
        placeholder="เขียนคำตอบของคุณ..."
        onSubmit={(txt) => addReply(t.id, txt)}
      />
    </View>
  );
}

function ProfileScreen({ sid }) {
  const { s, c, data, me, user, push, logout } = useApp();
  const isMe = !sid || sid === user.studentId;
  const id = isMe ? user.studentId : sid;
  const profile = isMe ? me : data.users.find((u) => u.studentId === id) || { studentId: id, name: 'ผู้ใช้' };
  const posts = data.posts.filter((p) => p.authorId === id).sort(byNewest);
  const st = profileStats(id, data, profile);
  return (
    <View>
      <ProfileCard
        profile={profile}
        action={isMe ? <Btn title="แต่งโปรไฟล์" icon="edit-2" small variant="outline" onPress={() => push('editProfile')} /> : null}
      />
      <LevelCard st={st} />
      <BadgeShelf st={st} />
      <SectionHead title={isMe ? 'โพสต์ของฉัน' : 'โพสต์ทั้งหมด'} style={{ marginTop: 8 }} />
      {posts.length ? posts.map((p) => <PostCard key={p.id} p={p} />) : <Empty text={isMe ? 'ยังไม่มีโพสต์ — แชร์สรุปแรกเพื่อรับเหรียญ ✍️ นักสรุป' : 'ยังไม่มีโพสต์'} />}
      {isMe ? (
        <>
          <Card style={[s.menuRow, { marginTop: 8 }]} onPress={() => push('instructors')}>
            <Feather name="users" size={18} color={c.text} />
            <Text style={s.menuTxt}>อาจารย์ประจำหลักสูตร dX</Text>
            <Feather name="chevron-right" size={18} color="#B5ADA2" />
          </Card>
          <Card style={s.menuRow} onPress={logout}>
            <Feather name="log-out" size={18} color={c.danger} />
            <Text style={[s.menuTxt, { color: c.danger }]}>ออกจากระบบ</Text>
            <View />
          </Card>
        </>
      ) : null}
    </View>
  );
}

function EditProfileScreen() {
  const { s, me, saveProfile, back } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <ProfileForm
      initial={{ year: 'ปี 1', color: 'yellow', emoji: '📚', bio: '', photo: null, ...me }}
      header={<Text style={[s.display2, { marginBottom: 14 }]}>แต่งโปรไฟล์{'\n'}ให้เป็นตัวเอง ✨</Text>}
      lockId
      busy={busy}
      submitLabel={busy ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
      onSubmit={async (p) => {
        setBusy(true);
        const ok = await saveProfile({ ...p, updatedAt: new Date().toISOString() });
        setBusy(false);
        if (ok) back();
      }}
    />
  );
}

function InstructorsScreen() {
  const { s } = useApp();
  const groups = [...new Set(INSTRUCTORS.map((i) => i.group))];
  const colors = ['yellow', 'pink', 'mint', 'blue', 'lilac', 'peach'];
  return (
    <View>
      <Breadcrumb items={[{ label: 'หน้าแรก', go: 'home' }, { label: 'อาจารย์หลักสูตร dX' }]} />
      <Text style={s.display2}>อาจารย์{'\n'}หลักสูตร dX</Text>
      <Text style={[s.smallMuted, { marginTop: 8 }]}>
        ข้อมูลจากเว็บไซต์วิทยาลัยนวัตกรรม มธ. — <Text style={s.linkTxt} onPress={() => Linking.openURL(CITU_URL)}>citu.tu.ac.th</Text>
      </Text>
      {groups.map((g) => (
        <View key={g}>
          <SectionHead title={g} style={{ marginTop: 18 }} />
          {INSTRUCTORS.filter((i) => i.group === g).map((i, idx) => (
            <Card key={i.name} style={s.personCard}>
              <View style={[s.instAvatar, { backgroundColor: PASTEL[colors[(idx + g.length) % colors.length]].dot }]}>
                <Feather name="award" size={20} color={INK} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.personName}>{i.name}</Text>
                {i.en ? <Text style={s.meta}>{i.en}</Text> : null}
                <Text style={[s.meta, { marginTop: 3 }]}>{i.role}</Text>
              </View>
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}

/* ============================ modals ============================ */
function ModalShell({ title, onClose, children }) {
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

/** เทอมปัจจุบันตามปฏิทินไทย: ส.ค.–ธ.ค. = เทอม 1, ม.ค.–พ.ค. = เทอม 2 ของปีก่อน, มิ.ย.–ก.ค. = ฤดูร้อน */
function currentTermKey() {
  const p = bkkParts(new Date().toISOString());
  if (p.m >= 7) return '1/' + p.y;
  if (p.m <= 4) return '2/' + (p.y - 1);
  return 'S/' + (p.y - 1);
}

function CoursePicker({ courses, value, onChange, allowNone, multi, compact }) {
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

function NewCourseModal({ onClose }) {
  const { createCourse } = useApp();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [sem, setSem] = useState('');
  const submit = () => {
    if (!code.trim() || !name.trim()) { notify('กรอกข้อมูลไม่ครบ', 'กรุณากรอกรหัสวิชาและชื่อวิชา'); return; }
    createCourse({ code: code.trim().toUpperCase(), name: name.trim(), semester: sem.trim(), credits: 3, instructor: '' });
    onClose();
  };
  return (
    <ModalShell title="เพิ่มรายวิชาใหม่" onClose={onClose}>
      <Field label="รหัสวิชา" value={code} onChangeText={setCode} placeholder="เช่น DX310" autoCapitalize="characters" />
      <Field label="ชื่อวิชา" value={name} onChangeText={setName} placeholder="ชื่อวิชาภาษาอังกฤษ" />
      <Field label="ภาคการศึกษา" value={sem} onChangeText={setSem} placeholder="เช่น 2/2026" />
      <Btn title="เพิ่มรายวิชา" arrow block onPress={submit} />
    </ModalShell>
  );
}

function PickInstructorModal({ courseId, onClose }) {
  const { s, data, setInstructor } = useApp();
  const course = data.courses.find((c) => c.id === courseId);
  const [val, setVal] = useState((course && course.instructor) || '');
  const [custom, setCustom] = useState('');
  return (
    <ModalShell title={`อาจารย์ผู้สอน ${course ? course.code : ''}`} onClose={onClose}>
      <Text style={[s.smallMuted, { marginBottom: 10 }]}>เลือกจากรายชื่ออาจารย์หลักสูตร dX หรือพิมพ์ชื่อเอง</Text>
      <View style={s.wrapRow}>
        <Chip label="ไม่ระบุ" selected={!val} onPress={() => setVal('')} />
        {INSTRUCTORS.map((i) => <Chip key={i.name} label={i.name} selected={val === i.name} onPress={() => setVal(i.name)} />)}
      </View>
      <Field label="หรือพิมพ์ชื่ออาจารย์" value={custom} onChangeText={setCustom} placeholder="เช่น อาจารย์พิเศษ" />
      <Btn title="บันทึก" arrow block onPress={() => { setInstructor(courseId, custom.trim() || val); onClose(); }} />
    </ModalShell>
  );
}

/** ส่วนเลือกไฟล์แนบในฟอร์มอัปโหลด */
function AttachPicker({ items, setItems, busy }) {
  const { s, c } = useApp();
  const left = MAX_ATTACH - items.length;
  const tooBig = (bytes) => bytes > MAX_FILE_MB * 1024 * 1024;
  const add = (list) => setItems((prev) => [...prev, ...list].slice(0, MAX_ATTACH));

  const pickImages = async () => {
    if (left <= 0) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { notify('ต้องการสิทธิ์เข้าถึงรูปภาพ', 'อนุญาตการเข้าถึงคลังรูปเพื่อแนบรูป'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: left, quality: 1 });
      if (res.canceled || !res.assets) return;
      const out = [];
      for (const a of res.assets.slice(0, left)) {
        const img = await prepareImage(a.uri, a.width);
        const bytes = b64Bytes(img.b64);
        if (tooBig(bytes)) { notify('รูปใหญ่เกินไป', `รูปต้องไม่เกิน ${MAX_FILE_MB} MB หลังย่อขนาด`); continue; }
        out.push({ id: uid(), name: a.fileName || `image_${out.length + 1}.jpg`, mime: 'image/jpeg', size: bytes, b64: img.b64, thumb: img.thumb });
      }
      add(out);
    } catch (e) { notify('แนบรูปไม่สำเร็จ', 'ลองเลือกรูปอีกครั้ง'); }
  };

  const pickFiles = async () => {
    if (left <= 0) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, multiple: true, copyToCacheDirectory: true });
      if (res.canceled || !res.assets) return;
      const out = [];
      for (const a of res.assets.slice(0, left)) {
        const kind = fileKind(a.name, a.mimeType);
        if (kind.key === 'image') {
          const img = await prepareImage(a.uri, 0);
          out.push({ id: uid(), name: a.name, mime: 'image/jpeg', size: b64Bytes(img.b64), b64: img.b64, thumb: img.thumb });
          continue;
        }
        if (a.size && tooBig(a.size)) { notify('ไฟล์ใหญ่เกินไป', `"${a.name}" ใหญ่ ${fmtSize(a.size)} — จำกัดไม่เกิน ${MAX_FILE_MB} MB ต่อไฟล์`); continue; }
        const b64 = await readAsBase64(a);
        const bytes = b64Bytes(b64);
        if (tooBig(bytes)) { notify('ไฟล์ใหญ่เกินไป', `"${a.name}" ใหญ่ ${fmtSize(bytes)} — จำกัดไม่เกิน ${MAX_FILE_MB} MB ต่อไฟล์`); continue; }
        out.push({ id: uid(), name: a.name, mime: a.mimeType || 'application/octet-stream', size: bytes, b64 });
      }
      add(out);
    } catch (e) { notify('แนบไฟล์ไม่สำเร็จ', 'ลองเลือกไฟล์อีกครั้ง'); }
  };

  return (
    <View style={s.field}>
      <View style={s.rowBetween}>
        <Text style={s.label}>ไฟล์แนบ (ไม่บังคับ)</Text>
        <Text style={s.hint}>{items.length}/{MAX_ATTACH} · ไม่เกิน {MAX_FILE_MB} MB/ไฟล์</Text>
      </View>
      <View style={s.row}>
        <TouchableOpacity disabled={busy || left <= 0} activeOpacity={0.85} onPress={pickImages} style={[s.attachBtn, { backgroundColor: PASTEL.mint.tile }, left <= 0 && { opacity: 0.4 }]}>
          <Feather name="image" size={18} color={INK} />
          <Text style={s.attachBtnTxt}>รูปภาพ</Text>
        </TouchableOpacity>
        <View style={{ width: 8 }} />
        <TouchableOpacity disabled={busy || left <= 0} activeOpacity={0.85} onPress={pickFiles} style={[s.attachBtn, { backgroundColor: PASTEL.pink.tile }, left <= 0 && { opacity: 0.4 }]}>
          <Feather name="file-text" size={18} color={INK} />
          <Text style={s.attachBtnTxt}>PDF / เอกสาร</Text>
        </TouchableOpacity>
      </View>
      {items.length ? (
        <View style={{ marginTop: 10 }}>
          {items.map((it) => {
            const k = fileKind(it.name, it.mime);
            return (
              <View key={it.id} style={s.pendRow}>
                {it.thumb ? <Image source={{ uri: it.thumb }} style={s.pendThumb} /> : (
                  <View style={[s.pendThumb, { backgroundColor: PASTEL[k.color].tile, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={s.fileExt}>{k.label === 'ไฟล์' ? '📎' : k.label.slice(0, 3).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.nextTitle} numberOfLines={1}>{it.name}</Text>
                  <Text style={s.meta}>{k.label} · {fmtSize(it.size)}</Text>
                </View>
                {!busy ? (
                  <TouchableOpacity onPress={() => setItems((prev) => prev.filter((x) => x.id !== it.id))} style={{ padding: 6 }}>
                    <Feather name="x" size={18} color={c.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[s.hint, { marginTop: 8 }]}>แนบรูปสรุป สไลด์ หรือไฟล์ PDF ให้รุ่นน้องดาวน์โหลดได้</Text>
      )}
    </View>
  );
}

/** แสดงไฟล์แนบในหน้าโพสต์: รูปเป็นแกลเลอรี + เอกสารเป็นการ์ด */
function AttachmentList({ items, flush }) {
  const { s, openModal } = useApp();
  const [opening, setOpening] = useState(null);
  if (!items || !items.length) return null;
  const images = items.filter((a) => fileKind(a.name, a.mime).key === 'image');
  const docs = items.filter((a) => fileKind(a.name, a.mime).key !== 'image');
  const open = async (att) => {
    setOpening(att.id);
    try { await openAttachment(att); }
    catch (e) { notify('เปิดไฟล์ไม่สำเร็จ', 'โหลดไฟล์ไม่ได้ ลองใหม่อีกครั้ง'); }
    finally { setOpening(null); }
  };
  return (
    <View style={{ marginTop: flush ? 0 : 16 }}>
      {images.length ? (
        <View style={s.gallery}>
          {images.map((a, i) => (
            <TouchableOpacity key={a.id} activeOpacity={0.9} onPress={() => openModal({ type: 'imageViewer', images, index: i })}
              style={[s.galleryItem, images.length === 1 && s.galleryOne]}>
              <Image source={{ uri: a.thumb }} style={s.galleryImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {docs.map((a) => {
        const k = fileKind(a.name, a.mime);
        return (
          <TouchableOpacity key={a.id} activeOpacity={0.85} onPress={() => open(a)} style={s.docCard}>
            <View style={[s.docIcon, { backgroundColor: PASTEL[k.color].tile }]}>
              <Text style={s.fileExt}>{k.label === 'ไฟล์' ? '📎' : k.label.slice(0, 3).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.nextTitle} numberOfLines={1}>{a.name}</Text>
              <Text style={s.meta}>{k.label} · {fmtSize(a.size)}</Text>
            </View>
            <View style={s.docOpen}>
              {opening === a.id ? <ActivityIndicator size="small" color="#fff" /> : <Feather name={Platform.OS === 'web' ? 'external-link' : 'download'} size={15} color="#fff" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** ดูรูปเต็มจอ — โหลดรูปความละเอียดเต็มเมื่อเปิด */
function ImageViewer({ images, index: start, onClose }) {
  const { s } = useApp();
  const [i, setI] = useState(start || 0);
  const [full, setFull] = useState({});
  const cur = images[i];
  useEffect(() => {
    let alive = true;
    if (cur && !full[cur.id]) {
      loadFileData(cur).then((b64) => { if (alive) setFull((f) => ({ ...f, [cur.id]: 'data:image/jpeg;base64,' + b64 })); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [cur && cur.id]);
  if (!cur) return null;
  return (
    <View style={s.viewer}>
      <Image source={{ uri: full[cur.id] || cur.thumb }} style={s.viewerImg} resizeMode="contain" />
      {!full[cur.id] ? <ActivityIndicator color="#fff" style={{ position: 'absolute', top: '50%', alignSelf: 'center' }} /> : null}
      <View style={s.viewerTop}>
        <Text style={s.viewerTxt} numberOfLines={1}>{i + 1}/{images.length} · {cur.name}</Text>
        <IconCircle name="x" size={38} bg="rgba(255,255,255,0.9)" onPress={onClose} />
      </View>
      {images.length > 1 ? (
        <View style={s.viewerNav}>
          <IconCircle name="chevron-left" size={44} bg="rgba(255,255,255,0.9)" onPress={() => setI((i - 1 + images.length) % images.length)} />
          <IconCircle name="chevron-right" size={44} bg="rgba(255,255,255,0.9)" onPress={() => setI((i + 1) % images.length)} />
        </View>
      ) : null}
    </View>
  );
}

function UploadModal({ defaultType, courseId: presetCourseId, onClose }) {
  const { s, data, createPost } = useApp();
  const typeOptions = defaultType === 'project' ? ['project'] : ['summary', 'problem'];
  const courses = [...data.courses].sort(byCode);
  const [type, setType] = useState(typeOptions[0]);
  const [courseId, setCourseId] = useState(presetCourseId || null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const presetCourse = courses.find((c) => c.id === presetCourseId);
  const [semester, setSemester] = useState(presetCourse && isRealTerm(presetCourse.semester) ? presetCourse.semester : '');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!courseId) { setError('ยังไม่ได้เลือกรายวิชา'); return; }
    if (!title.trim()) { setError('กรุณาใส่หัวข้อ'); return; }
    if (!content.trim() && !files.length) { setError('ใส่เนื้อหา หรือแนบไฟล์อย่างน้อย 1 ไฟล์'); return; }
    setBusy(true);
    try {
      const attachments = [];
      for (let k = 0; k < files.length; k++) {
        const f = files[k];
        setProgress(`กำลังอัปโหลดไฟล์ ${k + 1}/${files.length}`);
        const chunks = await saveFileData(f.id, f.b64, (r) => setProgress(`กำลังอัปโหลดไฟล์ ${k + 1}/${files.length} · ${Math.round(r * 100)}%`));
        fileCache[f.id] = f.b64;
        const meta = { id: f.id, name: f.name, mime: f.mime, size: f.size, chunks };
        if (f.thumb) meta.thumb = f.thumb;
        attachments.push(meta);
      }
      setProgress('กำลังโพสต์...');
      createPost({ type, courseId, title: title.trim(), content: content.trim(), semester: semester.trim(), attachments });
      onClose(courseId, type === 'project' ? 'project' : 'summary');
    } catch (e) {
      setBusy(false);
      setProgress('');
      setError(e && e.status === 403
        ? 'อัปโหลดไม่ได้: ยังไม่ได้อัปเดต Security Rules สำหรับไฟล์ (collection files)'
        : String(e && e.message || '').includes('quota')
          ? 'พื้นที่ในเครื่องเต็ม — ลองไฟล์ที่เล็กลง หรือเชื่อมต่อ Firebase'
          : 'อัปโหลดไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
    }
  };

  return (
    <ModalShell title={defaultType === 'project' ? 'แชร์โปรเจ็กต์' : 'แชร์สรุป / ปัญหาที่เจอ'} onClose={() => onClose()}>
      {typeOptions.length > 1 && (
        <View style={s.field}>
          <Text style={s.label}>ประเภทเนื้อหา</Text>
          <View style={s.wrapRow}>
            {typeOptions.map((t) => <Chip key={t} label={TYPE_LABEL[t]} dot={TYPE_COLOR[t]} selected={type === t} onPress={() => setType(t)} />)}
          </View>
        </View>
      )}
      <View style={s.field}>
        <Text style={s.label}>รายวิชา</Text>
        <CoursePicker compact courses={courses} value={courseId} onChange={(id) => {
          setCourseId(id);
          const c = courses.find((x) => x.id === id);
          if (c && !semester && isRealTerm(c.semester)) setSemester(c.semester);
        }} />
      </View>
      <Field label="หัวข้อ" value={title} onChangeText={setTitle} maxLength={200} placeholder="เช่น สรุปบทที่ 3-5 ก่อนสอบกลางภาค" />
      <Field label="เนื้อหา" value={content} onChangeText={setContent} multiline placeholder="พิมพ์สรุป ปัญหาที่เจอ หรือรายละเอียดโปรเจ็กต์ที่นี่... (ถ้าแนบไฟล์แล้ว จะเขียนสั้น ๆ ก็ได้)" />
      <Field label="ภาคการศึกษาที่เรียน" value={semester} onChangeText={setSemester} placeholder="เช่น 1/2026" />
      <AttachPicker items={files} setItems={setFiles} busy={busy} />
      {error ? <Text style={s.formError}>⚠️ {error}</Text> : null}
      {busy ? (
        <View style={[s.row, { marginBottom: 10 }]}>
          <ActivityIndicator size="small" color={INK} />
          <Text style={[s.smallMuted, { marginLeft: 8 }]}>{progress}</Text>
        </View>
      ) : null}
      <Btn title={busy ? 'กำลังอัปโหลด...' : files.length ? `โพสต์พร้อมไฟล์ ${files.length} ไฟล์` : 'โพสต์เลย'} arrow block disabled={busy} onPress={submit} />
    </ModalShell>
  );
}

function AdminPinModal({ onClose }) {
  const { s, unlockAdmin } = useApp();
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const submit = () => {
    if (pin === ADMIN_PIN) { onClose(); unlockAdmin(); }
    else { setWrong(true); setPin(''); }
  };
  return (
    <ModalShell title="เข้าสู่โหมดแอดมิน" onClose={onClose}>
      <Text style={[s.smallMuted, { marginBottom: 12 }]}>ใส่ PIN แอดมินเพื่อจัดการตารางสอบ ประกาศ และเนื้อหา</Text>
      <Field label="PIN" value={pin} onChangeText={(v) => { setPin(v.replace(/\D/g, '')); setWrong(false); }} keyboardType="number-pad"
        secureTextEntry maxLength={8} placeholder="••••" onSubmitEditing={submit} />
      {wrong ? <Text style={[s.hint, { color: '#D94A5C', marginTop: -6, marginBottom: 10 }]}>PIN ไม่ถูกต้อง ลองใหม่อีกครั้ง</Text> : null}
      <Btn title="เข้าสู่โหมดแอดมิน" arrow block onPress={submit} />
    </ModalShell>
  );
}

/** ปฏิทินเลือกวัน + เวลา (เวลาไทย) — ไม่ต้องพิมพ์ ไม่ต้องติดตั้งแพ็กเกจเพิ่ม */
function DateTimePicker({ value, onChange }) {
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
const partsToIso = (v) => new Date(Date.UTC(v.y, v.m, v.d, v.hh, v.mi) - BKK).toISOString();

function EventFormModal({ scope, event, onClose }) {
  const { s, data, saveEvent, addMyEvent } = useApp();
  const initial = () => {
    if (event && event.date) { const p = bkkParts(event.date); return { y: p.y, m: p.m, d: p.d, hh: p.hh, mi: p.mi }; }
    const t = new Date(Date.now() + BKK + 7 * 86400000); // ค่าเริ่มต้น: อีก 1 สัปดาห์ 09:00
    return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), hh: 9, mi: 0 };
  };
  const [kind, setKind] = useState((event && event.kind) || 'midterm');
  const [title, setTitle] = useState((event && event.title) || '');
  const [courseId, setCourseId] = useState((event && event.courseId) || null);
  const [when, setWhen] = useState(initial);
  const [place, setPlace] = useState((event && event.place) || '');
  const [error, setError] = useState('');
  const courses = [...data.courses].sort(byCode);
  const iso = partsToIso(when);
  const course = courses.find((x) => x.id === courseId);
  const submit = () => {
    if (new Date(iso).getTime() <= Date.now()) { setError('เวลานี้ผ่านไปแล้ว — เลือกวันหรือเวลาในอนาคต'); return; }
    const t = title.trim() || kindOf(kind).label;
    const payload = { title: t, kind, courseId: courseId || null, date: iso, place: place.trim() };
    if (scope === 'shared') saveEvent(event ? event.id : null, payload);
    else addMyEvent(payload);
    onClose();
  };
  return (
    <ModalShell title={scope === 'shared' ? (event ? 'แก้ไขวันสอบ' : 'เพิ่มวันสอบ (ทุกคนเห็น)') : 'เพิ่มวันสอบของฉัน'} onClose={onClose}>
      <Text style={s.formSection}>1 · ประเภท</Text>
      <View style={[s.wrapRow, { marginBottom: 6 }]}>
        {EXAM_KINDS.map((k) => <Chip key={k.key} label={k.emoji + ' ' + k.label} selected={kind === k.key} onPress={() => setKind(k.key)} />)}
      </View>

      <Text style={s.formSection}>2 · วิชา (ไม่บังคับ)</Text>
      <View style={{ marginBottom: 10 }}>
        <CoursePicker courses={courses} value={courseId} onChange={setCourseId} allowNone compact />
      </View>

      <Text style={s.formSection}>3 · วันและเวลา</Text>
      <DateTimePicker value={when} onChange={(v) => { setWhen(v); setError(''); }} />

      <Text style={[s.formSection, { marginTop: 14 }]}>4 · รายละเอียดเพิ่มเติม (ไม่บังคับ)</Text>
      <Field value={title} onChangeText={setTitle} maxLength={80} placeholder={'ชื่อ เช่น ' + kindOf(kind).label + ' บทที่ 1–5'} />
      <Field value={place} onChangeText={setPlace} maxLength={60} placeholder="สถานที่ เช่น SC1001 / ออนไลน์" />

      <View style={s.summaryBox}>
        <Text style={s.summaryKicker}>จะนับถอยหลังถึง</Text>
        <Text style={s.summaryTxt}>{kindOf(kind).emoji} {course ? course.code + ' · ' : ''}{title.trim() || kindOf(kind).label}</Text>
        <Text style={s.summaryDate}>📅 {fmtThaiDate(iso)}</Text>
      </View>
      {error ? <Text style={s.formError}>⚠️ {error}</Text> : null}
      <Btn title="บันทึกและเริ่มนับถอยหลัง" arrow block onPress={submit} />
    </ModalShell>
  );
}

function NewThreadModal({ onClose }) {
  const { s, data, createThread } = useApp();
  const courses = [...data.courses].sort(byCode);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [courseId, setCourseId] = useState(null);
  const submit = () => {
    if (!title.trim() || !body.trim()) { notify('กรอกข้อมูลไม่ครบ', 'กรุณากรอกหัวข้อและรายละเอียด'); return; }
    const c = courses.find((x) => x.id === courseId);
    createThread({ title: title.trim(), body: body.trim(), courseId: c ? c.id : null, courseCode: c ? c.code : null });
    onClose(true);
  };
  return (
    <ModalShell title="ตั้งกระทู้ใหม่" onClose={() => onClose()}>
      <Field label="หัวข้อคำถาม" value={title} onChangeText={setTitle} maxLength={200} placeholder="เช่น DX212 ใช้ Expo ทำ navigation ยังไง" />
      <Field label="รายละเอียด" value={body} onChangeText={setBody} multiline placeholder="อธิบายคำถามของคุณให้ละเอียด..." />
      <View style={{ marginBottom: 14 }}>
        <Text style={s.label}>เกี่ยวกับวิชา (ถ้ามี)</Text>
        <CoursePicker compact courses={courses} value={courseId} onChange={setCourseId} allowNone />
      </View>
      <Btn title="ตั้งกระทู้" arrow block onPress={submit} />
    </ModalShell>
  );
}

/* ============================ main app ============================ */
const TABS = [
  { key: 'home', icon: 'home', label: 'หน้าแรก', route: { name: 'home', params: {} } },
  { key: 'summary', icon: 'search', label: 'สรุป', route: { name: 'browse', params: { mode: 'summary' } } },
  { key: 'project', icon: 'folder', label: 'Projects', route: { name: 'browse', params: { mode: 'project' } } },
  { key: 'qa', icon: 'message-circle', label: 'ถาม-ตอบ', route: { name: 'qa', params: {} } },
  { key: 'me', icon: 'user', label: 'โปรไฟล์', route: { name: 'profile', params: {} } },
];

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

  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null); // { studentId, ...profile snapshot }
  const [data, setData] = useState(USE_FIREBASE ? { courses: [], posts: [], threads: [], users: [], events: [], config: {} } : { events: [], config: {}, ...SEED });
  const [myEvents, setMyEvents] = useState([]);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [syncing, setSyncing] = useState(USE_FIREBASE);
  const [dbError, setDbError] = useState(null);
  const [stack, setStack] = useState([{ name: 'home', params: {} }]);
  const [modal, setModal] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [authKey, setAuthKey] = useState(0);
  const [session, setSession] = useState(null); // Supabase session
  const [authChecked, setAuthChecked] = useState(!USE_SUPABASE);
  const [needsProfile, setNeedsProfile] = useState(false);
  useEffect(() => { dialogHandler = setDialog; return () => { dialogHandler = null; }; }, []);

  /* ---------- Supabase: session + โปรไฟล์ ---------- */
  /** รวมผู้ใช้จริงจาก Supabase เข้ากับรายชื่อในแอป (ผู้ใช้ตัวอย่างจาก SEED ยังอยู่จนถึงเฟส 3) */
  const mergeUsers = useCallback((list) => {
    setData((d) => {
      const ids = new Set(list.map((u) => u.studentId));
      return { ...d, users: [...d.users.filter((u) => !ids.has(u.studentId)), ...list] };
    });
  }, []);

  const loadMe = useCallback(async (sess) => {
    if (!sess) { setUser(null); setNeedsProfile(false); return; }
    try {
      const [mine, all] = await Promise.all([fetchMyProfile(sess.user.id), fetchAllProfiles()]);
      mergeUsers(all);
      if (mine) { setUser(mine); setNeedsProfile(false); }
      else { setUser(null); setNeedsProfile(true); }
    } catch (e) {
      setDbError('โหลดโปรไฟล์ไม่สำเร็จ — ' + authErrorMessage(e));
    }
  }, [mergeUsers]);

  useEffect(() => {
    if (!USE_SUPABASE) return undefined;
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

  /* ---------- load session + local data ---------- */
  useEffect(() => {
    (async () => {
      try {
        const rawUser = USE_SUPABASE ? null : await AsyncStorage.getItem(USER_KEY);
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u && u.studentId) setUser(u);
        }
        if (!USE_FIREBASE) {
          const rawData = await AsyncStorage.getItem(DATA_KEY);
          if (rawData) {
            const d = { courses: [], posts: [], threads: [], users: [], events: [], config: {}, ...JSON.parse(rawData) };
            // เติมรายวิชาในหลักสูตรที่ยังไม่มีในข้อมูลเดิม (เช่น ข้อมูลที่บันทึกไว้จากเวอร์ชันก่อน)
            const have = new Set(d.courses.map((c) => c.id));
            const missing = SEED.courses.filter((c) => !have.has(c.id));
            if (missing.length) {
              d.courses = [...d.courses, ...missing];
              AsyncStorage.setItem(DATA_KEY, JSON.stringify(d)).catch(() => {});
            }
            setData(d);
          } else {
            AsyncStorage.setItem(DATA_KEY, JSON.stringify(SEED)).catch(() => {});
          }
        }
      } catch (e) {}
      setReady(true);
    })();
  }, []);

  /* ---------- Firestore: โหลด + รีเฟรชอัตโนมัติ ---------- */
  const refresh = useCallback(async () => {
    if (!USE_FIREBASE) return null;
    try {
      const [courses, posts, threads, usersRaw, events, configDocs] = await Promise.all(['courses', 'posts', 'threads', 'users', 'events', 'config'].map((n) => fs.list(n)));
      const config = {};
      configDocs.forEach((d) => { config[d.id] = d; });
      const next = { courses, posts, threads, users: usersRaw.map((u) => ({ ...u, studentId: u.id })), events, config };
      setData(next);
      setDbError(null);
      setSyncing(false);
      return next;
    } catch (e) {
      setDbError(e.status === 403
        ? 'ไม่มีสิทธิ์เข้าถึงฐานข้อมูล — ตรวจ Security Rules ของ Firestore'
        : e.status === 404
          ? 'ไม่พบฐานข้อมูล — สร้าง Firestore Database ใน Firebase Console ก่อน'
          : 'เชื่อมต่อฐานข้อมูลไม่ได้ — ตรวจอินเทอร์เน็ตหรือค่า firebaseConfig');
      setSyncing(false);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!USE_FIREBASE) return undefined;
    let alive = true;
    (async () => {
      const first = await refresh();
      if (alive && first) {
        const n = await seedFirestore(first).catch(() => 0);
        if (n && alive) refresh();
      }
    })();
    const timer = setInterval(() => { if (alive) refresh(); }, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [refresh]);

  /* ---------- วันสอบส่วนตัว (เก็บในเครื่อง แยกตามผู้ใช้) ---------- */
  const myKey = user ? 'passon_my_events_' + user.studentId : null;
  useEffect(() => {
    if (!myKey) { setMyEvents([]); return; }
    AsyncStorage.getItem(myKey).then((raw) => setMyEvents(raw ? JSON.parse(raw) : [])).catch(() => setMyEvents([]));
  }, [myKey]);
  const saveMyEvents = (list) => {
    setMyEvents(list);
    if (myKey) AsyncStorage.setItem(myKey, JSON.stringify(list)).catch(() => {});
  };
  const addMyEvent = (e) => saveMyEvents([...myEvents, { id: uid(), ...e }]);
  const removeMyEvent = (id) => saveMyEvents(myEvents.filter((e) => e.id !== id));

  /** อัปเดตหน้าจอทันที (local mode บันทึกลงเครื่องด้วย) */
  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(prev);
      if (!USE_FIREBASE) AsyncStorage.setItem(DATA_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);
  const fbFail = () => notify('บันทึกไม่สำเร็จ', 'ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่ออินเทอร์เน็ต');
  /** อัปเดตหน้าจอก่อน แล้วค่อยส่งขึ้น Firestore — ถ้าพลาดจะแจ้งเตือนและดึงข้อมูลจริงกลับมา */
  const commit = (fn, remote) => {
    update(fn);
    if (USE_FIREBASE && remote) {
      remote().then(() => refresh()).catch(() => { fbFail(); refresh(); });
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
  const findProfile = async (sid) => {
    const local = data.users.find((u) => u.studentId === sid);
    if (local) return local;
    if (USE_FIREBASE) {
      try {
        const u = await fs.get('users', sid);
        return u ? { ...u, studentId: sid } : null;
      } catch (e) { return null; }
    }
    return null;
  };
  const saveProfile = async (p) => {
    if (USE_SUPABASE) {
      if (!session) return false;
      const uidNow = session.user.id;
      try {
        if (await isStudentIdTaken(p.studentId, uidNow)) {
          notify('รหัสนักศึกษานี้มีคนใช้แล้ว', 'ถ้าเป็นรหัสของคุณจริง ติดต่อแอดมินหลักสูตรเพื่อตรวจสอบ');
          return false;
        }
        const saved = await saveMyProfile(uidNow, p, user);
        mergeUsers([saved]);
        setUser(saved);
        setNeedsProfile(false);
        return true;
      } catch (e) {
        notify('บันทึกโปรไฟล์ไม่สำเร็จ', authErrorMessage(e));
        return false;
      }
    }
    const clean = {
      studentId: p.studentId, name: p.name, year: p.year || '', bio: p.bio || '', color: p.color || 'yellow',
      emoji: p.emoji || '📚', photo: p.photo || null, createdAt: p.createdAt || new Date().toISOString(),
      pattern: p.pattern || 'blobs', frame: p.frame || 'clean', shape: p.shape || 'circle',
      status: { emoji: (p.status && p.status.emoji) || '', text: (p.status && p.status.text) || '' },
      interests: (p.interests || []).slice(0, MAX_INTERESTS), favCourses: (p.favCourses || []).slice(0, MAX_FAV),
      links: p.links || {},
    };
    if (p.updatedAt) clean.updatedAt = p.updatedAt;
    if (USE_FIREBASE) {
      try { await fs.set('users', clean.studentId, clean); }
      catch (e) { fbFail(); return false; }
    }
    update((d) => ({ ...d, users: [...d.users.filter((u) => u.studentId !== clean.studentId), clean] }));
    setUser(clean);
    AsyncStorage.setItem(USER_KEY, JSON.stringify({ ...clean, photo: null })).catch(() => {});
    return true;
  };
  const signIn = (p) => {
    setUser(p);
    AsyncStorage.setItem(USER_KEY, JSON.stringify({ ...p, photo: null })).catch(() => {});
    reset('home');
  };
  const logout = () => {
    notify('ออกจากระบบ', USE_SUPABASE
      ? 'ต้องการออกจากระบบใช่ไหม? ข้อมูลโปรไฟล์และโพสต์ของคุณยังอยู่ครบ เข้าสู่ระบบใหม่ด้วยอีเมลเดิมได้ทุกเมื่อ'
      : 'ต้องการออกจากระบบใช่ไหม? ข้อมูลโปรไฟล์และโพสต์ของคุณยังอยู่ครบ เข้าสู่ระบบใหม่ด้วยรหัสนักศึกษาได้ทุกเมื่อ', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ', style: 'destructive', onPress: () => {
          if (USE_SUPABASE) supabase.auth.signOut().catch(() => {});
          else AsyncStorage.removeItem(USER_KEY).catch(() => {});
          setModal(null);
          setStack([{ name: 'home', params: {} }]);
          setAuthKey((k) => k + (USE_SUPABASE ? 0 : 1)); // เดโม: เปิดหน้าลงทะเบียนใหม่ / Supabase: กลับหน้าแรก
          setAdminUnlocked(false);
          setNeedsProfile(false);
          setUser(null);
        },
      },
    ]);
  };
  const me = user ? data.users.find((u) => u.studentId === user.studentId) || user : null;
  const nameOf = (sid, fallback) => {
    const u = data.users.find((x) => x.studentId === sid);
    return (u && u.name) || fallback || 'ผู้ใช้';
  };

  /* ---------- content actions ---------- */
  const toggleLike = (postId) => {
    if (!user) return;
    const sid = user.studentId;
    const post = data.posts.find((p) => p.id === postId);
    const liked = post && (post.likes || []).includes(sid);
    commit(
      (d) => ({
        ...d,
        posts: d.posts.map((p) => {
          if (p.id !== postId) return p;
          const likes = p.likes || [];
          return { ...p, likes: liked ? likes.filter((x) => x !== sid) : [...likes, sid] };
        }),
      }),
      () => fs.arrayOp('posts', postId, 'likes', [sid], liked)
    );
  };
  const addComment = (postId, text) => {
    const cm = { id: uid(), author: me.name, authorId: user.studentId, text, createdAt: new Date().toISOString() };
    commit(
      (d) => ({ ...d, posts: d.posts.map((p) => (p.id === postId ? { ...p, comments: [...(p.comments || []), cm] } : p)) }),
      () => fs.arrayOp('posts', postId, 'comments', [cm])
    );
  };
  const addReply = (threadId, text) => {
    const r = { id: uid(), author: me.name, authorId: user.studentId, text, createdAt: new Date().toISOString() };
    commit(
      (d) => ({ ...d, threads: d.threads.map((t) => (t.id === threadId ? { ...t, replies: [...(t.replies || []), r] } : t)) }),
      () => fs.arrayOp('threads', threadId, 'replies', [r])
    );
  };
  const createCourse = (course) => {
    const id = uid();
    commit((d) => ({ ...d, courses: [...d.courses, { id, ...course }] }), () => fs.set('courses', id, course));
    return id;
  };
  const setInstructor = (courseId, name) => {
    commit(
      (d) => ({ ...d, courses: d.courses.map((c) => (c.id === courseId ? { ...c, instructor: name || '' } : c)) }),
      () => fs.patch('courses', courseId, { instructor: name || '' })
    );
  };
  const createPost = (post) => {
    const id = uid();
    const full = { ...post, authorId: user.studentId, authorName: me.name, createdAt: new Date().toISOString(), likes: [], comments: [] };
    commit((d) => ({ ...d, posts: [...d.posts, { id, ...full }] }), () => fs.set('posts', id, full));
  };
  const createThread = (t) => {
    const id = uid();
    const full = { ...t, authorId: user.studentId, authorName: me.name, createdAt: new Date().toISOString(), replies: [] };
    commit((d) => ({ ...d, threads: [...d.threads, { id, ...full }] }), () => fs.set('threads', id, full));
  };

  /* ---------- admin actions ---------- */
  const unlockAdmin = () => { setAdminUnlocked(true); push('admin'); };
  const lockAdmin = () => { setAdminUnlocked(false); reset('home'); };
  const saveEvent = (id, ev) => {
    const eid = id || uid();
    commit(
      (d) => ({ ...d, events: id ? d.events.map((e) => (e.id === id ? { id, ...ev } : e)) : [...(d.events || []), { id: eid, ...ev }] }),
      () => fs.set('events', eid, ev)
    );
  };
  const deleteEvent = (id) => {
    commit((d) => ({ ...d, events: (d.events || []).filter((e) => e.id !== id) }), () => fs.del('events', id));
  };
  const saveAnnouncement = (text, color) => {
    const doc = { text, color, updatedAt: new Date().toISOString() };
    commit((d) => ({ ...d, config: { ...(d.config || {}), home: doc } }), () => fs.set('config', 'home', doc));
    notify(text ? 'บันทึกประกาศแล้ว' : 'ลบประกาศแล้ว', text ? 'ประกาศจะแสดงบนหน้าแรกของทุกคน' : '');
  };
  const setHidden = (col, id, hidden) => {
    commit((d) => ({ ...d, [col]: d[col].map((x) => (x.id === id ? { ...x, hidden } : x)) }), () => fs.patch(col, id, { hidden }));
  };

  /** ผู้ใช้ทั่วไปไม่เห็นโพสต์/กระทู้ที่แอดมินซ่อน */
  const visibleData = useMemo(() => ({
    ...data,
    posts: data.posts.filter((p) => !p.hidden),
    threads: data.threads.filter((t) => !t.hidden),
  }), [data]);

  const ctx = {
    c, s, user, me, data: visibleData, rawData: data, push, reset, back, jump, nameOf,
    myEvents, addMyEvent, removeMyEvent, adminUnlocked, unlockAdmin, lockAdmin, saveEvent, deleteEvent, saveAnnouncement, setHidden,
    openModal: setModal, findProfile, saveProfile, signIn, logout,
    toggleLike, addComment, addReply, createCourse, setInstructor, createPost, createThread,
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

  if (!ready || !authChecked || (!fontsLoaded && !fontError)) {
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
            {USE_SUPABASE && session && needsProfile
              ? <OnboardingScreen />
              : <AuthFlow key={authKey} initialStep={authKey ? 'register' : 'welcome'} />}
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
    case 'admin': screen = adminUnlocked ? <AdminScreen /> : <HomeScreen />; break;
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
          <View style={s.banner}><Text style={s.bannerTxt}>⚠️ {dbError}</Text></View>
        ) : syncing ? (
          <View style={s.bannerInfo}><ActivityIndicator size="small" color={c.ink} /><Text style={[s.bannerTxt, { marginLeft: 8 }]}>กำลังซิงก์ข้อมูล...</Text></View>
        ) : !USE_FIREBASE ? (
          <View style={s.bannerInfo}><Text style={s.bannerTxt}>📱 โหมดเก็บในเครื่องนี้ — ใส่ firebaseConfig เพื่อแชร์ข้อมูลกับทุกคน</Text></View>
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

        {onHome ? (
          <TouchableOpacity
            style={s.adminBtn}
            activeOpacity={0.85}
            onPress={() => (adminUnlocked ? push('admin') : setModal({ type: 'adminPin' }))}
          >
            <Feather name={adminUnlocked ? 'unlock' : 'shield'} size={16} color={c.onInk} />
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
            {modal && modal.type === 'adminPin' && <AdminPinModal onClose={() => setModal(null)} />}
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

/* ============================ styles ============================ */
const FONT_BY_WEIGHT = {
  '300': 'Prompt_400Regular', '400': 'Prompt_400Regular', '500': 'Prompt_500Medium',
  '600': 'Prompt_600SemiBold', '700': 'Prompt_700Bold', '800': 'Prompt_700Bold',
};
/** ใส่ฟอนต์ Prompt ให้ทุก style ที่มี fontSize (Android ต้องใช้ฟอนต์แยกตามน้ำหนัก) */
function applyFonts(styles, fontsOk) {
  if (!fontsOk) return styles;
  const out = {};
  Object.keys(styles).forEach((k) => {
    const st = styles[k];
    if (st && st.fontSize !== undefined) {
      const { fontWeight, ...rest } = st;
      out[k] = { ...rest, fontFamily: FONT_BY_WEIGHT[fontWeight || '400'] || 'Prompt_400Regular' };
    } else out[k] = st;
  });
  return out;
}

function makeStyles(c, fontsOk) {
  const soft = Platform.select({
    android: { elevation: 1 },
    default: { shadowColor: '#000', shadowOpacity: c.dark ? 0.3 : 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  });
  const raw = {
    root: { flex: 1, backgroundColor: c.bg },
    center: { alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
    main: { padding: 16, paddingBottom: 120 },
    pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
    icon: { color: c.text },
    danger: { color: c.danger },

    /* type */
    display: { fontSize: 36, lineHeight: 48, fontWeight: '600', color: c.text, letterSpacing: -0.5, marginTop: 6 },
    display2: { fontSize: 30, lineHeight: 41, fontWeight: '600', color: c.text, letterSpacing: -0.4 },
    hello: { fontSize: 14, fontWeight: '500', color: c.muted, marginTop: 4 },
    h1: { fontSize: 22, fontWeight: '600', color: c.text },
    h2: { fontSize: 18, fontWeight: '600', color: c.text, flexShrink: 1 },
    h3: { fontSize: 16, fontWeight: '600', color: c.text },
    body: { fontSize: 14.5, lineHeight: 23, color: c.text },
    smallMuted: { fontSize: 13, lineHeight: 20, color: c.muted },
    meta: { fontSize: 12, color: c.muted, marginRight: 10 },
    hint: { fontSize: 11.5, color: c.muted, marginTop: 5 },
    linkTxt: { fontSize: 13, fontWeight: '600', color: c.text, textDecorationLine: 'underline' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 4 },
    avatarTxt: { fontWeight: '700', color: INK, fontSize: 14 },

    /* surfaces */
    card: { backgroundColor: c.surface, borderRadius: 22, marginBottom: 12, borderWidth: c.dark ? 1 : 0, borderColor: c.border, ...soft },

    /* buttons */
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 12, paddingLeft: 22, paddingRight: 22, borderWidth: 1.5, borderColor: 'transparent' },
    btn_primary: { backgroundColor: c.ink },
    btn_outline: { backgroundColor: 'transparent', borderColor: c.ink },
    btn_soft: { backgroundColor: c.surface2 },
    btnSm: { paddingVertical: 7, paddingLeft: 14, paddingRight: 14 },
    btnBlock: { alignSelf: 'stretch' },
    btnTxt: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
    btnTxt_primary: { color: c.onInk },
    btnTxt_outline: { color: c.text },
    btnTxt_soft: { color: c.text },
    btnTxtSm: { fontSize: 13 },
    btnArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
    btnArrowSm: { width: 22, height: 22, borderRadius: 11, marginLeft: 6 },

    /* pills & chips */
    pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
    pillTxt: { fontSize: 11.5, fontWeight: '600', color: INK },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginRight: 8, marginBottom: 8 },
    chipSel: { backgroundColor: c.ink, borderColor: c.ink },
    chipTxt: { fontSize: 13, fontWeight: '500', color: c.text },
    chipTxtSel: { color: c.onInk },
    chipDot: { width: 9, height: 9, borderRadius: 5, marginRight: 6 },
    termHead: { marginTop: 8, marginBottom: 10, paddingLeft: 12, borderLeftWidth: 4, borderLeftColor: c.accent },
    termHeadTitle: { fontSize: 16, fontWeight: '600', color: c.text },
    termHeadSub: { fontSize: 12, color: c.muted, marginTop: 1 },
    termLabel: { fontSize: 11.5, fontWeight: '600', color: c.muted, marginBottom: 6, marginTop: 4, letterSpacing: 0.4 },

    /* inputs */
    field: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: c.text, marginBottom: 7 },
    input: { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.border, color: c.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
    textarea: { minHeight: 120 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 16, borderWidth: 1.5, borderColor: c.border },
    searchInput: { flex: 1, fontSize: 15, color: c.text, paddingVertical: 11, marginLeft: 8 },
    formSection: { fontSize: 12, fontWeight: '600', color: c.muted, letterSpacing: 1, marginBottom: 10, marginTop: 6 },

    /* breadcrumb & sections */
    breadcrumb: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
    crumbLink: { fontSize: 12.5, color: c.muted },
    crumbCurrent: { fontSize: 12.5, color: c.text, fontWeight: '600', maxWidth: 200 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    seeAll: { fontSize: 12.5, fontWeight: '600', color: c.text, marginRight: 6 },
    seeAllDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    empty: { padding: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, borderRadius: 22, alignItems: 'center', marginBottom: 12 },
    emptyTxt: { color: c.muted, textAlign: 'center', fontSize: 13.5, lineHeight: 21 },

    /* decorative blobs (ตาม UI kit รูปที่ 2) */
    blob: { position: 'absolute', width: 140, height: 130, borderRadius: 70 },
    blobSm: { position: 'absolute', width: 54, height: 50, borderRadius: 27 },
    blobBig: { position: 'absolute', width: 230, height: 210, borderRadius: 115, opacity: 0.9 },

    /* auth */
    welcome: { flexGrow: 1, padding: 24, overflow: 'hidden' },
    authScroll: { padding: 20, paddingBottom: 48 },
    notice: { padding: 16, marginBottom: 14 },
    noticeTxt: { fontSize: 13.5, color: INK, lineHeight: 21 },
    photoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
    photoBtnTxt: { fontSize: 13, fontWeight: '600', color: c.onInk, marginLeft: 6 },
    swatch: { width: 42, height: 42, borderRadius: 21, marginRight: 10, marginBottom: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    swatchOn: { borderColor: c.ink },
    emojiOpt: { width: 46, height: 46, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 8 },
    emojiOptOn: { borderColor: c.ink, backgroundColor: PASTEL.yellow.tile },

    /* profile */
    cover: { height: 120, overflow: 'hidden' },
    statusBubble: { position: 'absolute', left: 14, top: 12, maxWidth: '70%', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    statusTxt: { fontSize: 12.5, fontWeight: '500', color: INK },
    interestTag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
    interestTxt: { fontSize: 12, fontWeight: '500', color: INK },
    miniHead: { fontSize: 11.5, fontWeight: '600', color: c.muted, letterSpacing: 0.4, marginBottom: 6 },
    favChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
    favTxt: { fontSize: 12.5, fontWeight: '600', color: INK, marginLeft: 5 },
    linkBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: PASTEL.yellow.tile, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    levelBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.accent, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
    levelNum: { fontSize: 22, fontWeight: '700', color: INK },
    xpTrack: { height: 12, borderRadius: 6, backgroundColor: c.surface2, marginTop: 14, overflow: 'hidden' },
    xpFill: { height: 12, borderRadius: 6, backgroundColor: PASTEL.mint.dot, borderRightWidth: 2, borderRightColor: INK },
    badge: { width: '23.5%', alignItems: 'center', backgroundColor: PASTEL.yellow.tile, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 4, marginBottom: 8 },
    badgeOff: { backgroundColor: c.surface2 },
    badgeLabel: { fontSize: 11, fontWeight: '600', color: c.dark ? c.text : INK, marginTop: 4, textAlign: 'center' },
    badgeDesc: { fontSize: 9.5, color: c.muted, textAlign: 'center', marginTop: 1, lineHeight: 13 },
    optTile: { width: '31%', marginRight: '2%', marginBottom: 8, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', padding: 3, backgroundColor: c.surface },
    optTileOn: { borderColor: c.ink },
    optCover: { height: 46, borderRadius: 10, overflow: 'hidden' },
    optSmall: { alignItems: 'center', width: 64, paddingVertical: 6, marginRight: 8, marginBottom: 8, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', backgroundColor: c.surface },
    optLabel: { fontSize: 11, fontWeight: '500', color: c.text, textAlign: 'center', marginTop: 4 },
    coverEmoji: { position: 'absolute', right: 18, bottom: 10, fontSize: 34 },
    statsRow: { flexDirection: 'row', marginTop: 16, backgroundColor: c.surface2, borderRadius: 16, paddingVertical: 12 },
    statBox: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: '600', color: c.text },
    statLabel: { fontSize: 11.5, color: c.muted },
    emojiBadge: { position: 'absolute', right: -3, bottom: -3, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
    menuTxt: { flex: 1, fontSize: 14.5, fontWeight: '500', color: c.text, marginLeft: 12 },

    /* top bar & banners */
    topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.bg },
    topTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    banner: { backgroundColor: PASTEL.yellow.tile, paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16, borderRadius: 14, marginBottom: 4 },
    bannerInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface2, paddingHorizontal: 14, paddingVertical: 7, marginHorizontal: 16, borderRadius: 999, marginBottom: 4 },
    bannerTxt: { fontSize: 12, color: c.dark ? c.text : INK, flexShrink: 1 },

    /* home */
    quick: { width: 150, height: 150, borderRadius: 24, padding: 14, marginRight: 10 },
    quickTitle: { fontSize: 16, fontWeight: '600', color: INK, marginTop: 12 },
    quickSub: { fontSize: 12, color: 'rgba(17,17,17,0.6)', marginTop: 2 },
    quickArrow: { position: 'absolute', right: 12, bottom: 12, width: 30, height: 30, borderRadius: 15, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
    instructorBanner: { flexDirection: 'row', alignItems: 'center', padding: 20, marginTop: 8, overflow: 'hidden' },
    bannerKicker: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: 'rgba(17,17,17,0.6)' },
    bannerTitle: { fontSize: 19, lineHeight: 27, fontWeight: '600', color: INK, marginTop: 4 },
    bannerArrow: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

    /* course tiles */
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tile: { borderRadius: 22, padding: 14, marginBottom: 12, minHeight: 168, overflow: 'hidden' },
    tileHalf: { width: '48.5%' },
    tileWide: { width: '100%' },
    tileIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    tileTerm: { fontSize: 12, fontWeight: '600', color: INK, marginLeft: 7 },
    tileTitle: { fontSize: 16, lineHeight: 22, fontWeight: '500', color: INK, marginTop: 14, marginBottom: 12 },
    tileMeta: { fontSize: 11, color: 'rgba(17,17,17,0.65)', flexShrink: 1, marginRight: 4 },

    /* detail hero */
    hero: { borderRadius: 26, padding: 20, marginBottom: 12, overflow: 'hidden' },
    heroTitle: { fontSize: 23, lineHeight: 32, fontWeight: '600', color: INK, marginTop: 14 },
    heroMeta: { fontSize: 12.5, color: 'rgba(17,17,17,0.7)' },
    authorRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    detailContent: { fontSize: 15, color: c.text, lineHeight: 26 },

    /* lists */
    qaItem: { padding: 14, flexDirection: 'row', alignItems: 'flex-start' },
    qaTitle: { fontSize: 15, fontWeight: '500', color: c.text, lineHeight: 22 },
    personCard: { padding: 14, flexDirection: 'row', alignItems: 'center' },
    personName: { fontSize: 15, fontWeight: '600', color: c.text },
    instAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    postCard: { padding: 16 },
    postTitle: { fontSize: 16, fontWeight: '600', color: c.text, marginTop: 10, marginBottom: 4, lineHeight: 23 },
    snippet: { fontSize: 13, color: c.muted, lineHeight: 20 },
    likeBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surface2 },
    likeBtnOn: { backgroundColor: PASTEL.pink.dot },
    likeTxt: { fontSize: 12.5, fontWeight: '600', color: c.muted },
    likeTxtOn: { color: INK },
    commentItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    commentAuthor: { fontSize: 13, fontWeight: '600', color: c.text },
    commentTime: { fontSize: 11, color: c.muted },
    commentText: { fontSize: 14, color: c.text, lineHeight: 21, marginTop: 2 },
    commentForm: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 },
    sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

    /* fab & tabs */
    fab: {
      position: 'absolute', right: 18, bottom: 96, width: 58, height: 58, borderRadius: 29, backgroundColor: c.accent,
      alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: INK, elevation: 4,
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    tabbar: {
      flexDirection: 'row', backgroundColor: c.surface, marginHorizontal: 12, marginBottom: 10, borderRadius: 28,
      paddingVertical: 8, ...soft,
    },
    tab: { flex: 1, alignItems: 'center' },
    tabIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    tabIconOn: { backgroundColor: c.ink },
    tabLabel: { fontSize: 10.5, color: c.muted, fontWeight: '500', marginTop: 1 },
    tabLabelOn: { color: c.text, fontWeight: '600' },

    /* modal sheet */
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%',
      backgroundColor: c.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingTop: 10, paddingBottom: 28,
    },
    adminBtn: {
      position: 'absolute', right: 18, bottom: 98, flexDirection: 'row', alignItems: 'center', backgroundColor: c.ink,
      borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, elevation: 4,
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    adminBtnTxt: { fontSize: 13, fontWeight: '600', color: c.onInk, marginLeft: 6 },
    announce: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 20, padding: 14, marginBottom: 12 },
    announceIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    announceKicker: { fontSize: 11, fontWeight: '600', color: 'rgba(17,17,17,0.6)', letterSpacing: 0.4 },
    announceTxt: { fontSize: 14, lineHeight: 21, color: INK, marginTop: 2 },
    countCard: { borderRadius: 28, padding: 18, overflow: 'hidden' },
    countKicker: { fontSize: 12.5, fontWeight: '600', color: 'rgba(17,17,17,0.7)', flexShrink: 1, marginRight: 8 },
    countTitle: { fontSize: 19, lineHeight: 26, fontWeight: '600', color: INK },
    countMeta: { fontSize: 12.5, color: 'rgba(17,17,17,0.7)', marginTop: 2 },
    countRow: { flexDirection: 'row', marginTop: 14 },
    countBox: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 10, marginHorizontal: 3, alignItems: 'center', borderWidth: 1.5, borderColor: INK },
    countNum: { fontSize: 26, fontWeight: '700', color: INK },
    countUnit: { fontSize: 11, color: 'rgba(17,17,17,0.6)' },
    countNow: { backgroundColor: INK, borderRadius: 16, padding: 14, marginTop: 14, alignItems: 'center' },
    countNowTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
    nextRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    nextDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    nextTitle: { fontSize: 14, fontWeight: '500', color: c.text },
    weatherCard: { padding: 18, backgroundColor: PASTEL.blue.tile, borderWidth: 0 },
    weatherPlace: { fontSize: 12.5, fontWeight: '500', color: 'rgba(17,17,17,0.7)' },
    weatherTemp: { fontSize: 40, lineHeight: 46, fontWeight: '600', color: INK },
    weatherDesc: { fontSize: 13, color: 'rgba(17,17,17,0.75)' },
    weatherMeta: { fontSize: 12, color: 'rgba(17,17,17,0.75)', marginRight: 12 },
    envBox: { flex: 1, borderRadius: 18, padding: 12, borderWidth: 1.5, borderColor: 'rgba(17,17,17,0.12)' },
    envKicker: { fontSize: 11, fontWeight: '600', color: 'rgba(17,17,17,0.65)' },
    envVal: { fontSize: 24, fontWeight: '700', color: INK, marginTop: 2 },
    envUnit: { fontSize: 11, fontWeight: '400', color: 'rgba(17,17,17,0.6)' },
    envLabel: { fontSize: 13, fontWeight: '600', color: INK },
    envTip: { fontSize: 11, lineHeight: 16, color: 'rgba(17,17,17,0.75)', marginTop: 3 },
    weatherSrc: { fontSize: 10, color: c.muted, marginTop: 10, opacity: 0.8 },
    adminRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    statTile: { width: '48.5%', borderRadius: 22, padding: 14, marginBottom: 12 },
    statTileNum: { fontSize: 28, fontWeight: '700', color: INK, marginTop: 10 },
    statTileLabel: { fontSize: 12.5, color: 'rgba(17,17,17,0.7)' },
    shell: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
    /* hero cheer */
    hero2: { paddingTop: 4, paddingBottom: 18 },
    heroBrand: { fontSize: 13, fontWeight: '700', color: c.text, letterSpacing: 0.5 },
    heroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent, marginHorizontal: 8, borderWidth: 1, borderColor: INK },
    heroBrandSub: { fontSize: 13, fontWeight: '500', color: c.muted },
    cheer: { fontSize: 34, lineHeight: 50, fontWeight: '700', color: c.text, letterSpacing: -0.4, marginTop: 10, minHeight: 100 },
    cheerHl: { backgroundColor: c.accent, color: INK },
    cheerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.border, marginRight: 5 },
    cheerDotOn: { width: 20, backgroundColor: c.ink },
    /* countdown v2 */
    kindPill: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
    kindPillTxt: { fontSize: 12.5, fontWeight: '600', color: INK },
    ownerTag: { fontSize: 11.5, fontWeight: '600', color: 'rgba(17,17,17,0.6)' },
    bigDays: { width: 100, height: 100, borderRadius: 28, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
    bigDaysNum: { fontSize: 44, lineHeight: 52, fontWeight: '700', color: '#fff' },
    bigDaysUnit: { fontSize: 12, fontWeight: '500', color: c.accent, marginTop: -4 },
    countCode: { fontSize: 12.5, fontWeight: '700', color: 'rgba(17,17,17,0.65)', letterSpacing: 0.6 },
    countSub: { fontSize: 12.5, color: 'rgba(17,17,17,0.72)', marginTop: 2 },
    timeStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 20, paddingVertical: 10, marginTop: 16 },
    timeCell: { alignItems: 'center', minWidth: 62 },
    timeNum: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: INK },
    timeLbl: { fontSize: 10.5, color: 'rgba(17,17,17,0.6)' },
    timeColon: { fontSize: 22, fontWeight: '700', color: 'rgba(17,17,17,0.35)', marginTop: -12 },
    timeStripNow: { fontSize: 15, fontWeight: '600', color: INK, paddingVertical: 6 },
    progLabel: { fontSize: 11.5, fontWeight: '600', color: 'rgba(17,17,17,0.65)' },
    progTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.7)', marginTop: 6, overflow: 'hidden' },
    progFill: { height: 10, borderRadius: 5, backgroundColor: INK },
    countCheer: { fontSize: 13, fontWeight: '500', color: INK, marginTop: 12 },
    nextList: { backgroundColor: c.surface, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10 },
    nextRowLine: { borderTopWidth: 1, borderTopColor: c.border },
    daysBadge: { alignItems: 'center', backgroundColor: c.surface2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, minWidth: 48 },
    daysBadgeNum: { fontSize: 16, fontWeight: '700', color: c.text },
    daysBadgeLbl: { fontSize: 10, color: c.muted, marginTop: -2 },
    addEventBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, paddingVertical: 11, marginTop: 10 },
    addEventTxt: { fontSize: 13.5, fontWeight: '600', color: c.text, marginLeft: 6 },
    /* weather v2 */
    wxEmpty: { padding: 24, alignItems: 'center' },
    wxCard: { borderRadius: 26, overflow: 'hidden', backgroundColor: c.surface, marginBottom: 14, borderWidth: c.dark ? 1 : 0, borderColor: c.border },
    wxTop: { backgroundColor: PASTEL.blue.tile, padding: 18, overflow: 'hidden' },
    wxRefresh: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    wxTemp: { fontSize: 60, lineHeight: 66, fontWeight: '700', color: INK, letterSpacing: -1.5 },
    wxDesc: { fontSize: 16, fontWeight: '600', color: INK },
    wxFeels: { fontSize: 12.5, color: 'rgba(17,17,17,0.7)', marginTop: 2 },
    wxEmojiBox: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
    wxChip: { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
    wxChipTxt: { fontSize: 12, fontWeight: '500', color: INK },
    wxBottom: { padding: 14 },
    gaugeCard: { flex: 1, backgroundColor: c.surface2, borderRadius: 20, padding: 12 },
    gaugeTitle: { fontSize: 11.5, fontWeight: '600', color: c.muted },
    gaugeVal: { fontSize: 30, lineHeight: 36, fontWeight: '700', color: c.text },
    gaugeUnit: { fontSize: 11, color: c.muted, marginBottom: 5, marginLeft: 3 },
    levelChip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, marginTop: 4 },
    levelChipTxt: { fontSize: 12, fontWeight: '600', color: INK },
    gaugeTrack: { flexDirection: 'row', height: 8, marginTop: 10, marginBottom: 2 },
    gaugeSeg: { flex: 1, marginHorizontal: 1 },
    gaugeSegFirst: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
    gaugeSegLast: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    gaugeMarker: { position: 'absolute', top: -4, width: 6, height: 16, marginLeft: -3, borderRadius: 3, backgroundColor: c.ink, borderWidth: 1.5, borderColor: c.surface },
    gaugeTip: { fontSize: 11, lineHeight: 16, color: c.muted, marginTop: 8 },
    bringRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: PASTEL.yellow.tile, borderRadius: 16, padding: 10 },
    bringLabel: { fontSize: 12, fontWeight: '700', color: INK, marginRight: 8 },
    bringChip: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginRight: 5, marginVertical: 2 },
    bringTxt: { fontSize: 11.5, fontWeight: '500', color: INK },
    attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: 'rgba(17,17,17,0.12)', borderStyle: 'dashed' },
    attachBtnTxt: { fontSize: 14, fontWeight: '600', color: INK, marginLeft: 8 },
    pendRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, padding: 8, marginBottom: 6, borderWidth: 1, borderColor: c.border },
    pendThumb: { width: 44, height: 44, borderRadius: 10 },
    fileExt: { fontSize: 11, fontWeight: '700', color: INK, letterSpacing: 0.4 },
    miniThumb: { width: 40, height: 40, borderRadius: 10, marginRight: 4, backgroundColor: c.surface2 },
    miniMore: { alignItems: 'center', justifyContent: 'center' },
    miniMoreTxt: { fontSize: 12, fontWeight: '600', color: c.text },
    gallery: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginBottom: 6 },
    galleryItem: { width: '33.333%', aspectRatio: 1, padding: 3 },
    galleryOne: { width: '100%', aspectRatio: 4 / 3 },
    galleryImg: { width: '100%', height: '100%', borderRadius: 14, backgroundColor: c.surface2 },
    docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface2, borderRadius: 18, padding: 10, marginTop: 8 },
    docIcon: { width: 48, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(17,17,17,0.15)' },
    docOpen: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
    viewer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
    viewerImg: { width: '100%', height: '80%' },
    viewerTop: { position: 'absolute', top: 40, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    viewerTxt: { fontSize: 13, color: '#fff', flex: 1, marginRight: 10 },
    viewerNav: { position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 24 },
    calBox: { backgroundColor: c.surface, borderRadius: 20, padding: 12, borderWidth: 1.5, borderColor: c.border },
    calRow: { flexDirection: 'row' },
    calHead: { flex: 1, textAlign: 'center', fontSize: 11.5, color: c.muted, paddingVertical: 4 },
    calCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
    calDay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    calToday: { borderWidth: 1.5, borderColor: c.ink },
    calSel: { backgroundColor: c.ink },
    calDayTxt: { fontSize: 14, color: c.text },
    timeTxt: { fontSize: 18, fontWeight: '600', color: c.text, marginHorizontal: 12, minWidth: 80, textAlign: 'center' },
    summaryBox: { backgroundColor: PASTEL.yellow.tile, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: INK },
    summaryKicker: { fontSize: 11, fontWeight: '600', color: 'rgba(17,17,17,0.6)' },
    summaryTxt: { fontSize: 15, fontWeight: '600', color: INK, marginTop: 2 },
    summaryDate: { fontSize: 13, color: INK, marginTop: 2 },
    formError: { fontSize: 13, color: c.danger, marginBottom: 10, fontWeight: '500' },
    dialogLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000 },
    dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    dialog: { width: '100%', maxWidth: 380, backgroundColor: c.surface, borderRadius: 26, padding: 22 },
    dialogBtn: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginLeft: 8, marginTop: 6, borderWidth: 1.5 },
    dialogBtnOk: { backgroundColor: c.ink, borderColor: c.ink },
    dialogBtnDanger: { backgroundColor: c.danger, borderColor: c.danger },
    dialogBtnCancel: { backgroundColor: 'transparent', borderColor: c.border },
    dialogBtnTxt: { fontSize: 14, fontWeight: '600' },
    dialogBtnTxtOk: { color: '#fff' },
    dialogBtnTxtCancel: { color: c.text },
    sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: 'center', marginBottom: 12 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  };
  return StyleSheet.create(applyFonts(raw, fontsOk));
}
