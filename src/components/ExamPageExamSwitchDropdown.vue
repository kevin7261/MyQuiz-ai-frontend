<script setup>
defineProps({
  gridItems: { type: Array, default: () => [] },
  selectedExamTabId: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['switch-exam']);
</script>

<template>
  <div
    class="exam-page-exam-switch my-design-08-dropdown dropdown flex-shrink-0 position-static"
  >
    <button
      type="button"
      class="btn rounded-pill d-inline-flex align-items-center dropdown-toggle my-dropdown-caret flex-shrink-0 text-nowrap my-font-md-400 my-color-gray-1 my-course-header-nav-btn gap-2 px-4 py-2"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      aria-label="所有試卷"
      :disabled="disabled"
    >
      <span>所有試卷</span>
      <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret flex-shrink-0" aria-hidden="true" />
    </button>
    <ul class="dropdown-menu dropdown-menu-end exam-page-exam-switch-menu my-course-header__user-menu">
      <li v-if="gridItems.length === 0">
        <span class="dropdown-item disabled">尚無測驗</span>
      </li>
      <li v-for="item in gridItems" :key="item.tabId">
        <button
          type="button"
          class="dropdown-item"
          :class="{ active: item.tabId === selectedExamTabId }"
          @click="emit('switch-exam', item.tabId, item.label)"
        >
          <span class="text-truncate">{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.exam-page-exam-switch-menu {
  min-width: 10rem;
  max-height: min(60vh, 24rem);
  overflow-x: hidden;
  overflow-y: auto;
  z-index: 1100;
}

.exam-page-exam-switch-menu > li {
  display: block;
  width: 100%;
}

.exam-page-exam-switch-menu .dropdown-item {
  width: 100%;
  white-space: nowrap;
}

.exam-page-exam-switch .btn.dropdown-toggle.my-course-header-nav-btn {
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-2);
  box-shadow: none;
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

.exam-page-exam-switch .btn.dropdown-toggle:hover:not(:disabled),
.exam-page-exam-switch .btn.dropdown-toggle:focus-visible:not(:disabled),
.exam-page-exam-switch .btn.dropdown-toggle:active:not(:disabled),
.exam-page-exam-switch .btn.dropdown-toggle.show {
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  border-color: color-mix(in srgb, var(--my-color-black) 18%, var(--my-color-gray-2));
  outline: none;
}
</style>
