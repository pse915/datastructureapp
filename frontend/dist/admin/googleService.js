// Plain-JS mirror of googleService.ts (Streamlit 브릿지)
// App.jsx에 이미 있는 emit()을 재사용한다. 이 파일은 vite dev에서 모듈로 쓸 때 사용.
import { Streamlit } from 'streamlit-component-lib';

function wsEid(p) {
  try {
    if (globalThis.crypto?.randomUUID) return `${p}-${globalThis.crypto.randomUUID()}`;
  } catch (_) {}
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const WorksheetApi = {
  load(week) {
    Streamlit.setComponentValue({ action: 'teacher_worksheet_load', eventId: wsEid('ws-load'), week });
  },
  save(worksheet) {
    Streamlit.setComponentValue({ action: 'teacher_worksheet_save', eventId: wsEid('ws-save'), worksheet });
  },
  uploadImage(week, fileName, base64, mime) {
    Streamlit.setComponentValue({
      action: 'teacher_worksheet_image',
      eventId: wsEid('ws-img'),
      week, fileName, fileBase64: base64, mimeType: mime,
    });
  },
};

export const fileToBase64 = (f) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
