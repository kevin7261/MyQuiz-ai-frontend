import { describe, it, expect } from 'vitest';
import { normalizeExamRagForExamsPayload } from './examRagForExamsPayload.js';

describe('normalizeExamRagForExamsPayload', () => {
  it('null／非物件回 null', () => {
    expect(normalizeExamRagForExamsPayload(null)).toBeNull();
    expect(normalizeExamRagForExamsPayload(42)).toBeNull();
  });

  it('單元陣列 → 整理出 rag_id／units／outputs', () => {
    const out = normalizeExamRagForExamsPayload([
      { rag_id: 5, rag_tab_id: 't', rag_unit_id: 1, unit_name: 'U', quizzes: [{ q: 1 }] },
    ]);
    expect(out.rag_id).toBe(5);
    expect(out.rag_tab_id).toBe('t');
    expect(out.units).toHaveLength(1);
    expect(out.outputs[0]).toMatchObject({ unit_name: 'U', rag_name: 'U' });
    expect(out.outputs[0].quizzes).toEqual([{ q: 1 }]);
  });

  it('quizzes 為 JSON 字串時會被解析', () => {
    const out = normalizeExamRagForExamsPayload([
      { rag_tab_id: 't', unit_name: 'U', quizzes: '[{"q":2}]' },
    ]);
    expect(out.units[0].quizzes).toEqual([{ q: 2 }]);
  });

  it('{ rag: { units } } → 回傳該 rag 物件並帶 units', () => {
    const out = normalizeExamRagForExamsPayload({
      rag: { rag_id: 9, rag_tab_id: 't9', units: [{ unit_name: 'A', rag_tab_id: 't9' }] },
    });
    expect(out.rag_id).toBe(9);
    expect(out.units).toHaveLength(1);
  });

  it('明確 units: [] 時仍回物件（非 null），供顯示「題庫為空」', () => {
    const out = normalizeExamRagForExamsPayload({ rag_id: 1, rag_tab_id: 't', units: [] });
    expect(out).not.toBeNull();
    expect(out.units).toEqual([]);
    expect(out.outputs).toEqual([]);
    expect(out.rag_tab_id).toBe('t');
  });

  it('{ data: { units } } 會先解包 data', () => {
    const out = normalizeExamRagForExamsPayload({
      data: { rag_tab_id: 'td', units: [{ unit_name: 'X', rag_tab_id: 'td' }] },
    });
    expect(out.units).toHaveLength(1);
    expect(out.rag_tab_id).toBe('td');
  });
});
