/* context ของแอป + กล่องแจ้งเตือน */
import { createContext, useContext } from 'react';
import { Alert } from 'react-native';

/* ============================ app context ============================ */
export const Ctx = createContext(null);

/** กล่องแจ้งเตือน/ยืนยันของแอปเอง — ใช้แทน Alert.alert ซึ่งไม่ทำงานบน Snack Web */
export let dialogHandler = null;

export function setDialogHandler(fn) { dialogHandler = fn; }

export function notify(title, message, buttons) {
  if (dialogHandler) dialogHandler({ title, message, buttons: buttons && buttons.length ? buttons : [{ text: 'ตกลง' }] });
  else Alert.alert(title, message, buttons);
}

export const useApp = () => useContext(Ctx);
