<script setup>
/**
 * 出題區「選擇單元」：Bootstrap 5 dropdown（btn + dropdown-menu），行為等同原生 select + v-model。
 */
import { computed } from 'vue';
import { unitSelectValue } from '../utils/rag.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '— 請選擇單元 —' },
  /** 用於觸發鈕 id（會加上 -toggle），須在頁面內唯一 */
  menuId: { type: String, required: true },
});

const emit = defineEmits(['update:modelValue']);

const toggleId = computed(() => `${props.menuId}-toggle`);

const buttonLabel = computed(() => {
  const v = String(props.modelValue || '').trim();
  if (!v) return props.placeholder;
  const opt = props.options.find((o) => unitSelectValue(o) === v);
  if (opt && opt.rag_name != null && String(opt.rag_name).trim() !== '') {
    return String(opt.rag_name);
  }
  return props.placeholder;
});

function select(val) {
  emit('update:modelValue', val);
}
</script>

<template>
  <div class="dropdown w-100">
    <button
      :id="toggleId"
      class="btn btn-outline-secondary dropdown-toggle btn-sm w-100 d-flex align-items-center justify-content-between unit-select-dd-toggle"
      type="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      :disabled="disabled"
      :title="buttonLabel"
    >
      <span class="text-truncate text-start flex-grow-1 min-w-0 me-2">{{ buttonLabel }}</span>
    </button>
    <ul
      class="dropdown-menu dropdown-menu-start shadow-sm w-100 unit-select-dd-menu"
      :aria-labelledby="toggleId"
    >
      <li>
        <button
          type="button"
          class="dropdown-item"
          :class="{ active: !String(modelValue || '').trim() }"
          @click="select('')"
        >
          {{ placeholder }}
        </button>
      </li>
      <li v-for="(opt, i) in options" :key="unitSelectValue(opt) || 'u-' + i">
        <button
          type="button"
          class="dropdown-item text-wrap"
          :class="{ active: unitSelectValue(opt) === modelValue }"
          @click="select(unitSelectValue(opt))"
        >
          {{ opt.rag_name }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 觸發鈕與選單同寬，佔滿父層（父層請搭配 flex-grow-1 min-w-0 以在橫向排版吃滿剩餘寬度） */
.unit-select-dd-toggle {
  max-width: 100%;
}
.unit-select-dd-menu {
  max-height: 280px;
  overflow-y: auto;
  max-width: 100%;
}
</style>
