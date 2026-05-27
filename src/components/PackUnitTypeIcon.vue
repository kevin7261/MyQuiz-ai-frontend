<script setup>
import { computed } from 'vue';
import { packUnitTypeDisplayLabel, packUnitTypeIconClasses } from '../utils/rag.js';

const props = defineProps({
  unitType: { type: [Number, String], required: true },
  colorClass: { type: String, default: 'my-color-gray-1' },
  /** 按鈕旁已有文字標籤時設 true，避免重複 aria */
  decorative: { type: Boolean, default: false },
});

const iconClass = computed(() => packUnitTypeIconClasses(props.unitType));
const ariaLabel = computed(() => packUnitTypeDisplayLabel(props.unitType));
/** decorative 時 icon 繼承按鈕字色，不套 colorClass */
const iconColorClass = computed(() => (props.decorative ? null : props.colorClass));
</script>

<template>
  <i
    :class="[
      iconClass,
      iconColorClass,
      'my-pack-unit-type-icon',
      decorative ? 'my-pack-unit-type-icon--inherit' : null,
    ]"
    :role="decorative ? undefined : 'img'"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : ariaLabel"
  />
</template>
