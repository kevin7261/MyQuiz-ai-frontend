/**
 * 建立測驗題庫（稿）— API 替身（不發送 HTTP；僅供 UI 互動示範）
 */
import { formatGradingResult } from '../../utils/grading.js';
import {
  DESIGN_MOCK_RAG_LIST,
  DESIGN_MOCK_UNITS,
  DESIGN_MOCK_QUIZ_GENERATE,
  DESIGN_MOCK_TRANSCRIPT_MD,
} from './mockData.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let nextRagId = 9100;
let nextRagQuizId = 3000;

/** 稿頁「新增題庫」時追加的列（fetchRagList 會一併帶入） */
const extraRagRows = [];
/** 稿頁已刪除的示範 rag_tab_id */
const deletedMockTabIds = new Set();

export function buildDesignRagList() {
  return [
    ...DESIGN_MOCK_RAG_LIST.filter(
      (r) => !deletedMockTabIds.has(String(r.rag_tab_id ?? '')),
    ).map((r) => ({ ...r })),
    ...extraRagRows.map((r) => ({ ...r })),
  ];
}

export function getPersonId(authStore) {
  const id = authStore?.user?.person_id;
  if (id == null || String(id).trim() === '') return 'design_person';
  return String(id);
}

export function getCourseId() {
  return 'design_course';
}

export function transcriptResponseMarkdown(data) {
  if (!data || typeof data !== 'object') return '';
  const candidates = [
    data.markdown,
    data.text,
    data.transcription,
    data.transcript,
    data.content,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c);
  }
  return '';
}

export async function apiRagTranscriptText() {
  await delay(300);
  return { markdown: DESIGN_MOCK_TRANSCRIPT_MD };
}

export async function apiRagTranscriptAudio() {
  await delay(500);
  return { markdown: DESIGN_MOCK_TRANSCRIPT_MD };
}

export async function apiRagTranscriptYoutube() {
  await delay(500);
  return { markdown: DESIGN_MOCK_TRANSCRIPT_MD };
}

export async function apiRagUnitMp3FileByFolder() {
  await delay(200);
  return { url: '' };
}

export async function apiRagUnitYoutubeUrlByFolder() {
  await delay(200);
  return { youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
}

export function buildRagTabUnitMp3FileUrl() {
  return '';
}

export async function apiRagTabUnitMp3FileBlob() {
  await delay(200);
  return new Blob([], { type: 'audio/mpeg' });
}

export async function apiCreateUnit(personId, ragTabId, tabName) {
  await delay(200);
  nextRagId += 1;
  const row = {
    rag_id: nextRagId,
    rag_tab_id: ragTabId,
    person_id: personId,
    tab_name: tabName,
    rag_name: tabName,
    local: true,
    for_exam: false,
    file_metadata: { second_folders: [] },
    units: [],
  };
  extraRagRows.push(row);
  return row;
}

export async function apiUploadZip(_file, ragTabId) {
  await delay(400);
  const meta = {
    rag_tab_id: ragTabId,
    second_folders: ['Chapter_01', 'Chapter_02', 'Chapter_03'],
  };
  return meta;
}

export async function apiDeleteRag(ragTabId) {
  await delay(200);
  const id = String(ragTabId ?? '').trim();
  if (!id) return;
  const extraIdx = extraRagRows.findIndex((r) => String(r.rag_tab_id) === id);
  if (extraIdx >= 0) {
    extraRagRows.splice(extraIdx, 1);
    return;
  }
  if (DESIGN_MOCK_RAG_LIST.some((r) => String(r.rag_tab_id) === id)) {
    deletedMockTabIds.add(id);
  }
}

export async function apiUpdateRagTabName(ragId, tabName) {
  await delay(200);
  return { rag_id: ragId, tab_name: tabName };
}

export async function apiBuildRagZip(body, onStreamEvent) {
  const total = 2;
  if (typeof onStreamEvent === 'function') {
    onStreamEvent({ type: 'start', total });
    for (let i = 1; i <= total; i++) {
      await delay(150);
      onStreamEvent({
        type: 'building',
        index: i,
        total,
        completed_before: i - 1,
        filename: `unit_${i}.zip`,
      });
      onStreamEvent({
        type: 'unit',
        index: i,
        total,
        output: { filename: `unit_${i}.zip`, rag_filename: `unit_${i}_rag.zip` },
      });
    }
    onStreamEvent({ type: 'complete', success: true, total, built_ok: total, built_failed: 0 });
  } else {
    await delay(300);
  }
  return {
    success: true,
    rag_tab_id: body?.rag_tab_id,
    outputs: DESIGN_MOCK_UNITS,
    total,
    built_ok: total,
    built_failed: 0,
  };
}

export async function apiGetRagTabUnits() {
  await delay(250);
  return DESIGN_MOCK_UNITS.map((u) => ({ ...u, quizzes: (u.quizzes ?? []).map((q) => ({ ...q })) }));
}

export async function apiCreateRagUnitQuiz() {
  await delay(200);
  nextRagQuizId += 1;
  return { rag_quiz_id: nextRagQuizId, quiz_name: '未命名題型' };
}

export async function apiUpdateRagQuizName(body) {
  await delay(150);
  return { rag_quiz_id: body?.rag_quiz_id, quiz_name: body?.quiz_name };
}

export async function apiDeleteRagQuiz() {
  await delay(150);
  return {};
}

export async function apiRagUnitQuizLlmGenerate(body) {
  await delay(600);
  nextRagQuizId = Number(body?.rag_quiz_id) || nextRagQuizId;
  return {
    ...DESIGN_MOCK_QUIZ_GENERATE,
    rag_quiz_id: nextRagQuizId,
    quiz_name: body?.quiz_name || DESIGN_MOCK_QUIZ_GENERATE.quiz_name,
  };
}

export async function apiRagUnitQuizLlmGenerateDb(body) {
  await delay(500);
  return {
    ...DESIGN_MOCK_QUIZ_GENERATE,
    rag_quiz_id: body?.rag_quiz_id,
  };
}

export function normalizeFollowupHistoryItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const quiz_content = String(
    item.quiz_content ?? item.quizContent ?? item.quiz ?? '',
  ).trim();
  if (!quiz_content) return null;
  const answer_content = String(
    item.answer_content ?? item.answerContent ?? item.quiz_answer ?? item.answer ?? '',
  ).trim();
  const quiz_answer_reference = String(
    item.quiz_answer_reference
    ?? item.quizAnswerReference
    ?? item.quiz_reference_answer
    ?? item.referenceAnswer
    ?? '',
  ).trim();
  const answer_critique = String(
    item.answer_critique ?? item.answerCritique ?? '',
  ).trim();
  return { quiz_content, answer_content, quiz_answer_reference, answer_critique };
}

function followupHistoryDedupKey(item) {
  return [
    item.quiz_content,
    item.answer_content,
    item.quiz_answer_reference,
    item.answer_critique,
  ].join('\0');
}

export function parseFollowupHistoryListFromSource(source) {
  let list = source;
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    list =
      source.quiz_followup_history_list
      ?? source.quizFollowupHistoryList
      ?? source.quiz_history_list
      ?? source.quizHistoryList;
  }
  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (!trimmed || !trimmed.startsWith('[')) return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (typeof item === 'string') continue;
    const normalized = normalizeFollowupHistoryItem(item);
    if (!normalized) continue;
    const key = followupHistoryDedupKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

export function followupHistoryEntryFromQuizCard(card) {
  if (!card || typeof card !== 'object') return null;
  return normalizeFollowupHistoryItem({
    quiz_content: card.quiz,
    answer_content: card.quiz_answer,
    quiz_answer_reference: card.referenceAnswer ?? card.quiz_answer_reference,
    answer_critique: extractAnswerCritiqueRaw(card),
  });
}

export function extractAnswerCritiqueRaw(card) {
  if (!card || typeof card !== 'object') return '';
  for (const k of ['answer_critique', 'answerCritique']) {
    const v = card[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  const gj = card.gradingResponseJson;
  if (gj && typeof gj === 'object') {
    for (const k of ['answer_critique', 'answerCritique']) {
      const v = gj[k];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    const formatted = formatGradingResult(JSON.stringify(gj));
    if (formatted && String(formatted).trim() !== '') return String(formatted).trim();
  }
  const gr = card.gradingResult;
  if (gr != null && String(gr).trim() !== '') return String(gr).trim();
  return '';
}

export async function apiRagUnitQuizLlmGenerateFollowup(body) {
  await delay(500);
  return {
    ...DESIGN_MOCK_QUIZ_GENERATE,
    quiz_content: '（稿）追問示範題目',
    rag_quiz_id: body?.rag_quiz_id,
  };
}

export async function apiRagUnitQuizLlmGenerateFollowupDb(body) {
  await delay(400);
  return {
    ...DESIGN_MOCK_QUIZ_GENERATE,
    quiz_content: '（稿）追問示範題目（DB）',
    rag_quiz_id: body?.rag_quiz_id,
  };
}

export async function apiMarkRagQuizForExam(body) {
  await delay(200);
  const row = DESIGN_MOCK_RAG_LIST.find((r) => r.rag_tab_id === body?.rag_tab_id);
  if (row) row.for_exam = !!body?.for_exam;
  return { for_exam: !!body?.for_exam };
}

export async function apiGenerateQuiz(ragId, ragTabId) {
  await delay(500);
  nextRagQuizId += 1;
  return {
    ...DESIGN_MOCK_QUIZ_GENERATE,
    rag_id: ragId,
    rag_tab_id: ragTabId,
    rag_quiz_id: nextRagQuizId,
  };
}

export function is504OrNetworkError() {
  return false;
}
