/**
 * 建立「英文測驗題庫」專用：批改走 POST /english_system/tab/phase/quiz/grade（同步 200，無 job 輪詢）。
 *
 * 職責：送出評分請求、將回傳 JSON 格式化为易讀文字。
 * 會直接修改題目卡片 item（gradingResult、gradingResponseJson、answer_id；confirmed 於流程結束後設為 true）。
 * 供 CreateEnglishExamQuizBankPage 測驗階段題卡「確定批改」。
 */
import { API_BASE, API_ENGLISH_SYSTEM_TAB_PHASE_QUIZ_GRADE } from '../constants/api.js';
import { getPersonId } from '../services/englishExamRagApi.js';
import { useAuthStore } from '../stores/authStore.js';
import { formatGradingResult } from '../utils/grading.js';
import { loggedFetch } from '../utils/loggedFetch.js';

/** @param {unknown} v @param {number} fallback */
function toNonNegInt(v, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.trunc(n);
}

/**
 * 送出英文測驗階段題卡批改（English System Phase Quiz Grade）
 *
 * @param {Object} item - 題目卡片（quiz、quiz_answer、rag_quiz_id 即 system_quiz_id、referenceAnswer 等）
 * @param {Object} context - { systemId, systemTabId, systemQuizPhaseId, quizText }
 * @param {Object} [options] - critiqueUserPromptInstruction；或 extraGradeBody.critique_user_prompt_instruction / context_text（舊併送鍵）作為批改指令
 */
export async function submitGrade(item, context, options = {}) {
  const { systemId, systemTabId, systemQuizPhaseId, quizText } = context;

  const extra = options.extraGradeBody;
  const critiqueRaw =
    options.critiqueUserPromptInstruction ??
    (extra && typeof extra === 'object'
      ? extra.critique_user_prompt_instruction ?? extra.context_text
      : '') ??
    '';
  const critique_user_prompt_instruction = String(critiqueRaw ?? '').trim();

  const system_quiz_id_raw =
    item.rag_quiz_id != null && String(item.rag_quiz_id).trim() !== ''
      ? item.rag_quiz_id
      : item.quiz_id != null
        ? item.quiz_id
        : 0;

  /** 與 OpenAPI：POST /english_system/tab/phase/quiz/grade 之 application/json 欄位一致 */
  const gradeBody = {
    english_system_id: toNonNegInt(systemId, 0),
    english_system_tab_id: systemTabId != null ? String(systemTabId).trim() : '',
    english_system_quiz_phase_id: toNonNegInt(systemQuizPhaseId, 0),
    english_system_quiz_id: toNonNegInt(system_quiz_id_raw, 0),
    quiz_text: String(quizText ?? '').trim(),
    quiz_content: item.quiz ?? '',
    critique_user_prompt_instruction,
    quiz_answer: String(item.quiz_answer ?? '').trim(),
  };

  item.gradingResult = '';

  try {
    const authStore = useAuthStore();
    const personId = getPersonId(authStore);
    const fetchOpts = personId ? { personId } : {};
    const res = await loggedFetch(`${API_BASE}${API_ENGLISH_SYSTEM_TAB_PHASE_QUIZ_GRADE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gradeBody),
    }, fetchOpts);
    const text = await res.text();
    if (!res.ok) {
      let msg = res.statusText;
      if (text) {
        try {
          const errBody = JSON.parse(text);
          msg =
            errBody.error != null
              ? errBody.error
              : errBody.detail != null
                ? typeof errBody.detail === 'string'
                  ? errBody.detail
                  : JSON.stringify(errBody.detail)
                : text;
        } catch (_) {
          msg = text;
        }
      }
      const statusHint =
        res.status === 400
          ? '（請至「系統設定」確認已填寫 AI 服務 API 金鑰）\n\n'
          : res.status === 502
            ? '（服務忙碌或暫時無法回應，請稍後再試）\n\n'
            : '';
      item.gradingResult = `批改失敗：${statusHint}${msg}`;
      return;
    }

    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      item.gradingResult = text?.trim() || '批改失敗：無法解析回應';
      return;
    }
    item.gradingResponseJson = data;

    const forDisplay = {
      quiz_grade: data?.quiz_grade,
      quiz_score: data?.quiz_score ?? data?.quiz_grade,
      quiz_comments: data?.quiz_comments,
    };
    item.gradingResult = formatGradingResult(JSON.stringify(forDisplay)) || '（無批改內容）';

    const ansId = data?.english_system_answer_id;
    if (ansId != null && String(ansId).trim() !== '') {
      const rid = Number(ansId);
      item.answer_id = Number.isFinite(rid) ? rid : ansId;
    } else {
      delete item.answer_id;
    }
  } catch (_) {
    item.gradingResult = '批改失敗：連線逾時或服務忙碌，請稍後再試。';
  } finally {
    item.confirmed = true;
  }
}
