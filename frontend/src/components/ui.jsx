// 공유 아이콘 (Vite 모듈 / build 번들 공용 원본)
import React from 'react';

export function DbIcon({ name, size = 18 }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const P = {
    cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></>,
    swap: <><path d="M7 4 3 8l4 4" /><path d="M3 8h14" /><path d="m17 12 4 4-4 4" /><path d="M21 16H7" /></>,
    flask: <><path d="M9 3h6" /><path d="M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.6-3.2 2.8-5 6-5s5.4 1.8 6 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16 15.2c2.6.3 4.4 1.9 5 4.8" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></>,
    clip: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a3 3 0 0 1 6 0" /><path d="M9 11h6M9 15h6" /></>,
    wrench: <path d="M14.5 6.5a4 4 0 0 0-5.6 5.1L3 17.5V21h3.5l5.9-5.9a4 4 0 0 0 5.1-5.6l-2.8 2.8-2.4-2.4 2.2-3.4Z" />,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9" /><path d="m17 4 3 3M14 7l3 3" /></>,
    slides: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8" /></>,
    book: <><path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M4 19a2 2 0 0 0 2 2h13" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    heart: <path d="M20.8 8.6c0 5.5-8.8 10.4-8.8 10.4S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    print: <><path d="M7 8V3h10v5" /><rect x="3" y="8" width="18" height="9" rx="2" /><path d="M7 14h10v7H7z" /></>,
    down: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.7-4L3 10" /><path d="M3 5v5h5" /></>,
    cloud: <><path d="M7 18a4.5 4.5 0 1 1 .8-8.9A5.5 5.5 0 0 1 18.6 10H19a3.5 3.5 0 0 1 0 7H7Z" /></>,
    save: <><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h7V3" /><rect x="8" y="13" width="8" height="8" /></>,
    x: <><path d="M6 6l12 12M18 6 6 18" /></>,
    undo: <><path d="M8 5 3 10l5 5" /><path d="M3 10h11a6 6 0 0 1 0 12h-3" /></>,
    redo: <><path d="m16 5 5 5-5 5" /><path d="M21 10H10a6 6 0 0 0 0 12h3" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.7-3.4 3.1-5.2 7.5-5.2s6.8 1.8 7.5 5.2" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
  };
  return <svg {...c}>{P[name] || P.grid}</svg>;
}
