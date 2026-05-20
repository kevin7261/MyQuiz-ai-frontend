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
      tab_name: '示範試卷 A',
      exam_name: '示範試卷 A',
      test_tab_id: 'design_exam_001',
      test_name: '示範試卷 A',
      units: [
        {
          unit_name: 'Chapter_01',
          quizzes: [
            demoExamQuiz({
              exam_quiz_id: 5001,
              rag_unit_id: 101,
              rag_quiz_id: 1002,
              quiz_name: '示範｜題目區塊',
              quiz_content: 'What is the capital of Taiwan?',
              quiz_hint: 'Think about the island.',
              quiz_answer_reference: 'Taipei',
            }),
            demoExamQuiz({
              exam_quiz_id: 5002,
              rag_unit_id: 101,
              rag_quiz_id: 1003,
              quiz_name: '測驗用選擇題',
              quiz_content: 'Which of the following is a renewable energy source?',
              quiz_hint: 'Solar and wind are common examples.',
              quiz_answer_reference: 'Solar power',
              answer_content: 'Solar power',
              quiz_score: 5,
              answer_critique: DESIGN_DEMO_GRADING_CRITIQUE_SAMPLE,
            }),
            demoExamQuiz({
              exam_quiz_id: 5003,
              rag_unit_id: 102,
              rag_quiz_id: 1004,
              unit_name: 'Chapter_02',
              quiz_name: '示範｜產生題目按鈕',
              quiz_content: '',
              quiz_hint: '',
              quiz_answer_reference: '',
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
