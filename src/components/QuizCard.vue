<script setup>
import { computed, ref, watch } from 'vue';
import EnglishExamMarkdownEditor from './EnglishExamMarkdownEditor.vue';
import LogoGradientPillButton from './LogoGradientPillButton.vue';
import QuizHistoryModal from './QuizHistoryModal.vue';
import QuizHistoryPanel from './QuizHistoryPanel.vue';
import { renderMarkdownToSafeHtml } from '../utils/renderMarkdown.js';

/**
 * QuizCard - 單一題目卡片
 *
 * 顯示：題號（可隱藏）、題目內容（Markdown，marked + DOMPurify）、提示／參考答案（有內容時透過「顯示提示」「顯示參考答案」切換顯示）、答案區（作答輸入預設空白）、批改結果；hideGradingPrompt 時批改結果區塊最底部設「批改規則」pill（開 Modal；無快照時顯示「—」）。
 * 可輸入答案並按「開始批改」送出評分；**測驗頁**（hideGradingPrompt）在已批改（card.confirmed）後不顯示此鈕；建立題庫等未帶 hideGradingPrompt 時仍顯示按鈕群。
 * 單元題區塊內「開始批改」（llm-grade／llm-grade-db，由父層依規則是否改動路由）：啟停用對齊「產生題目」；gradingPromptInModal 時僅顯示單一「開始批改」鈕。
 * 「答案」不因 rag_id 與題庫不一致而停用（仍可鍵入；並顯示警示）；**測驗頁（hideGradingPrompt）在有批改結果文字後答案改為停用**（再次送出批改時會先清空結果）；**測驗稿頁三子區塊（hideExamRulePills）在有批改結果後答案改為與題目相同之純顯示**；其餘情境已批改後 textarea 仍可編輯（僅 readOnlyAnswer／分析頁為靜態）。
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
  /** 測驗介面稿：不顯示「出題規則／批改規則」pill（與 hideGradingPrompt 併用） */
  hideExamRulePills: { type: Boolean, default: false },
  /** 測驗頁：隱藏「批改結果」區塊 */
  hideGradingResult: { type: Boolean, default: false },
  /** 建立測驗題庫（單元題）：顯示「開始批改」（POST llm-grade-db，使用後端已存批改規則）；僅與顯示「批改規則」編輯區時併用 */
  showRagGradeDbButton: { type: Boolean, default: false },
  /** true 時在本卡「批改結果」下方顯示內嵌 for-exam 工具列（需父層未設 hideRagQuizForExamToolbar） */
  showRagQuizForExamAction: { type: Boolean, default: false },
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
   * 測驗頁：此題先前出題幹（字串陣列）；有傳入時於「開始批改」上方顯示小按鈕。
   */
  examQuizHistoryList: { type: Array, default: undefined },
  /** 測驗頁：先前出題 Modal 顯示用單元名稱 */
  examQuizHistoryUnitLabel: { type: String, default: '' },
  /** 測驗頁：先前出題 Modal 顯示用題型名稱 */
  examQuizHistoryQuizTypeLabel: { type: String, default: '' },
  /** 測驗頁：追問出題時 Modal 顯示問答四段式 */
  examQuizHistoryIsFollowup: { type: Boolean, default: false },
  /** 測驗頁：是否允許開啟「先前出題」（未選題型時 false） */
  examQuizHistoryOpenAllowed: { type: Boolean, default: true },
  /** 稿頁：批改規則改按鈕開 Modal 編輯（由父層提供 Modal；本卡僅 emit open-grading-prompt-edit） */
  gradingPromptInModal: { type: Boolean, default: false },
  /** 稿頁：「答案」標題列改為 答案／提示／參考答案 tab 內嵌（不開 Modal） */
  hintReferenceInModal: { type: Boolean, default: false },
  /** 稿頁：「先前出題」置於「題目」標題列右側 */
  showBankQuizHistoryButton: { type: Boolean, default: false },
  /** 稿頁：題目／先前出題改為 tab 內嵌（不用 Modal） */
  quizHistoryInline: { type: Boolean, default: false },
  /** 內嵌 tab 時之歷史列表（一般：string[]；追問：object[]） */
  bankQuizHistoryList: { type: Array, default: undefined },
  bankQuizHistoryIsFollowup: { type: Boolean, default: false },
  bankQuizHistoryUnitLabel: { type: String, default: '' },
  bankQuizHistoryQuizTypeLabel: { type: String, default: '' },
  /**
   * 僅 create-exam-bank_design：題卡尚無批改結果時，黑底區顯示之示範文字（不計入 hasGrade／confirmed）。
   */
  designGradingResultSample: { type: String, default: '' },
  /**
   * 僅 create-exam-bank_design：true 時啟用三子區塊拆分與稿頁專用按鈕排版（須併 designUi、designEmbedded）。
   */
  createExamBankDesignLayout: { type: Boolean, default: false },
  /**
   * 僅 create-exam-bank_design 且 createExamBankDesignLayout 為 true：question／answer／grading 各渲染一段。
   */
  designSubBlock: {
    type: String,
    default: '',
    validator: (v) => ['', 'question', 'answer', 'grading'].includes(String(v ?? '')),
  },
  /** exam_3／create-exam-bank_3：Logo 漸層 pill 色偏（出題偏藍、批改偏紅） */
  logoGradientBias: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'work3'].includes(v),
  },
});

/** work3 題目／答案 tab 列：無 pt-2（區塊頂 pt-2 由父層負責） */
function designStemTabsRowHeadClass(useTabs) {
  if (!useTabs) return 'align-items-center py-2';
  return props.createExamBankDesignLayout
    ? 'my-design-quiz-stem-tabs-row align-items-end pb-0'
    : 'my-design-quiz-stem-tabs-row align-items-end pt-2 pb-0';
}

/** exam_3／create-exam-bank_3：hr 下方內文 pt-2 */
const designFieldInsetBodyClass = computed(() => {
  const base = 'min-w-0 lh-base';
  if (props.logoGradientBias === 'work3') {
    return `${base} px-3 pt-2 pb-2`;
  }
  return `${base} px-3 pb-2`;
});

/** exam_3／create-exam-bank_3：出題／批改規則黑底區標題列下方不顯示橫線 */
const showDesignPromptBlockRule = computed(() => props.logoGradientBias !== 'work3');

/** exam_3／create-exam-bank_3：題目／答案／批改 tab 間距（較 gap-3 放大） */
const designStemTabsClass = computed(() => {
  const base = 'my-design-quiz-stem-tabs d-inline-flex align-items-stretch flex-shrink-0';
  return props.logoGradientBias === 'work3' ? `${base} gap-4` : `${base} gap-3`;
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
  'open-grading-prompt-edit',
  'open-quiz-history',
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

/** 題卡實際批改文字（不含稿頁 placeholder sample） */
const gradingResultActual = computed(() => String(props.card?.gradingResult ?? '').trim());

/** create-exam-bank_design：無真實批改時以 sample 填預覽；測驗／exam_design（hideGradingPrompt）僅顯示實際結果 */
const gradingResultDisplay = computed(() => {
  if (gradingResultActual.value) return props.card.gradingResult;
  const sample = String(props.designGradingResultSample ?? '').trim();
  if (props.createExamBankDesignLayout && sample && !props.hideGradingPrompt) return sample;
  return '';
});

/** 有後端／驗證回傳或稿頁 sample，且非送出中時顯示「批改結果」區塊 */
const showGradingResultSection = computed(
  () =>
    !props.hideGradingResult &&
    !props.questionHintOnly &&
    !props.gradeSubmitting &&
    String(gradingResultDisplay.value ?? '').trim() !== ''
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

/** 測驗頁：可查看此題先前出題（批改後仍保留；須父層傳入 history 相關 props）；稿頁題目標題列已有時不重复顯示 */
const showQuizHistoryPreviewButton = computed(
  () =>
    props.hideGradingPrompt
    && props.examQuizHistoryList !== undefined
    && !props.showBankQuizHistoryButton,
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

const hintMarkdownHtml = computed(() => renderMarkdownToSafeHtml(props.card?.hint));

/** designUi：題幹正下方工具列左側是否有「出題規則／顯示提示／顯示參考答案」任一（與測驗頁同一列、gap-1 緊貼題目區） */
const stemToolbarLeftPills = computed(
  () =>
    (
      props.hideGradingPrompt
      && !props.hideExamRulePills
      && quizUserPromptSnapshotTrimmed.value !== ''
    )
    || (
      !props.hintReferenceInModal
      && (
        hasHintText.value
        || (!props.questionHintOnly && hasReferenceAnswerText.value)
      )
    ),
);

function openPromptModal(kind) {
  if (!isExamDesignGradingLayout.value) {
    if (kind === 'question' && quizUserPromptSnapshotTrimmed.value === '') return;
    if (kind === 'grading' && answerUserPromptSnapshotTrimmed.value === '') return;
  }
  promptModalKind.value = kind;
}

function closePromptModal() {
  promptModalKind.value = '';
}

const hintRefModalKind = ref(/** @type {''|'hint'|'reference'} */ (''));

const hintRefModalTitle = computed(() =>
  hintRefModalKind.value === 'hint' ? '提示' : '參考答案',
);

const hintRefModalHtml = computed(() => {
  if (hintRefModalKind.value === 'hint') {
    return renderMarkdownToSafeHtml(props.card?.hint);
  }
  if (hintRefModalKind.value === 'reference') {
    return referenceAnswerMarkdownHtml.value;
  }
  return '';
});

function openHintRefModal(kind) {
  if (kind === 'hint' && !hasHintText.value) return;
  if (kind === 'reference' && !hasReferenceAnswerText.value) return;
  hintRefModalKind.value = kind;
}

function closeHintRefModal() {
  hintRefModalKind.value = '';
}

/**
 * designUi 時頂區為 flex gap-4 的子項之一；若第 N 題隱藏（如測驗頁、建立題庫 embedded），勿渲染空白包住器，否則與「題目」區之間會多出一格 gap。
 */
const showQuizCardHeaderBand = computed(
  () => !props.designUi || !props.hideSlotIndex,
);

const isDesignSubBlockFragment = computed(
  () =>
    props.createExamBankDesignLayout
    && ['question', 'answer', 'grading'].includes(String(props.designSubBlock ?? '')),
);

/** create-exam-bank_design 批改子區塊 */
const showDesignLayoutGradingToolbar = computed(
  () => isDesignSubBlockFragment.value && props.designSubBlock === 'grading',
);

/** exam_design 稿頁（hideExamRulePills、無示範批改 sample） */
const isExamDesignGradingLayout = computed(
  () =>
    props.createExamBankDesignLayout
    && props.hideExamRulePills
    && !String(props.designGradingResultSample ?? '').trim(),
);

/** 測驗稿頁：已有批改結果時答案改為與題目相同之標題＋橫線＋純文字（不可再編輯） */
const showDesignAnswerAsGradedDisplay = computed(
  () =>
    isExamDesignGradingLayout.value
    && props.designSubBlock === 'answer'
    && gradingResultActual.value !== '',
);

/** 稿頁答案子區：純顯示（分析頁 readOnlyAnswer 或測驗已批改） */
const showDesignAnswerPlainDisplay = computed(
  () => props.readOnlyAnswer || showDesignAnswerAsGradedDisplay.value,
);

/** 稿頁「開始批改」是否應顯示（不含子區塊位置） */
const showDesignGradingStartButton = computed(() => {
  if (!props.createExamBankDesignLayout) return false;
  if (
    isExamDesignGradingLayout.value
    && (gradingResultActual.value || props.card?.confirmed === true)
  ) {
    return false;
  }
  if (props.gradeSaveAllowed !== undefined || props.gradeDbAllowed !== undefined) {
    return true;
  }
  return showStartGradeButton.value;
});

/** 稿頁批改子區：「開始批改」列（create-exam-bank_design／exam_design 共用；置於批改子區左下） */
const showDesignGradingStartRow = computed(() => {
  if (!showDesignLayoutGradingToolbar.value) return false;
  return showDesignGradingStartButton.value;
});

/** exam_design：題目標題列右側「出題規則」pill */
const showExamDesignQuizRulePill = computed(
  () =>
    isExamDesignGradingLayout.value
    && props.designSubBlock === 'question'
    && useDesignFieldLabelInset.value,
);

/** exam_design：批改結果標題列右側「批改規則」pill */
const showExamDesignGradingRulePill = computed(
  () =>
    isExamDesignGradingLayout.value
    && props.designSubBlock === 'grading'
    && useDesignFieldLabelInset.value
    && props.gradingPromptInModal,
);

/** 稿頁批改子區：「批改結果」plain 區（對應「題目」；含稿頁示範 sample） */
const showDesignGradingResultBlock = computed(
  () => showDesignLayoutGradingToolbar.value && showGradingResultSection.value,
);

/**
 * create-exam-bank_design 批改子區「開始批改／批改結果」版式（gradingPromptInModal）；
 * exam_design 併用 hideGradingPrompt + hideExamRulePills 時仍保留此版式、不顯示批改規則黑底區。
 */
const showDesignGradingModalLayout = computed(() => {
  if (!props.gradingPromptInModal) return false;
  if (!props.hideGradingPrompt) return true;
  return (
    props.createExamBankDesignLayout
    && props.designSubBlock === 'grading'
    && props.hideExamRulePills
  );
});

/** create-exam-bank_design 子區塊：欄位標題寫在輸入框內（非框外 label） */
const useDesignFieldLabelInset = computed(
  () => props.createExamBankDesignLayout && isDesignSubBlockFragment.value,
);

const showDesignSubBlockQuestion = computed(
  () => !isDesignSubBlockFragment.value || props.designSubBlock === 'question',
);

const showDesignSubBlockAnswer = computed(
  () => !isDesignSubBlockFragment.value || props.designSubBlock === 'answer',
);

const showDesignSubBlockGrading = computed(
  () => !isDesignSubBlockFragment.value || props.designSubBlock === 'grading',
);

/** 子區塊模式：出題／批改規則唯讀 Modal（question；exam_design 批改規則掛 grading 實例） */
const showDesignSubBlockPromptModals = computed(() => {
  if (!isDesignSubBlockFragment.value) return true;
  if (props.designSubBlock === 'question') return true;
  if (isExamDesignGradingLayout.value && props.designSubBlock === 'grading') return true;
  return false;
});

/** 子區塊模式：提示／參考答案 Modal 掛在 answer 實例 */
const showDesignSubBlockHintModals = computed(
  () => !isDesignSubBlockFragment.value || props.designSubBlock === 'answer',
);

/** 稿頁／題庫：「先前出題」只在 question sub-block（或非 sub-block 模式）顯示 */
const showBankQuizHistoryInStemHeader = computed(
  () =>
    props.showBankQuizHistoryButton &&
    (!isDesignSubBlockFragment.value || props.designSubBlock === 'question'),
);

/** 題目區 tab：題目／先前出題（內嵌，取代 Modal pill） */
const showBankQuizHistoryTabs = computed(
  () => showBankQuizHistoryInStemHeader.value && props.quizHistoryInline,
);

const questionStemTab = ref('current');

watch(
  () => props.card?.id,
  () => {
    questionStemTab.value = 'current';
  },
);

const showQuestionStemBody = computed(
  () => !showBankQuizHistoryTabs.value || questionStemTab.value === 'current',
);

const showQuestionHistoryBody = computed(
  () => showBankQuizHistoryTabs.value && questionStemTab.value === 'history',
);

/** 測驗頁讚／差：僅「題目」tab 顯示（「先前出題」tab 不顯示） */
const showExamRatingVisible = computed(
  () => props.showExamRating && showQuestionStemBody.value,
);

const showDesignStemToolbarRow = computed(
  () => showExamRatingVisible.value || stemToolbarLeftPills.value,
);

const designStemToolbarJustifyClass = computed(() => {
  if (showExamRatingVisible.value && stemToolbarLeftPills.value) return 'justify-content-between';
  if (showExamRatingVisible.value) return 'justify-content-end';
  return 'justify-content-start';
});

/** exam_design 題目子區：讚／差列內距 */
const designStemToolbarRowPaddingClass = computed(() =>
  isDesignSubBlockFragment.value
  && props.designSubBlock === 'question'
  && showExamRatingVisible.value
    ? 'px-3 pt-2'
    : '',
);

const bankQuizHistoryListResolved = computed(() => {
  if (!Array.isArray(props.bankQuizHistoryList)) return [];
  return props.bankQuizHistoryList;
});

/** 答案區 tab：答案／提示／參考答案（內嵌，取代 Modal pill） */
const showAnswerHintRefTabs = computed(
  () =>
    props.hintReferenceInModal
    && useDesignFieldLabelInset.value
    && showDesignSubBlockAnswer.value
    && (hasHintText.value || hasReferenceAnswerText.value),
);

const answerSectionTab = ref(/** @type {'answer'|'hint'|'reference'} */ ('answer'));

watch(
  () => props.card?.id,
  () => {
    answerSectionTab.value = 'answer';
  },
);

watch(answerSectionTab, (tab) => {
  if (tab === 'hint' && !hasHintText.value) answerSectionTab.value = 'answer';
  if (tab === 'reference' && !hasReferenceAnswerText.value) {
    answerSectionTab.value = 'answer';
  }
});

const showAnswerSectionBody = computed(
  () => !showAnswerHintRefTabs.value || answerSectionTab.value === 'answer',
);

const showAnswerHintBody = computed(
  () => showAnswerHintRefTabs.value && answerSectionTab.value === 'hint',
);

const showAnswerReferenceBody = computed(
  () => showAnswerHintRefTabs.value && answerSectionTab.value === 'reference',
);

/** 批改結果區：單一 tab「批改結果」（與題目／答案 tab 版式一致） */
const showGradingResultInsetTabs = computed(
  () =>
    props.gradingPromptInModal
    && useDesignFieldLabelInset.value
    && showDesignSubBlockGrading.value,
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

/** 稿頁 gradingPromptInModal：合併「儲存並開始批改／開始批改」為單一「開始批改」 */
const mergedGradeButtonDisabled = computed(() => {
  if (props.gradeSubmitting) return true;
  if (props.gradeSaveAllowed !== undefined && props.gradeDbAllowed !== undefined) {
    return !props.gradeSaveAllowed && !props.gradeDbAllowed;
  }
  if (cardMarkedForExam.value) return ragGradeDbButtonDisabled.value;
  return saveAndGradeButtonDisabled.value && ragGradeDbButtonDisabled.value;
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

/** 稿頁批改子區「開始批改」：父層傳 gradeSaveAllowed／gradeDbAllowed 時對齊 create-exam-bank_design */
const designGradingStartButtonDisabled = computed(() => {
  if (props.gradeSaveAllowed !== undefined || props.gradeDbAllowed !== undefined) {
    return mergedGradeButtonDisabled.value;
  }
  return props.hideGradingPrompt
    ? standaloneStartGradeButtonDisabled.value
    : mergedGradeButtonDisabled.value;
});

const gradingPromptResetDisabled = computed(
  () =>
    cardMarkedForExam.value
    || props.gradeSubmitting
    || String(props.card?.gradingPrompt ?? '')
      === String(props.card?.gradingPromptBaseline ?? ''),
);

/** 測驗頁（hideGradingPrompt）：批改結果區有文字時鎖定答案；稿頁三子區塊（createExamBankDesignLayout）對齊 create-exam-bank_design 不鎖 */
const quizAnswerFieldDisabled = computed(
  () =>
    props.gradeSubmitting
    || (
      props.hideGradingPrompt
      && !props.createExamBankDesignLayout
      && String(props.card?.gradingResult ?? '').trim() !== ''
    ),
);
</script>

<template>
  <div>
    <Teleport v-if="showDesignSubBlockPromptModals" to="body">
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
          <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
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
        v-if="showDesignSubBlockPromptModals"
        v-model="quizHistoryModalOpen"
        :unit-label="examQuizHistoryUnitLabel"
        :quiz-type-label="examQuizHistoryQuizTypeLabel"
        :is-followup="examQuizHistoryIsFollowup"
        :history-list="quizHistoryModalList"
        :title-id="`quiz-card-history-modal-title-${card.id}`"
      />
    </Teleport>
    <Teleport v-if="showDesignSubBlockHintModals && !hintReferenceInModal" to="body">
      <div
        v-if="hintRefModalKind"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`quiz-card-hint-ref-modal-title-${card.id}`"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                :id="`quiz-card-hint-ref-modal-title-${card.id}`"
                class="modal-title my-color-black"
              >{{ hintRefModalTitle }}</h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closeHintRefModal"
              />
            </div>
            <div class="modal-body p-0 lh-base" style="max-height: 70vh; overflow: auto;">
              <div
                v-if="hintRefModalHtml"
                class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                v-html="hintRefModalHtml"
              />
              <span
                v-else-if="hintRefModalKind === 'hint'"
                class="my-font-md-400 my-color-black text-break"
                style="white-space: pre-wrap;"
              >{{ card.hint }}</span>
              <span
                v-else
                class="my-font-md-400 my-color-black"
              >—</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <div
      :class="[
        isDesignSubBlockFragment
          ? 'w-100 min-w-0'
          : [
            designUi
              ? (designEmbedded ? 'w-100 min-w-0 mb-0' : 'my-bgcolor-gray-3 rounded-4 p-4 mb-0 w-100 min-w-0')
              : ['my-bgcolor-page-block rounded-3 p-3 p-lg-4', 'mb-4'],
            { 'mt-4': !designUi && slotIndex > 1 },
          ],
      ]"
    >
    <div
      class="text-start w-100 min-w-0"
      :class="
        isDesignSubBlockFragment
          ? 'd-flex flex-column gap-3'
          : (designUi ? 'd-flex flex-column gap-4' : '')
      "
    >
      <div
        v-if="showDesignSubBlockQuestion && showQuizCardHeaderBand"
        :class="designUi ? 'd-flex flex-column gap-3 w-100 min-w-0' : ''"
      >
      <div
        v-if="!hideSlotIndex"
        class="my-font-lg-600 my-color-black"
        :class="designUi ? 'mb-0' : 'mb-3'"
      >第 {{ slotIndex }} 題</div>
      </div>
      <div
        v-if="showDesignSubBlockQuestion"
        class="w-100 min-w-0"
        :class="designUi ? 'd-flex flex-column mb-0' : 'mb-3'"
      >
        <template v-if="useDesignFieldLabelInset">
          <section
            class="my-design-quiz-field-inset my-design-quiz-field-inset--plain w-100 min-w-0"
            aria-label="題目"
          >
            <header class="my-design-quiz-field-inset__head">
              <div
                class="d-flex justify-content-between gap-2 px-3"
                :class="designStemTabsRowHeadClass(showBankQuizHistoryTabs)"
              >
                <div
                  v-if="showBankQuizHistoryTabs"
                  :class="designStemTabsClass"
                  role="tablist"
                  aria-label="題目與先前出題"
                >
                  <button
                    type="button"
                    role="tab"
                    class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                    :class="{ 'my-design-quiz-stem-tab--active': questionStemTab === 'current' }"
                    :aria-selected="questionStemTab === 'current'"
                    @click="questionStemTab = 'current'"
                  >
                    題目
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                    :class="{ 'my-design-quiz-stem-tab--active': questionStemTab === 'history' }"
                    :aria-selected="questionStemTab === 'history'"
                    @click="questionStemTab = 'history'"
                  >
                    先前出題
                  </button>
                </div>
                <h3
                  v-else
                  class="my-design-quiz-field-inset-label my-font-sm-400 mb-0"
                >
                  題目
                </h3>
                <div
                  class="d-inline-flex flex-nowrap align-items-center gap-2 flex-shrink-0 ms-auto"
                  :class="{ 'pb-1': showBankQuizHistoryTabs }"
                >
                  <button
                    v-if="showExamDesignQuizRulePill"
                    type="button"
                    class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-design-quiz-history-btn px-3 py-1"
                    title="出題規則"
                    aria-label="出題規則"
                    @click="openPromptModal('question')"
                  >
                    出題規則
                  </button>
                  <button
                    v-if="showBankQuizHistoryInStemHeader && !showBankQuizHistoryTabs"
                    type="button"
                    class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-design-quiz-history-btn px-3 py-1"
                    aria-label="查看先前出題"
                    :disabled="examQuizHistoryButtonDisabled"
                    @click="emit('open-quiz-history')"
                  >
                    先前出題
                  </button>
                </div>
              </div>
              <div class="px-3 py-0">
                <hr class="my-design-quiz-field-inset__rule m-0">
              </div>
            </header>
            <div
              class="my-design-quiz-field-inset-body quiz-card-quiz-stem"
              :class="designFieldInsetBodyClass"
            >
              <template v-if="showQuestionStemBody">
                <div
                  v-if="quizMarkdownHtml"
                  class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                  v-html="quizMarkdownHtml"
                />
                <span
                  v-else
                  class="my-font-md-400 my-color-black text-break"
                >{{ card.quiz }}</span>
              </template>
              <QuizHistoryPanel
                v-else-if="showQuestionHistoryBody"
                compact
                :unit-label="bankQuizHistoryUnitLabel"
                :quiz-type-label="bankQuizHistoryQuizTypeLabel"
                :is-followup="bankQuizHistoryIsFollowup"
                :history-list="bankQuizHistoryListResolved"
              />
            </div>
          </section>
        </template>
        <template v-else>
          <div
            class="d-flex justify-content-between gap-2 flex-wrap w-100 min-w-0 mb-1"
            :class="designUi && showBankQuizHistoryInStemHeader ? 'align-items-end' : 'align-items-center'"
          >
            <div
              v-if="showBankQuizHistoryTabs"
              :class="designStemTabsClass"
              role="tablist"
              aria-label="題目與先前出題"
            >
              <button
                type="button"
                role="tab"
                class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                :class="{ 'my-design-quiz-stem-tab--active': questionStemTab === 'current' }"
                :aria-selected="questionStemTab === 'current'"
                @click="questionStemTab = 'current'"
              >
                題目
              </button>
              <button
                type="button"
                role="tab"
                class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                :class="{ 'my-design-quiz-stem-tab--active': questionStemTab === 'history' }"
                :aria-selected="questionStemTab === 'history'"
                @click="questionStemTab = 'history'"
              >
                先前出題
              </button>
            </div>
            <div
              v-else
              :class="designUi ? 'my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0' : 'form-label my-font-sm-600 mb-0 my-color-gray-1'"
            >題目</div>
            <button
              v-if="showBankQuizHistoryInStemHeader && !showBankQuizHistoryTabs"
              type="button"
              class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1 ms-auto"
              aria-label="查看先前出題"
              :disabled="examQuizHistoryButtonDisabled"
              @click="emit('open-quiz-history')"
            >
              先前出題
            </button>
          </div>
          <div
            class="lh-base mb-0 quiz-card-quiz-stem"
            :class="designUi ? 'form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2' : 'form-control my-input-md my-input-md--on-dark rounded-2 my-form-control-static w-100 min-w-0 px-3 py-2'"
          >
            <template v-if="showQuestionStemBody">
              <div
                v-if="quizMarkdownHtml"
                class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                v-html="quizMarkdownHtml"
              />
              <span
                v-else
                class="my-font-md-400 my-color-black text-break"
              >{{ card.quiz }}</span>
            </template>
            <QuizHistoryPanel
              v-else-if="showQuestionHistoryBody"
              compact
              :unit-label="bankQuizHistoryUnitLabel"
              :quiz-type-label="bankQuizHistoryQuizTypeLabel"
              :is-followup="bankQuizHistoryIsFollowup"
              :history-list="bankQuizHistoryListResolved"
            />
          </div>
        </template>
        <template v-if="designUi && hasQuizBody">
          <div
            v-if="showDesignStemToolbarRow"
            class="d-flex flex-row flex-nowrap align-items-center gap-2 w-100 min-w-0"
            :class="[designStemToolbarJustifyClass, designStemToolbarRowPaddingClass]"
          >
            <div
              v-if="stemToolbarLeftPills"
              class="d-inline-flex flex-nowrap align-items-center gap-2 min-w-0"
            >
              <button
                v-if="hideGradingPrompt && !hideExamRulePills && quizUserPromptSnapshotTrimmed !== ''"
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
                @click="openPromptModal('question')"
              >
                出題規則
              </button>
              <button
                v-if="hasHintText && !hintReferenceInModal"
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
                @click="emit('toggle-hint', card)"
              >
                {{ card.hintVisible ? '隱藏提示' : '顯示提示' }}
              </button>
              <button
                v-if="!questionHintOnly && hasReferenceAnswerText && !hintReferenceInModal"
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
                @click="emit('toggle-reference-answer', card)"
              >
                {{ card.referenceAnswerVisible ? '隱藏參考答案' : '顯示參考答案' }}
              </button>
            </div>
            <div
              v-if="showExamRatingVisible"
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
            v-if="showExamRatingVisible && card.rateError"
            class="my-font-sm-400 my-color-red text-end mb-0 w-100"
          >
            {{ card.rateError }}
          </div>
          <template v-if="!hintReferenceInModal">
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
        </template>
        <button
          v-else-if="!designUi && hideGradingPrompt && !hideExamRulePills && hasQuizBody && quizUserPromptSnapshotTrimmed !== ''"
          type="button"
          class="btn rounded-pill d-inline-flex justify-content-center align-items-center align-self-start flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
          @click="openPromptModal('question')"
        >
          出題規則
        </button>
      </div>
      <div
        v-if="showDesignSubBlockQuestion && !(designUi && hasQuizBody) && !hintReferenceInModal && (hasHintText || (!questionHintOnly && hasReferenceAnswerText))"
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
      <div
        v-if="showDesignSubBlockAnswer && !questionHintOnly && hasQuizBody"
        class="w-100 min-w-0"
        :class="designUi ? 'd-flex flex-column mb-0' : 'mb-3'"
      >
        <template v-if="useDesignFieldLabelInset">
          <section
            class="my-design-quiz-field-inset my-design-quiz-field-inset--plain w-100 min-w-0"
            aria-label="答案"
          >
            <header class="my-design-quiz-field-inset__head">
              <div
                class="d-flex justify-content-between gap-2 px-3"
                :class="designStemTabsRowHeadClass(showAnswerHintRefTabs)"
              >
                <div
                  v-if="showAnswerHintRefTabs"
                  :class="designStemTabsClass"
                  role="tablist"
                  aria-label="答案、提示與參考答案"
                >
                  <button
                    type="button"
                    role="tab"
                    class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                    :class="{ 'my-design-quiz-stem-tab--active': answerSectionTab === 'answer' }"
                    :aria-selected="answerSectionTab === 'answer'"
                    @click="answerSectionTab = 'answer'"
                  >
                    答案
                  </button>
                  <button
                    v-if="hasHintText"
                    type="button"
                    role="tab"
                    class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                    :class="{ 'my-design-quiz-stem-tab--active': answerSectionTab === 'hint' }"
                    :aria-selected="answerSectionTab === 'hint'"
                    @click="answerSectionTab = 'hint'"
                  >
                    提示
                  </button>
                  <button
                    v-if="hasReferenceAnswerText"
                    type="button"
                    role="tab"
                    class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                    :class="{ 'my-design-quiz-stem-tab--active': answerSectionTab === 'reference' }"
                    :aria-selected="answerSectionTab === 'reference'"
                    @click="answerSectionTab = 'reference'"
                  >
                    參考答案
                  </button>
                </div>
                <h3
                  v-else
                  class="my-design-quiz-field-inset-label my-font-sm-400 mb-0"
                >
                  答案
                </h3>
              </div>
              <div class="px-3 py-0">
                <hr class="my-design-quiz-field-inset__rule m-0">
              </div>
            </header>
            <div
              class="my-design-quiz-field-inset-body my-design-quiz-answer-inset-body"
              :class="designFieldInsetBodyClass"
            >
              <template v-if="showAnswerSectionBody">
                <template v-if="showDesignAnswerPlainDisplay">
                  <span
                    :id="`quiz-answer-${card.id}`"
                    class="my-font-md-400 my-color-black text-break"
                  >{{ card.quiz_answer }}</span>
                </template>
                <textarea
                  v-else
                  :id="`quiz-answer-${card.id}`"
                  :value="card.quiz_answer"
                  class="form-control my-input-md my-design-quiz-answer-input rounded-2 w-100 min-w-0 py-2 shadow-none"
                  :disabled="quizAnswerFieldDisabled"
                  @input="emit('update:quiz_answer', $event.target.value)"
                  rows="4"
                  placeholder=""
                  maxlength="2000"
                />
              </template>
              <div
                v-else-if="showAnswerHintBody"
                class="quiz-card-quiz-stem"
              >
                <div
                  v-if="hintMarkdownHtml"
                  class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                  v-html="hintMarkdownHtml"
                />
                <span
                  v-else
                  class="my-font-md-400 my-color-black text-break"
                  style="white-space: pre-wrap;"
                >{{ card.hint }}</span>
              </div>
              <div
                v-else-if="showAnswerReferenceBody"
                class="quiz-card-reference-answer"
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
          </section>
        </template>
        <template v-else>
          <div
            class="d-flex justify-content-between gap-2 flex-wrap w-100 min-w-0 mb-1"
            :class="
              showAnswerHintRefTabs && designUi
                ? 'my-design-quiz-stem-tabs-row align-items-end'
                : hintReferenceInModal
                  ? 'align-items-end'
                  : 'align-items-center'
            "
          >
            <div
              v-if="showAnswerHintRefTabs && designUi"
              :class="designStemTabsClass"
              role="tablist"
              aria-label="答案、提示與參考答案"
            >
              <button
                type="button"
                role="tab"
                class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                :class="{ 'my-design-quiz-stem-tab--active': answerSectionTab === 'answer' }"
                :aria-selected="answerSectionTab === 'answer'"
                @click="answerSectionTab = 'answer'"
              >
                答案
              </button>
              <button
                v-if="hasHintText"
                type="button"
                role="tab"
                class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                :class="{ 'my-design-quiz-stem-tab--active': answerSectionTab === 'hint' }"
                :aria-selected="answerSectionTab === 'hint'"
                @click="answerSectionTab = 'hint'"
              >
                提示
              </button>
              <button
                v-if="hasReferenceAnswerText"
                type="button"
                role="tab"
                class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400"
                :class="{ 'my-design-quiz-stem-tab--active': answerSectionTab === 'reference' }"
                :aria-selected="answerSectionTab === 'reference'"
                @click="answerSectionTab = 'reference'"
              >
                參考答案
              </button>
            </div>
            <label
              v-else
              :for="`quiz-answer-${card.id}`"
              :class="designUi ? 'my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0' : 'form-label my-font-sm-600 mb-0 my-color-gray-1'"
            >答案</label>
            <div
              v-if="hintReferenceInModal && !designUi"
              class="d-inline-flex flex-wrap align-items-end justify-content-end gap-2 ms-auto"
            >
              <button
                v-if="hasHintText"
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
                title="提示"
                aria-label="提示"
                @click="openHintRefModal('hint')"
              >
                提示
              </button>
              <button
                v-if="hasReferenceAnswerText"
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 my-btn-outline-gray-1 px-3 py-1"
                title="參考答案"
                aria-label="參考答案"
                @click="openHintRefModal('reference')"
              >
                參考答案
              </button>
            </div>
          </div>
          <template v-if="!showAnswerHintRefTabs || !designUi || showAnswerSectionBody">
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
          </template>
          <div
            v-else-if="showAnswerHintBody"
            class="form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2 mb-0"
          >
            <div
              v-if="hintMarkdownHtml"
              class="my-markdown-rendered my-font-md-400 my-color-black text-break"
              v-html="hintMarkdownHtml"
            />
            <span
              v-else
              class="my-font-md-400 my-color-black text-break"
              style="white-space: pre-wrap;"
            >{{ card.hint }}</span>
          </div>
          <div
            v-else-if="showAnswerReferenceBody"
            class="form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2 mb-0 quiz-card-reference-answer"
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
        </template>
        <template v-if="!readOnlyAnswer">
          <div
            v-if="ragMismatchWarning"
            :class="designUi ? 'my-font-sm-400 my-color-red mt-1' : 'form-text my-font-sm-400 my-color-red'"
          >此題與目前題庫版本不一致，無法作答。請改題或重新產生題目。</div>
        </template>
      </div>
      <div
        v-if="showDesignSubBlockGrading && !questionHintOnly && hasQuizBody"
        class="w-100 min-w-0"
        :class="[
          designUi && isDesignSubBlockFragment
            ? 'd-flex flex-column mb-0'
            : designUi
              ? 'd-flex flex-column gap-3 mb-0'
              : 'mb-3',
        ]"
      >
        <div
          v-if="showDesignGradingModalLayout"
          class="d-flex flex-column w-100 min-w-0"
          :class="isDesignSubBlockFragment ? '' : 'mt-3'"
        >
          <div
            v-if="!hideExamRulePills && !hideGradingPrompt"
            class="my-design-quiz-question-prompt-wrap w-100 min-w-0"
            :class="useDesignFieldLabelInset ? 'px-3 pt-2 pb-0' : ''"
          >
            <section
              class="my-design-quiz-question-prompt-block w-100 min-w-0"
              aria-label="批改規則"
            >
              <header class="my-design-quiz-question-prompt-block__head">
                <div
                  class="my-design-quiz-question-prompt-block__title-row d-flex justify-content-between align-items-center gap-2 px-3 py-2"
                >
                  <h3 class="my-design-quiz-question-prompt-block__title my-font-sm-400 mb-0">
                    批改規則
                  </h3>
                  <button
                    type="button"
                    class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-design-quiz-question-prompt-block__edit-btn lh-1"
                    title="編輯批改規則"
                    aria-label="編輯批改規則"
                    :disabled="gradeSubmitting || cardMarkedForExam"
                    @click="emit('open-grading-prompt-edit')"
                  >
                    <i class="fa-solid fa-pen" aria-hidden="true" />
                  </button>
                </div>
                <div
                  v-if="showDesignPromptBlockRule"
                  class="px-3 py-0"
                >
                  <hr class="my-design-quiz-question-prompt-block__rule m-0">
                </div>
              </header>
              <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
                <EnglishExamMarkdownEditor
                  :model-value="String(card.gradingPrompt ?? '')"
                  :textarea-id="`quiz-grading-prompt-ro-${card.id}`"
                  preview-only
                  preview-design-dark
                  preview-design-dark-embedded
                />
              </div>
            </section>
          </div>
          <template v-if="useDesignFieldLabelInset">
            <div
              v-if="showDesignGradingStartRow"
              class="d-flex justify-content-start align-items-center flex-nowrap gap-2 px-3 py-2 my-design-quiz-grading-start-row"
            >
              <LogoGradientPillButton
                tone="grade"
                :gradient-bias="logoGradientBias"
                :id-prefix="`quiz-grade-mark-${card.id}-grading-row`"
                title="依批改規則批改；規則已改動時會先儲存再批改，否則使用後端已儲存規則"
                :disabled="designGradingStartButtonDisabled"
                :aria-busy="gradeSubmitting"
                aria-label="開始批改"
                @click="emit('confirm-answer', card)"
              >
                開始批改
              </LogoGradientPillButton>
            </div>
            <div
              v-if="showDesignGradingResultBlock"
              class="w-100 min-w-0"
            >
              <section
                class="my-design-quiz-field-inset my-design-quiz-field-inset--plain w-100 min-w-0"
                aria-label="批改結果"
              >
                <header class="my-design-quiz-field-inset__head">
                  <div
                    class="d-flex justify-content-between gap-2 px-3"
                    :class="designStemTabsRowHeadClass(showGradingResultInsetTabs)"
                  >
                    <div
                      v-if="showGradingResultInsetTabs"
                      :class="designStemTabsClass"
                      role="tablist"
                      aria-label="批改結果"
                    >
                      <button
                        type="button"
                        role="tab"
                        class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400 my-design-quiz-stem-tab--active"
                        aria-selected="true"
                      >
                        批改結果
                      </button>
                    </div>
                    <h3
                      v-else
                      class="my-design-quiz-field-inset-label my-font-sm-400 mb-0"
                    >
                      批改結果
                    </h3>
                    <div
                      v-if="showExamDesignGradingRulePill"
                      class="d-inline-flex flex-nowrap align-items-center gap-2 flex-shrink-0 ms-auto"
                      :class="{ 'pb-1': showGradingResultInsetTabs }"
                    >
                      <button
                        type="button"
                        class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-button-gray-3 my-design-quiz-stem-history-btn px-3 py-1"
                        title="批改規則"
                        aria-label="批改規則"
                        @click="openPromptModal('grading')"
                      >
                        批改規則
                      </button>
                    </div>
                  </div>
                  <div class="px-3 py-0">
                    <hr class="my-design-quiz-field-inset__rule m-0">
                  </div>
                </header>
                <div
                  class="my-design-quiz-field-inset-body"
                  :class="designFieldInsetBodyClass"
                  style="white-space: pre-wrap;"
                >
                  <div class="my-font-md-400 my-color-black text-break">
                    {{ gradingResultDisplay }}
                  </div>
                </div>
              </section>
            </div>
          </template>
          <div
            v-if="!showDesignLayoutGradingToolbar && !showDesignGradingStartRow && (showStartGradeButton || !cardMarkedForExam)"
            :class="
              designUi
                ? 'd-flex justify-content-center align-items-center flex-wrap gap-3 mt-2 pt-2'
                : 'd-flex justify-content-end align-items-center flex-wrap gap-3 mt-2 pt-2'
            "
          >
            <LogoGradientPillButton
              v-if="showStartGradeButton"
              tone="grade"
              :gradient-bias="logoGradientBias"
              :id-prefix="`quiz-grade-mark-${card.id}-toolbar-fallback`"
              title="依批改規則批改；規則已改動時會先儲存再批改，否則使用後端已儲存規則"
              :disabled="mergedGradeButtonDisabled"
              :aria-busy="gradeSubmitting"
              aria-label="開始批改"
              @click="emit('confirm-answer', card)"
            >
              開始批改
            </LogoGradientPillButton>
          </div>
        </div>
        <div
          v-else-if="!hideGradingPrompt"
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
          <!-- 建立題庫（gradingPromptInModal）重設在 Modal；其餘情境編輯區下方同一列 -->
          <div
            v-if="showStartGradeButton || !cardMarkedForExam"
            :class="
              showDesignLayoutGradingToolbar
                ? 'd-flex justify-content-start align-items-center flex-wrap gap-2 mt-2 pt-2'
                : designUi
                  ? 'd-flex justify-content-center align-items-center flex-wrap gap-3 mt-2 pt-2'
                  : 'd-flex justify-content-end align-items-center flex-wrap gap-3 mt-2 pt-2'
            "
          >
            <button
              v-if="!cardMarkedForExam && !gradingPromptInModal"
              type="button"
              class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-3 py-2"
              title="還原為上次載入或送出後的內容"
              aria-label="重設批改規則"
              :disabled="gradingPromptResetDisabled"
              @click="emit('reset-grading-prompt')"
            >
              重設
            </button>
            <LogoGradientPillButton
              v-if="showRagGradeDbButton && showStartGradeButton"
              tone="grade"
              :gradient-bias="logoGradientBias"
              :id-prefix="`quiz-grade-mark-${card.id}-grade-db`"
              title="使用後端已儲存之批改規則；須曾成功「儲存並開始批改」且未在編輯器中改動批改規則"
              :disabled="ragGradeDbButtonDisabled"
              :aria-busy="gradeSubmitting"
              aria-label="開始批改"
              @click="emit('confirm-grade-db', card)"
            >
              開始批改
            </LogoGradientPillButton>
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
        <!-- 測驗頁隱藏批改編輯區：「先前出題」批改後仍保留；「開始批改」僅未批改時 -->
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
            aria-label="查看先前出題"
            :disabled="examQuizHistoryButtonDisabled"
            @click="openQuizHistoryModal"
          >
            先前出題
          </button>
          <LogoGradientPillButton
            v-if="showStartGradeButton"
            tone="grade"
            :gradient-bias="logoGradientBias"
            :id-prefix="`quiz-grade-mark-${card.id}-standalone`"
            :disabled="standaloneStartGradeButtonDisabled"
            :aria-busy="gradeSubmitting"
            aria-label="開始批改"
            @click="emit('confirm-answer', card)"
          >
            開始批改
          </LogoGradientPillButton>
        </div>
      <!-- 批改結果區：僅在回傳後有內容時顯示（送出中不占位）；稿頁批改子區塊改由 showDesignGradingResultBlock 渲染 -->
      <div
        v-if="showGradingResultSection && !showDesignLayoutGradingToolbar"
        class="w-100 min-w-0"
        :class="designUi ? 'd-flex flex-column gap-1 mb-0' : 'mb-3'"
      >
        <template v-if="useDesignFieldLabelInset">
          <section
            class="my-design-quiz-field-inset my-design-quiz-field-inset--plain w-100 min-w-0"
            aria-label="批改結果"
          >
            <header class="my-design-quiz-field-inset__head">
              <div
                class="d-flex justify-content-between gap-2 px-3"
                :class="designStemTabsRowHeadClass(showGradingResultInsetTabs)"
              >
                <div
                  v-if="showGradingResultInsetTabs"
                  :class="designStemTabsClass"
                  role="tablist"
                  aria-label="批改結果"
                >
                  <button
                    type="button"
                    role="tab"
                    class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400 my-design-quiz-stem-tab--active"
                    aria-selected="true"
                  >
                    批改結果
                  </button>
                </div>
                <h3
                  v-else
                  class="my-design-quiz-field-inset-label my-font-sm-400 mb-0"
                >
                  批改結果
                </h3>
              </div>
              <div class="px-3 py-0">
                <hr class="my-design-quiz-field-inset__rule m-0">
              </div>
            </header>
            <div
              class="my-design-quiz-field-inset-body"
              :class="designFieldInsetBodyClass"
              style="white-space: pre-wrap;"
            >
              <div class="my-font-md-400 my-color-black text-break">
                {{ gradingResultDisplay }}
              </div>
            </div>
          </section>
        </template>
        <template v-else>
          <div
            :class="designUi ? 'my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0' : 'form-label my-font-sm-600 mb-0 my-color-gray-1'"
          >批改結果</div>
          <div
            class="my-font-sm-400"
            style="white-space: pre-wrap;"
            :class="designUi ? 'form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2' : 'form-control my-input-md my-input-md--on-dark rounded-2 my-form-control-static w-100 min-w-0 px-3 py-2'"
          >{{ gradingResultDisplay }}</div>
        </template>
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
          v-if="hideGradingPrompt && !hideExamRulePills"
          type="button"
          class="btn rounded-pill d-inline-flex justify-content-center align-items-center align-self-start flex-shrink-0 my-font-sm-400 my-button-gray-3 my-design-quiz-stem-history-btn px-3 py-1"
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
/* 題目／先前出題 tab：選中 2pt 黑底線疊在下方 hr 灰線上（對齊 .my-rag-tabs-bar） */
.my-design-quiz-stem-tabs-row .my-design-quiz-stem-tab {
  position: relative;
  z-index: 0;
  margin-bottom: -1px;
}
.my-design-quiz-stem-tab {
  border: none;
  border-bottom: 2pt solid transparent;
  border-radius: 0;
  background: transparent;
  color: color-mix(in srgb, var(--my-color-black) 46%, var(--my-color-white));
  line-height: 1.25;
  box-shadow: none;
}
.my-design-quiz-stem-tab--active,
.my-design-quiz-stem-tab--active:hover,
.my-design-quiz-stem-tab--active:focus,
.my-design-quiz-stem-tab--active:focus-visible {
  z-index: 1;
  padding-bottom: calc(0.5rem + 1px);
  border-bottom-color: var(--my-color-black);
  color: var(--my-color-black);
  background-color: transparent;
  box-shadow: none;
}
.my-design-quiz-stem-tab:not(.my-design-quiz-stem-tab--active):hover:not(:disabled),
.my-design-quiz-stem-tab:not(.my-design-quiz-stem-tab--active):focus-visible:not(:disabled) {
  color: var(--my-color-black);
}
.quiz-card-quiz-stem :deep(.my-markdown-rendered > :last-child) {
  margin-bottom: 0;
}
.quiz-card-reference-answer :deep(.my-markdown-rendered > :last-child) {
  margin-bottom: 0;
}
/*
 * EasyMDE 編輯區選擇器與 CreateExamQuizBankPage「出題規則」(.my-rag-unit-quiz-prompt-editor) 對齊，
 * 批改規則編輯區固定 96pt。
 */
.quiz-card-grading-prompt-editor :deep(.english-exam-md-editor-root) {
  --english-md-preview-max-h: 96pt;
}
.quiz-card-grading-prompt-editor :deep(.english-exam-md-editor-wrap .CodeMirror-scroll) {
  min-height: 96pt;
}
/* 稿頁答案子區塊：白底、淡灰框（與 create-exam-bank_design 頁內 :deep 規則一致） */
:deep(.form-control.my-design-quiz-answer-input) {
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-2);
  color: var(--my-color-black);
}
:deep(.form-control.my-design-quiz-answer-input:focus) {
  background-color: var(--my-color-white);
  border-color: var(--my-color-gray-2);
  box-shadow: none;
}
:deep(.form-control.my-design-quiz-answer-input:disabled) {
  background-color: var(--my-color-gray-4);
  border-color: var(--my-color-gray-2);
  opacity: 1;
}
/* 稿頁「開始批改」pill（批改子區左下） */
:deep(.my-design-quiz-grading-start-row .btn.my-button-white),
:deep(.my-design-quiz-grading-start-row .btn.my-button-logo-gradient) {
  white-space: nowrap;
  flex-shrink: 0;
}
/* 出題／批改規則黑底預覽區（gradingPromptInModal） */
.my-design-quiz-question-prompt-block {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border: 1px solid var(--my-color-white);
  border-radius: 0.5rem;
  background-color: var(--my-color-black);
  overflow: hidden;
}
.my-design-quiz-question-prompt-block__title {
  color: var(--my-color-gray-2);
  line-height: 1.35;
  font-weight: 400;
  white-space: nowrap;
}
.my-design-quiz-question-prompt-block__edit-btn {
  box-sizing: border-box;
  width: 1.75rem;
  height: 1.75rem;
  min-width: 1.75rem;
  min-height: 1.75rem;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--my-color-white) 40%, transparent);
  background-color: transparent;
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__edit-btn:hover:not(:disabled),
.my-design-quiz-question-prompt-block__edit-btn:focus-visible:not(:disabled) {
  color: var(--my-color-white);
  border-color: var(--my-color-white);
  background-color: color-mix(in srgb, var(--my-color-white) 14%, transparent);
}
.my-design-quiz-question-prompt-block__edit-btn .fa-solid {
  font-size: var(--my-font-size-sm);
  line-height: 1;
}
.my-design-quiz-question-prompt-block__rule {
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--my-color-white) 35%, transparent);
  opacity: 1;
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-panel--design-dark) {
  margin-bottom: 0;
  background: transparent !important;
  border: none !important;
  border-radius: 0;
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-panel) {
  margin-bottom: 0;
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-empty) {
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-empty) {
  color: var(--my-color-gray-2);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body h1),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body h2),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body h3),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body p),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body li),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body td),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body th) {
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body a) {
  color: var(--my-color-blue-hover);
  word-break: break-word;
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body pre) {
  background: color-mix(in srgb, var(--my-color-white) 12%, transparent);
  color: var(--my-color-white);
}
</style>
