<script setup>
/**
 * QuizHistoryModal — 「先前出題」共用 Modal
 *
 * 供 ExamPage、CreateExamQuizBankPage（及 QuizCard 預覽）使用。
 * Bootstrap 5 風格；Teleport 至 body；點背景可關閉。
 *
 * Props:
 *   modelValue     Boolean  v-model：是否顯示
 *   unitLabel      String   單元名稱
 *   quizTypeLabel  String   題型名稱
 *   isFollowup     Boolean  true：顯示追問歷史（題目／參考答案／回答／評閱）
 *   historyList    Array    一般：string[]；追問：含 quiz_content 等欄位之 object[]
 *   titleId        String   aria-labelledby 用 id（多實例時須唯一）
 */
import { computed } from 'vue';
import { normalizeFollowupHistoryItem } from '../services/ragApi.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  unitLabel: { type: String, default: '—' },
  quizTypeLabel: { type: String, default: '—' },
  isFollowup: { type: Boolean, default: false },
  historyList: { type: Array, default: () => [] },
  titleId: { type: String, default: 'quiz-history-modal-title' },
});

const emit = defineEmits(['update:modelValue']);

function close() {
  emit('update:modelValue', false);
}

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
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal fade show d-block my-modal-backdrop"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="close"
    >
      <div
        class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
        @click.stop
      >
        <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
          <div class="modal-header border-bottom-0 p-0">
            <h5 :id="titleId" class="modal-title my-color-black">
              先前出題
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="關閉"
              @click="close"
            />
          </div>
          <div class="modal-body p-0" style="max-height: 70vh; overflow: auto;">
            <div class="d-flex flex-row flex-nowrap w-100 min-w-0 align-items-start gap-3 mb-3">
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
              v-if="isFollowup && followupEntries.length > 0"
              class="my-font-md-400 my-color-black text-break mb-0 ps-3 d-flex flex-column gap-4"
            >
              <li
                v-for="(entry, hi) in followupEntries"
                :key="`quiz-followup-history-${hi}-${entry.quiz_content.slice(0, 24)}`"
                class="pe-2"
              >
                <div class="d-flex flex-column gap-2">
                  <div>
                    <div class="my-color-gray-1 my-font-sm-400">題目</div>
                    <div class="my-color-black lh-base text-break mt-1">{{ entry.quiz_content }}</div>
                  </div>
                  <div>
                    <div class="my-color-gray-1 my-font-sm-400">參考答案</div>
                    <div class="my-color-black lh-base text-break mt-1">
                      {{ entry.quiz_answer_reference || '—' }}
                    </div>
                  </div>
                  <div>
                    <div class="my-color-gray-1 my-font-sm-400">回答</div>
                    <div class="my-color-black lh-base text-break mt-1">
                      {{ entry.answer_content || '—' }}
                    </div>
                  </div>
                  <div>
                    <div class="my-color-gray-1 my-font-sm-400">評閱</div>
                    <div class="my-color-black lh-base text-break mt-1">
                      {{ entry.answer_critique || '—' }}
                    </div>
                  </div>
                </div>
              </li>
            </ol>
            <ol
              v-else-if="!isFollowup && stemList.length > 0"
              class="my-font-md-400 my-color-black text-break mb-0 ps-3 d-flex flex-column gap-3"
            >
              <li
                v-for="(stem, hi) in stemList"
                :key="`quiz-history-stem-${hi}-${stem.slice(0, 32)}`"
                class="pe-2"
              >
                {{ stem }}
              </li>
            </ol>
            <p
              v-else
              class="my-font-md-400 my-color-gray-1 mb-0"
            >
              尚無先前的出題。
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
