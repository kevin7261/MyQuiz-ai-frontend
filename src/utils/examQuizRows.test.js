import { describe, it, expect } from 'vitest';
import {
  isNotFoundLike,
  normalizeExamQuizRate,
  examQuizNameFromPreviewRow,
  examQuizDisplayNameFromRow,
  examQuizApiRowIsFollowUp,
  examQuizGenerateModeLabel,
  examQuizTypeDisplayLabelFromParts,
  examQuizTypeDisplayLabel,
  examYoutubeLooksLikeUrl,
  examFollowupPredecessorsByExamQuizId,
  examFollowupRowMergeKey,
  mergeExamFollowupPredecessorRows,
  examRichQuizHistoryDedupKey,
  parseExamRichQuizHistoryListFromSource,
} from './examQuizRows.js';

describe('isNotFoundLike', () => {
  it('404 或訊息含 not found／查無', () => {
    expect(isNotFoundLike(404, '')).toBe(true);
    expect(isNotFoundLike(200, 'Resource Not Found')).toBe(true);
    expect(isNotFoundLike(500, '查無資料')).toBe(true);
    expect(isNotFoundLike(200, 'ok')).toBe(false);
  });
});

describe('normalizeExamQuizRate', () => {
  it('僅允許 -1／0／1，其餘為 0', () => {
    expect(normalizeExamQuizRate(1)).toBe(1);
    expect(normalizeExamQuizRate('-1')).toBe(-1);
    expect(normalizeExamQuizRate(0)).toBe(0);
    expect(normalizeExamQuizRate(5)).toBe(0);
    expect(normalizeExamQuizRate('x')).toBe(0);
  });
});

describe('examQuizNameFromPreviewRow / examQuizDisplayNameFromRow', () => {
  it('取 quiz_name／title／metadata', () => {
    expect(examQuizNameFromPreviewRow({ quiz_name: ' A ' })).toBe('A');
    expect(examQuizNameFromPreviewRow({ title: 'B' })).toBe('B');
    expect(examQuizNameFromPreviewRow(null)).toBe('');
    expect(examQuizDisplayNameFromRow({ quizName: 'C' })).toBe('C');
    expect(examQuizDisplayNameFromRow({ quiz_metadata: { quiz_name: 'D' } })).toBe('D');
    expect(examQuizDisplayNameFromRow({})).toBe('');
  });
});

describe('examQuizApiRowIsFollowUp / label', () => {
  it('追問旗標與標籤', () => {
    expect(examQuizApiRowIsFollowUp({ follow_up: 1 })).toBe(true);
    expect(examQuizApiRowIsFollowUp({})).toBe(false);
    expect(examQuizGenerateModeLabel(true)).toBe('追問出題');
    expect(examQuizGenerateModeLabel(false)).toBe('一般出題');
    expect(examQuizTypeDisplayLabelFromParts('題', true)).toBe('題 (追問出題)');
    expect(examQuizTypeDisplayLabelFromParts('', false)).toBe('—');
    expect(examQuizTypeDisplayLabel({ quiz_name: 'X', follow_up: 0 })).toBe('X (一般出題)');
  });
});

describe('examYoutubeLooksLikeUrl', () => {
  it('http(s) 開頭', () => {
    expect(examYoutubeLooksLikeUrl('https://y.t/abc')).toBe(true);
    expect(examYoutubeLooksLikeUrl(' HTTP://x ')).toBe(true);
    expect(examYoutubeLooksLikeUrl('abc')).toBe(false);
  });
});

describe('examFollowupPredecessorsByExamQuizId', () => {
  it('沿 follow_up_exam_quiz_id 回溯，回傳祖先（舊→新）', () => {
    const map = new Map([
      [1, { exam_quiz_id: 1 }],
      [2, { exam_quiz_id: 2, follow_up_exam_quiz_id: 1 }],
      [3, { exam_quiz_id: 3, follow_up_exam_quiz_id: 2 }],
    ]);
    const chain = examFollowupPredecessorsByExamQuizId(3, map);
    expect(chain.map((r) => r.exam_quiz_id)).toEqual([1, 2]);
    expect(examFollowupPredecessorsByExamQuizId(1, map)).toEqual([]);
    expect(examFollowupPredecessorsByExamQuizId(99, map)).toEqual([]);
  });
});

describe('examFollowupRowMergeKey / mergeExamFollowupPredecessorRows', () => {
  it('id 優先，否則題幹；合併去重保序', () => {
    expect(examFollowupRowMergeKey({ exam_quiz_id: 7 })).toBe('id:7');
    expect(examFollowupRowMergeKey({ quiz_content: 'q' })).toBe('stem:q');
    expect(examFollowupRowMergeKey({})).toBe('');
    const fromDb = [{ exam_quiz_id: 1 }, { exam_quiz_id: 2 }];
    const local = [{ exam_quiz_id: 2, extra: true }, { exam_quiz_id: 3 }];
    const merged = mergeExamFollowupPredecessorRows(fromDb, local);
    expect(merged.map((r) => r.exam_quiz_id)).toEqual([1, 2, 3]);
    // 後者覆蓋同鍵
    expect(merged[1].extra).toBe(true);
  });
});

describe('parseExamRichQuizHistoryListFromSource', () => {
  it('字串陣列去重轉物件；JSON 字串解析', () => {
    const out = parseExamRichQuizHistoryListFromSource(['a', 'a', 'b']);
    expect(out.map((x) => x.quiz_content)).toEqual(['a', 'b']);
    expect(out[0]).toMatchObject({ answer_content: '', quiz_answer_reference: '', answer_critique: '' });

    const fromObj = parseExamRichQuizHistoryListFromSource({
      quiz_history_list: '[{"quiz_content":"q1","answer_content":"a1"}]',
    });
    expect(fromObj).toEqual([
      { quiz_content: 'q1', answer_content: 'a1', quiz_answer_reference: '', answer_critique: '' },
    ]);

    expect(parseExamRichQuizHistoryListFromSource('not-json')).toEqual([]);
    expect(parseExamRichQuizHistoryListFromSource(null)).toEqual([]);
  });

  it('dedupKey 以四欄組成', () => {
    expect(
      examRichQuizHistoryDedupKey({
        quiz_content: 'q',
        answer_content: 'a',
        quiz_answer_reference: 'r',
        answer_critique: 'c',
      }),
    ).toBe(['q', 'a', 'r', 'c'].join('\0'));
  });
});
