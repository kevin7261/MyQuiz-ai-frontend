import { describe, it, expect } from 'vitest';
import {
  DEFAULT_UNIT_QUIZ_DISPLAY_NAME,
  youtubeUrlFromUnitUrlResponse,
  quizTypeTabLabel,
  isRagQuizRowDeleted,
  unitStackRowMatchesRagUnitId,
  quizRowQuizEmpty,
  isRagQuizMarkedForExam,
  hasRagQuizPromptRulesForExam,
  extractQuizUserPromptText,
  sortUnitQuizCardsByRagQuizId,
  quizBankReadonlyOutlineChunkFields,
  quizBankReadonlySourceDisplay,
  parsePositiveQuizId,
  isQuizCardFollowupModeForCount,
  positiveRagQuizIdFromQuizRow,
  positiveRagQuizIdFromCard,
} from './ragQuizCardHelpers.js';

describe('youtubeUrlFromUnitUrlResponse', () => {
  it('多別名候選，取第一個非空', () => {
    expect(youtubeUrlFromUnitUrlResponse({ watch_url: ' https://y/x ' })).toBe('https://y/x');
    expect(youtubeUrlFromUnitUrlResponse({ video_url: 'v' })).toBe('v');
    expect(youtubeUrlFromUnitUrlResponse({})).toBe('');
    expect(youtubeUrlFromUnitUrlResponse(null)).toBe('');
  });
});

describe('quizTypeTabLabel', () => {
  it('quizName 非空回該值，否則預設名稱', () => {
    expect(quizTypeTabLabel({ quizName: ' A ' })).toBe('A');
    expect(quizTypeTabLabel({})).toBe(DEFAULT_UNIT_QUIZ_DISPLAY_NAME);
  });
});

describe('isRagQuizRowDeleted / unitStackRowMatchesRagUnitId', () => {
  it('多種軟刪標記', () => {
    expect(isRagQuizRowDeleted({ deleted: true })).toBe(true);
    expect(isRagQuizRowDeleted({ deleted: 'true' })).toBe(true);
    expect(isRagQuizRowDeleted({ is_deleted: 1 })).toBe(true);
    expect(isRagQuizRowDeleted({ deleted_at: '2020' })).toBe(true);
    expect(isRagQuizRowDeleted({})).toBe(false);
  });
  it('跳過已刪除，比對 rag_unit_id', () => {
    const row = [{ rag_unit_id: 5, deleted: true }, { rag_unit_id: 9 }];
    expect(unitStackRowMatchesRagUnitId(row, 9)).toBe(true);
    expect(unitStackRowMatchesRagUnitId(row, 5)).toBe(false); // 已刪除
    expect(unitStackRowMatchesRagUnitId(row, 0)).toBe(false);
    expect(unitStackRowMatchesRagUnitId(null, 9)).toBe(false);
  });
});

describe('for_exam 判斷', () => {
  it('quizRowQuizEmpty / isRagQuizMarkedForExam / hasRagQuizPromptRulesForExam', () => {
    expect(quizRowQuizEmpty({ quiz: '  ' })).toBe(true);
    expect(quizRowQuizEmpty({ quiz: 'q' })).toBe(false);
    expect(isRagQuizMarkedForExam({ rag_quiz_for_exam: 1 })).toBe(true);
    expect(isRagQuizMarkedForExam({ rag_quiz_for_exam: false })).toBe(false);
    expect(hasRagQuizPromptRulesForExam({ quizUserPromptText: 'a', gradingPrompt: 'b' })).toBe(true);
    expect(hasRagQuizPromptRulesForExam({ quizUserPromptText: 'a', gradingPrompt: '' })).toBe(false);
  });
});

describe('extractQuizUserPromptText', () => {
  it('多別名鍵，取第一個非空', () => {
    expect(extractQuizUserPromptText({ quiz_user_prompt_text: 'x' })).toBe('x');
    expect(extractQuizUserPromptText({ promptText: 'y' })).toBe('y');
    expect(extractQuizUserPromptText({ prompt_text: '   ' })).toBe('');
    expect(extractQuizUserPromptText(null)).toBe('');
  });
});

describe('parsePositiveQuizId', () => {
  it('僅正整數（取 floor），其餘 null', () => {
    expect(parsePositiveQuizId('12')).toBe(12);
    expect(parsePositiveQuizId(3.9)).toBe(3);
    expect(parsePositiveQuizId(0)).toBeNull();
    expect(parsePositiveQuizId('')).toBeNull();
    expect(parsePositiveQuizId(true)).toBeNull();
  });
});

describe('positiveRagQuizIdFromQuizRow / FromCard / sort', () => {
  it('取正整數 id；卡片退回 generateQuizResponseJson', () => {
    expect(positiveRagQuizIdFromQuizRow({ rag_quiz_id: 8 })).toBe(8);
    expect(positiveRagQuizIdFromQuizRow({ id: 4 })).toBe(4);
    expect(positiveRagQuizIdFromQuizRow({})).toBeNull();
    expect(positiveRagQuizIdFromCard({ generateQuizResponseJson: { quiz_id: 6 } })).toBe(6);
  });
  it('sortUnitQuizCardsByRagQuizId 依 id 升冪，不變動原陣列', () => {
    const list = [{ rag_quiz_id: 3 }, { rag_quiz_id: 1 }, { rag_quiz_id: 2 }];
    const sorted = sortUnitQuizCardsByRagQuizId(list);
    expect(sorted.map((x) => x.rag_quiz_id)).toEqual([1, 2, 3]);
    expect(list.map((x) => x.rag_quiz_id)).toEqual([3, 1, 2]);
  });
});

describe('isQuizCardFollowupModeForCount', () => {
  it('明確模式優先，否則看 follow_up 旗標', () => {
    expect(isQuizCardFollowupModeForCount({ quizGenerateMode: 'followup' })).toBe(true);
    expect(isQuizCardFollowupModeForCount({ quizGenerateMode: 'normal', follow_up: 1 })).toBe(false);
    expect(isQuizCardFollowupModeForCount({ follow_up: 1 })).toBe(true);
    expect(isQuizCardFollowupModeForCount({})).toBe(false);
  });
});

describe('quizBankReadonly* 顯示', () => {
  it('chunk 欄位（套用預設值）', () => {
    const fields = quizBankReadonlyOutlineChunkFields(undefined, undefined);
    expect(fields[0].value).toBe('1000');
    expect(fields[1].value).toBe('200');
    // null → Number(null)===0，視為有效數字（非 NaN），不套用預設
    expect(quizBankReadonlyOutlineChunkFields(null, null)[0].value).toBe('0');
  });
  it('來源檔依 unitType', () => {
    expect(quizBankReadonlySourceDisplay({ unitType: 2, textFileName: 't.md' })).toBe('t.md');
    expect(quizBankReadonlySourceDisplay({ unitType: 3, mp3FileName: 'a.mp3' })).toBe('a.mp3');
    expect(quizBankReadonlySourceDisplay({ unitType: 4, youtubeUrl: 'u' })).toBe('u');
    expect(quizBankReadonlySourceDisplay({ unitType: 1, filename: 'f.zip' })).toBe('f.zip');
    expect(quizBankReadonlySourceDisplay(null)).toBe('');
  });
});
