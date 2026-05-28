<script setup>
/**
 * CourseSelectModal — 選擇課程 Modal
 *
 * 登入後首次出現（currentCourse 為 null 時），強制選擇一門課程。
 * 已有 currentCourse 時可透過 closable=true 允許關閉（不切換）。
 *
 * Props:
 *   open      Boolean  是否顯示
 *   courses   Array    可選課程列表（來自 authStore.courses）
 *   closable  Boolean  是否顯示關閉按鈕（已選課程時為 true）
 *
 * Emits:
 *   select(course)  使用者點選某門課
 *   close           使用者關閉 modal（僅 closable=true 時觸發）
 */
import { userTypeLabel } from '../router/permissions.js';

const props = defineProps({
  open: { type: Boolean, required: true },
  courses: { type: Array, default: () => [] },
  closable: { type: Boolean, default: false },
});

const emit = defineEmits(['select', 'close']);

function select(course) {
  emit('select', course);
}

function close() {
  if (!props.closable) return;
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal fade show d-block my-modal-backdrop"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-select-modal-title"
      @click.self="close"
    >
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" @click.stop>
        <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
          <div class="modal-header border-bottom-0 p-0">
            <h5 id="course-select-modal-title" class="modal-title my-color-black">
              選擇課程
            </h5>
            <button
              v-if="closable"
              type="button"
              class="btn-close"
              aria-label="關閉"
              @click="close"
            />
          </div>

          <div class="modal-body p-0 min-w-0">
            <p
              v-if="courses.length === 0"
              class="my-font-md-400 my-color-gray-1 mb-0"
            >
              目前沒有可用的課程
            </p>

            <div v-else class="d-flex flex-column gap-2">
              <button
                v-for="course in courses"
                :key="course.course_user_id"
                type="button"
                class="my-course-select-btn rounded-3 text-start border-0 px-3 py-2 w-100"
                @click="select(course)"
              >
                <span class="my-font-md-400 my-color-black text-break d-block">
                  {{ course.course_name || '（未命名課程）' }}
                </span>
                <span class="my-font-sm-400 my-color-gray-1 d-block mt-1">
                  {{ userTypeLabel(course.user_type) }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.my-course-select-btn {
  background-color: var(--my-color-gray-3);
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.my-course-select-btn:hover,
.my-course-select-btn:focus-visible {
  background-color: var(--my-color-gray-2);
  outline: none;
}
</style>
