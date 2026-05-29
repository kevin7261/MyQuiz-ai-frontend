<script setup>
/**
 * SystemSettingsPage - 系統設定頁面
 * 僅顯示服務位址等僅供查閱資訊。
 * design3：白底主內容、TopView 頁名；表單欄位為 label + input（對齊 design_3）。
 */
import { API_BASE } from '../constants/api.js';

defineProps({
  hidePageHeader: { type: Boolean, default: false },
  design3: { type: Boolean, default: false },
});
</script>

<template>
  <div
    class="d-flex flex-column h-100 overflow-hidden position-relative"
    :class="design3 ? 'my-bgcolor-white' : 'my-bgcolor-gray-4'"
  >
    <header v-if="!hidePageHeader && !design3" class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">系統設定</p>
      </div>
    </header>
    <div class="flex-grow-1 overflow-auto d-flex flex-column min-h-0" :class="design3 ? 'my-bgcolor-white' : 'my-bgcolor-gray-4'">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div :class="design3 ? 'col-12 col-md-12 col-lg-10 col-xl-8 col-xxl-6' : 'col-12 col-lg-10 col-xl-8 col-xxl-6'">
            <template v-if="design3">
              <div class="d-flex flex-column gap-4 w-100 min-w-0 text-start py-4">
                <div class="mb-0">
                  <label class="form-label my-font-sm-400 my-color-gray-1 mb-2">服務位址（僅供查閱）</label>
                  <input
                    :value="API_BASE"
                    type="text"
                    class="form-control my-input-md rounded-2 my-form-control-static font-monospace text-break w-100 px-3 py-2"
                    readonly
                    aria-label="服務位址"
                  >
                </div>
              </div>
            </template>

            <div v-else class="text-start my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-4 p-4 w-100 min-w-0">
                <div class="mb-0">
                  <label class="form-label my-font-sm-600 my-color-gray-1 mb-0">服務位址（僅供查閱）</label>
                  <div
                    class="form-control my-input-md my-input-md--on-dark rounded-2 my-form-control-static font-monospace text-break w-100 px-3 py-2"
                    role="status"
                  >
                    {{ API_BASE }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
