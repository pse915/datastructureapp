import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { Question, Worksheet, QuestionType, createQuestion, EMPTY_WORKSHEET } from './types';
import { WorksheetApi, UploadResult, fileToBase64 } from './googleService';
import './worksheet.css';

/* ---------- 상태 관리 ---------- */

type S = {
  week: number;
  title: string;
  unit: string;
  guide: string;
  published: boolean;
  questions: Question[];
  selectedId: string | null;
  preview: boolean;
};

type A =
  | { type: 'LOAD'; ws: Worksheet }
  | { type: 'META'; patch: Partial<S> }
  | { type: 'ADD'; qtype: QuestionType }
  | { type: 'PATCH_Q'; id: string; patch: Record<string, unknown> }
  | { type: 'REMOVE'; id: string }
  | { type: 'MOVE'; id: string; dir: -1 | 1 }
  | { type: 'REORDER'; from: number; to: number }
  | { type: 'DUP'; id: string };

function reducer(s: S, a: A): S {
  switch (a.type) {
    case 'LOAD':
      return {
        ...s,
        week: a.ws.week,
        title: a.ws.title,
        unit: a.ws.unit,
        guide: a.ws.guide,
        published: a.ws.published,
        questions: a.ws.questions,
        selectedId: a.ws.questions[0]?.id ?? null,
      };
    case 'META':
      return { ...s, ...a.patch };
    case 'ADD': {
      const q = createQuestion(a.qtype);
      return { ...s, questions: [...s.questions, q], selectedId: q.id };
    }
    case 'PATCH_Q':
      return {
        ...s,
        questions: s.questions.map((q) =>
          q.id === a.id ? ({ ...q, ...a.patch } as Question) : q,
        ),
      };
    case 'REMOVE':
      return { ...s, questions: s.questions.filter((q) => q.id !== a.id), selectedId: null };
    case 'MOVE': {
      const i = s.questions.findIndex((q) => q.id === a.id);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= s.questions.length) return s;
      const arr = [...s.questions];
      const [t] = arr.splice(i, 1);
      arr.splice(j, 0, t);
      return { ...s, questions: arr };
    }
    case 'REORDER': {
      const arr = [...s.questions];
      const [t] = arr.splice(a.from, 1);
      arr.splice(a.to, 0, t);
      return { ...s, questions: arr };
    }
    case 'DUP': {
      const src = s.questions.find((q) => q.id === a.id);
      if (!src) return s;
      const copy = { ...JSON.parse(JSON.stringify(src)), id: `${src.id}-copy-${Date.now().toString(36)}` };
      return { ...s, questions: [...s.questions, copy as Question] };
    }
  }
}

const TYPE_LABEL: Record<QuestionType, string> = {
  quiz: '퀴즈/선택형',
  blank: '빈칸 채우기',
  matching: '사다리/선잇기',
  image: '사진 연상',
};

export interface UploaderProps {
  weeks: Array<{ 주차: number | string; 학습목표?: string }>;
  initial: Worksheet | null;
  uploadResult: UploadResult | null;
}

export default function WorksheetUploader({ weeks, initial, uploadResult }: UploaderProps) {
  const firstWeek = Number(weeks[0]?.주차 ?? 1);
  const [s, d] = useReducer(reducer, {
    week: firstWeek,
    title: '',
    unit: '',
    guide: '',
    published: true,
    questions: [],
    selectedId: null,
    preview: false,
  });
  const [drag, setDrag] = useState<number | null>(null);
  const sel = useMemo(
    () => s.questions.find((q) => q.id === s.selectedId) ?? null,
    [s.questions, s.selectedId],
  );

  useEffect(() => {
    if (initial) d({ type: 'LOAD', ws: initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.week, initial?.updatedAt]);

  // Drive 이미지 업로드 완료 -> 현재 선택 image 문제에 바인딩
  useEffect(() => {
    if (uploadResult && sel?.type === 'image') {
      d({ type: 'PATCH_Q', id: sel.id, patch: { fileId: uploadResult.fileId, imageUrl: uploadResult.viewUrl } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadResult?.fileId]);

  const patch = (p: Record<string, unknown>) => {
    if (sel) d({ type: 'PATCH_Q', id: sel.id, patch: p });
  };

  const current: Worksheet = {
    week: s.week,
    title: s.title,
    unit: s.unit,
    guide: s.guide,
    published: s.published,
    questions: s.questions,
  };

  return (
    <div className="ws-wrap">
      <header className="ws-top">
        <div>
          <span className="eyebrow">WEEKLY WORKSHEET · ADMIN</span>
          <h1>주차별 학습지 관리</h1>
        </div>
        <div className="ws-top-actions">
          <select
            value={s.week}
            onChange={(e) => {
              const w = Number(e.target.value);
              d({ type: 'META', patch: { week: w } });
              WorksheetApi.load(w);
            }}
          >
            {Array.from({ length: 17 }, (_, i) => {
              const goal = weeks.find((w) => Number(w.주차) === i + 1)?.학습목표 ?? '';
              return (
                <option key={i + 1} value={i + 1}>
                  {i + 1}주차 {goal}
                </option>
              );
            })}
          </select>
          <button
            className={s.preview ? 'ws-btn' : 'ws-btn primary'}
            onClick={() => d({ type: 'META', patch: { preview: !s.preview } })}
          >
            {s.preview ? '편집으로' : '미리보기'}
          </button>
          <button className="ws-btn primary" onClick={() => WorksheetApi.save(current)}>
            Sheets에 저장
          </button>
        </div>
      </header>

      {!s.preview ? (
        <>
          <section className="ws-card">
            <label>
              학습지 제목
              <input
                value={s.title}
                onChange={(e) => d({ type: 'META', patch: { title: e.target.value } })}
                placeholder="예: 2주차 제작·생존 기술"
              />
            </label>
            <div className="ws-row">
              <label>
                단원명
                <input
                  value={s.unit}
                  onChange={(e) => d({ type: 'META', patch: { unit: e.target.value } })}
                  placeholder="예: II. 기술의 세계"
                />
              </label>
              <label className="ws-check">
                <input
                  type="checkbox"
                  checked={s.published}
                  onChange={(e) => d({ type: 'META', patch: { published: e.target.checked } })}
                />
                학생에게 공개
              </label>
            </div>
            <label>
              기본 안내 문구
              <textarea
                value={s.guide}
                onChange={(e) => d({ type: 'META', patch: { guide: e.target.value } })}
                placeholder="학생에게 보여줄 안내문"
              />
            </label>
          </section>

          <div className="ws-cols">
            <aside className="ws-card">
              <div className="ws-list-head">
                <b>문제 목록 ({s.questions.length})</b>
                <div className="ws-add">
                  {(['quiz', 'blank', 'matching', 'image'] as QuestionType[]).map((t) => (
                    <button key={t} onClick={() => d({ type: 'ADD', qtype: t })}>
                      + {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
              {s.questions.map((q, i) => (
                <div
                  key={q.id}
                  draggable
                  onDragStart={() => setDrag(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (drag !== null && drag !== i) d({ type: 'REORDER', from: drag, to: i });
                    setDrag(null);
                  }}
                  className={`ws-qrow ${q.id === s.selectedId ? 'on' : ''}`}
                  onClick={() => d({ type: 'META', patch: { selectedId: q.id } })}
                >
                  <span className="ws-badge">{TYPE_LABEL[q.type]}</span>
                  <b>
                    {i + 1}. {q.prompt.slice(0, 24) || '(제목 없음)'}
                  </b>
                  <span className="ws-mini">{q.points}점</span>
                  <div className="ws-rowbtns">
                    <button onClick={(e) => { e.stopPropagation(); d({ type: 'MOVE', id: q.id, dir: -1 }); }}>▲</button>
                    <button onClick={(e) => { e.stopPropagation(); d({ type: 'MOVE', id: q.id, dir: 1 }); }}>▼</button>
                    <button onClick={(e) => { e.stopPropagation(); d({ type: 'DUP', id: q.id }); }}>복제</button>
                    <button onClick={(e) => { e.stopPropagation(); d({ type: 'REMOVE', id: q.id }); }}>삭제</button>
                  </div>
                </div>
              ))}
              {!s.questions.length && <p className="ws-empty">문제를 추가하세요. 드래그 또는 ▲▼로 순서 변경.</p>}
            </aside>
            <section className="ws-card">
              {sel ? <QEditor q={sel} onPatch={patch} week={s.week} /> : <p className="ws-empty">왼쪽에서 문제를 선택하세요.</p>}
            </section>
          </div>
        </>
      ) : (
        <WorksheetPreview ws={current} />
      )}
    </div>
  );
}

/* ---------- 문제 타입별 에디터 ---------- */

function QEditor({ q, onPatch, week }: { q: Question; onPatch: (p: Record<string, unknown>) => void; week: number }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="ws-editor">
      <label>
        질문
        <input value={q.prompt} onChange={(e) => onPatch({ prompt: e.target.value })} placeholder="문제를 입력하세요" />
      </label>
      <label>
        배점
        <input type="number" value={q.points} min={1} max={100} onChange={(e) => onPatch({ points: Number(e.target.value) })} />
      </label>

      {q.type === 'quiz' && (
        <>
          {q.options.map((op, i) => (
            <div key={i} className="ws-opt">
              <input type="radio" checked={q.answerIndex === i} onChange={() => onPatch({ answerIndex: i })} title="정답" />
              <input
                value={op}
                onChange={(e) => {
                  const a = [...q.options];
                  a[i] = e.target.value;
                  onPatch({ options: a });
                }}
                placeholder={`보기 ${'ABCD'[i] ?? i + 1}`}
              />
              <button onClick={() => onPatch({ options: q.options.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
          <button className="ws-btn" onClick={() => onPatch({ options: [...q.options, ''] })}>+ 보기 추가</button>
          <label>
            해설
            <textarea value={q.explanation ?? ''} onChange={(e) => onPatch({ explanation: e.target.value })} />
          </label>
        </>
      )}

      {q.type === 'blank' && (
        <>
          <label>
            지문 (빈칸은 <code>[빈칸]</code>으로)
            <textarea value={q.template} onChange={(e) => onPatch({ template: e.target.value })} />
          </label>
          {q.answers.map((a, i) => (
            <input
              key={i}
              value={a}
              onChange={(e) => {
                const c = [...q.answers];
                c[i] = e.target.value;
                onPatch({ answers: c });
              }}
              placeholder={`모범답안 ${i + 1}`}
            />
          ))}
          <button className="ws-btn" onClick={() => onPatch({ answers: [...q.answers, ''] })}>+ 답안 추가</button>
        </>
      )}

      {q.type === 'matching' && (
        <>
          <div className="ws-row">
            <div>
              {q.left.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => {
                    const c = [...q.left];
                    c[i] = e.target.value;
                    onPatch({ left: c });
                  }}
                  placeholder={`좌 A${i + 1}`}
                />
              ))}
              <button className="ws-btn" onClick={() => onPatch({ left: [...q.left, ''] })}>+ 좌 항목</button>
            </div>
            <div>
              {q.right.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => {
                    const c = [...q.right];
                    c[i] = e.target.value;
                    onPatch({ right: c });
                  }}
                  placeholder={`우 ${i + 1}`}
                />
              ))}
              <button className="ws-btn" onClick={() => onPatch({ right: [...q.right, ''] })}>+ 우 항목</button>
            </div>
          </div>
          <small>정답 매칭: 좌 인덱스→우 인덱스 JSON (예: 0→1)</small>
          <input
            value={JSON.stringify(q.pairs)}
            onChange={(e) => {
              try {
                onPatch({ pairs: JSON.parse(e.target.value) });
              } catch { /* invalid json 무시 */ }
            }}
          />
        </>
      )}

      {q.type === 'image' && (
        <>
          {q.imageUrl && <img src={q.imageUrl} alt="" className="ws-img" />}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                WorksheetApi.uploadImage(week, f.name, await fileToBase64(f), f.type);
              } finally {
                setBusy(false);
              }
            }}
          />
          <small>{busy ? '업로드 중… (Drive 저장 후 URL 자동 바인딩)' : q.fileId ? `fileId: ${q.fileId}` : 'Drive 지정 폴더에 저장됩니다.'}</small>
          <label>
            힌트
            <input value={q.hint} onChange={(e) => onPatch({ hint: e.target.value })} />
          </label>
          <label>
            정답
            <input value={q.answer} onChange={(e) => onPatch({ answer: e.target.value })} />
          </label>
        </>
      )}
    </div>
  );
}

/* ---------- 학생 미리보기 ---------- */

export function WorksheetPreview({ ws }: { ws: Worksheet }) {
  const empty = EMPTY_WORKSHEET(ws.week);
  void empty;
  return (
    <div className="ws-preview">
      <div className="ws-card">
        <span className="eyebrow">WEEK {ws.week} · {ws.unit}</span>
        <h2>{ws.title || `${ws.week}주차 학습지`}</h2>
        <p>{ws.guide}</p>
      </div>
      {ws.questions.map((q, i) => (
        <div key={q.id} className="ws-card">
          <span className="ws-badge">{TYPE_LABEL[q.type]} · {q.points}점</span>
          <h3>Q{i + 1}. {q.prompt}</h3>
          {q.type === 'quiz' &&
            q.options.map((o, j) => (
              <label key={j} className="ws-pv-opt">
                <input type="radio" name={q.id} />
                {'ABCD'[j] ?? j + 1}. {o}
              </label>
            ))}
          {q.type === 'blank' && (
            <p>
              {q.template.split('[빈칸]').map((t, k, arr) =>
                k < arr.length - 1 ? (
                  <span key={k}>
                    {t}
                    <input className="ws-blank" placeholder="답" />
                  </span>
                ) : (
                  t
                ),
              )}
            </p>
          )}
          {q.type === 'matching' && (
            <div className="ws-row">
              <div>{q.left.map((v, k) => (<div key={k} className="ws-chip">A{k + 1}. {v}</div>))}</div>
              <div>{q.right.map((v, k) => (<div key={k} className="ws-chip">● {v}</div>))}</div>
            </div>
          )}
          {q.type === 'image' && (
            <>
              {q.imageUrl && <img src={q.imageUrl} className="ws-img" alt="" />}
              <p className="ws-hint">힌트: {q.hint}</p>
              <input placeholder="연상되는 답을 쓰세요" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
