<script setup>
/**
 * EnglishExamMarkdownEditor — Markdown 編輯／預覽元件
 *
 * 編輯模式使用 CodeMirror 5：視窗縮放、版面重排、側欄開合、預覽區塊出現等都會改變編輯器實際寬度或裝置像素比例，
 * 必須在變動後呼叫 `codemirror.refresh()`，否則游標與點選位置會與顯示脫離、工具列對位異常。
 * 元件內以 ResizeObserver、`window.resize` 與 `visualViewport` 事件合併觸發 refresh。
 *
 * 雙模式設計：
 * - **編輯模式**（previewOnly=false）：掛載 EasyMDE 富文字編輯器（工具列含預覽、粗體、清單等）；
 *   輸入內容以 `update:modelValue` emit 至父層。
 * - **預覽模式**（previewOnly=true）：僅渲染 HTML 預覽（marked + DOMPurify，與全站
 *   `renderMarkdownToSafeHtml` 一致），不掛 EasyMDE，適用於讀入完成 / build 完成的唯讀場合。
 *
 * previewDesignDark：僅在 previewOnly=true 時生效，切換為黑底白字預覽
 * （與 DesignPage `.my-bgcolor-black` 區塊示範一致）；未展開最高 96pt（可捲動），超出時內容下方另起一排「…… 查看更多」。
 *
 * disabled：僅影響 EasyMDE CodeMirror 的 readOnly 選項，不影響預覽模式。
 *
 * 供 CreateExamQuizBankPage 文字單元逐字稿輸入、QuizCard 批改規則預覽使用。
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';
import { renderMarkdownToSafeHtml } from '../utils/renderMarkdown.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** 僅預覽：已讀入或 build-system 完成；不掛編輯器 */
  previewOnly: { type: Boolean, default: false },
  /** 唯讀預覽用：Design 頁同款黑底白字（須併 previewOnly） */
  previewDesignDark: { type: Boolean, default: false },
  /**
   * 併 previewDesignDark：預覽內文 px-3 pt-2 pb-2、「查看更多」px-3 pt-2 pb-2（稿頁出題／批改規則黑底區）。
   */
  previewDesignDarkEmbedded: { type: Boolean, default: false },
  /** 對應外層 <label for="…">，維持無障礙關聯 */
  textareaId: { type: String, default: 'english-bank-paste-text' },
  /** 編輯模式：EasyMDE／CodeMirror 使用 Google Sans Code（出題／批改規則 Modal） */
  promptCodeFont: { type: Boolean, default: false },
  /** 編輯模式：Modal 黑底白字（對齊 previewDesignDark 預覽；須 previewOnly=false） */
  editDesignDark: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const previewHtml = computed(() => renderMarkdownToSafeHtml(props.modelValue));
const previewEmpty = computed(() => !(props.modelValue != null && String(props.modelValue).trim()));

const previewPanelRef = ref(null);
/** 黑底預覽內容是否超過 96pt（需顯示展開鈕） */
const previewHadOverflow = ref(false);
const previewExpanded = ref(false);

/** 稿頁黑底預覽：有內容且未展開時最高 96pt；空狀態高度隨內容 */
const previewDesignDarkFixed = computed(
  () => props.previewDesignDark && props.previewOnly && !previewExpanded.value && !previewEmpty.value,
);

const textareaRef = ref(null);
const editorWrapRef = ref(null);
/** @type {null | ResizeObserver} */
let editorResizeObserver = null;
/** @type {null | number} */
let codemirrorRefreshRafId = null;

/** @type {null | { value: (v?: string) => string, codemirror: { setOption: (k: string, v: unknown) => void, refresh: () => void }, toTextArea: () => void }} */
let easyMDE = null;

function scheduleCodemirrorRefresh() {
  if (!easyMDE?.codemirror?.refresh) return;
  if (codemirrorRefreshRafId != null) return;
  codemirrorRefreshRafId = requestAnimationFrame(() => {
    codemirrorRefreshRafId = null;
    try {
      easyMDE?.codemirror?.refresh();
    } catch {
      /* noop */
    }
  });
}

function detachEditorResizeObservers() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleCodemirrorRefresh);
  }
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (vv) {
    vv.removeEventListener('resize', scheduleCodemirrorResize);
    vv.removeEventListener('scroll', scheduleCodemirrorResize);
  }
  if (editorResizeObserver) {
    editorResizeObserver.disconnect();
    editorResizeObserver = null;
  }
}

function scheduleCodemirrorResize() {
  scheduleCodemirrorRefresh();
}

function attachEditorResizeObservers() {
  detachEditorResizeObservers();
  const wrap = editorWrapRef.value;
  if (!wrap || props.previewOnly || !easyMDE?.codemirror) return;
  editorResizeObserver = new ResizeObserver(() => scheduleCodemirrorRefresh());
  editorResizeObserver.observe(wrap);
  window.addEventListener('resize', scheduleCodemirrorRefresh);
  if (window.visualViewport) {
    const vv = window.visualViewport;
    vv.addEventListener('resize', scheduleCodemirrorResize);
    vv.addEventListener('scroll', scheduleCodemirrorResize);
  }
}

function syncReadOnly() {
  if (!easyMDE?.codemirror) return;
  easyMDE.codemirror.setOption('readOnly', props.disabled);
}

function initEasyMde() {
  if (props.previewOnly || easyMDE) return;
  const el = textareaRef.value;
  if (!el) return;
  easyMDE = new EasyMDE({
    element: el,
    initialValue: props.modelValue ?? '',
    /** 空字串：不出現編輯器預設提示文案（出題／批改欄不寫佔位） */
    placeholder: String(props.placeholder ?? ''),
    spellChecker: false,
    autoDownloadFontAwesome: false,
    status: false,
    minHeight: '260px',
    renderingConfig: {
      singleLineBreaks: false,
    },
  });
  easyMDE.codemirror.on('change', () => {
    emit('update:modelValue', easyMDE.value());
  });
  syncReadOnly();
  nextTick(() => {
    attachEditorResizeObservers();
    scheduleCodemirrorRefresh();
  });
}

function destroyEasyMde() {
  detachEditorResizeObservers();
  if (codemirrorRefreshRafId != null) {
    cancelAnimationFrame(codemirrorRefreshRafId);
    codemirrorRefreshRafId = null;
  }
  if (easyMDE) {
    easyMDE.toTextArea();
    easyMDE = null;
  }
}

onMounted(() => {
  nextTick(() => {
    if (!props.previewOnly) {
      initEasyMde();
    }
  });
});

watch(
  () => props.modelValue,
  (v) => {
    if (!easyMDE) return;
    const next = v ?? '';
    if (easyMDE.value() !== next) {
      easyMDE.value(next);
      scheduleCodemirrorRefresh();
    }
  }
);

watch(
  () => props.disabled,
  () => {
    syncReadOnly();
  }
);

watch(
  () => props.previewOnly,
  (po) => {
    if (po) {
      destroyEasyMde();
    } else {
      nextTick(() => {
        initEasyMde();
        nextTick(() => {
          scheduleCodemirrorRefresh();
        });
      });
    }
  }
);

/** @type {null | ResizeObserver} */
let previewOverflowResizeObserver = null;

function detachPreviewOverflowObserver() {
  if (previewOverflowResizeObserver) {
    previewOverflowResizeObserver.disconnect();
    previewOverflowResizeObserver = null;
  }
}

function measureDesignDarkPreviewOverflow() {
  if (!props.previewDesignDark || !props.previewOnly || previewEmpty.value) {
    previewHadOverflow.value = false;
    previewExpanded.value = false;
    return;
  }
  nextTick(() => {
    requestAnimationFrame(() => {
      const panel = previewPanelRef.value;
      if (!panel) return;
      const keepExpanded = previewExpanded.value;
      previewExpanded.value = false;
      panel.style.maxHeight = '96pt';
      panel.style.overflow = 'hidden';
      const overflows = panel.scrollHeight > panel.clientHeight + 1;
      panel.style.maxHeight = '';
      panel.style.overflow = '';
      previewHadOverflow.value = overflows;
      previewExpanded.value = keepExpanded && overflows;
      if (!overflows) previewExpanded.value = false;
    });
  });
}

function attachPreviewOverflowObserver() {
  detachPreviewOverflowObserver();
  if (!props.previewDesignDark || !props.previewOnly) return;
  const panel = previewPanelRef.value;
  if (!panel || typeof ResizeObserver === 'undefined') return;
  previewOverflowResizeObserver = new ResizeObserver(() => {
    measureDesignDarkPreviewOverflow();
  });
  previewOverflowResizeObserver.observe(panel);
}

watch(
  () => [props.modelValue, props.previewDesignDark, props.previewOnly, previewEmpty.value],
  () => {
    previewExpanded.value = false;
    measureDesignDarkPreviewOverflow();
  },
);

watch(previewExpanded, () => {
  if (!previewExpanded.value) measureDesignDarkPreviewOverflow();
});

onMounted(() => {
  measureDesignDarkPreviewOverflow();
  attachPreviewOverflowObserver();
});

watch(
  () => props.previewOnly && props.previewDesignDark,
  (on) => {
    if (on) {
      nextTick(() => {
        measureDesignDarkPreviewOverflow();
        attachPreviewOverflowObserver();
      });
    } else {
      detachPreviewOverflowObserver();
      previewHadOverflow.value = false;
      previewExpanded.value = false;
    }
  },
);

onBeforeUnmount(() => {
  detachPreviewOverflowObserver();
  destroyEasyMde();
});
</script>

<template>
  <div
    class="english-exam-md-editor-root min-w-0"
    :class="{
      'english-exam-md-editor-root--prompt-code-font': promptCodeFont,
      'english-exam-md-editor-root--edit-design-dark': editDesignDark,
    }"
  >
    <!-- 唯讀讀入／已建置：只顯示預覽 -->
    <template v-if="previewOnly">
      <div
        class="english-exam-md-preview-stack min-w-0 d-flex flex-column"
        :class="previewDesignDarkEmbedded ? 'gap-0' : 'gap-1'"
      >
        <div class="english-exam-md-preview-panel-wrap min-w-0">
          <div
            ref="previewPanelRef"
            :id="textareaId"
            class="english-exam-md-preview-panel min-w-0 rounded-2 overflow-x-auto"
            :class="
              previewDesignDark
                ? [
                    'english-exam-md-preview-panel--design-dark my-bgcolor-black border border-white',
                    {
                      'english-exam-md-preview-panel--design-dark-fixed': previewDesignDarkFixed,
                      'english-exam-md-preview-panel--design-dark-expanded': previewExpanded,
                      'english-exam-md-preview-panel--design-dark-empty': previewEmpty,
                    },
                  ]
                : 'english-exam-md-preview-panel--surface my-bgcolor-surface border overflow-y-visible'
            "
            role="region"
            aria-label="Markdown 預覽（僅讀）"
            tabindex="0"
          >
            <div
              v-if="!previewEmpty"
              class="english-exam-md-preview-body text-break"
              :class="[
                previewDesignDark ? 'my-color-white my-font-md-400' : '',
                previewDesignDarkEmbedded ? 'px-3 pt-2 pb-2' : 'px-3 py-2',
              ]"
              v-html="previewHtml"
            />
            <div
              v-else
              class="english-exam-md-preview-empty min-w-0 my-font-md-400"
              :class="[
                previewDesignDark ? 'my-color-gray-2' : 'my-color-gray-4',
                previewDesignDarkEmbedded ? 'px-3 pt-2 pb-2' : 'px-3 py-2',
              ]"
              role="status"
            >
              {{ previewDesignDark ? '未設定規則內容' : '尚無內容' }}
            </div>
          </div>
        </div>
        <div
          v-if="previewDesignDark && previewHadOverflow && !previewExpanded"
          class="english-exam-md-preview-more-row"
          :class="{ 'px-3 pt-2 pb-2': previewDesignDarkEmbedded }"
          >
          <button
            type="button"
            class="english-exam-md-preview-more-btn my-font-sm-400 d-inline-flex align-items-center gap-1"
            aria-expanded="false"
            aria-label="查看更多內容"
            @click="previewExpanded = true"
          >
            查看更多
            <i class="fa-solid fa-chevron-down" aria-hidden="true" />
          </button>
        </div>
        <div
          v-if="previewDesignDark && previewHadOverflow && previewExpanded"
          class="english-exam-md-preview-more-row"
          :class="{ 'px-3 pt-2 pb-2': previewDesignDarkEmbedded }"
          >
          <button
            type="button"
            class="english-exam-md-preview-more-btn my-font-sm-400 d-inline-flex align-items-center gap-1"
            aria-expanded="true"
            aria-label="收起內容"
            @click="previewExpanded = false"
          >
            收起內容
            <i class="fa-solid fa-chevron-up" aria-hidden="true" />
          </button>
        </div>
      </div>
    </template>
    <template v-else>
      <div
        ref="editorWrapRef"
        id="english-exam-md-editor-panel"
        class="english-exam-md-editor-wrap min-w-0"
        role="region"
        aria-label="Markdown 編輯"
      >
        <textarea :id="textareaId" ref="textareaRef" />
      </div>
    </template>
  </div>
</template>

<style scoped src="./EnglishExamMarkdownEditor.css"></style>
