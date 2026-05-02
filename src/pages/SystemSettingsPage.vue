<script setup>
/**
 * SystemSettingsPage - 系統設定頁面
 * 僅顯示服務位址等僅供查閱資訊。
 */
import { API_BASE } from '../constants/api.js';
</script>

<template>
  <div class="d-flex flex-column h-100 overflow-hidden my-bgcolor-gray-4 position-relative">
    <header class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">系統設定</p>
      </div>
    </header>
    <div class="flex-grow-1 overflow-auto my-bgcolor-gray-4 d-flex flex-column min-h-0">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div class="col-12 col-lg-10 col-xl-8 col-xxl-6">
            <div class="text-start my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 w-100 min-w-0">
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
