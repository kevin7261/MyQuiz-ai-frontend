<script setup>
import { ref } from 'vue';
import DesignPageCopyBtn from '../components/DesignPageCopyBtn.vue';

defineProps({
  tabId: { type: String, default: '' },
});

const designSampleChoice = ref('選項一');
</script>

<template>
  <div class="design-page-root h-100 d-flex flex-column overflow-hidden my-bgcolor-black" data-bs-theme="dark">
    <header class="flex-shrink-0 my-border-bottom-muted py-3 px-3 px-md-4 my-bgcolor-black">
      <div class="container-fluid px-0">
        <div class="row justify-content-center">
          <div class="col-12 col-xl-10 col-xxl-8">
            <p class="my-type-xl-600 my-color-white text-break mb-0">UI 元件參考</p>
          </div>
        </div>
      </div>
    </header>
    <div class="design-page-scroll flex-grow-1 overflow-auto">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div class="col-12 col-xl-10 col-xxl-8">
          <section class="mb-5">
            <h2 class="my-type-md-600 my-color-gray-light text-break mb-3">01 · 字階</h2>
            <div class="card border-0 rounded-4 my-shadow-card my-bgcolor-gray-dark">
              <div class="card-body p-3 p-lg-4">
                <div class="row g-4 align-items-start">
                  <div class="col-12 col-md-6">
                    <dl class="mb-0">
                      <div class="d-flex flex-column gap-1 my-border-bottom-faint pb-3 mb-3">
                        <dt class="my-type-xl-400 my-color-white">第一級 · 一般</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-xl-400</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-xl-400" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 my-border-bottom-faint pb-3 mb-3">
                        <dt class="my-type-lg-400 my-color-white">第二級 · 一般</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-lg-400</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-lg-400" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 my-border-bottom-faint pb-3 mb-3">
                        <dt class="my-type-md-400 my-color-gray-light">第三級 · 一般</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-md-400</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-md-400" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 my-border-bottom-faint pb-3 mb-3">
                        <dt class="my-type-sm-400 my-color-white">第四級 · 一般</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-sm-400</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-sm-400" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1">
                        <dt class="my-type-xs-400 my-color-gray-light">第五級 · 一般</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-xs-400</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-xs-400" />
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div class="col-12 col-md-6">
                    <dl class="mb-0">
                      <div class="d-flex flex-column gap-1 my-border-bottom-faint pb-3 mb-3">
                        <dt class="my-type-xl-600 my-color-white">第一級 · 強調</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-xl-600</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-xl-600" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 my-border-bottom-faint pb-3 mb-3">
                        <dt class="my-type-lg-600 my-color-white">第二級 · 強調</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-lg-600</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-lg-600" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 my-border-bottom-faint pb-3 mb-3">
                        <dt class="my-type-md-600 my-color-white">第三級 · 強調</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-md-600</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-md-600" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 my-border-bottom-faint pb-3 mb-3">
                        <dt class="my-type-sm-600 my-color-white">第四級 · 強調</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-sm-600</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-sm-600" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1">
                        <dt class="my-type-xs-600 my-color-gray-light">第五級 · 強調</dt>
                        <dd class="my-font-size-sm d-flex align-items-center gap-2 mb-0 w-100">
                          <span class="font-monospace my-color-gray-light text-break flex-grow-1 min-w-0">.my-type-xs-600</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-type-xs-600" />
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="mb-5">
            <h2 class="my-type-md-600 my-color-gray-light text-break mb-3">02 · 語意色</h2>
            <div class="card border-0 rounded-4 my-shadow-card my-bgcolor-gray-dark">
              <div class="card-body p-3 p-lg-4">
                <div class="row g-3">
                  <div class="col-12">
                    <div
                      class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-size-sm rounded-3 text-center my-bgcolor-red my-color-white p-3"
                    >
                      <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-red · .my-color-white</code>
                      <DesignPageCopyBtn class="ms-auto" text="my-bgcolor-red my-color-white" />
                    </div>
                  </div>
                  <div class="col-12">
                    <div
                      class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-size-sm rounded-3 text-center my-bgcolor-yellow my-color-black p-3"
                    >
                      <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1 my-color-black">.my-bgcolor-yellow · .my-color-black</code>
                      <DesignPageCopyBtn class="ms-auto" text="my-bgcolor-yellow my-color-black" on-light-bg />
                    </div>
                  </div>
                  <div class="col-12">
                    <div
                      class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-size-sm rounded-3 text-center my-bgcolor-green my-color-white p-3"
                    >
                      <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-green · .my-color-white</code>
                      <DesignPageCopyBtn class="ms-auto" text="my-bgcolor-green my-color-white" />
                    </div>
                  </div>
                  <div class="col-12">
                    <div
                      class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-size-sm rounded-3 text-center my-bgcolor-blue my-color-white p-3"
                    >
                      <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-blue · .my-color-white</code>
                      <DesignPageCopyBtn class="ms-auto" text="my-bgcolor-blue my-color-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="mb-5">
            <h2 class="my-type-md-600 my-color-gray-light text-break mb-3">03 · 灰階 · 背景</h2>
            <div class="card border-0 rounded-4 my-shadow-card my-bgcolor-gray-dark">
              <div class="card-body p-3 p-lg-4">
                <div class="row g-3">
                  <div class="col-12">
                    <div
                      class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-size-sm rounded-3 text-center my-bgcolor-black my-color-white p-3"
                    >
                      <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-black · .my-color-white</code>
                      <DesignPageCopyBtn class="ms-auto" text="my-bgcolor-black my-color-white" />
                    </div>
                  </div>
                  <div class="col-12">
                    <div
                      class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-size-sm rounded-3 text-center my-bgcolor-gray-dark my-color-white p-3"
                    >
                      <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-gray-dark · .my-color-white</code>
                      <DesignPageCopyBtn class="ms-auto" text="my-bgcolor-gray-dark my-color-white" />
                    </div>
                  </div>
                  <div class="col-12">
                    <div
                      class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-size-sm rounded-3 text-center my-bgcolor-gray-light my-color-black p-3"
                    >
                      <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-gray-light · .my-color-black</code>
                      <DesignPageCopyBtn class="ms-auto" text="my-bgcolor-gray-light my-color-black" on-light-bg />
                    </div>
                  </div>
                  <div class="col-12">
                    <div
                      class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-size-sm rounded-3 text-center my-bgcolor-white my-color-black p-3"
                    >
                      <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-white · .my-color-black</code>
                      <DesignPageCopyBtn class="ms-auto" text="my-bgcolor-white my-color-black" on-light-bg />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="mb-5">
            <h2 class="my-type-md-600 my-color-gray-light text-break mb-3">04 · 按鈕</h2>
            <div class="card border-0 rounded-4 my-shadow-card my-bgcolor-gray-dark">
              <div class="card-body p-3 p-lg-4">
                <div class="d-flex flex-column gap-3">
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-red my-color-white my-btn-hover-red flex-shrink-0 design-page-btn-04 px-3 py-2"
                    >
                      紅色
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-red my-color-white my-btn-hover-red px-3 py-2</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-red my-color-white my-btn-hover-red px-3 py-2" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-yellow my-color-black my-btn-hover-yellow flex-shrink-0 design-page-btn-04 px-3 py-2"
                    >
                      黃色
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-yellow my-color-black my-btn-hover-yellow px-3 py-2</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-yellow my-color-black my-btn-hover-yellow px-3 py-2" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-green my-color-white my-btn-hover-green flex-shrink-0 design-page-btn-04 px-3 py-2"
                    >
                      綠色
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-green my-color-white my-btn-hover-green px-3 py-2</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-green my-color-white my-btn-hover-green px-3 py-2" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-blue my-color-white my-btn-hover-blue flex-shrink-0 design-page-btn-04 px-3 py-2"
                    >
                      藍色
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-blue my-color-white my-btn-hover-blue px-3 py-2</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-blue my-color-white my-btn-hover-blue px-3 py-2" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-btn-border flex-shrink-0 design-page-btn-04 px-3 py-2"
                    >
                    邊框
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-btn-border px-3 py-2</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-btn-border px-3 py-2" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-red my-color-white my-btn-hover-red flex-shrink-0 design-page-btn-04 px-4 py-3"
                    >
                      紅色
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-red my-color-white my-btn-hover-red px-4 py-3</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-red my-color-white my-btn-hover-red px-4 py-3" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-yellow my-color-black my-btn-hover-yellow flex-shrink-0 design-page-btn-04 px-4 py-3"
                    >
                      黃色
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-yellow my-color-black my-btn-hover-yellow px-4 py-3</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-yellow my-color-black my-btn-hover-yellow px-4 py-3" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-green my-color-white my-btn-hover-green flex-shrink-0 design-page-btn-04 px-4 py-3"
                    >
                      綠色
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-green my-color-white my-btn-hover-green px-4 py-3</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-green my-color-white my-btn-hover-green px-4 py-3" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-blue my-color-white my-btn-hover-blue flex-shrink-0 design-page-btn-04 px-4 py-3"
                    >
                      藍色
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-blue my-color-white my-btn-hover-blue px-4 py-3</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-bgcolor-blue my-color-white my-btn-hover-blue px-4 py-3" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <button
                      type="button"
                      class="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-btn-border flex-shrink-0 design-page-btn-04 px-4 py-3"
                    >
                    邊框
                    </button>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-btn-border px-4 py-3</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="btn d-flex align-items-center justify-content-center rounded-pill btn-sm my-btn-border px-4 py-3" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="mb-5">
            <h2 class="my-type-md-600 my-color-gray-light text-break mb-3">05 · 表格</h2>
            <div class="card border-0 rounded-4 my-shadow-card my-bgcolor-gray-dark">
              <div class="card-body p-3 p-lg-4">
                <div class="rounded-4 overflow-auto my-border-subtle">
                  <table class="table table-striped table-hover mb-0">
                    <thead>
                      <tr>
                        <th class="px-3 py-2" scope="col">項目</th>
                        <th class="px-3 py-2" scope="col">說明</th>
                        <th class="px-3 py-2 text-end" scope="col">數量</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="px-3 py-2">範例列 A</td>
                        <td class="px-3 py-2 my-color-gray-light">輔助欄位</td>
                        <td class="px-3 py-2 text-end">12</td>
                      </tr>
                      <tr>
                        <td class="px-3 py-2">範例列 B</td>
                        <td class="px-3 py-2 my-color-gray-light">輔助欄位</td>
                        <td class="px-3 py-2 text-end">3</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="my-font-size-sm mt-3 d-flex flex-column gap-3">
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">外層捲動框</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >rounded-4 overflow-auto my-border-subtle</code>
                    <DesignPageCopyBtn
                      class="ms-auto align-self-end align-self-md-center"
                      text="rounded-4 overflow-auto my-border-subtle"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">表格</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >table table-striped table-hover mb-0</code>
                    <DesignPageCopyBtn
                      class="ms-auto align-self-end align-self-md-center"
                      text="table table-striped table-hover mb-0"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">表頭／儲存格</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >px-3 py-2</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="px-3 py-2" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">輔助字色</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >my-color-gray-light</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="my-color-gray-light" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="pb-4">
            <h2 class="my-type-md-600 my-color-gray-light text-break mb-3">06 · 下拉選單</h2>
            <div class="card border-0 rounded-4 my-shadow-card my-bgcolor-gray-dark">
              <div class="card-body p-3 p-lg-4">
                <div class="mb-4">
                  <div class="dropdown">
                    <button
                      id="design-page-choice-dropdown-btn"
                      class="btn d-flex align-items-center justify-content-between dropdown-toggle my-dropdown-caret rounded-pill btn-sm my-bgcolor-blue my-color-white my-btn-hover-blue flex-shrink-0 design-page-btn-04 px-3 py-2"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <span class="text-truncate text-start flex-grow-1 min-w-0 pe-2">{{ designSampleChoice }}</span>
                      <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret" aria-hidden="true"></i>
                    </button>
                    <ul class="dropdown-menu my-dropdown-menu" aria-labelledby="design-page-choice-dropdown-btn">
                      <li>
                        <a class="dropdown-item" href="#" @click.prevent="designSampleChoice = '選項一'">選項一</a>
                      </li>
                      <li>
                        <a class="dropdown-item" href="#" @click.prevent="designSampleChoice = '選項二'">選項二</a>
                      </li>
                      <li>
                        <a class="dropdown-item" href="#" @click.prevent="designSampleChoice = '選項三'">選項三</a>
                      </li>
                    </ul>
                  </div>
                </div>
                <div class="dropdown">
                  <button
                    class="btn d-flex align-items-center justify-content-between dropdown-toggle my-dropdown-caret rounded-pill btn-sm my-btn-border flex-shrink-0 design-page-btn-04 px-3 py-2"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    id="design-page-dropdown-btn"
                  >
                    <span class="text-truncate text-start flex-grow-1 min-w-0 pe-2">更多動作</span>
                    <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret" aria-hidden="true"></i>
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end my-dropdown-menu" aria-labelledby="design-page-dropdown-btn">
                    <li><a class="dropdown-item" href="#" @click.prevent>編輯</a></li>
                    <li><a class="dropdown-item" href="#" @click.prevent>複製</a></li>
                    <li><hr class="dropdown-divider" /></li>
                    <li><a class="dropdown-item my-dropdown-item-danger" href="#" @click.prevent>刪除</a></li>
                  </ul>
                </div>

                <div class="my-font-size-sm mt-4 d-flex flex-column gap-3">
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">觸發（填色 · 同 04 藍）</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-between dropdown-toggle my-dropdown-caret rounded-pill btn-sm my-bgcolor-blue my-color-white my-btn-hover-blue flex-shrink-0 design-page-btn-04 px-3 py-2</code>
                    <DesignPageCopyBtn
                      class="ms-auto align-self-end align-self-md-center"
                      text="btn d-flex align-items-center justify-content-between dropdown-toggle my-dropdown-caret rounded-pill btn-sm my-bgcolor-blue my-color-white my-btn-hover-blue flex-shrink-0 design-page-btn-04 px-3 py-2"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">觸發（描邊 · 同 04）</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >btn d-flex align-items-center justify-content-between dropdown-toggle my-dropdown-caret rounded-pill btn-sm my-btn-border flex-shrink-0 design-page-btn-04 px-3 py-2</code>
                    <DesignPageCopyBtn
                      class="ms-auto align-self-end align-self-md-center"
                      text="btn d-flex align-items-center justify-content-between dropdown-toggle my-dropdown-caret rounded-pill btn-sm my-btn-border flex-shrink-0 design-page-btn-04 px-3 py-2"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">箭頭（Font Awesome · 接在標籤後）</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >fa-solid fa-chevron-down my-dropdown-toggle-caret</code>
                    <DesignPageCopyBtn
                      class="ms-auto align-self-end align-self-md-center"
                      text="fa-solid fa-chevron-down my-dropdown-toggle-caret"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">標籤（選用）</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >span.text-truncate.text-start.flex-grow-1.min-w-0.pe-2</code>
                    <DesignPageCopyBtn
                      class="ms-auto align-self-end align-self-md-center"
                      text="text-truncate text-start flex-grow-1 min-w-0 pe-2"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">選單</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >dropdown-menu my-dropdown-menu</code>
                    <DesignPageCopyBtn class="ms-auto align-self-end align-self-md-center" text="dropdown-menu my-dropdown-menu" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">選單靠右（選用）</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >dropdown-menu dropdown-menu-end my-dropdown-menu</code>
                    <DesignPageCopyBtn
                      class="ms-auto align-self-end align-self-md-center"
                      text="dropdown-menu dropdown-menu-end my-dropdown-menu"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">項目／分隔／危險</span>
                    <code
                      class="user-select-all my-font-size-sm font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 p-2 rounded-2 my-bgcolor-black"
                      >dropdown-item · dropdown-divider · dropdown-item my-dropdown-item-danger</code>
                    <DesignPageCopyBtn
                      class="ms-auto align-self-end align-self-md-center"
                      text="dropdown-item my-dropdown-item-danger"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.design-page-root {
  min-height: 0;
}
.design-page-scroll {
  min-height: 0;
}
.design-page-btn-04 {
  min-width: 3.25rem;
}
</style>
