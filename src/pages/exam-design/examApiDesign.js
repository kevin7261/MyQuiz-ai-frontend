/**
 * 測驗 — API 替身（不發送 HTTP；僅供 UI 互動示範）
 */
import {
  DESIGN_MOCK_EXAM_QUIZ_GENERATE,
  DESIGN_MOCK_EXAM_QUIZ_FOLLOWUP_GENERATE,
  nextDesignExamQuizId,
} from './mockData.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function apiUpdateExamTabName(_examId, tabName) {
  void _examId;
  await delay(200);
  return { tab_name: tabName };
}

export async function apiExamTabQuizCreate() {
  await delay(200);
  const id = nextDesignExamQuizId();
  return { exam_quiz_id: id };
}

export async function apiExamTabQuizCreateLlmGenerate(_body) {
  void _body;
  await delay(600);
  const id = nextDesignExamQuizId();
  return {
    exam_quiz_id: id,
    ...DESIGN_MOCK_EXAM_QUIZ_GENERATE,
  };
}

export async function apiExamTabQuizCreateLlmGenerateFollowup(_body) {
  void _body;
  await delay(600);
  const id = nextDesignExamQuizId();
  return {
    exam_quiz_id: id,
    ...DESIGN_MOCK_EXAM_QUIZ_FOLLOWUP_GENERATE,
  };
}

export async function apiExamTabQuizLlmGenerate(body) {
  await delay(600);
  const id = body?.exam_quiz_id ?? nextDesignExamQuizId();
  return {
    exam_quiz_id: id,
    ...DESIGN_MOCK_EXAM_QUIZ_GENERATE,
  };
}

export async function apiExamTabQuizLlmGenerateFollowup(body) {
  await delay(600);
  const id = body?.exam_quiz_id ?? nextDesignExamQuizId();
  return {
    exam_quiz_id: id,
    ...DESIGN_MOCK_EXAM_QUIZ_FOLLOWUP_GENERATE,
  };
}

export async function apiExamTabDelete() {
  await delay(200);
  return { ok: true };
}
