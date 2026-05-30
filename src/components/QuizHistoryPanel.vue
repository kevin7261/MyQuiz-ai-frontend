<script setup>
/**
 * QuizHistoryPanel — 「先前出題」內容區（Modal 與題目區 tab 內嵌共用）
 * 每筆含題目、參考答案、您的答案、批改結果（一般／追問模式相同版面）。
 */
import { computed } from 'vue';
import { normalizeFollowupHistoryItem } from '../services/ragApi.js';
import { renderMarkdownToSafeHtml } from '../utils/renderMarkdown.js';

const props = defineProps({
  unitLabel: { type: String, default: '—' },
  quizTypeLabel: { type: String, default: '—' },
  isFollowup: { type: Boolean, default: false },
  historyList: { type: Array, default: () => [] },
  /** 內嵌於題目區時隱藏單元／題型標題列 */
  compact: { type: Boolean, default: false },
});

const historyEntries = computed(() => {
  const out = [];
  for (const item of props.historyList) {
    if (typeof item === 'string') {
      const s = item.trim();
      if (!s) continue;
      out.push({
        quiz_content: s,
        answer_content: '',
        quiz_answer_reference: '',
        answer_critique: '',
      });
      continue;
    }
    const normalized = normalizeFollowupHistoryItem(item);
    if (normalized) out.push(normalized);
  }
  return out;
});

const historyEntriesDisplay = computed(() => historyEntries.value.map((entry) => ({
  ...entry,
  quizContentHtml: renderMarkdownToSafeHtml(entry.quiz_content),
  referenceHtml: renderMarkdownToSafeHtml(entry.quiz_answer_reference),
  answerHtml: renderMarkdownToSafeHtml(entry.answer_content),
  critiqueHtml: renderMarkdownToSafeHtml(entry.answer_critique),
})));
</script>

<template>
  <div class="quiz-history-panel w-100 min-w-0">
    <div
      v-if="!compact"
      class="d-flex flex-row flex-nowrap w-100 min-w-0 align-items-start gap-3 mb-3"
    >
      <div class="min-w-0 flex-grow-1" style="flex-basis: 0">
        <div class="my-color-gray-1 my-font-sm-400 mb-0">單元</div>
        <div
          class="my-font-md-400 my-color-black text-break lh-base mt-1"
          role="status"
        >
          {{ unitLabel || '—' }}
        </div>
      </div>
      <div class="min-w-0 flex-grow-1" style="flex-basis: 0">
        <div class="my-color-gray-1 my-font-sm-400 mb-0">題型</div>
        <div
          class="my-font-md-400 my-color-black text-break lh-base mt-1"
          role="status"
        >
          {{ quizTypeLabel || '—' }}
        </div>
      </div>
      <div
        v-if="isFollowup"
        class="flex-shrink-0 align-self-end"
      >
        <span class="my-color-gray-1 my-font-sm-400">出題模式：追問</span>
      </div>
      <div
        v-else
        class="flex-shrink-0 align-self-end"
      >
        <span class="my-color-gray-1 my-font-sm-400">出題模式：一般</span>
      </div>
    </div>
    <div
      class="quiz-history-panel__scroll w-100 min-w-0"
      :class="{ 'quiz-history-panel__scroll--filled': historyEntriesDisplay.length > 0 }"
    >
      <ol
        v-if="historyEntriesDisplay.length > 0"
        class="quiz-history-panel__list my-font-md-400 my-color-black text-break mb-0"
      >
        <li
          v-for="(entry, hi) in historyEntriesDisplay"
          :key="`quiz-history-${hi}-${entry.quiz_content.slice(0, 24)}`"
        >
        <div class="d-flex flex-column gap-2">
          <div>
            <div class="my-color-gray-1 my-font-sm-400">題目</div>
            <div
              v-if="entry.quizContentHtml"
              class="my-markdown-rendered my-color-black lh-base text-break mt-1"
              v-html="entry.quizContentHtml"
            />
            <div
              v-else
              class="my-color-black lh-base text-break mt-1"
            >
              {{ entry.quiz_content }}
            </div>
          </div>
          <div>
            <div class="my-color-gray-1 my-font-sm-400">參考答案</div>
            <div
              v-if="entry.referenceHtml"
              class="my-markdown-rendered my-color-black lh-base text-break mt-1"
              v-html="entry.referenceHtml"
            />
            <div
              v-else
              class="my-color-black lh-base text-break mt-1"
            >
              {{ entry.quiz_answer_reference || '—' }}
            </div>
          </div>
          <div>
            <div class="my-color-gray-1 my-font-sm-400">您的答案</div>
            <div
              v-if="entry.answerHtml"
              class="my-markdown-rendered my-color-black lh-base text-break mt-1"
              v-html="entry.answerHtml"
            />
            <div
              v-else
              class="my-color-black lh-base text-break mt-1"
            >
              {{ entry.answer_content || '—' }}
            </div>
          </div>
          <div>
            <div class="my-color-gray-1 my-font-sm-400">批改結果</div>
            <div
              v-if="entry.critiqueHtml"
              class="my-markdown-rendered my-color-black lh-base text-break mt-1"
              v-html="entry.critiqueHtml"
            />
            <div
              v-else
              class="my-color-black lh-base text-break mt-1"
            >
              {{ entry.answer_critique || '—' }}
            </div>
          </div>
        </div>
      </li>
      </ol>
      <p
        v-else
        class="quiz-history-panel__empty my-font-md-400 my-color-gray-2 mb-0 w-100 text-center"
      >
        沒有先前出題
      </p>
    </div>
  </div>
</template>

<style scoped>
.quiz-history-panel__scroll--filled {
  max-height: 320pt;
  overflow-y: auto;
  padding-inline-end: 0.25rem;
}

.quiz-history-panel__list {
  padding-left: 1.25rem;
  margin-left: 0;
  list-style-position: outside;
}

.quiz-history-panel__list > li + li {
  margin-top: 1.5rem;
}
</style>
