import { describe, it, expect } from 'vitest';
import {
  ensureNumber,
  checkRagHasMetadata,
  extractUnitsFromRag,
  checkRagHasList,
  isPackTasksListReady,
  ragIsForExamFromListRow,
  ragQuizApiRowIsForExam,
  ragQuizApiRowIsFollowUp,
  quizRowsFromUnitApiRow,
  ragListRowHasNestedForExamQuiz,
  stateHasExamQuizCardsInTabState,
  tabStateHasAnyRagQuizForExam,
} from './ragExamRows.js';

describe('ensureNumber', () => {
  it('回傳數字；非數字／NaN 用預設值', () => {
    expect(ensureNumber('5', 0)).toBe(5);
    expect(ensureNumber('', 9)).toBe(0); // Number('') === 0
    expect(ensureNumber('abc', 9)).toBe(9);
    expect(ensureNumber(null, 9)).toBe(0); // Number(null) === 0
    expect(ensureNumber(undefined, 9)).toBe(9); // Number(undefined) === NaN
  });
});

describe('checkRagHasMetadata', () => {
  it('rag_metadata 為非空字串或物件才算有', () => {
    expect(checkRagHasMetadata(null)).toBe(false);
    expect(checkRagHasMetadata({})).toBe(false);
    expect(checkRagHasMetadata({ rag_metadata: '' })).toBe(false);
    expect(checkRagHasMetadata({ rag_metadata: '  ' })).toBe(false);
    expect(checkRagHasMetadata({ rag_metadata: 'x' })).toBe(true);
    expect(checkRagHasMetadata({ rag_metadata: { a: 1 } })).toBe(true);
  });
});

describe('extractUnitsFromRag', () => {
  it('支援陣列、JSON 字串、別名鍵；無效回 []', () => {
    expect(extractUnitsFromRag({ units: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(extractUnitsFromRag({ rag_units: '[{"a":1}]' })).toEqual([{ a: 1 }]);
    expect(extractUnitsFromRag({ units: 'not-json' })).toEqual([]);
    expect(extractUnitsFromRag(null)).toEqual([]);
  });
});

describe('checkRagHasList', () => {
  it('有單元或 unit_list 字串時為 true', () => {
    expect(checkRagHasList({ units: [{ a: 1 }] })).toBe(true);
    expect(checkRagHasList({})).toBe(false);
  });
});

describe('isPackTasksListReady', () => {
  it('每列至少一個標籤才算就緒', () => {
    expect(isPackTasksListReady([['a']])).toBe(true);
    expect(isPackTasksListReady([[]])).toBe(false);
    expect(isPackTasksListReady([])).toBe(false);
    expect(isPackTasksListReady(null)).toBe(false);
  });
});

describe('ragIsForExamFromListRow', () => {
  it('依 for_exam 旗標', () => {
    expect(ragIsForExamFromListRow({ for_exam: true })).toBe(true);
    expect(ragIsForExamFromListRow({ for_exam: false })).toBe(false);
    expect(ragIsForExamFromListRow(null)).toBe(false);
  });
});

describe('ragQuizApiRowIsForExam', () => {
  it('支援 for_exam／rag_quiz_for_exam（true 或 1）', () => {
    expect(ragQuizApiRowIsForExam({ for_exam: 1 })).toBe(true);
    expect(ragQuizApiRowIsForExam({ rag_quiz_for_exam: true })).toBe(true);
    expect(ragQuizApiRowIsForExam({ for_exam: 0 })).toBe(false);
    expect(ragQuizApiRowIsForExam(null)).toBe(false);
  });
});

describe('ragQuizApiRowIsFollowUp', () => {
  it('支援 follow_up／followUp（true 或 1）', () => {
    expect(ragQuizApiRowIsFollowUp({ follow_up: 1 })).toBe(true);
    expect(ragQuizApiRowIsFollowUp({ followUp: true })).toBe(true);
    expect(ragQuizApiRowIsFollowUp({})).toBe(false);
  });
});

describe('quizRowsFromUnitApiRow', () => {
  it('依序取 quizzes／quiz_list／Quizzes', () => {
    expect(quizRowsFromUnitApiRow({ quizzes: [1] })).toEqual([1]);
    expect(quizRowsFromUnitApiRow({ quiz_list: [2] })).toEqual([2]);
    expect(quizRowsFromUnitApiRow({ Quizzes: [3] })).toEqual([3]);
    expect(quizRowsFromUnitApiRow({})).toEqual([]);
  });
});

describe('ragListRowHasNestedForExamQuiz', () => {
  it('單元內或頂層 quizzes 含測驗用題型', () => {
    expect(
      ragListRowHasNestedForExamQuiz({ units: [{ quizzes: [{ for_exam: true }] }] }),
    ).toBe(true);
    expect(
      ragListRowHasNestedForExamQuiz({ units: [{ quizzes: [{ for_exam: false }] }] }),
    ).toBe(false);
    expect(ragListRowHasNestedForExamQuiz({ quizzes: [{ rag_quiz_for_exam: 1 }] })).toBe(true);
  });
});

describe('stateHasExamQuizCardsInTabState', () => {
  it('掃描 unitSlotQuizCards 與 cardList', () => {
    expect(
      stateHasExamQuizCardsInTabState({ unitSlotQuizCards: [[{ rag_quiz_for_exam: 1 }]] }),
    ).toBe(true);
    expect(stateHasExamQuizCardsInTabState({ cardList: [{ rag_quiz_for_exam: true }] })).toBe(true);
    expect(stateHasExamQuizCardsInTabState({ cardList: [{}] })).toBe(false);
  });
});

describe('tabStateHasAnyRagQuizForExam', () => {
  it('依 tabId 或別名鍵比對', () => {
    const map = {
      t1: { cardList: [{ rag_quiz_for_exam: 1 }] },
      other: { zipTabId: 't2', cardList: [{ rag_quiz_for_exam: true }] },
    };
    expect(tabStateHasAnyRagQuizForExam(map, 't1')).toBe(true);
    expect(tabStateHasAnyRagQuizForExam(map, 't2')).toBe(true);
    expect(tabStateHasAnyRagQuizForExam(map, 'missing')).toBe(false);
    expect(tabStateHasAnyRagQuizForExam(map, '')).toBe(false);
  });
});
