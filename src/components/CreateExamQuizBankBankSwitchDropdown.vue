<script setup>
defineProps({
  gridItems: { type: Array, default: () => [] },
  selectedBankTabId: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** course-header-nav＝課程 header；detail-bar＝左側 detail bar（_2） */
  variant: {
    type: String,
    default: 'course-header-nav',
    validator: (v) => ['course-header-nav', 'detail-bar'].includes(v),
  },
});

const emit = defineEmits(['switch-bank']);
</script>

<template>
  <div
    class="create-exam-bank-bank-switch my-design-08-dropdown dropdown flex-shrink-0 position-static"
    :class="{ 'create-exam-bank-bank-switch--detail-bar': variant === 'detail-bar' }"
  >
    <button
      type="button"
      class="btn rounded-pill d-inline-flex align-items-center dropdown-toggle my-dropdown-caret flex-shrink-0 text-nowrap"
      :class="
        variant === 'course-header-nav'
          ? 'my-font-md-400 my-color-gray-1 my-course-header-nav-btn gap-2 px-4 py-2'
          : 'my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-2 py-1 justify-content-between text-start text-nowrap'
      "
      data-bs-toggle="dropdown"
      aria-expanded="false"
      aria-label="所有題庫"
      :disabled="disabled"
    >
      <span :class="variant === 'detail-bar' ? 'pe-2' : ''">所有題庫</span>
      <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret flex-shrink-0" aria-hidden="true" />
    </button>
    <ul
      class="dropdown-menu dropdown-menu-end create-exam-bank-bank-switch-menu my-nav-switch-dropdown-menu"
      :class="{ 'my-course-header__user-menu': variant === 'course-header-nav' }"
    >
      <li v-if="gridItems.length === 0">
        <span class="dropdown-item disabled">尚無題庫</span>
      </li>
      <li v-for="item in gridItems" :key="item.tabId">
        <button
          type="button"
          class="dropdown-item"
          :class="{ active: item.tabId === selectedBankTabId }"
          @click="emit('switch-bank', item.tabId, item.label)"
        >
          <span class="d-flex align-items-center gap-2 w-100 min-w-0">
            <span class="text-truncate flex-grow-1 min-w-0">{{ item.label }}</span>
            <span
              v-if="item.isExam"
              class="rounded-circle d-inline-block flex-shrink-0 my-bgcolor-green"
              style="width: 0.5rem; height: 0.5rem"
              title="試卷用題庫"
              aria-label="試卷用題庫"
            />
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>

.create-exam-bank-bank-switch:not(.create-exam-bank-bank-switch--detail-bar) .btn.dropdown-toggle.my-course-header-nav-btn {
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-3);
  box-shadow: none;
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

.create-exam-bank-bank-switch:not(.create-exam-bank-bank-switch--detail-bar) .btn.dropdown-toggle:hover:not(:disabled),
.create-exam-bank-bank-switch:not(.create-exam-bank-bank-switch--detail-bar) .btn.dropdown-toggle:focus-visible:not(:disabled),
.create-exam-bank-bank-switch:not(.create-exam-bank-bank-switch--detail-bar) .btn.dropdown-toggle:active:not(:disabled),
.create-exam-bank-bank-switch:not(.create-exam-bank-bank-switch--detail-bar) .btn.dropdown-toggle.show {
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  border-color: color-mix(in srgb, var(--my-color-black) 18%, var(--my-color-gray-3));
  outline: none;
}
</style>
