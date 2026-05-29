/**
 * 認證狀態 Store（Pinia）
 *
 * 職責：
 * - 存放目前登入使用者資料（登入成功後由 API 回傳並透過 setUser 寫入）
 * - 存放登入時回傳的課程列表（User_Course_Relation）
 * - 各功能頁各自記憶已選課程（coursesByScope）；currentCourse 為目前路由 scope 對應的課程
 * - 提供 setUser、setCourses、logout，供登入頁與導航守衛使用
 * - 啟用 persist，重新整理後仍保留登入狀態（依 pinia-plugin-persistedstate）
 *
 * 使用者物件欄位：user_id, person_id, name, user_type, llm_api_key 等（依後端 API）
 * 課程物件欄位：course_user_id, course_id, course_name, user_type
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  ALL_COURSE_SCOPE_KEYS,
  COURSE_SCOPE_KEYS,
  normalizeCourseScopeKey,
  resolveCourseScopeKey,
} from '../utils/courseScope.js';

/** @param {{ course_user_id: number, course_id: number, course_name: string, user_type: number }} course */
function cloneCourse(course) {
  return { ...course };
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    /** @type {import('vue').Ref<{ user_id: number, person_id: string, name?: string, password?: string, user_type?: number, llm_api_key?: string, user_metadata?: unknown, updated_at?: string, created_at?: string } | null>} 目前登入使用者，未登入為 null */
    const user = ref(null);

    /** @type {import('vue').Ref<Array<{ course_user_id: number, course_id: number, course_name: string, user_type: number }>>} 登入時回傳的課程列表 */
    const courses = ref([]);

    /**
     * 各功能頁已選課程（persist）；key 見 courseScope.js
     * @type {import('vue').Ref<Record<string, { course_user_id: number, course_id: number, course_name: string, user_type: number }>>}
     */
    const coursesByScope = ref({});

    /** 目前路由對應的課程 scope（不 persist；由 router afterEach 更新） */
    const activeCourseScopeKey = ref(null);

    /** 目前路由 scope 的課程；API 與 UI 讀取此值 */
    const currentCourse = computed(() => getCourseForScope(activeCourseScopeKey.value));

    /**
     * @param {string | null | undefined} scopeKey
     * @returns {{ course_user_id: number, course_id: number, course_name: string, user_type: number } | null}
     */
    function getCourseForScope(scopeKey) {
      const key = normalizeCourseScopeKey(scopeKey);
      if (!key) return null;
      const c = coursesByScope.value[key];
      if (!c || c.course_id == null) return null;
      return c;
    }

    /**
     * @param {string | null | undefined} scopeKey
     * @param {{ course_user_id: number, course_id: number, course_name: string, user_type: number } | null} course
     */
    function setCourseForScope(scopeKey, course) {
      const key = normalizeCourseScopeKey(scopeKey);
      if (!key) return;
      if (!course) {
        const next = { ...coursesByScope.value };
        delete next[key];
        coursesByScope.value = next;
        return;
      }
      coursesByScope.value = {
        ...coursesByScope.value,
        [key]: cloneCourse(course),
      };
    }

    /**
     * @param {import('vue-router').RouteLocationNormalizedLoaded} route
     */
    function syncActiveCourseScopeFromRoute(route) {
      if (route.name === 'Courses') {
        const fromQuery = normalizeCourseScopeKey(route.query?.scope);
        if (fromQuery) activeCourseScopeKey.value = fromQuery;
        return;
      }
      activeCourseScopeKey.value = resolveCourseScopeKey(route);
    }

    /**
     * 設定目前使用者（登入成功時呼叫）
     * @param {object | null} userData - 後端回傳的使用者物件；傳 null 會清空
     */
    function setUser(userData) {
      if (!userData) {
        user.value = null;
        return;
      }
      const u = { ...userData };
      // 後端可能回傳 id 而非 user_id，統一設為 user_id 供前端與 API 使用
      if (u.user_id == null && u.id != null) u.user_id = u.id;
      user.value = u;
    }

    /**
     * 設定課程列表（登入成功時呼叫）
     * @param {Array | null} coursesData - 後端回傳的課程陣列；傳 null 或空陣列會清空
     */
    function setCourses(coursesData) {
      courses.value = Array.isArray(coursesData) ? coursesData : [];
      validateCurrentCourse();
    }

    function isCourseInList(course) {
      if (!course) return false;
      return courses.value.some(
        (item) => item.course_id === course.course_id && item.course_user_id === course.course_user_id,
      );
    }

    /** 確認 coursesByScope 各項仍存在於 courses 列表；無效則移除 */
    function validateCurrentCourse() {
      const next = { ...coursesByScope.value };
      let changed = false;
      for (const [key, c] of Object.entries(next)) {
        if (!isCourseInList(c)) {
          delete next[key];
          changed = true;
        }
      }
      if (changed) coursesByScope.value = next;
    }

    /**
     * 設定目前路由 scope 的課程（相容舊 API）
     * @param {{ course_user_id: number, course_id: number, course_name: string, user_type: number } | null} course
     */
    function setCurrentCourse(course) {
      const key = activeCourseScopeKey.value ?? COURSE_SCOPE_KEYS.EXAM;
      setCourseForScope(key, course);
    }

    /** 舊版 persist 僅存單一 currentCourse 時，複製到各 scope（僅在 coursesByScope 為空時執行一次） */
    function migrateLegacyCourseState() {
      if (Object.keys(coursesByScope.value).length > 0) return;
      try {
        const raw = localStorage.getItem('auth');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const legacy = parsed?.currentCourse;
        if (!legacy?.course_id || !isCourseInList(legacy)) return;
        const seeded = cloneCourse(legacy);
        coursesByScope.value = Object.fromEntries(
          ALL_COURSE_SCOPE_KEYS.map((key) => [key, { ...seeded }]),
        );
      } catch {
        /* ignore */
      }
    }

    /** 登出：清空 user、courses 與各頁課程，導航守衛會導向 /login */
    function logout() {
      user.value = null;
      courses.value = [];
      coursesByScope.value = {};
      activeCourseScopeKey.value = null;
    }

    return {
      user,
      courses,
      coursesByScope,
      activeCourseScopeKey,
      currentCourse,
      setUser,
      setCourses,
      getCourseForScope,
      setCourseForScope,
      syncActiveCourseScopeFromRoute,
      setCurrentCourse,
      validateCurrentCourse,
      migrateLegacyCourseState,
      logout,
    };
  },
  {
    persist: {
      pick: ['user', 'courses', 'coursesByScope'],
    },
  },
);
