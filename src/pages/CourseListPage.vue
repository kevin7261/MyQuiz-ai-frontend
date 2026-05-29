<script setup>
/**
 * CourseListPage — 選擇課程頁
 *
 * 左側系統 header 的課程 icon 可導向此頁，供切換課程。
 * 以 query `scope` 指定要設定哪個功能頁的課程（各頁可不同）。
 */
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { userTypeLabel } from '../router/permissions.js';
import {
  COURSE_SCOPE_KEYS,
  courseScopeReturnPath,
  normalizeCourseScopeKey,
} from '../utils/courseScope.js';

defineProps({
  design3: { type: Boolean, default: false },
});

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const sortOrder = ref('asc');

const courses = computed(() => authStore.courses);

const scopeKey = computed(
  () => normalizeCourseScopeKey(route.query.scope) ?? COURSE_SCOPE_KEYS.EXAM,
);

const selectedCourse = computed(() => authStore.getCourseForScope(scopeKey.value));

const sortedCourses = computed(() => {
  const items = courses.value.map((course) => ({
    course,
    label: course.course_name || '（未命名課程）',
    subtitle: userTypeLabel(course.user_type),
    selected:
      selectedCourse.value?.course_id === course.course_id
      && selectedCourse.value?.course_user_id === course.course_user_id,
  }));
  return items.sort((a, b) =>
    sortOrder.value === 'asc'
      ? a.label.localeCompare(b.label, 'zh-TW')
      : b.label.localeCompare(a.label, 'zh-TW'),
  );
});

function toggleSort() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

function onCourseSelect(course) {
  const prev = selectedCourse.value;
  const isDifferent =
    !prev
    || prev.course_id !== course.course_id
    || prev.course_user_id !== course.course_user_id;
  authStore.setCourseForScope(scopeKey.value, course);
  if (isDifferent) {
    router.push(courseScopeReturnPath(scopeKey.value));
    return;
  }
  router.push(courseScopeReturnPath(scopeKey.value));
}
</script>

<template>
  <div class="course-list d-flex flex-column h-100 overflow-hidden my-bgcolor-white">
    <div
      class="exam-2__grid-scroll flex-grow-1 min-h-0 overflow-auto px-3 px-md-4 py-4 position-relative d-flex flex-column exam-2__grid-scroll--scrollbar"
    >
      <div
        v-if="courses.length === 0"
        class="flex-grow-1 d-flex justify-content-center align-items-center"
      >
        <p class="my-main-empty-hint mb-0 text-center text-break">
          目前沒有可用的課程
        </p>
      </div>

      <div v-else class="bank-list-wrap mx-auto">
        <div class="bank-table-header">
          <button
            type="button"
            class="bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1 flex-shrink-0"
            :aria-label="sortOrder === 'asc' ? '升冪排序，點擊改為降冪' : '降冪排序，點擊改為升冪'"
            @click="toggleSort"
          >
            名稱
            <i
              :class="['fa-solid', sortOrder === 'asc' ? 'fa-chevron-up' : 'fa-chevron-down']"
              aria-hidden="true"
            />
          </button>
        </div>

        <ul class="bank-list">
          <li v-for="item in sortedCourses" :key="item.course.course_user_id">
            <button
              type="button"
              class="bank-list-row"
              :class="{ 'bank-list-row--selected': item.selected }"
              @click="onCourseSelect(item.course)"
            >
              <span class="bank-list-row__label my-font-md-400 my-color-black">{{ item.label }}</span>
              <span
                v-if="item.subtitle"
                class="bank-list-row__subtitle my-font-sm-400 my-color-gray-1"
              >{{ item.subtitle }}</span>
              <i class="fa-solid fa-chevron-right bank-list-row__chevron" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.course-list .bank-list-row:hover:not(:disabled) {
  background-color: var(--my-color-gray-4);
}
.course-list .bank-list-row--selected {
  background-color: var(--my-color-gray-4);
}
</style>
