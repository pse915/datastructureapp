import { Streamlit } from 'streamlit-component-lib';
import type { Worksheet } from './types';

function eid(p: string): string {
  try {
    if (globalThis.crypto?.randomUUID) return `${p}-${globalThis.crypto.randomUUID()}`;
  } catch { /* fallback */ }
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface UploadResult {
  fileId: string;
  viewUrl: string;
}

/**
 * React -> Streamlit 이벤트 브릿지.
 * 비밀키(Service Account, Sheet ID, Drive Folder ID)는 절대 프론트에 두지 않고,
 * Python backend(worksheet_admin.py)에서만 처리한다.
 */
export const WorksheetApi = {
  load(week: number): void {
    Streamlit.setComponentValue({ action: 'teacher_worksheet_load', eventId: eid('ws-load'), week });
  },
  save(worksheet: Worksheet): void {
    Streamlit.setComponentValue({
      action: 'teacher_worksheet_save',
      eventId: eid('ws-save'),
      worksheet,
    });
  },
  /** 이미지를 base64로 Streamlit 경유 전송 -> Python이 Drive에 업로드 */
  uploadImage(week: number, fileName: string, base64: string, mime: string): void {
    Streamlit.setComponentValue({
      action: 'teacher_worksheet_image',
      eventId: eid('ws-img'),
      week,
      fileName,
      fileBase64: base64,
      mimeType: mime,
    });
  },
};

/** File -> base64(dataURL prefix 제거) */
export const fileToBase64 = (f: File): Promise<string> =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

/* ---- 선택: GAS Web App 직접 호출 방식 (Streamlit 없이 쓸 때) ---- */
export async function saveViaGas(gasUrl: string, token: string, worksheet: Worksheet): Promise<void> {
  const r = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, op: 'save', worksheet }),
  });
  if (!r.ok) throw new Error(`GAS save failed: ${r.status}`);
}

export async function loadViaGas(gasUrl: string, token: string, week: number): Promise<Worksheet | null> {
  const r = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, op: 'load', week }),
  });
  if (!r.ok) throw new Error(`GAS load failed: ${r.status}`);
  const j = await r.json();
  return (j.row as Worksheet | null) ?? null;
}
