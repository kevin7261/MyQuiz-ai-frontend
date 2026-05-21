/**
 * 測驗（介面稿）頁面用示範資料，不呼叫後端 API。
 */
import {
  DESIGN_DEMO_GRADING_CRITIQUE_SAMPLE,
  DESIGN_DEMO_MP3_SAMPLE_URL,
  buildDesignDemoUnits,
} from '../create-exam-bank-design/mockData.js';

export { DESIGN_DEMO_MP3_SAMPLE_URL };

let nextExamId = 8000;
let nextExamQuizId = 5000;

/** 示範「產生題目」回傳 */
export const DESIGN_MOCK_EXAM_QUIZ_GENERATE = {
  quiz_content: '（稿）示範題目：請簡述本單元重點，並舉一個實際應用例子。',
  quiz_hint: '可參考教材第一段與課堂討論。',
  quiz_reference_answer: '本單元重點包含核心概念定義、應用情境與常見誤區；例如影像辨識即為深度學習的應用之一。',
  quiz_name: '示範題型',
};

/** 示範追問出題回傳 */
export const DESIGN_MOCK_EXAM_QUIZ_FOLLOWUP_GENERATE = {
  quiz_content: '你提到「監督式學習」—請再說明它與非監督式學習在標註資料上的差別。',
  quiz_hint: '聚焦是否有標籤（label）。',
  quiz_reference_answer: '監督式學習需要標註資料；非監督式則從未標註資料找結構。',
  quiz_name: '追問出題',
  follow_up: true,
};

/** GET /exam/rag-for-exams 示範（試卷題庫） */
export const DESIGN_MOCK_FOR_EXAM_RAG = {
  rag_id: 9001,
  rag_tab_id: 'design_demo_001',
  rag_name: '示範題庫 A',
  units: buildDesignDemoUnits(),
};

function demoExamQuiz(overrides = {}) {
  nextExamQuizId += 1;
  return {
    exam_quiz_id: nextExamQuizId,
    rag_id: 9001,
    rag_unit_id: 101,
    rag_quiz_id: 1002,
    unit_name: 'Chapter_01',
    quiz_name: '示範｜題目區塊',
    quiz_content: 'What is the capital of Taiwan?',
    quiz_hint: 'Think about the island.',
    quiz_answer_reference: 'Taipei',
    quiz_rate: 0,
    ...overrides,
  };
}

/** 示範試卷列表（GET /exam/tabs） */
export function buildDesignExamList() {
  nextExamQuizId = 5000;
  return [
    {
      exam_id: 8001,
      exam_tab_id: 'design_exam_001',
      tab_name: '示範試卷 A（RAG／文字／MP3／YouTube）',
      exam_name: '示範試卷 A（RAG／文字／MP3／YouTube）',
      test_tab_id: 'design_exam_001',
      test_name: '示範試卷 A（RAG／文字／MP3／YouTube）',
      units: [
        {
          unit_name: 'Chapter_01',
          quizzes: [
            demoExamQuiz({
              exam_quiz_id: 5001,
              rag_unit_id: 101,
              rag_quiz_id: 1002,
              unit_name: 'Chapter_01',
              quiz_name: '示範｜題目區塊（RAG）',
              quiz_content: 'What is the capital of Taiwan?',
              quiz_hint: 'Think about the island.',
              quiz_answer_reference: 'Taipei',
            }),
          ],
        },
        {
          unit_name: 'Chapter_02',
          quizzes: [
            demoExamQuiz({
              exam_quiz_id: 5002,
              rag_unit_id: 102,
              rag_quiz_id: 1007,
              unit_name: 'Chapter_02',
              quiz_name: '示範｜題目區塊（文字）',
              quiz_content: 'Chapter 02 中提到的三個重點是什麼？',
              quiz_hint: '參考第二段條列。',
              quiz_answer_reference: '重點一、重點二、重點三（示範）。',
              answer_content: '我記得有提到定義、例子還有練習題，但沒有完整條列三點。',
              quiz_score: 4,
              answer_critique: DESIGN_DEMO_GRADING_CRITIQUE_SAMPLE,
            }),
          ],
        },
        {
          unit_name: 'Chapter_04',
          quizzes: [
            demoExamQuiz({
              exam_quiz_id: 5003,
              rag_unit_id: 104,
              rag_quiz_id: 1012,
              unit_name: 'Chapter_04',
              quiz_name: '示範｜題目區塊（MP3）',
              quiz_content: '根據音檔內容，說明講者強調的第一個論點。（示範）',
              quiz_hint: '可點「逐字稿」對照。',
              quiz_answer_reference: '（依音檔逐字稿填寫）',
            }),
          ],
        },
        {
          unit_name: 'Chapter_05',
          quizzes: [
            demoExamQuiz({
              exam_quiz_id: 5004,
              rag_unit_id: 105,
              rag_quiz_id: 1013,
              unit_name: 'Chapter_05',
              quiz_name: '示範｜題目區塊（YouTube）',
              quiz_content: '根據影片內容，說明講者強調的第一個論點。（示範）',
              quiz_hint: '可點「逐字稿」對照。',
              quiz_answer_reference: '（依影片內容填寫）',
            }),
          ],
        },
      ],
    },
    {
      exam_id: 8002,
      exam_tab_id: 'design_exam_002',
      tab_name: '示範試卷 B（空白）',
      exam_name: '示範試卷 B（空白）',
      test_tab_id: 'design_exam_002',
      test_name: '示範試卷 B（空白）',
      units: [],
    },
  ];
}

/** 新增試卷分頁時追加的列 */
const extraExamRows = [];
/** 已刪除的示範 exam_tab_id */
const deletedMockExamTabIds = new Set();

export function buildDesignExamListMerged() {
  return [
    ...buildDesignExamList().filter(
      (e) => !deletedMockExamTabIds.has(String(e.exam_tab_id ?? '')),
    ),
    ...extraExamRows.map((e) => ({ ...e })),
  ];
}

export function addDesignExamRow(row) {
  extraExamRows.push(row);
}

export function markDesignExamDeleted(examTabId) {
  deletedMockExamTabIds.add(String(examTabId ?? ''));
}

export function nextDesignExamId() {
  nextExamId += 1;
  return nextExamId;
}

export function nextDesignExamQuizId() {
  nextExamQuizId += 1;
  return nextExamQuizId;
}
