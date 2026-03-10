<script setup>
/**
 * SystemSettingsPage - 系統設定頁面
 *
 * 課程名稱：GET /system-settings/course-name、PUT /system-settings/course-name（body 僅傳 { course_name }）。
 * LLM API Key：GET /system-settings/llm-api-key、PUT /system-settings/llm-api-key（body 僅傳 { llm_api_key }，空字串表示清除）。
 * 進入頁面時依 authStore.user 觸發取得，儲存後顯示成功/失敗訊息。
 */
import { ref, watch } from 'vue';
import { useAuthStore } from '../stores/authStore.js';
import { API_BASE, API_GET_LLM_API_KEY, API_GET_SYSTEM_SETTING_COURSE_NAME, API_PUT_SYSTEM_SETTING_COURSE_NAME, API_PUT_SYSTEM_SETTING_LLM_API_KEY } from '../constants/api.js';
import LoadingOverlay from '../components/LoadingOverlay.vue';

const authStore = useAuthStore();

const llmApiKey = ref('');
const courseName = ref('');
const fetchLoading = ref(false);
const loadingCourseName = ref(false);
const loadingLlmApiKey = ref(false);
const messageCourseName = ref('');
const messageTypeCourseName = ref(''); // 'success' | 'danger'
const messageLlmApiKey = ref('');
const messageTypeLlmApiKey = ref(''); // 'success' | 'danger'

async function fetchSettings() {
  if (!authStore.user) {
    llmApiKey.value = '';
    courseName.value = '';
    return;
  }
  fetchLoading.value = true;
  messageCourseName.value = '';
  messageLlmApiKey.value = '';
  try {
    const [courseRes, llmRes] = await Promise.all([
      fetch(`${API_BASE}${API_GET_SYSTEM_SETTING_COURSE_NAME}`, { method: 'GET' }),
      fetch(`${API_BASE}${API_GET_LLM_API_KEY}`, { method: 'GET' }),
    ]);
    const courseText = await courseRes.text();
    const llmText = await llmRes.text();
    if (!courseRes.ok) {
      try {
        const body = courseText ? JSON.parse(courseText) : {};
        if (body.detail) messageCourseName.value = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      } catch {
        if (courseText && courseText.length < 200) messageCourseName.value = courseText;
      }
      messageTypeCourseName.value = 'danger';
      return;
    }
    if (!llmRes.ok) {
      try {
        const body = llmText ? JSON.parse(llmText) : {};
        if (body.detail) messageLlmApiKey.value = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      } catch {
        if (llmText && llmText.length < 200) messageLlmApiKey.value = llmText;
      }
      messageTypeLlmApiKey.value = 'danger';
      return;
    }
    const courseData = courseText ? JSON.parse(courseText) : {};
    const llmData = llmText ? JSON.parse(llmText) : {};
    courseName.value = courseData?.course_name != null ? String(courseData.course_name) : '';
    llmApiKey.value = llmData?.llm_api_key != null ? String(llmData.llm_api_key) : '';
  } catch (e) {
    messageCourseName.value = e.message || '無法連線，請確認後端已啟動';
    messageTypeCourseName.value = 'danger';
  } finally {
    fetchLoading.value = false;
  }
}

watch(() => authStore.user, fetchSettings, { immediate: true });

async function putSettingByUrl(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = '儲存失敗';
    try {
      const parsed = JSON.parse(text);
      if (parsed.detail) msg = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
    } catch {
      if (text && text.length < 200) msg = text;
    }
    throw new Error(msg);
  }
  return text ? JSON.parse(text) : {};
}

async function saveCourseName() {
  if (!authStore.user) {
    messageCourseName.value = '請先登入';
    messageTypeCourseName.value = 'danger';
    return;
  }
  loadingCourseName.value = true;
  messageCourseName.value = '';
  try {
    await putSettingByUrl(API_PUT_SYSTEM_SETTING_COURSE_NAME, { course_name: courseName.value ?? '' });
    messageCourseName.value = '課程名稱已儲存';
    messageTypeCourseName.value = 'success';
  } catch (e) {
    messageCourseName.value = e.message || '無法連線，請確認後端已啟動';
    messageTypeCourseName.value = 'danger';
  } finally {
    loadingCourseName.value = false;
  }
}

async function saveLlmApiKey() {
  if (!authStore.user) {
    messageLlmApiKey.value = '請先登入';
    messageTypeLlmApiKey.value = 'danger';
    return;
  }
  loadingLlmApiKey.value = true;
  messageLlmApiKey.value = '';
  try {
    await putSettingByUrl(API_PUT_SYSTEM_SETTING_LLM_API_KEY, { llm_api_key: llmApiKey.value ?? '' });
    messageLlmApiKey.value = llmApiKey.value ? 'LLM API Key 已儲存' : 'LLM API Key 已清除';
    messageTypeLlmApiKey.value = 'success';
  } catch (e) {
    messageLlmApiKey.value = e.message || '無法連線，請確認後端已啟動';
    messageTypeLlmApiKey.value = 'danger';
  } finally {
    loadingLlmApiKey.value = false;
  }
}
</script>

<template>
  <div class="d-flex flex-column bg-body-secondary h-100 position-relative">
    <LoadingOverlay
      :is-visible="loadingCourseName || loadingLlmApiKey"
      loading-text="儲存中..."
    />
    <div class="navbar navbar-expand-lg bg-white flex-shrink-0">
      <div class="container-fluid d-flex justify-content-center">
        <span class="navbar-brand mb-0">系統設定</span>
      </div>
    </div>
    <div class="flex-grow-1 overflow-auto bg-white p-4">
      <div class="row justify-content-center">
        <div class="col-12 col-lg-8">
      <div class="bg-body-tertiary rounded text-start p-4 mb-3">
        <div class="fs-5 fw-semibold mb-3 pb-2 border-bottom">課程名稱</div>
        <p class="small text-secondary mb-3">
          顯示於系統的課程名稱，可留空。
        </p>
        <div class="mb-3">
          <label class="form-label small text-secondary fw-medium mb-1">課程名稱</label>
          <input
            v-model="courseName"
            type="text"
            class="form-control form-control-sm"
            placeholder="選填"
            :disabled="fetchLoading"
          >
          <div v-if="fetchLoading" class="form-text small">載入中...</div>
        </div>
        <div v-if="messageCourseName" :class="['alert py-2 mb-3', messageTypeCourseName === 'success' ? 'alert-success' : 'alert-danger']" role="alert">
          {{ messageCourseName }}
        </div>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="loadingCourseName || fetchLoading"
          @click="saveCourseName"
        >
          儲存
        </button>
      </div>
      <div class="bg-body-tertiary rounded text-start p-4 mb-3">
        <div class="fs-5 fw-semibold mb-3 pb-2 border-bottom">LLM API Key</div>
        <p class="small text-secondary mb-3">
          用於呼叫 LLM 的 API Key，留空並儲存可清除已儲存的 Key。
        </p>
        <div class="mb-3">
          <label class="form-label small text-secondary fw-medium mb-1">API Key</label>
          <input
            v-model="llmApiKey"
            type="text"
            class="form-control form-control-sm"
            placeholder="選填，用於呼叫 LLM"
            autocomplete="off"
            :disabled="fetchLoading"
          >
          <div v-if="fetchLoading" class="form-text small">載入中...</div>
        </div>
        <div v-if="messageLlmApiKey" :class="['alert py-2 mb-3', messageTypeLlmApiKey === 'success' ? 'alert-success' : 'alert-danger']" role="alert">
          {{ messageLlmApiKey }}
        </div>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="loadingLlmApiKey || fetchLoading"
          @click="saveLlmApiKey"
        >
          儲存
        </button>
      </div>
        </div>
      </div>
    </div>
  </div>
</template>
