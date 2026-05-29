<script>
  /**
   * LoginView - 登入頁
   *
   * 版面對齊 DesignPage profile_3（白底、label + input、my-button-white）。
   * 以 person_id（使用者帳號）與 password 呼叫 POST /user/login。
   */
  import { ref, computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { useAuthStore } from '../stores/authStore.js';
  import { useAppStore } from '../stores/appStore.js';
  import { API_BASE } from '../constants/api.js';
  import { loggedFetch } from '../utils/loggedFetch.js';
  import { logoDiamondGradientToCssLinear } from '../utils/logoDiamondGradient.js';
  import LoadingOverlay from '../components/LoadingOverlay.vue';
  import LogoGridSvg from '../components/LogoGridSvg.vue';
  import { useSystemHeaderLogoGradients } from '../composables/useSystemHeaderLogoGradients.js';

  export default {
    name: 'LoginView',
    components: { LoadingOverlay, LogoGridSvg },
    setup() {
      const router = useRouter();
      const authStore = useAuthStore();
      const appStore = useAppStore();
      const personId = ref('');
      const password = ref('');
      const loading = ref(false);
      const error = ref('');
      const {
        loginLogoColors,
        loginPageBgGradientCss,
        regenerateSystemHeaderLogoGradients: refreshLoginLogoGradient,
      } = useSystemHeaderLogoGradients();

      /** 51、53（secondary 左半）— 與 SVG 漸層向量一致 */
      const loginBrandMyquizCss = computed(() =>
        logoDiamondGradientToCssLinear(loginLogoColors.value.secondaryGradient, {
          useStopsOnly: true,
        }),
      );
      /** 52、54（primary 右半）— 與 SVG 漸層向量一致 */
      const loginBrandAiCss = computed(() =>
        logoDiamondGradientToCssLinear(loginLogoColors.value.primaryGradient, {
          useStopsOnly: true,
        }),
      );

      const canLogin = computed(
        () => personId.value.trim() !== '' && password.value.trim() !== '',
      );

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

      return {
        personId,
        password,
        loading,
        error,
        canLogin,
        onLogin,
        loginLogoColors,
        refreshLoginLogoGradient,
        loginBrandMyquizCss,
        loginBrandAiCss,
        loginPageBgGradientCss,
        currentVersion: appStore.currentVersion,
      };
    },
  };
</script>

<template>
  <div class="my-login-view-shell d-flex flex-column h-100 overflow-hidden position-relative">
    <div
      class="my-login-view-page-gradient"
      aria-hidden="true"
      :style="{ backgroundImage: loginPageBgGradientCss }"
    />
    <div class="my-login-view-content d-flex flex-column h-100 flex-grow-1 min-h-0">
    <LoadingOverlay :is-visible="loading" loading-text="登入中..." />
    <div class="flex-grow-1 overflow-auto d-flex flex-column min-h-0">
      <div
        class="container-fluid px-3 px-md-4 py-4 flex-grow-1 d-flex align-items-center justify-content-center"
      >
        <div class="my-login-view-card w-100 min-w-0">
          <div class="d-flex flex-column align-items-center text-center mb-5">
            <button
              type="button"
              class="my-login-view-logo flex-shrink-0"
              aria-label="重新產生標誌漸層"
              title="重新產生標誌漸層"
              @click="refreshLoginLogoGradient"
            >
              <LogoGridSvg
                :show-grid="false"
                unified-primary-gradient
                outer-cells-white-overlay
                size-to-container
                id-prefix="login"
                :colors="loginLogoColors"
              />
            </button>
            <p class="my-login-view-brand my-brand-wordmark my-font-xl-600 text-break text-center mb-0 mt-4">
              <span
                class="my-login-view-brand-part"
                :style="{ backgroundImage: loginBrandMyquizCss }"
              >MYQUIZ</span><span
                class="my-login-view-brand-part"
                :style="{ backgroundImage: loginBrandAiCss }"
              >.ai</span>
            </p>
          </div>
          <form class="d-flex flex-column gap-4 w-100 min-w-0 text-start pt-5" @submit.prevent="onLogin">
            <div class="d-flex flex-column gap-0 mb-0">
              <label class="form-label my-font-sm-400 my-color-gray-1 mb-0" for="login-person-id">使用者帳號</label>
              <input
                id="login-person-id"
                v-model="personId"
                type="text"
                class="form-control my-input-md rounded-2 w-100 px-3 py-2"
                placeholder="請輸入使用者帳號"
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
            <p v-if="error" class="my-color-red my-font-sm-400 mb-0 text-break text-center" role="alert">{{ error }}</p>
            <button
              type="submit"
              class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-login-view-submit-btn px-4 py-2 w-100"
              :disabled="loading || !canLogin"
              :aria-busy="loading"
            >
              登入
            </button>
          </form>
        </div>
      </div>
    </div>
    </div>
    <p class="my-login-view-version my-font-family-code my-font-sm-400 my-color-gray-1 text-center mb-0 px-3 py-3 flex-shrink-0">
      v{{ currentVersion }}
    </p>
  </div>
</template>

<style scoped>
.my-login-view-shell {
  background-color: var(--my-color-white);
}

.my-login-view-page-gradient {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.my-login-view-content {
  position: relative;
  z-index: 1;
}

.my-login-view-version {
  position: relative;
  z-index: 1;
}

.my-login-view-card {
  width: 100%;
  max-width: 360px;
}

.my-login-view-logo {
  width: calc(80pt * 4 / 3);
  height: 80pt;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  line-height: 0;
  cursor: pointer;
}

.my-login-view-brand {
  line-height: 1.35;
}

.my-login-view-brand-part {
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}
</style>

<style>
/* 漸層底上：輸入／登入鈕須實心白底（Bootstrap --bs-* 與透明 .btn 預設會透出背景） */
.my-login-view-shell #login-person-id,
.my-login-view-shell #login-password {
  --bs-body-bg: var(--my-color-white);
  background-color: var(--my-color-white) !important;
  color: var(--my-color-black) !important;
}

.my-login-view-shell #login-person-id::placeholder,
.my-login-view-shell #login-password::placeholder {
  color: var(--my-color-gray-3) !important;
  opacity: 1;
}

.my-login-view-shell #login-person-id::-webkit-input-placeholder,
.my-login-view-shell #login-password::-webkit-input-placeholder {
  color: var(--my-color-gray-3);
  -webkit-text-fill-color: var(--my-color-gray-3);
}

.my-login-view-shell #login-person-id:focus,
.my-login-view-shell #login-password:focus {
  background-color: var(--my-color-white) !important;
  color: var(--my-color-black) !important;
}

.my-login-view-shell #login-person-id:disabled,
.my-login-view-shell #login-password:disabled {
  background-color: var(--my-color-white) !important;
  color: var(--my-color-black) !important;
  opacity: 1;
}

.my-login-view-shell #login-person-id:-webkit-autofill,
.my-login-view-shell #login-person-id:-webkit-autofill:hover,
.my-login-view-shell #login-person-id:-webkit-autofill:focus,
.my-login-view-shell #login-password:-webkit-autofill,
.my-login-view-shell #login-password:-webkit-autofill:hover,
.my-login-view-shell #login-password:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--my-color-black);
  box-shadow: 0 0 0 1000px var(--my-color-white) inset;
  transition: background-color 9999s ease-out 0s;
}

.my-login-view-shell .btn.my-login-view-submit-btn {
  --bs-btn-bg: var(--my-color-white);
  --bs-btn-hover-bg: var(--my-color-white);
  --bs-btn-active-bg: var(--my-color-white);
  --bs-btn-disabled-bg: var(--my-color-white);
  --bs-btn-border-color: var(--my-color-gray-3);
  --bs-btn-hover-border-color: var(--my-color-gray-3);
  --bs-btn-active-border-color: var(--my-color-gray-3);
  background-color: var(--my-color-white) !important;
  color: var(--my-color-black) !important;
  border: 1px solid var(--my-color-gray-3) !important;
  box-shadow: none !important;
}

.my-login-view-shell .btn.my-login-view-submit-btn:hover:not(:disabled),
.my-login-view-shell .btn.my-login-view-submit-btn:focus-visible:not(:disabled) {
  background-color: var(--my-color-white) !important;
  color: var(--my-color-black) !important;
  border-color: var(--my-color-gray-3) !important;
  box-shadow: 0 0 1rem rgba(0, 0, 0, 0.25) !important;
}

.my-login-view-shell .btn.my-login-view-submit-btn:active:not(:disabled) {
  background-color: var(--my-color-white) !important;
  color: var(--my-color-black) !important;
}

.my-login-view-shell .btn.my-login-view-submit-btn:disabled {
  --bs-btn-disabled-bg: var(--my-color-white);
  --bs-btn-disabled-border-color: var(--my-color-gray-3);
  --bs-btn-disabled-color: var(--my-color-gray-3);
  background-color: var(--my-color-white) !important;
  color: var(--my-color-gray-3) !important;
  border: 1px solid var(--my-color-gray-3) !important;
  opacity: 1;
}
</style>
