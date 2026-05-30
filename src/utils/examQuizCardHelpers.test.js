import { describe, it, expect } from 'vitest';
import {
  answerHasGradingEvidence,
  normalizeFollowupQuizAnswers,
  buildExamQuizByIdMapForExam,
  buildFollowupChain,
} from './examQuizCardHelpers.js';

describe('answerHasGradingEvidence', () => {
  it('分數／評語／critique／metadata 任一非空即為 true', () => {
    expect(answerHasGradingEvidence({ quiz_score: 3 })).toBe(true);
    expect(answerHasGradingEvidence({ quiz_comments: ['ok'] })).toBe(true);
    expect(answerHasGradingEvidence({ answer_critique: 'c' })).toBe(true);
    expect(answerHasGradingEvidence({ answer_metadata: 'm' })).toBe(true);
    expect(answerHasGradingEvidence({})).toBe(false);
    expect(answerHasGradingEvidence(null)).toBe(false);
  });
});

describe('normalizeFollowupQuizAnswers', () => {
  it('已有 answers 原樣返回', () => {
    const q = { answers: [{ quiz_answer: 'a' }] };
    expect(normalizeFollowupQuizAnswers(q)).toBe(q);
  });
  it('無 answers 但有內嵌作答時補回 answers', () => {
    const out = normalizeFollowupQuizAnswers({ exam_quiz_id: 1, answer_content: 'hello' });
    expect(Array.isArray(out.answers)).toBe(true);
    expect(out.answers[0].quiz_answer).toBe('hello');
  });
  it('僅分數時保留 quiz_score 供偵測', () => {
    const out = normalizeFollowupQuizAnswers({ exam_quiz_id: 1, quiz_score: 4 });
    expect(out.answers[0].quiz_score).toBe(4);
  });
  it('無內嵌作答時原樣返回', () => {
    const q = { exam_quiz_id: 1 };
    expect(normalizeFollowupQuizAnswers(q)).toBe(q);
  });
});

describe('buildExamQuizByIdMapForExam', () => {
  it('依 exam_quiz_id 索引，含 follow_up_quiz 巢狀鏈', () => {
    const exam = { quizzes: [{ exam_quiz_id: 1, follow_up_quiz: { exam_quiz_id: 2 } }] };
    const map = buildExamQuizByIdMapForExam(exam);
    expect(map.has(1)).toBe(true);
    expect(map.has(2)).toBe(true);
    expect(buildExamQuizByIdMapForExam(null).size).toBe(0);
  });
});

describe('buildFollowupChain', () => {
  it('單節點：無 rounds，activeQuiz 為自身', () => {
    const quiz = { exam_quiz_id: 1 };
    const { rounds, activeQuiz } = buildFollowupChain(quiz);
    expect(rounds).toEqual([]);
    expect(activeQuiz).toBe(quiz);
  });
  it('多節點：rounds 為前段，activeQuiz 為鏈尾', () => {
    const quiz = { exam_quiz_id: 1, follow_up_quiz: { exam_quiz_id: 2, answer_content: 'x' } };
    const { rounds, activeQuiz } = buildFollowupChain(quiz);
    expect(rounds).toHaveLength(1);
    expect(activeQuiz.exam_quiz_id).toBe(2);
  });
});
