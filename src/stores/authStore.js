/**
 * 登入狀態：目前使用者（登入成功後由 API 回傳）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore(
  'auth',
  () => {
    /** @type {import('vue').Ref<{ user_id: number, name?: string, type?: number, created_at?: string, metadata?: unknown } | null>} */
    const user = ref(null);

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

    function logout() {
      user.value = null;
    }

    return { user, setUser, logout };
  },
  { persist: true }
);
