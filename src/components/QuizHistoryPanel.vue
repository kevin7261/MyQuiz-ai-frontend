<script setup>
/**
 * QuizHistoryPanel — 「先前出題」內容區（Modal 與題目區 tab 內嵌共用）
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

const followupEntries = computed(() => {
  if (!props.isFollowup) return [];
  const out = [];
  for (const item of props.historyList) {
    if (typeof item === 'string') continue;
    const normalized = normalizeFollowupHistoryItem(item);
    if (normalized) out.push(normalized);
  }
  return out;
});

const stemList = computed(() => {
  if (props.isFollowup) return [];
  return props.historyList
    .map((s) => String(s ?? '').trim())
    .filter((s) => s !== '');
});

/** 與 QuizCard 題幹相同：marked + DOMPurify */
const stemHtmlList = computed(() => stemList.value.map((stem) => ({
  stem,
  html: renderMarkdownToSafeHtml(stem),
})));

const followupEntriesDisplay = computed(() => followupEntries.value.map((entry) => ({
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
    </div>
    <ol
      v-if="isFollowup && followupEntriesDisplay.length > 0"
      class="my-font-md-400 my-color-black text-break mb-0 ps-3 d-flex flex-column gap-4"
    >
      <li
        v-for="(entry, hi) in followupEntriesDisplay"
        :key="`quiz-followup-history-${hi}-${entry.quiz_content.slice(0, 24)}`"
        class="pe-2"
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
            <div class="my-color-gray-1 my-font-sm-400">回答</div>
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
            <div class="my-color-gray-1 my-font-sm-400">評閱</div>
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
    <ol
      v-else-if="!isFollowup && stemHtmlList.length > 0"
      class="my-font-md-400 my-color-black text-break mb-0 ps-3 d-flex flex-column gap-3"
    >
      <li
        v-for="(item, hi) in stemHtmlList"
        :key="`quiz-history-stem-${hi}-${item.stem.slice(0, 32)}`"
        class="pe-2"
      >
        <div
          v-if="item.html"
          class="my-markdown-rendered lh-base text-break"
          v-html="item.html"
        />
        <span
          v-else
          class="lh-base text-break"
        >{{ item.stem }}</span>
      </li>
    </ol>
    <p
      v-else
      class="my-font-md-400 my-color-gray-1 mb-0"
    >
      尚無先前的出題。
    </p>
  </div>
</template>
