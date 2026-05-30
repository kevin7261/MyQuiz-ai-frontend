import { describe, it, expect } from 'vitest';
import {
  examNormalizeUnitRow,
  parseExamUnitQuizzesMaybe,
  examBuildUnitTabItem,
  examUnitSelectValue,
  examQuizTypeDisplayLabelForDropdownOption,
  examQuizNameLabelForDropdownOption,
  examQuizDropdownOptionIsFollowUp,
  examQuizPickSelectValue,
  extractQuizUserPromptFromExamRagRow,
  extractAnswerUserPromptFromExamRagRow,
  examResolvedUnitType,
  examUnitTranscriptFromRaw,
  examUnitSourceFilenameLabel,
} from './examUnitTabItems.js';

describe('examNormalizeUnitRow', () => {
  it('無名稱回 null；+ 取代為 _，補預設檔名', () => {
    expect(examNormalizeUnitRow({}, 't')).toBeNull();
    const out = examNormalizeUnitRow({ unit_name: 'A+B', rag_tab_id: 'tab1' }, 'fb');
    expect(out.unit_name).toBe('A_B');
    expect(out.rag_tab_id).toBe('tab1');
    expect(out.filename).toBe('A_B_rag.zip');
  });
});

describe('parseExamUnitQuizzesMaybe', () => {
  it('陣列原樣；JSON 字串解析；其餘 []', () => {
    expect(parseExamUnitQuizzesMaybe({ quizzes: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(parseExamUnitQuizzesMaybe({ quizzes: '[{"a":1}]' })).toEqual([{ a: 1 }]);
    expect(parseExamUnitQuizzesMaybe({ quizzes: 'x' })).toEqual([]);
    expect(parseExamUnitQuizzesMaybe(null)).toEqual([]);
  });
});

describe('examBuildUnitTabItem / examUnitSelectValue', () => {
  it('組分頁項目並保留來源', () => {
    const item = examBuildUnitTabItem(
      { unit_name: 'U1', rag_tab_id: 'tabX', rag_unit_id: 7 },
      0,
      'tabX',
    );
    expect(item.unitName).toBe('U1');
    expect(item.ragUnitId).toBe(7);
    expect(item.sourceUnitIndex).toBe(0);
    expect(examUnitSelectValue(item)).toBe(item.id);
    expect(examBuildUnitTabItem({}, 0, 't')).toBeNull();
  });
});

describe('下拉選項標籤', () => {
  it('type／name／followup／pick', () => {
    expect(examQuizTypeDisplayLabelForDropdownOption({ quiz_name: 'X', follow_up: 1 })).toBe(
      'X (追問出題)',
    );
    expect(examQuizTypeDisplayLabelForDropdownOption(null)).toBe('—');
    expect(examQuizNameLabelForDropdownOption({ quiz_name: ' A ' })).toBe('A');
    expect(examQuizNameLabelForDropdownOption({})).toBe('—');
    expect(examQuizDropdownOptionIsFollowUp({ follow_up: 1 })).toBe(true);
    expect(examQuizDropdownOptionIsFollowUp({})).toBe(false);
    expect(examQuizPickSelectValue({ quiz_name: ' q ' })).toBe('q');
  });
});

describe('提示擷取', () => {
  it('quiz／answer user prompt 多別名', () => {
    expect(extractQuizUserPromptFromExamRagRow({ quizUserPromptText: 'q' })).toBe('q');
    expect(extractQuizUserPromptFromExamRagRow({})).toBe('');
    expect(extractAnswerUserPromptFromExamRagRow({ answer_user_prompt_text: 'a' })).toBe('a');
    expect(
      extractAnswerUserPromptFromExamRagRow({ critique_user_prompt_instruction: 'c' }),
    ).toBe('c');
    expect(extractAnswerUserPromptFromExamRagRow({})).toBe('');
  });
});

describe('unit_type 與來源檔', () => {
  it('examResolvedUnitType / transcript / sourceFilenameLabel', () => {
    expect(examResolvedUnitType({ unit_type: 3 })).toBe(3);
    expect(examResolvedUnitType({ unit_type: 9 })).toBe(1);
    expect(examUnitTranscriptFromRaw({ transcript: ' hi ' })).toBe('hi');
    expect(examUnitTranscriptFromRaw({})).toBe('');
    expect(examUnitSourceFilenameLabel({ unit_type: 2, text_file_name: 't.md' })).toBe('t.md');
    expect(examUnitSourceFilenameLabel({ unit_type: 3, mp3_file_name: 'a.mp3' })).toBe('a.mp3');
    expect(examUnitSourceFilenameLabel({ unit_type: 4, youtube_url: 'u' })).toBe('u');
    expect(examUnitSourceFilenameLabel({ unit_type: 1 })).toBe('');
  });
});
