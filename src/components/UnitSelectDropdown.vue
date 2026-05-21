<script setup>
/**
 * 出題區「選擇單元」：Bootstrap 5 dropdown；行為等同原生 select + v-model。
 * 與 Design 08 一致：外層 .my-design-08-dropdown；觸發 rounded-2、my-button-white（白底、gray-2 邊）；選單 .dropdown-menu Bootstrap 預設。
 * omitEmptyChoice：不列「清空」項，適用必選之單元切換列。
 */
import { computed, ref, nextTick, onMounted } from 'vue';
import { Dropdown } from 'bootstrap';
import { unitSelectValue } from '../utils/rag.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: '— 請選擇單元 —' },
  /** 用於觸發鈕 id（會加上 -toggle），須在頁面內唯一 */
  menuId: { type: String, required: true },
  /** 選項 value；未傳時等同 unitSelectValue（單元 outputs） */
  optionValue: { type: Function, default: null },
  /** 選項顯示文字；未傳時使用 rag_name */
  optionLabel: { type: Function, default: null },
  /** disabled 時觸發鈕 title（例如「請先選擇單元」）；未設則用顯示文字 */
  hintWhenDisabled: { type: String, default: '' },
  /** true 時不顯示「清空／清空至 placeholder」選項（僅列出 options，適用必選之單元切換） */
  omitEmptyChoice: { type: Boolean, default: false },
  /** Modal 內使用：static 定位 + 提高 z-index，避免選單被 modal 裁切或無法點擊 */
  inModal: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const rootRef = ref(null);
const toggleId = computed(() => `${props.menuId}-toggle`);

const dropdownRootBind = computed(() =>
  props.inModal ? {} : { 'data-bs-display': 'static' },
);

/** Bootstrap 只讀 toggle 上的 data-bs-*；Modal 內用 static 避免 Popper 被裁切 */
const dropdownToggleBind = computed(() =>
  props.inModal ? { 'data-bs-display': 'static' } : {},
);

function getToggleEl() {
  return rootRef.value?.querySelector('[data-bs-toggle="dropdown"]') ?? null;
}

function getDropdownInstance() {
  const toggle = getToggleEl();
  if (!toggle) return null;
  const config = props.inModal ? { display: 'static' } : {};
  return Dropdown.getInstance(toggle) ?? Dropdown.getOrCreateInstance(toggle, config);
}

onMounted(() => {
  if (!props.inModal) return;
  nextTick(() => {
    getDropdownInstance();
  });
});

function optValue(o) {
  if (typeof props.optionValue === 'function') {
    return String(props.optionValue(o) ?? '').trim();
  }
  return unitSelectValue(o);
}

function optLabel(o) {
  if (typeof props.optionLabel === 'function') {
    return String(props.optionLabel(o) ?? '').trim() || '—';
  }
  if (o && o.rag_name != null && String(o.rag_name).trim() !== '') {
    return String(o.rag_name);
  }
  return '—';
}

const buttonLabel = computed(() => {
  const v = String(props.modelValue || '').trim();
  if (!v) return props.placeholder;
  const opt = props.options.find((o) => optValue(o) === v);
  if (opt) return optLabel(opt);
  return props.placeholder;
});

const buttonTitle = computed(() => {
  if (props.disabled && String(props.hintWhenDisabled ?? '').trim() !== '') {
    return String(props.hintWhenDisabled).trim();
  }
  return buttonLabel.value;
});

function hideDropdownMenu() {
  nextTick(() => {
    getDropdownInstance()?.hide();
  });
}

function select(val) {
  emit('update:modelValue', val);
  hideDropdownMenu();
}
</script>

<template>
  <div
    ref="rootRef"
    class="dropdown w-100 my-design-08-dropdown"
    v-bind="dropdownRootBind"
  >
    <button
      :id="toggleId"
      type="button"
      class="btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white w-100 min-w-0 px-3 py-2 text-start my-unit-select-dd-toggle"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      :disabled="disabled"
      :title="buttonTitle"
      v-bind="dropdownToggleBind"
    >
      <span class="text-truncate flex-grow-1 pe-2">{{ buttonLabel }}</span>
      <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret flex-shrink-0" aria-hidden="true" />
    </button>
    <ul
      class="dropdown-menu dropdown-menu-start w-100 my-unit-select-dd-menu"
      :class="{ 'my-unit-select-dd-menu--in-modal': inModal }"
      :aria-labelledby="toggleId"
    >
      <li v-if="!omitEmptyChoice">
        <button
          type="button"
          class="dropdown-item"
          :class="{ active: !String(modelValue || '').trim() }"
          @click="select('')"
        >
          {{ placeholder }}
        </button>
      </li>
      <li v-for="(opt, i) in options" :key="optValue(opt) || 'u-' + i">
        <button
          type="button"
          class="dropdown-item text-wrap"
          :class="{ active: optValue(opt) === modelValue }"
          @click="select(optValue(opt))"
        >
          {{ optLabel(opt) }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 觸發鈕與選單同寬，佔滿父層 */
.my-unit-select-dd-toggle {
  max-width: 100%;
}
.my-unit-select-dd-menu {
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  max-height: 280px;
  overflow-y: auto;
  box-sizing: border-box;
}
</style>

<!-- Modal 內 static 下拉：提高 z-index，避免被其他層遮住 -->
<style>
.dropdown-menu.my-unit-select-dd-menu--in-modal {
  z-index: 2000 !important;
}
</style>
