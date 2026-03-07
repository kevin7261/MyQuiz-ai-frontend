<script setup>
/** 個資修改頁面：PATCH /user/profile 更新 name、llm_api_key（以 person_id 識別）。 */
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/authStore.js';
import { API_BASE, API_UPDATE_PROFILE } from '../constants/api.js';
import LoadingOverlay from '../components/LoadingOverlay.vue';

const authStore = useAuthStore();

const name = ref('');
const llmApiKey = ref('');
const loading = ref(false);
const message = ref('');
const messageType = ref(''); // 'success' | 'danger'

const account = computed(() => authStore.user?.person_id ?? '—');

function initFromUser() {
  const u = authStore.user;
  name.value = u?.name ?? '';
  llmApiKey.value = u?.llm_api_key ?? '';
}
watch(() => authStore.user, initFromUser, { immediate: true });

async function saveProfile() {
  const personId = authStore.user?.person_id;
  if (!personId) {
    message.value = '請先登入';
    messageType.value = 'danger';
    return;
  }
  const payload = { person_id: String(personId) };
  if (name.value !== (authStore.user?.name ?? '')) payload.name = name.value;
  if (llmApiKey.value !== (authStore.user?.llm_api_key ?? '')) payload.llm_api_key = llmApiKey.value;
  if (Object.keys(payload).length === 1) {
    message.value = '未變更任何欄位';
    messageType.value = 'danger';
    return;
  }
  message.value = '';
  loading.value = true;
  try {
    const res = await fetch(`${API_BASE}${API_UPDATE_PROFILE}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = '更新失敗';
      try {
        const body = JSON.parse(text);
        if (body.detail) msg = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      } catch {
        if (text && text.length < 200) msg = text;
      }
      message.value = msg;
      messageType.value = 'danger';
      return;
    }
    const data = JSON.parse(text);
    const userData = data.user != null ? data.user : data;
    authStore.setUser(userData);
    initFromUser();
    message.value = '已儲存';
    messageType.value = 'success';
  } catch (e) {
    message.value = e.message || '無法連線，請確認後端已啟動';
    messageType.value = 'danger';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="d-flex flex-column bg-body-secondary h-100 position-relative">
    <LoadingOverlay
      :is-visible="loading"
      loading-text="執行中..."
    />
    <div class="flex-shrink-0 bg-white border-bottom">
      <div class="d-flex align-items-center gap-2 px-4 pt-2 pb-2">
        <span class="fs-5 fw-semibold">個資修改</span>
      </div>
    </div>
    <div class="flex-grow-1 overflow-auto bg-white p-4">
      <div class="bg-body-tertiary rounded text-start p-4 mb-3">
        <div class="fs-5 fw-semibold mb-3 pb-2 border-bottom">個人資料</div>
        <div class="mb-3">
          <label class="form-label small text-secondary fw-medium mb-1">帳號（person_id）</label>
          <input :value="account" type="text" class="form-control form-control-sm" placeholder="帳號" readonly disabled>
        </div>
        <div class="mb-3">
          <label class="form-label small text-secondary fw-medium mb-1">名稱</label>
          <input v-model="name" type="text" class="form-control form-control-sm" placeholder="名稱">
        </div>
        <div class="mb-3">
          <label class="form-label small text-secondary fw-medium mb-1">LLM API Key</label>
          <input v-model="llmApiKey" type="text" class="form-control form-control-sm" placeholder="選填，用於呼叫 LLM" autocomplete="off">
        </div>
        <div v-if="message" :class="['alert py-2 mb-3', messageType === 'success' ? 'alert-success' : 'alert-danger']" role="alert">
          {{ message }}
        </div>
        <button type="button" class="btn btn-primary btn-sm" :disabled="loading" @click="saveProfile">
          儲存
        </button>
      </div>
    </div>
  </div>
</template>
