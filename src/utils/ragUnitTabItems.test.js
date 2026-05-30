import { describe, it, expect } from 'vitest';
import {
  firstRagQuizAnchorIdFromUnit,
  ragUnitIdFromRawUnit,
  unitSourceFilename,
  unitTextFileName,
  unitMp3FileName,
  unitYoutubeUrl,
  folderCombinationFromUnitRaw,
  parseFolderCombinationTags,
  rawUnitTranscriptString,
  normalizeUnitFromRagTabsRow,
  unitsFromRagTabsRow,
  unitTabLabelFromUnit,
  tabUnitTypeFromUnit,
  buildUnitTabItem,
} from './ragUnitTabItems.js';

describe('id 取值', () => {
  it('firstRagQuizAnchorIdFromUnit：直接欄位優先，否則掃 quizzes', () => {
    expect(firstRagQuizAnchorIdFromUnit({ rag_quiz_id: 7 })).toBe(7);
    expect(firstRagQuizAnchorIdFromUnit({ quizzes: [{ quiz_id: 3 }] })).toBe(3);
    expect(firstRagQuizAnchorIdFromUnit({ quizzes: [{ id: 0 }] })).toBeNull();
    expect(firstRagQuizAnchorIdFromUnit(null)).toBeNull();
  });
  it('ragUnitIdFromRawUnit：僅正整數', () => {
    expect(ragUnitIdFromRawUnit({ rag_unit_id: 5 })).toBe(5);
    expect(ragUnitIdFromRawUnit({ unit_id: '0' })).toBeNull();
    expect(ragUnitIdFromRawUnit({})).toBeNull();
  });
});

describe('檔名／逐字稿欄位', () => {
  it('unitSourceFilename 取多別名', () => {
    expect(unitSourceFilename({ rag_file_name: ' a.zip ' })).toBe('a.zip');
    expect(unitSourceFilename({ filename: 'b.zip' })).toBe('b.zip');
    expect(unitSourceFilename({})).toBe('');
  });
  it('unitTextFileName：text_file_name 優先；文字單元才退回 filename（排除 _rag.zip）', () => {
    expect(unitTextFileName({ text_file_name: 't.md' })).toBe('t.md');
    expect(unitTextFileName({ unit_type: 2, filename: 'note.md' })).toBe('note.md');
    expect(unitTextFileName({ unit_type: 2, filename: 'x_rag.zip' })).toBe('');
    expect(unitTextFileName({ unit_type: 1, filename: 'note.md' })).toBe('');
  });
  it('mp3／youtube／folder 取值', () => {
    expect(unitMp3FileName({ mp3_file_name: 'a.mp3' })).toBe('a.mp3');
    expect(unitYoutubeUrl({ youtube_url: 'https://y/x' })).toBe('https://y/x');
    expect(folderCombinationFromUnitRaw({ folder_combination: 'A/tB' })).toBe('A/tB');
  });
  it('rawUnitTranscriptString：多候選含 output 巢狀', () => {
    expect(rawUnitTranscriptString({ transcript: ' hi ' })).toBe('hi');
    expect(rawUnitTranscriptString({ output: { transcript_plain: 'p' } })).toBe('p');
    expect(rawUnitTranscriptString({})).toBe('');
  });
});

describe('parseFolderCombinationTags', () => {
  it('支援 /t、tab、+ 分隔；否則回退 fallback line', () => {
    expect(parseFolderCombinationTags('A/tB/tC')).toEqual(['A', 'B', 'C']);
    expect(parseFolderCombinationTags('A\tB')).toEqual(['A', 'B']);
    expect(parseFolderCombinationTags('A + B')).toEqual(['A', 'B']);
    expect(parseFolderCombinationTags('', 'X + Y')).toEqual(['X', 'Y']);
    expect(parseFolderCombinationTags('', '')).toEqual([]);
  });
});

describe('tabUnitTypeFromUnit / unitTabLabelFromUnit', () => {
  it('unit_type 2/3/4 保留，其餘為 RAG(1)', () => {
    expect(tabUnitTypeFromUnit({ unit_type: 2 })).toBe(2);
    expect(tabUnitTypeFromUnit({ unit_type: 3 })).toBe(3);
    expect(tabUnitTypeFromUnit({ unit_type: 4 })).toBe(4);
    expect(tabUnitTypeFromUnit({ unit_type: 9 })).toBe(1);
    expect(tabUnitTypeFromUnit({})).toBe(1);
  });
  it('label 退回「單元 n」', () => {
    expect(unitTabLabelFromUnit({ unit_name: 'U' })).toBe('U');
    expect(unitTabLabelFromUnit({}, 2)).toBe('單元 3');
  });
});

describe('normalizeUnitFromRagTabsRow', () => {
  it('無名稱回 null；正規化關鍵欄位', () => {
    expect(normalizeUnitFromRagTabsRow({}, 't')).toBeNull();
    const out = normalizeUnitFromRagTabsRow(
      { unit_name: 'A+B', rag_tab_id: 'tab1', unit_type: 2, rag_quiz_id: 4 },
      'fb',
    );
    expect(out.unit_name).toBe('A_B'); // + 取代為 _
    expect(out.rag_tab_id).toBe('tab1');
    expect(out.anchor_rag_quiz_id).toBe(4);
    expect(out.unit_type).toBe(2);
  });
});

describe('unitsFromRagTabsRow / buildUnitTabItem', () => {
  it('由內嵌 units[] 正規化並組分頁項目', () => {
    const rows = unitsFromRagTabsRow({
      rag_tab_id: 'tabX',
      units: [{ unit_name: 'U1', rag_tab_id: 'tabX', rag_unit_id: 11, unit_type: 3 }],
    });
    expect(rows).toHaveLength(1);
    const item = buildUnitTabItem(rows[0], 0);
    expect(item.unitName).toBe('U1');
    expect(item.unitType).toBe(3);
    expect(item.ragUnitDbId).toBe(11);
    expect(item.id).toContain('ru-11');
  });
});
