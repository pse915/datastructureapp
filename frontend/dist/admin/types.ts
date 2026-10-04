export type QuestionType = 'quiz' | 'blank' | 'matching' | 'image';

interface BaseQ {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  explanation?: string;
}

export interface QuizQ extends BaseQ {
  type: 'quiz';
  options: string[];
  answerIndex: number;
}

export interface BlankQ extends BaseQ {
  type: 'blank';
  /** 지문. 빈칸 위치는 [빈칸] 키워드로 표시 */
  template: string;
  /** 모범 답안 목록 */
  answers: string[];
}

export interface MatchingQ extends BaseQ {
  type: 'matching';
  left: string[];
  right: string[];
  /** 좌 인덱스 -> 우 인덱스 매핑. 예: {0:1, 1:0} */
  pairs: Record<number, number>;
}

export interface ImageQ extends BaseQ {
  type: 'image';
  imageUrl: string;
  fileId: string;
  hint: string;
  answer: string;
}

export type Question = QuizQ | BlankQ | MatchingQ | ImageQ;

export interface Worksheet {
  week: number;
  title: string;
  unit: string;
  guide: string;
  published: boolean;
  questions: Question[];
  updatedAt?: string;
}

export const newId = (p = 'q'): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function createQuestion(t: QuestionType): Question {
  const base = { id: newId(), prompt: '', points: 5, explanation: '' };
  switch (t) {
    case 'quiz':
      return { ...base, type: 'quiz', options: ['', '', '', ''], answerIndex: 0 };
    case 'blank':
      return { ...base, type: 'blank', template: '오늘 배운 [빈칸]에 대해 쓰세요.', answers: [''] };
    case 'matching':
      return { ...base, type: 'matching', left: ['A', 'B'], right: ['1', '2'], pairs: { 0: 0, 1: 1 } };
    case 'image':
      return { ...base, type: 'image', imageUrl: '', fileId: '', hint: '', answer: '' };
  }
}

export const EMPTY_WORKSHEET = (week = 1): Worksheet => ({
  week,
  title: '',
  unit: '',
  guide: '',
  published: true,
  questions: [],
});
