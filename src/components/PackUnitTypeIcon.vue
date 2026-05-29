<script setup>
import { computed } from 'vue';
import { packUnitTypeDisplayLabel, packUnitTypeIconClasses } from '../utils/rag.js';

const props = defineProps({
  unitType: { type: [Number, String], required: true },
  /** 已廢止：icon 一律繼承父層字色，請在父層設 .my-color-* */
  colorClass: { type: String, default: '' },
  /** 按鈕旁已有文字標籤時設 true，避免重複 aria */
  decorative: { type: Boolean, default: false },
});

const iconClass = computed(() => packUnitTypeIconClasses(props.unitType));
const ariaLabel = computed(() => packUnitTypeDisplayLabel(props.unitType));
</script>

<template>
  <i
    :class="[iconClass, 'my-pack-unit-type-icon']"
    :role="decorative ? undefined : 'img'"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : ariaLabel"
  />
</template>
