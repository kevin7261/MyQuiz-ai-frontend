<script>
  /**
   * LoginView - 登入頁
   *
   * 版面對齊 DesignPage profile_3（白底、label + input、my-button-white）。
   * 以 person_id（使用者 ID）與 password 呼叫 POST /user/login。
   */
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useAuthStore } from '../stores/authStore.js';
  import { API_BASE } from '../constants/api.js';
  import { loggedFetch } from '../utils/loggedFetch.js';
  import LoadingOverlay from '../components/LoadingOverlay.vue';
  import LogoGridSvg from '../components/LogoGridSvg.vue';

  export default {
    name: 'LoginView',
    components: { LoadingOverlay, LogoGridSvg },
    setup() {
      const router = useRouter();
      const authStore = useAuthStore();
      const personId = ref('');
      const password = ref('');
      const loading = ref(false);
      const error = ref('');

      const onLogin = async () => {
        error.value = '';
        loading.value = true;
        try {
          const res = await loggedFetch(
            `${API_BASE}/user/login`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ person_id: personId.value, password: password.value }),
            },
            { personId: personId.value, omitCourseQuery: true }
          );
          const text = await res.text();
          if (!res.ok) {
            let msg = '登入失敗';
            try {
              const body = JSON.parse(text);
              if (body.detail) msg = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
            } catch {
              if (text && text.length < 150) msg = text;
            }
            error.value = msg;
            return;
          }
          const data = JSON.parse(text);
          const userData = data.user != null ? data.user : data;
          authStore.setUser(userData);
          authStore.setCourses(data.courses ?? []);
          router.push('/exam');
        } catch (e) {
          error.value = e.message || '無法連線，請檢查網路或稍後再試';
        } finally {
          loading.value = false;
        }
      };

      return { personId, password, loading, error, onLogin };
    },
  };
</script>

<template>
  <div class="d-flex flex-column h-100 overflow-hidden my-bgcolor-white position-relative">
    <LoadingOverlay :is-visible="loading" loading-text="登入中..." />
    <div class="flex-grow-1 overflow-auto d-flex flex-column min-h-0 my-bgcolor-white">
      <div
        class="container-fluid px-3 px-md-4 py-4 flex-grow-1 d-flex align-items-center justify-content-center"
      >
        <div class="my-login-view-card w-100 min-w-0">
          <div class="d-flex flex-column align-items-center text-center mb-4">
            <div class="my-login-view-logo flex-shrink-0" aria-hidden="true">
              <LogoGridSvg
                :show-grid="false"
                size-to-container
                id-prefix="login"
              />
            </div>
            <p class="my-login-view-brand my-font-xl-400 my-color-black text-break mb-0 mt-3">
              MyQuiz.ai
            </p>
          </div>
          <form class="d-flex flex-column gap-4 w-100 min-w-0 text-start" @submit.prevent="onLogin">
            <div class="d-flex flex-column gap-0 mb-0">
              <label class="form-label my-font-sm-400 my-color-gray-1 mb-0" for="login-person-id">使用者 ID</label>
              <input
                id="login-person-id"
                v-model="personId"
                type="text"
                class="form-control my-input-md rounded-2 w-100 px-3 py-2"
                placeholder="請輸入使用者 ID"
                autocomplete="username"
                :disabled="loading"
              >
            </div>
            <div class="d-flex flex-column gap-0 mb-0">
              <label class="form-label my-font-sm-400 my-color-gray-1 mb-0" for="login-password">密碼</label>
              <input
                id="login-password"
                v-model="password"
                type="text"
                class="form-control my-input-md rounded-2 w-100 px-3 py-2"
                placeholder="請輸入密碼"
                autocomplete="current-password"
                :disabled="loading"
              >
            </div>
            <p v-if="error" class="my-color-red my-font-sm-400 mb-0 text-break" role="alert">{{ error }}</p>
            <button
              type="submit"
              class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white px-4 py-2 w-100"
              :disabled="loading"
              :aria-busy="loading"
            >
              登入
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-login-view-card {
  width: 100%;
  max-width: 360px;
}

.my-login-view-logo {
  width: calc(128pt * 4 / 3);
  height: 128pt;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.my-login-view-brand {
  line-height: 1.35;
}
</style>
