/**
 * 認證狀態 Store（Pinia）
 *
 * 職責：
 * - 存放目前登入使用者資料（登入成功後由 API 回傳並透過 setUser 寫入）
 * - 存放登入時回傳的課程列表（User_Course_Relation）
 * - 提供 setUser、setCourses、logout，供登入頁與導航守衛使用
 * - 啟用 persist，重新整理後仍保留登入狀態（依 pinia-plugin-persistedstate）
 *
 * 使用者物件欄位：user_id, person_id, name, user_type, llm_api_key 等（依後端 API）
 * 課程物件欄位：course_user_id, course_id, course_name, user_type
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore(
  'auth',
  () => {
    /** @type {import('vue').Ref<{ user_id: number, person_id: string, name?: string, password?: string, user_type?: number, llm_api_key?: string, user_metadata?: unknown, updated_at?: string, created_at?: string } | null>} 目前登入使用者，未登入為 null */
    const user = ref(null);

    /** @type {import('vue').Ref<Array<{ course_user_id: number, course_id: number, course_name: string, user_type: number }>>} 登入時回傳的課程列表 */
    const courses = ref([]);

    /** @type {import('vue').Ref<{ course_user_id: number, course_id: number, course_name: string, user_type: number } | null>} 目前選取的課程 */
    const currentCourse = ref(null);

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

    /**
     * 確認 currentCourse 仍存在於 courses 列表；無效則清空（persist 還原或列表變更時）
     */
    function validateCurrentCourse() {
      const c = currentCourse.value;
      if (!c) return;
      const valid = courses.value.some(
        (item) => item.course_id === c.course_id && item.course_user_id === c.course_user_id
      );
      if (!valid) currentCourse.value = null;
    }

    /**
     * 設定目前選取的課程
     * @param {{ course_user_id: number, course_id: number, course_name: string, user_type: number } | null} course
     */
    function setCurrentCourse(course) {
      currentCourse.value = course ?? null;
    }

    /** 登出：清空 user、courses 與 currentCourse，導航守衛會導向 /login */
    function logout() {
      user.value = null;
      courses.value = [];
      currentCourse.value = null;
    }

    return { user, courses, currentCourse, setUser, setCourses, setCurrentCourse, validateCurrentCourse, logout };
  },
  { persist: true }
);
