import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBankQuizHistoryStorageKey,
  CREATE_BANK_QUIZ_HISTORY_STORAGE_PREFIX,
  readRagQuizHistoryMap,
  writeRagQuizHistoryMap,
  richQuizHistoryDedupKey,
  parseRichQuizHistoryListFromSource,
  richQuizHistoryRichnessScore,
  mergeRichQuizHistoryLists,
  quizHistoryListFieldForMode,
  quizHistoryAnchorKey,
  quizHistoryAnchorsEqual,
  storedQuizHistoryForAnchor,
  persistQuizHistoryForAnchor,
  appendRichQuizHistory,
} from './createBankQuizHistory.js';

beforeEach(() => {
  localStorage.clear();
});

describe('storage key / map roundtrip', () => {
  it('key 帶 personId，anon fallback', () => {
    expect(createBankQuizHistoryStorageKey('p1')).toBe(
      `${CREATE_BANK_QUIZ_HISTORY_STORAGE_PREFIX}p1`,
    );
    expect(createBankQuizHistoryStorageKey('')).toBe(
      `${CREATE_BANK_QUIZ_HISTORY_STORAGE_PREFIX}anon`,
    );
  });

  it('write 後 read 回相同 map', () => {
    expect(readRagQuizHistoryMap('p1')).toEqual({});
    writeRagQuizHistoryMap('p1', { k: [{ quiz_content: 'q' }] });
    expect(readRagQuizHistoryMap('p1')).toEqual({ k: [{ quiz_content: 'q' }] });
  });
});

describe('parse / dedup / richness / merge', () => {
  it('字串陣列去重；richness 高者勝出', () => {
    const parsed = parseRichQuizHistoryListFromSource(['a', 'a']);
    expect(parsed.map((x) => x.quiz_content)).toEqual(['a']);

    expect(richQuizHistoryRichnessScore({ answer_content: 'x' })).toBe(4);
    expect(richQuizHistoryRichnessScore({ quiz_answer_reference: 'x' })).toBe(2);
    expect(richQuizHistoryRichnessScore({ answer_critique: 'x' })).toBe(1);
    expect(richQuizHistoryRichnessScore(null)).toBe(0);

    const merged = mergeRichQuizHistoryLists(
      [{ quiz_content: 'q', answer_critique: 'c' }],
      [{ quiz_content: 'q', answer_content: 'rich' }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].answer_content).toBe('rich');
  });

  it('dedupKey 四欄；field 依模式', () => {
    expect(
      richQuizHistoryDedupKey({
        quiz_content: 'q',
        answer_content: 'a',
        quiz_answer_reference: 'r',
        answer_critique: 'c',
      }),
    ).toBe(['q', 'a', 'r', 'c'].join('\0'));
    expect(quizHistoryListFieldForMode('followup')).toBe('quiz_followup_history_list');
    expect(quizHistoryListFieldForMode('normal')).toBe('quiz_history_list');
  });
});

describe('anchor key / equality', () => {
  const anchor = { rag_tab_id: 't', rag_unit_id: 1, rag_quiz_id: 9, generate_mode: 'normal' };
  it('key 與相等比較', () => {
    expect(quizHistoryAnchorKey(anchor)).toBe('t|1|9|normal');
    expect(quizHistoryAnchorKey(null)).toBe('');
    expect(quizHistoryAnchorsEqual(anchor, { ...anchor })).toBe(true);
    expect(quizHistoryAnchorsEqual(anchor, { ...anchor, rag_quiz_id: 8 })).toBe(false);
    expect(quizHistoryAnchorsEqual(anchor, null)).toBe(false);
  });
});

describe('persist / stored roundtrip', () => {
  const anchor = { rag_tab_id: 't', rag_unit_id: 1, rag_quiz_id: 9, generate_mode: 'normal' };
  it('persist 後 stored 取回', () => {
    expect(storedQuizHistoryForAnchor('p1', anchor)).toEqual([]);
    persistQuizHistoryForAnchor('p1', anchor, ['q1', 'q2']);
    const got = storedQuizHistoryForAnchor('p1', anchor);
    expect(got.map((x) => x.quiz_content)).toEqual(['q1', 'q2']);
  });

  it('舊版三 id 鍵在一般模式下沿用', () => {
    const map = { 't|1|9': [{ quiz_content: 'legacy' }] };
    writeRagQuizHistoryMap('p2', map);
    const got = storedQuizHistoryForAnchor('p2', anchor);
    expect(got.map((x) => x.quiz_content)).toEqual(['legacy']);
  });
});

describe('appendRichQuizHistory', () => {
  it('去重後 append；重複不加', () => {
    const base = [
      { quiz_content: 'q1', answer_content: '', quiz_answer_reference: '', answer_critique: '' },
    ];
    const added = appendRichQuizHistory(base, { quiz_content: 'q2' });
    expect(added.map((x) => x.quiz_content)).toEqual(['q1', 'q2']);
    const dup = appendRichQuizHistory(added, { quiz_content: 'q2' });
    expect(dup.map((x) => x.quiz_content)).toEqual(['q1', 'q2']);
  });
});
