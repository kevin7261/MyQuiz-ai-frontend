import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/authStore.js';
import { COURSE_SCOPE_KEYS } from '../utils/courseScope.js';
import {
  normalizeAnalysisQuizzesListResponse,
  mergeQuizzesWithTopLevelAnswers,
} from '../utils/rag.js';
import { formatGradingResult } from '../utils/grading.js';
import { examQuizApiRowIsFollowUp } from '../utils/examQuizRows.js';
import { loggedFetch } from '../utils/loggedFetch.js';
import { renderMarkdownToSafeHtml } from '../utils/renderMarkdown.js';

/**
 * Shared logic for AnswerWeaknessAnalysisPage and StudentAnswerAnalysisPage.
 *
 * @param {object} config
 * @param {(personId: string) => string} config.apiQuizzesUrlFn - builds the quizzes fetch URL
 * @param {string} config.apiPromptUrl - full URL for GET/PUT the analysis prompt setting
 * @param {string} config.promptBodyKey - PUT body key (e.g. 'person_analysis_user_prompt_text')
 * @param {(data: object) => string} config.parsePromptFromBody - parses prompt text from GET response
 * @param {string} config.courseRequiredMsg - error shown when no course selected
 * @param {string} config.loginRequiredMsg - error shown when not logged in
 * @param {string} config.overlayFetchText - loading text while fetching quizzes
 * @param {string} config.cardIdPrefix - prefix for QuizCard id field
 */
export function useAnalysisPage({
  apiQuizzesUrlFn,
  apiPromptUrl,
  promptBodyKey,
  parsePromptFromBody,
  courseRequiredMsg,
  loginRequiredMsg,
  overlayFetchText,
  cardIdPrefix,
  scopeKey,
}) {
  const authStore = useAuthStore();

  const canEditRules = computed(() => {
    const t = Number(authStore.user?.user_type);
    return t === 1 || t === 2;
  });

  function md(s) {
    return renderMarkdownToSafeHtml(s);
  }

  function weaknessScalarToMdHtml(val) {
    if (val == null) return '';
    if (typeof val === 'string') return renderMarkdownToSafeHtml(val);
    try {
      return renderMarkdownToSafeHtml('```json\n' + JSON.stringify(val, null, 2) + '\n```');
    } catch {
      return renderMarkdownToSafeHtml(String(val));
    }
  }

  // ── state ──────────────────────────────────────────────────────────────────

  const items = ref([]);
  const quizCardUi = ref([]);
  const weaknessReport = ref('');
  const loading = ref(false);
  const error = ref('');
  const analysisLoadedOnce = ref(false);

  const promptText = ref('');
  const promptBaseline = ref('');
  const promptSectionLoading = ref(false);
  const promptSaving = ref(false);

  // ── overlay ────────────────────────────────────────────────────────────────

  const overlayBlocking = computed(
    () => loading.value || promptSectionLoading.value || promptSaving.value,
  );

  const overlayLoadingText = computed(() => {
    if (loading.value) return overlayFetchText;
    if (promptSaving.value) return '儲存分析規則中...';
    if (promptSectionLoading.value) return '載入分析規則中...';
    return '載入中...';
  });

  // ── helpers ────────────────────────────────────────────────────────────────

  const resolvedScopeKey = scopeKey ?? COURSE_SCOPE_KEYS.EXAM;

  function hasSelectedCourse() {
    return authStore.getCourseForScope(resolvedScopeKey)?.course_id != null;
  }

  async function parseFetchErrorMessage(res, fallback) {
    let msg = fallback;
    try {
      const body = await res.json();
      if (body.detail) msg = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    return msg;
  }

  // ── prompt setting ─────────────────────────────────────────────────────────

  async function fetchPromptSetting() {
    const personId = authStore.user?.person_id;
    if (!personId) return;
    if (!hasSelectedCourse()) {
      promptText.value = '';
      promptBaseline.value = '';
      return;
    }
    promptSectionLoading.value = true;
    try {
      const res = await loggedFetch(apiPromptUrl, {
        method: 'GET',
        headers: { 'X-Person-Id': String(personId) },
      });
      if (res.ok) {
        const next = parsePromptFromBody(await res.json());
        promptText.value = next;
        promptBaseline.value = next;
      }
    } catch {
      // keep editor blank
    } finally {
      promptSectionLoading.value = false;
    }
  }

  // ── fetch quizzes & report ─────────────────────────────────────────────────

  async function runAnalysisFetch({ manageLoading = true } = {}) {
    const personId = authStore.user?.person_id;
    if (!personId) { error.value = loginRequiredMsg; return; }
    if (!hasSelectedCourse()) { error.value = courseRequiredMsg; return; }
    if (manageLoading) loading.value = true;
    error.value = '';
    analysisLoadedOnce.value = true;
    try {
      const url = apiQuizzesUrlFn(personId);
      const res = await loggedFetch(url, {
        method: 'GET',
        headers: { 'X-Person-Id': String(personId) },
      });
      if (!res.ok) {
        throw new Error(await parseFetchErrorMessage(res, res.statusText || '無法載入答題資料'));
      }
      const data = await res.json();
      const exams = normalizeAnalysisQuizzesListResponse(data);
      items.value = exams.flatMap((parent) => {
        const quizzes = mergeQuizzesWithTopLevelAnswers(parent);
        const examLabel = parent.tab_name ?? parent.exam_name ?? parent.rag_name ?? parent.exam_tab_id ?? '';
        const examTabId = parent.exam_tab_id ?? parent.test_tab_id;
        const examId = parent.exam_id ?? parent.test_id;
        const ragTabId = parent.rag_tab_id;
        const ragId = parent.rag_id ?? parent.id;
        return quizzes.map((q) => ({
          ...q,
          exam_name: q.exam_name ?? examLabel,
          exam_tab_id: q.exam_tab_id ?? examTabId,
          exam_id: q.exam_id ?? examId,
          rag_tab_id: q.rag_tab_id ?? ragTabId,
          rag_id: q.rag_id ?? q.ragId ?? ragId,
        }));
      });
      weaknessReport.value =
        data?.weakness_report != null && String(data.weakness_report).trim() !== ''
          ? String(data.weakness_report).trim()
          : '';
    } catch (err) {
      error.value = err.message || '無法載入分析資料';
      items.value = [];
      weaknessReport.value = '';
    } finally {
      if (manageLoading) loading.value = false;
    }
  }

  async function fetchAnalysisOnly() {
    await runAnalysisFetch({ manageLoading: true });
  }

  // ── prompt derived state ───────────────────────────────────────────────────

  const promptDirty = computed(
    () => String(promptText.value ?? '') !== String(promptBaseline.value ?? ''),
  );

  const canStartFromSavedRules = computed(
    () =>
      !promptDirty.value
      && !!authStore.user?.person_id
      && hasSelectedCourse()
      && !promptSectionLoading.value
      && !loading.value
      && !promptSaving.value,
  );

  const canSaveAndStart = computed(
    () =>
      promptDirty.value
      && !!authStore.user?.person_id
      && hasSelectedCourse()
      && !promptSectionLoading.value
      && !loading.value
      && !promptSaving.value,
  );

  /** 稿頁「開始分析」：常駐顯示；loading 或不可送出時 disabled（對齊 create-exam-bank 開始出題） */
  const analysisStartButtonDisabled = computed(
    () =>
      !authStore.user?.person_id
      || !hasSelectedCourse()
      || promptSectionLoading.value
      || loading.value
      || promptSaving.value,
  );

  function resetPromptToBaseline() {
    promptText.value = String(promptBaseline.value ?? '');
  }

  async function startAnalysisFromRulesEditor() {
    if (!canEditRules.value) return;
    const personId = authStore.user?.person_id;
    if (!personId) { error.value = '請先登入'; return; }
    if (!hasSelectedCourse()) { error.value = courseRequiredMsg; return; }
    error.value = '';
    if (promptDirty.value) {
      promptSaving.value = true;
      try {
        const res = await loggedFetch(apiPromptUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Person-Id': String(personId) },
          body: JSON.stringify({ [promptBodyKey]: promptText.value ?? '' }),
        });
        if (!res.ok) {
          error.value = await parseFetchErrorMessage(res, '儲存分析規則失敗');
          return;
        }
        promptBaseline.value = String(promptText.value ?? '');
      } catch (e) {
        error.value = e?.message ?? '無法連線';
        return;
      } finally {
        promptSaving.value = false;
      }
    }
    await runAnalysisFetch({ manageLoading: true });
  }

  // ── rules modal (read-only view) ───────────────────────────────────────────

  const analysisRulesModalOpen = ref(false);
  const analysisRulesModalLoading = ref(false);
  const analysisRulesModalRaw = ref('');

  const analysisRulesModalHtml = computed(() => {
    const raw = String(analysisRulesModalRaw.value ?? '');
    return raw.trim() !== '' ? renderMarkdownToSafeHtml(raw) : '';
  });

  const analysisRulesSnapshotTrimmed = computed(() =>
    String(promptText.value ?? '').trim(),
  );

  async function fetchRulesForModal() {
    const personId = authStore.user?.person_id;
    if (!personId || !hasSelectedCourse()) {
      analysisRulesModalRaw.value = '';
      return;
    }
    analysisRulesModalLoading.value = true;
    promptSectionLoading.value = true;
    try {
      const res = await loggedFetch(apiPromptUrl, {
        method: 'GET',
        headers: { 'X-Person-Id': String(personId) },
      });
      analysisRulesModalRaw.value = res.ok ? parsePromptFromBody(await res.json()) : '';
    } catch {
      analysisRulesModalRaw.value = '';
    } finally {
      analysisRulesModalLoading.value = false;
      promptSectionLoading.value = false;
    }
  }

  async function openRulesModal() {
    analysisRulesModalOpen.value = true;
    if (analysisRulesSnapshotTrimmed.value !== '') {
      analysisRulesModalRaw.value = promptText.value;
      analysisRulesModalLoading.value = false;
      return;
    }
    await fetchRulesForModal();
  }

  function closeRulesModal() {
    analysisRulesModalOpen.value = false;
  }

  // ── prompt edit modal ──────────────────────────────────────────────────────

  const editModalOpen = ref(false);
  const editModalDraft = ref('');

  const editModalSavingDisabled = computed(
    () => promptSectionLoading.value || loading.value || promptSaving.value,
  );

  const editModalResetDisabled = computed(() => {
    if (editModalSavingDisabled.value) return true;
    return String(editModalDraft.value ?? '') === String(promptBaseline.value ?? '');
  });

  function openEditModal() {
    if (editModalSavingDisabled.value) return;
    editModalDraft.value = String(promptText.value ?? '');
    editModalOpen.value = true;
  }

  function closeEditModal() {
    editModalOpen.value = false;
    editModalDraft.value = '';
  }

  function resetEditModalDraft() {
    editModalDraft.value = String(promptBaseline.value ?? '');
  }

  function applyEditModal() {
    promptText.value = editModalDraft.value;
    closeEditModal();
  }

  // ── watch: reset on user / course change ───────────────────────────────────

  watch(
    () => [authStore.user?.person_id, authStore.getCourseForScope(resolvedScopeKey)?.course_id],
    ([pid, courseId]) => {
      analysisLoadedOnce.value = false;
      items.value = [];
      weaknessReport.value = '';
      error.value = '';
      if (pid && courseId != null) {
        fetchPromptSetting();
      } else {
        promptText.value = '';
        promptBaseline.value = '';
      }
    },
    { immediate: true },
  );

  // ── report parsing ─────────────────────────────────────────────────────────

  function extractJsonFromReport(text) {
    if (!text || typeof text !== 'string') return null;
    let t = text.trim();
    if (t.startsWith('```')) {
      const endFence = t.indexOf('\n```');
      const body =
        endFence >= 0
          ? t.slice(t.indexOf('\n') + 1, endFence)
          : t.replace(/^```\w*\n?/, '').replace(/\n?```\s*$/, '');
      t = body.trim();
    }
    if (!t.startsWith('{')) return null;
    try {
      const obj = JSON.parse(t);
      return obj && typeof obj === 'object' ? obj : null;
    } catch {
      return null;
    }
  }

  const reportParsed = computed(() => extractJsonFromReport(weaknessReport.value));

  const reportSections = computed(() => {
    const obj = reportParsed.value;
    return obj ? Object.keys(obj) : [];
  });

  // ── item → QuizCard conversion ─────────────────────────────────────────────

  function normalizeExamQuizRate(v) {
    const n = Number(v);
    if (n === 1 || n === -1 || n === 0) return n;
    return 0;
  }

  function extractQuizUserPromptFromRow(raw) {
    if (!raw || typeof raw !== 'object') return '';
    for (const key of [
      'quiz_user_prompt_text', 'quizUserPromptText',
      'user_prompt_text', 'userPromptText',
      'prompt_text', 'promptText',
    ]) {
      const val = raw[key];
      if (val != null && String(val).trim()) return String(val);
    }
    return '';
  }

  function extractAnswerUserPromptFromRow(raw) {
    if (!raw || typeof raw !== 'object') return '';
    for (const key of [
      'answer_user_prompt_text', 'answerUserPromptText',
      'critique_user_prompt_instruction',
    ]) {
      const val = raw[key];
      if (val != null && String(val).trim()) return String(val);
    }
    return '';
  }

  function examQuizDisplayNameFromRow(quiz) {
    if (!quiz || typeof quiz !== 'object') return '';
    const direct = quiz.quiz_name ?? quiz.quizName ?? quiz.QuizName;
    if (direct != null && String(direct).trim() !== '') return String(direct).trim();
    const meta = quiz.quiz_metadata ?? quiz.quizMetadata;
    if (meta != null && typeof meta === 'object') {
      const mn = meta.quiz_name ?? meta.quizName;
      if (mn != null && String(mn).trim() !== '') return String(mn).trim();
    }
    return '';
  }

  function quizTypeLabel(quiz) {
    return examQuizDisplayNameFromRow(quiz) || '—';
  }

  function unitLabelForItem(item) {
    const v = item?.rag_name ?? item?.unit_name ?? item?.exam_name ?? '';
    const t = String(v).trim();
    return t || '—';
  }

  function itemUnitType(item) {
    const ut = item?.unit_type ?? item?.unitType;
    if (ut == null || ut === '') return null;
    const n = Number(ut);
    return Number.isFinite(n) ? n : null;
  }

  function itemIsFollowUpQuiz(item) {
    return examQuizApiRowIsFollowUp(item);
  }

  function itemToQuizCard(item, index) {
    const answers = Array.isArray(item?.answers) ? item.answers : [];
    const latestAnswer = answers.length > 0 ? answers[answers.length - 1] : null;
    const latestSubmitted =
      latestAnswer?.quiz_answer ??
      latestAnswer?.student_answer ??
      latestAnswer?.answer_text ??
      latestAnswer?.content ??
      (item?.answer_content != null && String(item.answer_content).trim() !== ''
        ? String(item.answer_content)
        : null);
    const quiz_answer =
      latestSubmitted != null && String(latestSubmitted).trim() !== ''
        ? String(latestSubmitted)
        : '';
    const gradingResult = latestAnswer
      ? (formatGradingResult(JSON.stringify(latestAnswer)) ||
          (latestSubmitted != null && String(latestSubmitted).trim() !== '' ? '已批改' : ''))
      : '';
    const quizId = item?.exam_quiz_id ?? item?.quiz_id ?? null;
    const answerId = latestAnswer?.exam_answer_id ?? latestAnswer?.answer_id ?? null;
    const rid = item?.rag_id ?? item?.ragId ?? null;
    const ragIdStr = rid != null && String(rid).trim() !== '' ? String(rid) : null;
    const ragName = (item?.rag_name ?? item?.unit_name ?? item?.exam_name ?? '').trim() || null;
    return {
      id: `${cardIdPrefix}-${quizId ?? item?.rag_quiz_id ?? index}-${index}`,
      quiz: item?.quiz_content ?? item?.quiz ?? item?.question ?? '',
      hint: item?.quiz_hint ?? item?.hint ?? '',
      referenceAnswer:
        item?.quiz_answer_reference ?? item?.quiz_reference_answer ?? item?.reference_answer ?? '',
      sourceFilename: item?.file_name ?? null,
      ragName,
      rag_id: ragIdStr,
      rag_unit_id:
        item?.rag_unit_id != null && item?.rag_unit_id !== '' ? Number(item.rag_unit_id) : null,
      rag_quiz_id:
        item?.rag_quiz_id != null && item?.rag_quiz_id !== '' ? Number(item.rag_quiz_id) : null,
      quiz_answer,
      hintVisible: false,
      referenceAnswerVisible: false,
      quiz_rate: normalizeExamQuizRate(item?.quiz_rate),
      rateError: '',
      confirmed: !!latestAnswer,
      gradingResult,
      gradingResponseJson: latestAnswer ?? null,
      generateQuizResponseJson: null,
      exam_quiz_id: quizId,
      answer_id: answerId,
      gradingPrompt: extractAnswerUserPromptFromRow(item).trim(),
      quiz_user_prompt_text: extractQuizUserPromptFromRow(item).trim(),
      examQuizDisplayName: examQuizDisplayNameFromRow(item),
    };
  }

  function toggleHint(card) {
    if (!card || typeof card !== 'object') return;
    card.hintVisible = !card.hintVisible;
  }

  function toggleReferenceAnswer(card) {
    if (!card || typeof card !== 'object') return;
    card.referenceAnswerVisible = !card.referenceAnswerVisible;
  }

  watch(
    items,
    (list) => {
      quizCardUi.value = list.map((it, i) => itemToQuizCard(it, i));
    },
    { immediate: true },
  );

  function slotQuizBodyTrim(idx) {
    return String(quizCardUi.value[idx]?.quiz ?? '').trim();
  }

  return {
    authStore,
    canEditRules,
    md,
    weaknessScalarToMdHtml,
    items,
    quizCardUi,
    weaknessReport,
    loading,
    error,
    analysisLoadedOnce,
    promptText,
    promptSectionLoading,
    promptSaving,
    overlayBlocking,
    overlayLoadingText,
    hasSelectedCourse,
    fetchAnalysisOnly,
    startAnalysisFromRulesEditor,
    promptDirty,
    canStartFromSavedRules,
    canSaveAndStart,
    analysisStartButtonDisabled,
    resetPromptToBaseline,
    analysisRulesModalOpen,
    analysisRulesModalLoading,
    analysisRulesModalHtml,
    analysisRulesSnapshotTrimmed,
    openRulesModal,
    closeRulesModal,
    editModalOpen,
    editModalDraft,
    editModalSavingDisabled,
    editModalResetDisabled,
    openEditModal,
    closeEditModal,
    resetEditModalDraft,
    applyEditModal,
    reportParsed,
    reportSections,
    quizTypeLabel,
    unitLabelForItem,
    itemUnitType,
    itemIsFollowUpQuiz,
    toggleHint,
    toggleReferenceAnswer,
    slotQuizBodyTrim,
  };
}
