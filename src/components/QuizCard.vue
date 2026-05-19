<script setup>
import { computed, ref } from 'vue';
import EnglishExamMarkdownEditor from './EnglishExamMarkdownEditor.vue';
import QuizHistoryModal from './QuizHistoryModal.vue';
import { renderMarkdownToSafeHtml } from '../utils/renderMarkdown.js';

/**
 * QuizCard - 單一題目卡片
 *
 * 顯示：題號（可隱藏）、題目內容（Markdown，marked + DOMPurify）、提示／參考答案（有內容時透過「顯示提示」「顯示參考答案」切換顯示）、答案區（作答輸入預設空白）、批改結果；hideGradingPrompt 時批改結果區塊最底部設「批改規則」pill（開 Modal；無快照時顯示「—」）。
 * 可輸入答案並按「開始批改」送出評分；**測驗頁**（hideGradingPrompt）在已批改（card.confirmed）後不顯示此鈕；建立題庫等未帶 hideGradingPrompt 時仍顯示按鈕群。
 * 單元題區塊內「儲存並開始批改／開始批改」（llm-grade／llm-grade-db）按鈕啟停用對齊「儲存並產生題目／產生題目」：批改規則須相對 baseline 已改動才可儲存送出；載入過／已同步之規則可「開始批改」；並檢 rag_quiz_id。
 * 「答案」不因 rag_id 與題庫不一致而停用（仍可鍵入；並顯示警示）；**測驗頁（hideGradingPrompt）在有批改結果文字後答案改為停用**（再次送出批改時會先清空結果）；其餘情境已批改後 textarea 仍可編輯（僅 readOnlyAnswer／分析頁為靜態）。
 * **RAG 題庫且 card.rag_quiz_for_exam === true（測驗用）時**：批改規則改為預覽唯讀（黑底預覽），與建立頁出題規則一致；**不顯示「儲存並開始批改」**（仍可依後端既有規則使用「開始批改」）。
 * 供 CreateExamQuizBankPage、ExamPage 使用；評分邏輯由父層透過 useQuizGrading 處理。
 *
 * card 物件需含：quiz, hint, referenceAnswer, quiz_answer（使用者作答）, gradingPrompt（可選；Markdown；**RAG** 批改 POST 對應 answer_user_prompt_text；**Exam** 時批改指引仍不由前端於 POST 送出，欄位可編輯以相容），confirmed, gradingResult, ragName, rag_id（可選，供與 currentRagId 比對是否可作答）, id；測驗頁另含 exam_quiz_id、quiz_rate、rateError、quiz_user_prompt_text（可選；POST /exam/tab/quiz/llm-generate 回傳之出題模板快照，與 gradingPrompt 一併在 hideGradingPrompt 時唯讀顯示）；RAG 題庫頁／單元題另含 rag_quiz_id、rag_tab_id、rag_unit_id（狀態／其他 API）、rag_quiz_for_exam（已標為測驗用試題；for-exam 僅送 rag_quiz_id／for_exam）。designEmbedded：true 時不套 rounded-4 深灰外框（由父層區塊包住）；稿頁「測試題目」每題一區塊時應為 false。hideRagQuizForExamToolbar：true 時不在卡內顯示「設為測驗用」（由建立頁置於題型區塊最下方（題目卡片之後）常駐；未出題或未批改為 disabled）。showExamRating：測驗頁專用，顯示讚／差（32×32 透明底；未選 fa-regular gray-1、選中 fa-solid 黑色）並 emit rate-quiz。questionHintOnly：建立英文測驗題庫用，僅顯示「第 N 題」、題目、提示（與 designUi 相同 class），不顯示參考答案、作答、批改。hideGradingPrompt／hideGradingResult：測驗頁可隱藏批改輸入／結果區（仍可送出批改）。readOnlyAnswer：作答弱點分析／學生作答分析等純顯示頁，答案區唯讀、不顯示「開始批改」。
 */
const props = defineProps({
  /** 題目資料（含題目、提示、答案、批改結果等） */
  card: { type: Object, required: true },
  /** 題號（從 1 開始，用於顯示「第 N 題」） */
  slotIndex: { type: Number, required: true },
  /** 目前分頁／試題用 RAG 的 rag_id；與 card.rag_id 皆知且不同時仍顯示警示（答案欄不依此停用）；若需略過請用 skipRagMismatchGuard */
  currentRagId: { type: [String, Number], default: null },
  /** 為 true 時略過上述 rag_id 比對（介面稿頁用） */
  skipRagMismatchGuard: { type: Boolean, default: false },
  /** 與 UI 元件參考按鈕／字色一致（建立測驗題庫設計稿用） */
  designUi: { type: Boolean, default: false },
  /** 稿頁「測試題目」外層已包 rounded-4 深灰塊時為 true，本卡不再重複外框 */
  designEmbedded: { type: Boolean, default: false },
  /** 正在送出「開始批改」（全螢幕 LoadingOverlay 由父層顯示；按鈕僅停用） */
  gradeSubmitting: { type: Boolean, default: false },
  /** 測驗頁：顯示題目讚／差（32×32 my-btn-circle · 透明底；未選 fa-regular my-color-gray-1、選中 fa-solid my-color-black；與 POST /exam/tab/quiz/rate 搭配；需 designUi） */
  showExamRating: { type: Boolean, default: false },
  /** true 時讚／差按鈕停用且不 emit（作答弱點分析等唯讀頁與測驗題目區版面一致用） */
  examRatingReadOnly: { type: Boolean, default: false },
  /** 建立英文測驗題庫：僅題目＋提示，版式與本元件 designUi 相同，其餘區塊隱藏 */
  questionHintOnly: { type: Boolean, default: false },
  /** 父層已顯示「第 N 題」時，隱藏本卡題號（避免重複） */
  hideSlotIndex: { type: Boolean, default: false },
  /** 測驗頁：隱藏「批改規則」Markdown 區（仍可依既有 gradingPrompt 送出） */
  hideGradingPrompt: { type: Boolean, default: false },
  /** 測驗頁：隱藏「批改結果」區塊 */
  hideGradingResult: { type: Boolean, default: false },
  /** 建立測驗題庫（單元題）：顯示「開始批改」（POST llm-grade-db，使用後端已存批改規則）；僅與顯示「批改規則」編輯區時併用 */
  showRagGradeDbButton: { type: Boolean, default: false },
  /** true 時不在本卡「批改結果」下方顯示 for-exam 鈕（改由父層例如題型區塊下方置中顯示） */
  hideRagQuizForExamToolbar: { type: Boolean, default: false },
  /** true 時答案區唯讀、不顯示「開始批改」（仍顯示批改結果區；與 hideGradingPrompt 併用於分析頁） */
  readOnlyAnswer: { type: Boolean, default: false },
  /**
   * 建立題庫頁覆寫「儲存並開始批改」是否可按（對齊 canEnableUnitQuizGenerate）；省略時用元件內 gradingPrompt／baseline 判斷。
   */
  gradeSaveAllowed: { type: Boolean, default: undefined },
  /**
   * 建立題庫頁覆寫「開始批改」(llm-grade-db) 是否可按（對齊 canEnableUnitQuizGenerateFromDb）；省略時用元件內判斷。
   */
  gradeDbAllowed: { type: Boolean, default: undefined },
  /**
   * 測驗頁：此題之前的出題幹（字串陣列）；有傳入時於「開始批改」上方顯示小按鈕。
   */
  examQuizHistoryList: { type: Array, default: undefined },
  /** 測驗頁：之前的出題 Modal 顯示用單元名稱 */
  examQuizHistoryUnitLabel: { type: String, default: '' },
  /** 測驗頁：之前的出題 Modal 顯示用題型名稱 */
  examQuizHistoryQuizTypeLabel: { type: String, default: '' },
  /** 測驗頁：追問出題時 Modal 顯示問答四段式 */
  examQuizHistoryIsFollowup: { type: Boolean, default: false },
  /** 測驗頁：是否允許開啟「之前的出題」（未選題型時 false） */
  examQuizHistoryOpenAllowed: { type: Boolean, default: true },
});

const emit = defineEmits([
  'toggle-hint',
  'toggle-reference-answer',
  'confirm-answer',
  'confirm-grade-db',
  'update:quiz_answer',
  'update:grading_prompt',
  'reset-grading-prompt',
  'rate-quiz',
  'mark-rag-quiz-for-exam',
]);

/**
 * rag_id 與目前題庫不一致時仍顯示提示，但作答框依需求保持可編輯（不依此停用 input）。
 */
const ragMismatchWarning = computed(() => {
  if (props.skipRagMismatchGuard) return false;
  const cur =
    props.currentRagId != null && String(props.currentRagId).trim() !== ''
      ? String(props.currentRagId).trim()
      : '';
  const q =
    props.card?.rag_id != null && String(props.card.rag_id).trim() !== ''
      ? String(props.card.rag_id).trim()
      : '';
  if (!cur || !q) return false;
  return cur !== q;
});

const cardMarkedForExam = computed(
  () => props.card?.rag_quiz_for_exam === true || props.card?.rag_quiz_for_exam === 1,
);

/** 有後端／驗證回傳文字且非送出中時才顯示「批改結果」區塊（不預留空白、不顯示尚未批改） */
const showGradingResultSection = computed(
  () =>
    !props.hideGradingResult &&
    !props.questionHintOnly &&
    !props.gradeSubmitting &&
    String(props.card?.gradingResult ?? '').trim() !== ''
);

const showRagQuizForExamToolbar = computed(() => {
  if (props.hideRagQuizForExamToolbar) return false;
  if (!props.showRagQuizForExamAction || props.questionHintOnly) return false;
  if (!cardMarkedForExam.value) {
    if (!showGradingResultSection.value) return false;
  }
  const raw = props.card?.rag_quiz_id ?? props.card?.quiz_id;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1;
});

/** 測驗頁（hideGradingPrompt）：已有批改紀錄／結果後不再顯示「開始批改」；建立題庫頁不帶 hideGradingPrompt，仍可再次批改 */
const showStartGradeButton = computed(
  () =>
    !props.readOnlyAnswer
    && !(props.hideGradingPrompt && props.card?.confirmed),
);

/** 題幹有文字才顯示作答／「開始批改」等（後端空白列或未產出題文時不應出現批改流程） */
const hasQuizBody = computed(() => String(props.card?.quiz ?? '').trim() !== '');

/** 無提示內容時不顯示「顯示提示」與空白提示區 */
const hasHintText = computed(() => String(props.card?.hint ?? '').trim() !== '');

/** 測驗頁 hideGradingPrompt：顯示 llm-generate／Exam_Quiz 之出題模板（quiz_user_prompt_text） */
const quizUserPromptSnapshotTrimmed = computed(() => {
  const c = props.card;
  if (!c || typeof c !== 'object') return '';
  const raw = c.quiz_user_prompt_text ?? c.quizUserPromptText;
  return String(raw ?? '').trim();
});

/** 測驗頁 hideGradingPrompt：批改模板對應 gradingPrompt（answer_user_prompt_text） */
const answerUserPromptSnapshotTrimmed = computed(() =>
  String(props.card?.gradingPrompt ?? '').trim(),
);

const promptModalKind = ref('');
const quizHistoryModalOpen = ref(false);

const promptModalTitle = computed(() =>
  promptModalKind.value === 'question' ? '出題規則' : '批改規則'
);

/** 測驗頁：可查看此題之前的出題（批改後仍保留；須父層傳入 history 相關 props） */
const showQuizHistoryPreviewButton = computed(
  () => props.hideGradingPrompt && props.examQuizHistoryList !== undefined,
);

const examQuizHistoryButtonDisabled = computed(
  () => props.examQuizHistoryOpenAllowed === false,
);

const quizHistoryModalList = computed(() => {
  if (!Array.isArray(props.examQuizHistoryList)) return [];
  return props.examQuizHistoryList
    .map((s) => String(s ?? '').trim())
    .filter((s) => s !== '');
});

function openQuizHistoryModal() {
  quizHistoryModalOpen.value = true;
}


/** Modal 內文：用題卡完整字串跑 Markdown（與 EnglishExamMarkdownEditor 預覽同源），勿先行 trim 以免破壞程式碼區塊 */
const promptModalMarkdownSource = computed(() => {
  const c = props.card;
  if (!c || typeof c !== 'object') return '';
  if (promptModalKind.value === 'question') {
    const raw = c.quiz_user_prompt_text ?? c.quizUserPromptText;
    return raw != null ? String(raw) : '';
  }
  if (promptModalKind.value === 'grading') {
    return String(c.gradingPrompt ?? '');
  }
  return '';
});

const promptModalHtml = computed(() => renderMarkdownToSafeHtml(promptModalMarkdownSource.value));

/** 題幹以 Markdown 渲染（與出題／批改規則 modal 同 pipeline：marked + DOMPurify） */
const quizMarkdownHtml = computed(() => renderMarkdownToSafeHtml(props.card?.quiz));

/** 有參考答案文字時才顯示「參考答案」區塊（版式與題目區一致） */
const hasReferenceAnswerText = computed(
  () => String(props.card?.referenceAnswer ?? '').trim() !== '',
);

const referenceAnswerMarkdownHtml = computed(() =>
  renderMarkdownToSafeHtml(props.card?.referenceAnswer),
);

/** designUi：題幹正下方工具列左側是否有「出題規則／顯示提示／顯示參考答案」任一（與測驗頁同一列、gap-1 緊貼題目區） */
const stemToolbarLeftPills = computed(
  () =>
    (props.hideGradingPrompt && quizUserPromptSnapshotTrimmed.value !== '')
    || hasHintText.value
    || (!props.questionHintOnly && hasReferenceAnswerText.value),
);

const showDesignStemToolbarRow = computed(
  () => props.showExamRating || stemToolbarLeftPills.value,
);

const designStemToolbarJustifyClass = computed(() => {
  if (props.showExamRating && stemToolbarLeftPills.value) return 'justify-content-between';
  if (props.showExamRating) return 'justify-content-end';
  return 'justify-content-start';
});

function openPromptModal(kind) {
  if (kind === 'question' && quizUserPromptSnapshotTrimmed.value === '') return;
  if (kind === 'grading' && answerUserPromptSnapshotTrimmed.value === '') return;
  promptModalKind.value = kind;
}

function closePromptModal() {
  promptModalKind.value = '';
}

/**
 * designUi 時頂區為 flex gap-4 的子項之一；若第 N 題隱藏（如測驗頁、建立題庫 embedded），勿渲染空白包住器，否則與「題目」區之間會多出一格 gap。
 */
const showQuizCardHeaderBand = computed(
  () => !props.designUi || !props.hideSlotIndex,
);

/** 建立測驗題庫頁在 card 上帶入 baseline；未帶入時維持原僅檢查非空即可送出 */
function cardHasGradeBaselines(card) {
  if (!card || typeof card !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(card, 'gradingPromptBaseline')
    || Object.prototype.hasOwnProperty.call(card, 'quizAnswerBaseline')
  );
}

const gradingSectionDirty = computed(() => {
  const c = props.card;
  if (!c || typeof c !== 'object') return true;
  if (!cardHasGradeBaselines(c)) return true;
  return (
    String(c.gradingPrompt ?? '') !== String(c.gradingPromptBaseline ?? '')
    || String(c.quiz_answer ?? '') !== String(c.quizAnswerBaseline ?? '')
  );
});

/**
 * 與題庫頁 canEnableUnitQuizGenerate 對齊：批改規則（gradingPrompt vs baseline）
 * — 對應 isQuizUserPromptDirty（quizUserPromptText vs quizUserPromptBaseline）。
 */
const isGradingPromptDirtyVsBaseline = computed(() => {
  const c = props.card;
  if (!c || typeof c !== 'object') return false;
  return String(c.gradingPrompt ?? '') !== String(c.gradingPromptBaseline ?? '');
});

/**
 * 對應 canEnableUnitQuizGenerateFromDb 之「規則與後端對齊」判斷：未改動批改規則才可按「開始批改」。
 */
const isGradingPromptSyncedWithBaseline = computed(
  () => !isGradingPromptDirtyVsBaseline.value,
);

/**
 * hideGradingPrompt（如測驗頁）時仍可依「規則或答案是否相對 baseline 曾改過」決定可否再送批改；
 * 顯示批改規則編輯區時則對齊出題區邏輯，僅以批改規則 dirty 為準（與 isQuizUserPromptDirty 對稱）。
 */
const blockExamStyleGradeResubmitUntilDirty = computed(
  () =>
    props.hideGradingPrompt
    && props.card?.confirmed === true
    && !gradingSectionDirty.value,
);

/** 已儲存之 rag_quiz_id（對應 canEnableUnitQuizGenerateFromDb 之 rag quiz id） */
const ragQuizIdLooksValid = computed(() => {
  const raw = props.card?.rag_quiz_id ?? props.card?.quiz_id;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1;
});

const gradingPromptNonEmptyTrimmed = computed(() =>
  String(props.card?.gradingPrompt ?? '').trim() !== '',
);

/**
 * 「儲存並開始批改」— 對應「儲存並產生題目」(canEnableUnitQuizGenerate)；建立題庫頁可經 gradeSaveAllowed 與父層 canEnableUnitQuizGrade 綁定。
 */
const saveAndGradeButtonDisabled = computed(() => {
  if (props.gradeSubmitting) return true;
  if (props.gradeSaveAllowed !== undefined) return !props.gradeSaveAllowed;
  return (
    !gradingPromptNonEmptyTrimmed.value
    || !isGradingPromptDirtyVsBaseline.value
  );
});

/**
 * 「開始批改」(llm-grade-db) — 對應「產生題目」(canEnableUnitQuizGenerateFromDb)；建立題庫頁可經 gradeDbAllowed 與父層 canEnableUnitQuizGradeDb 綁定。
 */
const ragGradeDbButtonDisabled = computed(() => {
  if (!props.showRagGradeDbButton || props.gradeSubmitting) return true;
  if (props.gradeDbAllowed !== undefined) return !props.gradeDbAllowed;
  return (
    props.card?.hasUsedSaveAndGradeOnce !== true
    || !ragQuizIdLooksValid.value
    || !isGradingPromptSyncedWithBaseline.value
  );
});

/**
 * hideGradingPrompt 時唯一「開始批改」鈕（測驗頁 POST llm-grade）：body 不含批改模板，後端自 Rag_Quiz 讀取，故不依賴 gradingPrompt 是否在前端非空。
 * confirmed 後須規則或答案相對 baseline 至少一項已改過才可再送出（有設定 baseline 時）。
 */
const standaloneStartGradeButtonDisabled = computed(
  () =>
    props.gradeSubmitting
    || blockExamStyleGradeResubmitUntilDirty.value,
);

const gradingPromptResetDisabled = computed(
  () =>
    cardMarkedForExam.value
    || props.gradeSubmitting
    || String(props.card?.gradingPrompt ?? '')
      === String(props.card?.gradingPromptBaseline ?? ''),
);

/** 測驗頁（hideGradingPrompt）：批改結果區有文字時鎖定答案；送出批改時父層 gradeSubmitting 與 submitGrade 清空結果後恢復可編輯 */
const quizAnswerFieldDisabled = computed(
  () =>
    props.gradeSubmitting
    || (
      props.hideGradingPrompt
      && String(props.card?.gradingResult ?? '').trim() !== ''
    ),
);
</script>

<template>
  <div>
    <Teleport to="body">
      <div
        v-if="promptModalKind"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`quiz-card-prompt-modal-title-${card.id}`"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                :id="`quiz-card-prompt-modal-title-${card.id}`"
                class="modal-title my-color-black"
              >{{ promptModalTitle }}</h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closePromptModal"
              />
            </div>
            <div class="modal-body p-0 lh-base" style="max-height: 70vh; overflow: auto;">
              <div
                v-if="promptModalHtml"
                class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                v-html="promptModalHtml"
              />
              <span
                v-else
                class="my-font-md-400 my-color-black"
              >—</span>
            </div>
          </div>
        </div>
      </div>
      <QuizHistoryModal
        v-model="quizHistoryModalOpen"
        :unit-label="examQuizHistoryUnitLabel"
        :quiz-type-label="examQuizHistoryQuizTypeLabel"
        :is-followup="examQuizHistoryIsFollowup"
        :history-list="quizHistoryModalList"
        :title-id="`quiz-card-history-modal-title-${card.id}`"
      />
    </Teleport>
    <div
      :class="[
        designUi
          ? (designEmbedded ? 'w-100 min-w-0 mb-0' : 'my-bgcolor-gray-3 rounded-4 p-4 mb-0 w-100 min-w-0')
          : ['my-bgcolor-page-block rounded-3 p-3 p-lg-4', 'mb-4'],
        { 'mt-4': !designUi && slotIndex > 1 },
      ]"
    >
    <div
      class="text-start w-100 min-w-0"
      :class="designUi ? 'd-flex flex-column gap-4' : ''"
    >
      <div
        v-if="showQuizCardHeaderBand"
        :class="designUi ? 'd-flex flex-column gap-3 w-100 min-w-0' : ''"
      >
      <div
        v-if="!hideSlotIndex"
        class="my-font-lg-600 my-color-black"
        :class="designUi ? 'mb-0' : 'mb-3'"
      >第 {{ slotIndex }} 題</div>
      </div>
      <div
        class="w-100 min-w-0"
        :class="designUi ? 'd-flex flex-column gap-1 mb-0' : 'mb-3'"
      >
        <div
          class="d-flex justify-content-between align-items-center gap-2 w-100 min-w-0"
          :class="designUi ? '' : 'mb-1'"
        >
          <div
            :class="designUi ? 'my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0' : 'form-label my-font-sm-600 mb-0 my-color-gray-1'"
          >題目</div>
        </div>
        <div
          class="lh-base mb-0 quiz-card-quiz-stem"
          :class="designUi ? 'form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2' : 'form-control my-input-md my-input-md--on-dark rounded-2 my-form-control-static w-100 min-w-0 px-3 py-2'"
        >
          <div
            v-if="quizMarkdownHtml"
            class="my-markdown-rendered my-font-md-400 my-color-black text-break"
            v-html="quizMarkdownHtml"
          />
          <span
            v-else
            class="my-font-md-400 my-color-black text-break"
          >{{ card.quiz }}</span>
        </div>
        <template v-if="designUi && hasQuizBody">
          <div
            v-if="showDesignStemToolbarRow"
            class="d-flex flex-row flex-wrap align-items-center gap-2 w-100 min-w-0"
            :class="designStemToolbarJustifyClass"
          >
            <div
              v-if="stemToolbarLeftPills"
              class="d-inline-flex flex-wrap align-items-center gap-2 min-w-0"
            >
              <button
                v-if="hideGradingPrompt && quizUserPromptSnapshotTrimmed !== ''"
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
                @click="openPromptModal('question')"
              >
                出題規則
              </button>
              <button
                v-if="hasHintText"
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
                @click="emit('toggle-hint', card)"
              >
                {{ card.hintVisible ? '隱藏提示' : '顯示提示' }}
              </button>
              <button
                v-if="!questionHintOnly && hasReferenceAnswerText"
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
                @click="emit('toggle-reference-answer', card)"
              >
                {{ card.referenceAnswerVisible ? '隱藏參考答案' : '顯示參考答案' }}
              </button>
            </div>
            <div
              v-if="showExamRating"
              class="d-inline-flex justify-content-end align-items-center flex-shrink-0 gap-1"
              role="group"
              aria-label="題目評價"
            >
              <button
                type="button"
                class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle flex-shrink-0 border-0 shadow-none lh-1"
                title="讚"
                :aria-pressed="card.quiz_rate === 1"
                :disabled="examRatingReadOnly"
                @click="!examRatingReadOnly && emit('rate-quiz', 'up')"
              >
                <i
                  class="fa-thumbs-up"
                  :class="card.quiz_rate === 1 ? 'fa-solid my-color-black' : 'fa-regular my-color-gray-1'"
                  aria-hidden="true"
                />
                <span class="visually-hidden">讚</span>
              </button>
              <button
                type="button"
                class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle flex-shrink-0 border-0 shadow-none lh-1"
                title="差"
                :aria-pressed="card.quiz_rate === -1"
                :disabled="examRatingReadOnly"
                @click="!examRatingReadOnly && emit('rate-quiz', 'down')"
              >
                <i
                  class="fa-thumbs-down"
                  :class="card.quiz_rate === -1 ? 'fa-solid my-color-black' : 'fa-regular my-color-gray-1'"
                  aria-hidden="true"
                />
                <span class="visually-hidden">差</span>
              </button>
            </div>
          </div>
          <div
            v-if="showExamRating && card.rateError"
            class="my-font-sm-400 my-color-red text-end mb-0 w-100"
          >
            {{ card.rateError }}
          </div>
          <div
            v-if="hasHintText"
            v-show="card.hintVisible"
            class="w-100 min-w-0 mt-2"
          >
            <div
              class="my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-1"
            >提示</div>
            <div
              class="my-font-sm-400 form-control my-input-md my-input-md--on-dark my-bgcolor-light-gray rounded-2 w-100 min-w-0 px-3 py-2 my-color-gray-4"
            >
              {{ card.hint }}
            </div>
          </div>
          <div
            v-if="!questionHintOnly && hasReferenceAnswerText"
            v-show="card.referenceAnswerVisible"
            class="w-100 min-w-0 mt-2"
          >
            <div
              class="d-flex justify-content-between align-items-center gap-2 w-100 min-w-0 mb-1"
            >
              <div
                class="my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0"
              >參考答案</div>
            </div>
            <div
              class="lh-base mb-0 quiz-card-reference-answer"
              :class="designUi ? 'form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2' : 'form-control my-input-md my-input-md--on-dark rounded-2 my-form-control-static w-100 min-w-0 px-3 py-2'"
            >
              <div
                v-if="referenceAnswerMarkdownHtml"
                class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                v-html="referenceAnswerMarkdownHtml"
              />
              <span
                v-else
                class="my-font-md-400 my-color-black text-break"
              >{{ card.referenceAnswer }}</span>
            </div>
          </div>
        </template>
        <button
          v-else-if="!designUi && hideGradingPrompt && hasQuizBody && quizUserPromptSnapshotTrimmed !== ''"
          type="button"
          class="btn rounded-pill d-inline-flex justify-content-center align-items-center align-self-start flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
          @click="openPromptModal('question')"
        >
          出題規則
        </button>
      </div>
      <div
        v-if="!(designUi && hasQuizBody) && (hasHintText || (!questionHintOnly && hasReferenceAnswerText))"
        class="w-100 min-w-0"
        :class="designUi ? 'd-flex flex-column gap-1 mb-0' : 'mb-3'"
      >
        <div class="d-inline-flex flex-wrap align-items-center gap-2">
          <button
            v-if="hasHintText"
            type="button"
            class="btn rounded-pill d-inline-flex justify-content-center align-items-center align-self-start flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
            style="flex: 0 0 auto;"
            @click="emit('toggle-hint', card)"
          >
            {{ card.hintVisible ? '隱藏提示' : '顯示提示' }}
          </button>
          <button
            v-if="!questionHintOnly && hasReferenceAnswerText"
            type="button"
            class="btn rounded-pill d-inline-flex justify-content-center align-items-center align-self-start flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
            style="flex: 0 0 auto;"
            @click="emit('toggle-reference-answer', card)"
          >
            {{ card.referenceAnswerVisible ? '隱藏參考答案' : '顯示參考答案' }}
          </button>
        </div>
        <div
          v-if="hasHintText"
          v-show="card.hintVisible"
          class="w-100 min-w-0 mt-2"
        >
          <div
            :class="designUi ? 'my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-1' : 'form-label my-font-sm-600 mb-1 my-color-gray-1'"
          >提示</div>
          <div
            class="my-font-sm-400"
            :class="designUi ? 'form-control my-input-md my-input-md--on-dark my-bgcolor-light-gray rounded-2 w-100 min-w-0 px-3 py-2 my-color-gray-4' : 'form-control my-input-md my-input-md--on-dark rounded-2 my-form-control-static w-100 min-w-0 px-3 py-2'"
          >
            {{ card.hint }}
          </div>
        </div>
        <div
          v-if="!questionHintOnly && hasReferenceAnswerText"
          v-show="card.referenceAnswerVisible"
          class="w-100 min-w-0"
          :class="designUi ? '' : 'mt-2'"
        >
          <div
            class="d-flex justify-content-between align-items-center gap-2 w-100 min-w-0"
            :class="designUi ? 'mb-1' : 'mb-1'"
          >
            <div
              :class="designUi ? 'my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0' : 'form-label my-font-sm-600 mb-0 my-color-gray-1'"
            >參考答案</div>
          </div>
          <div
            class="lh-base mb-0 quiz-card-reference-answer"
            :class="designUi ? 'form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2' : 'form-control my-input-md my-input-md--on-dark rounded-2 my-form-control-static w-100 min-w-0 px-3 py-2'"
          >
            <div
              v-if="referenceAnswerMarkdownHtml"
              class="my-markdown-rendered my-font-md-400 my-color-black text-break"
              v-html="referenceAnswerMarkdownHtml"
            />
            <span
              v-else
              class="my-font-md-400 my-color-black text-break"
            >{{ card.referenceAnswer }}</span>
          </div>
        </div>
      </div>
      <!-- 答案、批改規則按鈕與批改結果同欄 gap-1，避免與上方題幹區 gap-4 拉開過遠 -->
      <div
        class="w-100 min-w-0"
        :class="designUi ? 'd-flex flex-column gap-1' : ''"
      >
      <div
        v-if="!questionHintOnly && hasQuizBody"
        class="w-100 min-w-0"
        :class="designUi ? 'd-flex flex-column gap-1 mb-0' : 'mb-3'"
      >
        <div class="d-flex justify-content-between align-items-baseline gap-2" :class="designUi ? '' : 'mb-1'">
          <label
            :for="`quiz-answer-${card.id}`"
            :class="designUi ? 'my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0' : 'form-label my-font-sm-600 mb-0 my-color-gray-1'"
          >答案</label>
          <span
            v-if="!readOnlyAnswer"
            :class="designUi ? 'my-font-sm-400 my-color-gray-4 text-end flex-shrink-0 mb-0' : 'form-text my-font-sm-400 my-color-gray-4 text-end flex-shrink-0 mb-0'"
          >{{ card.quiz_answer.length }} / 2000</span>
        </div>
        <template v-if="readOnlyAnswer">
          <div
            :id="`quiz-answer-${card.id}`"
            class="my-font-sm-400 mb-0"
            :class="designUi ? 'form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2' : 'form-control my-input-md my-input-md--on-dark rounded-2 my-form-control-static w-100 min-w-0 px-3 py-2'"
          >{{ card.quiz_answer }}</div>
        </template>
        <template v-else>
          <textarea
            :id="`quiz-answer-${card.id}`"
            :value="card.quiz_answer"
            class="form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2"
            :disabled="quizAnswerFieldDisabled"
            @input="emit('update:quiz_answer', $event.target.value)"
            rows="4"
            placeholder="請輸入您的答案..."
            maxlength="2000"
          />
        </template>
        <template v-if="!readOnlyAnswer">
          <div
            v-if="ragMismatchWarning"
            :class="designUi ? 'my-font-sm-400 my-color-red mt-1' : 'form-text my-font-sm-400 my-color-red'"
          >此題與目前題庫版本不一致，無法作答。請改題或重新產生題目。</div>
        </template>
        <div
          v-if="!hideGradingPrompt"
          class="d-flex flex-column gap-0 w-100 min-w-0 mt-3 quiz-card-grading-prompt-editor"
        >
          <label
            :for="`quiz-grading-prompt-${card.id}`"
            :class="designUi ? 'form-label my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0' : 'form-label my-font-sm-600 mb-0 my-color-gray-1'"
          >批改規則</label>
          <EnglishExamMarkdownEditor
            :model-value="String(card.gradingPrompt ?? '')"
            :textarea-id="`quiz-grading-prompt-${card.id}`"
            :preview-only="cardMarkedForExam"
            :preview-design-dark="cardMarkedForExam && gradingPromptNonEmptyTrimmed"
            :disabled="cardMarkedForExam ? false : gradeSubmitting"
            @update:model-value="emit('update:grading_prompt', $event)"
          />
          <!-- 與建立題庫「出題規則」同款：編輯區下方同一列，重設在左、儲存並開始批改在右 -->
          <div
            v-if="showStartGradeButton || !cardMarkedForExam"
            :class="
              designUi
                ? 'd-flex justify-content-center align-items-center flex-wrap gap-3 mt-2 pt-2'
                : 'd-flex justify-content-end align-items-center flex-wrap gap-3 mt-2 pt-2'
            "
          >
            <button
              v-if="!cardMarkedForExam"
              type="button"
              class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-2"
              title="還原為上次載入或送出後的內容"
              aria-label="重設批改規則"
              :disabled="gradingPromptResetDisabled"
              @click="emit('reset-grading-prompt')"
            >
              重設
            </button>
            <button
              v-if="showRagGradeDbButton && showStartGradeButton"
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 flex-shrink-0 px-3 py-2 my-font-md-400 my-button-white"
              title="使用後端已儲存之批改規則；須曾成功「儲存並開始批改」且未在編輯器中改動批改規則"
              :disabled="ragGradeDbButtonDisabled"
              :aria-busy="gradeSubmitting"
              aria-label="開始批改"
              @click="emit('confirm-grade-db', card)"
            >
              開始批改
            </button>
            <button
              v-if="showStartGradeButton && !cardMarkedForExam"
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 flex-shrink-0 px-3 py-2 my-font-md-400 my-button-white"
              :disabled="saveAndGradeButtonDisabled"
              :aria-busy="gradeSubmitting"
              aria-label="儲存並開始批改"
              @click="emit('confirm-answer', card)"
            >
              儲存並開始批改
            </button>
          </div>
        </div>
        <!-- 測驗頁隱藏批改編輯區：「之前的出題」批改後仍保留；「開始批改」僅未批改時 -->
        <div
          v-else-if="showStartGradeButton || showQuizHistoryPreviewButton"
          :class="
            designUi
              ? 'd-flex flex-column align-items-center gap-2 mt-3'
              : 'd-flex flex-column align-items-end gap-2 mt-3'
          "
        >
          <button
            v-if="showQuizHistoryPreviewButton"
            type="button"
            class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
            aria-label="查看之前的出題"
            :disabled="examQuizHistoryButtonDisabled"
            @click="openQuizHistoryModal"
          >
            之前的出題
          </button>
          <button
            v-if="showStartGradeButton"
            type="button"
            class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 flex-shrink-0 px-3 py-2 my-font-md-400 my-button-white"
            :disabled="standaloneStartGradeButtonDisabled"
            :aria-busy="gradeSubmitting"
            aria-label="開始批改"
            @click="emit('confirm-answer', card)"
          >
            開始批改
          </button>
        </div>
      </div>
      <!-- 批改結果區：僅在回傳後有內容時顯示（送出中不占位） -->
      <div
        v-if="showGradingResultSection"
        class="w-100 min-w-0"
        :class="designUi ? 'd-flex flex-column gap-1 mb-0' : 'mb-3'"
      >
        <div
          :class="designUi ? 'my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0' : 'form-label my-font-sm-600 mb-0 my-color-gray-1'"
        >批改結果</div>
        <div
          class="my-font-sm-400"
          style="white-space: pre-wrap;"
          :class="designUi ? 'form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2' : 'form-control my-input-md my-input-md--on-dark rounded-2 my-form-control-static w-100 min-w-0 px-3 py-2'"
        >{{ card.gradingResult }}</div>
        <div
          v-if="showRagQuizForExamToolbar"
          class="w-100 min-w-0 d-flex flex-column align-items-center gap-2 mt-3"
        >
          <button
            type="button"
            :class="
              cardMarkedForExam
                ? 'btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-btn-outline-green-hollow px-3 py-2'
                : 'btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-green px-3 py-2'
            "
            :disabled="card.ragQuizForExamLoading"
            :aria-busy="card.ragQuizForExamLoading"
            @click="emit('mark-rag-quiz-for-exam', card)"
          >
            {{ cardMarkedForExam ? '取消設為測驗用' : '設為測驗用' }}
          </button>
          <div
            v-if="String(card.ragQuizForExamError ?? '').trim() !== ''"
            class="my-alert-danger-soft my-font-sm-400 py-2 mb-0 w-100 text-center"
          >
            {{ card.ragQuizForExamError }}
          </div>
        </div>
        <button
          v-if="hideGradingPrompt"
          type="button"
          class="btn rounded-pill d-inline-flex justify-content-center align-items-center align-self-start flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
          @click="openPromptModal('grading')"
        >
          批改規則
        </button>
      </div>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
/* 題幹 Markdown：末段底距與答案靜態框一致（避免 .my-markdown-rendered p 等同 mb-2 的留白） */
.quiz-card-quiz-stem :deep(.my-markdown-rendered > :last-child) {
  margin-bottom: 0;
}
.quiz-card-reference-answer :deep(.my-markdown-rendered > :last-child) {
  margin-bottom: 0;
}
/*
 * EasyMDE 編輯區選擇器與 CreateExamQuizBankPage「出題規則」(.my-rag-unit-quiz-prompt-editor) 對齊，
 * 避免批改規則額外套 .CodeMirror min-height 與出題區高度不一致。
 * 唯讀預覽高度仍由元件內文決定。
 */
.quiz-card-grading-prompt-editor :deep(.english-exam-md-editor-root) {
  --english-md-preview-max-h: min(60vh, 28rem);
}
.quiz-card-grading-prompt-editor :deep(.english-exam-md-editor-wrap .CodeMirror-scroll) {
  min-height: 400px;
}
</style>
