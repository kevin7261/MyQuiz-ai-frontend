<script setup>
/**
 * 分析頁逐題標題：{單元} > {題型}（對齊 ExamDetailPage 題目標題列；學生作答分析可選 person_id 子標題）
 */
import { computed } from 'vue';
import PackUnitTypeIcon from './PackUnitTypeIcon.vue';

const props = defineProps({
  unitLabel: { type: String, required: true },
  quizTypeLabel: { type: String, required: true },
  unitType: { type: [Number, String], default: null },
  isFollowUp: { type: Boolean, default: false },
  /** 學生作答分析：標題上方子標題顯示使用者 ID（無 label） */
  personId: { type: String, default: '' },
  design3: { type: Boolean, default: false },
});

const personIdTrimmed = computed(() => String(props.personId ?? '').trim());

const titleFontClass = computed(() =>
  props.design3 ? 'my-font-xl-400' : 'my-font-lg-600',
);
</script>

<template>
  <div class="d-flex flex-column gap-1 w-100 min-w-0 mb-0">
    <div
      v-if="personIdTrimmed"
      class="my-font-sm-400 my-color-gray-1 mb-0 text-break"
    >
      {{ personIdTrimmed }}
    </div>

    <div
      class="d-flex align-items-center w-100 min-w-0 mb-0"
      role="heading"
      aria-level="2"
      :aria-label="`${unitLabel} > ${quizTypeLabel}${isFollowUp ? '，追問' : ''}${personIdTrimmed ? `，${personIdTrimmed}` : ''}`"
    >
      <span
        class="analysis-item-unit-quiz-row my-color-black d-flex align-items-center gap-1 flex-nowrap min-w-0 flex-grow-1 overflow-hidden mb-0"
        :class="titleFontClass"
      >
        <span
          v-if="unitType != null"
          class="my-pack-unit-type-icon-slot flex-shrink-0"
          aria-hidden="true"
        >
          <PackUnitTypeIcon :unit-type="unitType" decorative />
        </span>
        <span class="analysis-item-unit-quiz-row__segment text-truncate">{{ unitLabel }}</span>
        <span
          class="my-inline-icon-slot flex-shrink-0"
          aria-hidden="true"
        >
          <i
            class="fa-solid fa-chevron-right analysis-item-unit-quiz-row__chevron"
            aria-hidden="true"
          />
        </span>
        <span class="d-flex align-items-center gap-1 min-w-0 flex-shrink-1 overflow-hidden">
          <span class="analysis-item-unit-quiz-row__segment text-truncate">{{ quizTypeLabel }}</span>
          <span
            v-if="isFollowUp"
            class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 flex-shrink-0"
          >追問</span>
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped src="../pages/AnalysisPage.css"></style>
