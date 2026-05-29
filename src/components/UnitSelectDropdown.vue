<script setup>
/**
 * 出題區「選擇單元」：Bootstrap 5 dropdown；行為等同原生 select + v-model。
 * 與 Design 08 一致：外層 .my-design-08-dropdown；觸發 rounded-2、my-button-white（白底、gray-3 邊）；選單 .dropdown-menu Bootstrap 預設。
 * omitEmptyChoice：不列「清空」項，適用必選之單元切換列。
 */
import { computed, ref, nextTick, onMounted } from 'vue';
import { unitSelectValue } from '../utils/rag.js';

/** 與 main.js 同一 Bootstrap 實例（window.bootstrap）；元件內勿 import 'bootstrap' */
function getBootstrapDropdown() {
  return typeof window !== 'undefined' ? window.bootstrap?.Dropdown : null;
}

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
  /** 選項是否顯示「追問」tag；未傳時不顯示 */
  optionFollowUp: { type: Function, default: null },
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

function getMenuEl() {
  return rootRef.value?.querySelector('.dropdown-menu') ?? null;
}

function getDropdownInstance() {
  const Dropdown = getBootstrapDropdown();
  const toggle = getToggleEl();
  if (!Dropdown || !toggle) return null;
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

function optFollowUp(o) {
  if (typeof props.optionFollowUp !== 'function') return false;
  return !!props.optionFollowUp(o);
}

const selectedOption = computed(() => {
  const v = String(props.modelValue || '').trim();
  if (!v) return null;
  return props.options.find((o) => optValue(o) === v) ?? null;
});

const buttonLabel = computed(() => {
  const opt = selectedOption.value;
  if (opt) return optLabel(opt);
  return props.placeholder;
});

const buttonFollowUp = computed(() => {
  const opt = selectedOption.value;
  return opt ? optFollowUp(opt) : false;
});

const buttonTitle = computed(() => {
  if (props.disabled && String(props.hintWhenDisabled ?? '').trim() !== '') {
    return String(props.hintWhenDisabled).trim();
  }
  return buttonLabel.value;
});

function hideDropdownMenu() {
  nextTick(() => {
    const inst = getDropdownInstance();
    if (inst) {
      inst.hide();
      return;
    }
    const toggle = getToggleEl();
    const menu = getMenuEl();
    toggle?.classList.remove('show');
    toggle?.setAttribute('aria-expanded', 'false');
    menu?.classList.remove('show');
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
      class="btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white w-100 min-w-0 mw-100 px-3 py-2 text-start"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      :disabled="disabled"
      :title="buttonTitle"
      v-bind="dropdownToggleBind"
    >
      <span class="d-flex align-items-center min-w-0 flex-grow-1 pe-2">
        <span class="text-truncate">{{ buttonLabel }}</span>
        <span
          v-if="buttonFollowUp"
          class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 ms-2 flex-shrink-0"
        >追問</span>
      </span>
      <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret flex-shrink-0" aria-hidden="true" />
    </button>
    <ul
      class="dropdown-menu dropdown-menu-start w-100 mw-100 overflow-y-auto my-unit-select-dd-menu"
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
          <span class="d-inline-flex align-items-center flex-wrap gap-1">
            <span>{{ optLabel(opt) }}</span>
            <span
              v-if="optFollowUp(opt)"
              class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1"
            >追問</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.my-unit-select-dd-menu {
  min-width: 100%;
  max-height: 280px;
}
</style>

<!-- Modal 內 static 下拉：提高 z-index，避免被其他層遮住 -->
<style>
.dropdown-menu.my-unit-select-dd-menu--in-modal {
  z-index: 2000 !important;
}
</style>
