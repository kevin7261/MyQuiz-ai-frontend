<script>
  /**
   * LoginView - 登入頁
   *
   * 版面對齊 DesignPage profile_3（白底、label + input、my-button-white）。
   * 以 person_id（使用者 ID）與 password 呼叫 POST /user/login。
   */
  import { ref, computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { useAuthStore } from '../stores/authStore.js';
  import { API_BASE } from '../constants/api.js';
  import { loggedFetch } from '../utils/loggedFetch.js';
  import {
    createRandomLogoDiamondGradient,
    createRandomLogoGradientCss,
    logoDiamondGradientToCssLinear,
  } from '../utils/logoDiamondGradient.js';
  import LoadingOverlay from '../components/LoadingOverlay.vue';
  import LogoGridSvg from '../components/LogoGridSvg.vue';

  /** 登入頁漸層僅線性（不用徑向／錐形／mesh） */
  const LOGIN_GRADIENT_OPTIONS = { linearOnly: true };

  function buildLoginLogoColors() {
    const primaryGrad = createRandomLogoDiamondGradient(LOGIN_GRADIENT_OPTIONS);
    const secondaryGrad = createRandomLogoDiamondGradient(LOGIN_GRADIENT_OPTIONS);
    return {
      background: 'transparent',
      diamondFill: '#ffffff',
      primaryGradient: {
        x1: primaryGrad.x1,
        y1: primaryGrad.y1,
        x2: primaryGrad.x2,
        y2: primaryGrad.y2,
        stops: primaryGrad.stops,
        css: primaryGrad.css,
      },
      secondaryGradient: {
        x1: secondaryGrad.x1,
        y1: secondaryGrad.y1,
        x2: secondaryGrad.x2,
        y2: secondaryGrad.y2,
        stops: secondaryGrad.stops,
        css: secondaryGrad.css,
      },
    };
  }

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
      const loginLogoColors = ref(buildLoginLogoColors());
      const loginPageBgGradientCss = ref(createRandomLogoGradientCss(LOGIN_GRADIENT_OPTIONS));

      function refreshLoginLogoGradient() {
        loginLogoColors.value = buildLoginLogoColors();
        loginPageBgGradientCss.value = createRandomLogoGradientCss(LOGIN_GRADIENT_OPTIONS);
      }

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
        onLogin,
        loginLogoColors,
        refreshLoginLogoGradient,
        loginBrandMyquizCss,
        loginBrandAiCss,
        loginPageBgGradientCss,
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
            <p class="my-login-view-brand my-font-xl-600 text-break mb-0 mt-3">
              <span
                class="my-login-view-brand-part"
                :style="{ backgroundImage: loginBrandMyquizCss }"
              >MYQUIZ</span><span
                class="my-login-view-brand-part"
                :style="{ backgroundImage: loginBrandAiCss }"
              >.ai</span>
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
  </div>
</template>

<style scoped>
.my-login-view-shell {
  background-color: #ffffff;
}

.my-login-view-page-gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.2;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 100%);
}

.my-login-view-content {
  position: relative;
  z-index: 1;
}

.my-login-view-card {
  width: 100%;
  max-width: 360px;
}

.my-login-view-logo {
  width: calc(160pt * 4 / 3);
  height: 160pt;
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
