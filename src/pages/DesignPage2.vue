<script setup>
import DesignPageCopyBtn from '../components/DesignPageCopyBtn.vue';

defineProps({
  tabId: { type: String, default: '' },
});
</script>

<template>
  <!--
    DesignPage2｜exam_2、create-exam-bank_2 專用 UI 元件參考
    - 僅示範此兩頁實際使用之 class／結構（九宮格、內頁頂列、提示、上傳 Modal 等）
    - bank-grid 樣式定義於各頁 scoped；本頁複製相同規則供預覽
  -->
  <div class="design-page-2 d-flex flex-column h-100 overflow-hidden my-bgcolor-gray-4 position-relative">
    <header class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">UI 元件參考 2</p>
        <p class="my-font-sm-400 my-color-gray-1 text-break mb-0 mt-2">exam_2 · create-exam-bank_2</p>
      </div>
    </header>

    <div class="flex-grow-1 overflow-auto my-bgcolor-gray-4 d-flex flex-column min-h-0">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div class="col-12 col-lg-11 col-xl-10">

            <!-- 01 · 頁首標題（grid 模式，兩頁共用） -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">01 · 頁首標題</div>
                <p class="my-font-sm-400 my-color-gray-1 mb-4">exam_2「測驗」／create-exam-bank_2「建立測驗題庫」</p>
                <header class="my-bgcolor-gray-4 p-4 rounded-3">
                  <div class="container-fluid px-0 text-center">
                    <p class="my-font-xl-400 my-color-black text-break mb-0">測驗</p>
                  </div>
                </header>
                <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-3">
                  <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-font-xl-400 my-color-black · header.flex-shrink-0.my-bgcolor-gray-4.p-4</code>
                  <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-font-xl-400 my-color-black" :on-light-bg="false" />
                </div>
              </div>
            </section>

            <!-- 02 · 九宮格方塊 -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">02 · 九宮格方塊</div>
                <p class="my-font-sm-400 my-color-gray-1 mb-4">.bank-grid · .bank-grid-tile（兩頁共用）</p>
                <div class="bank-grid-wrap">
                  <div class="bank-grid" role="list">
                    <button type="button" class="bank-grid-tile" role="listitem">
                      <span class="bank-grid-tile__label my-font-md-400 my-color-black text-break">範例測驗題庫</span>
                      <span class="bank-grid-tile__subtitle my-font-sm-400 my-color-gray-1 text-break">3 個單元</span>
                    </button>
                    <button type="button" class="bank-grid-tile bank-grid-tile--with-dot" role="listitem">
                      <span
                        class="bank-grid-tile__exam-dot rounded-circle d-inline-block my-bgcolor-green"
                        title="試卷用題庫"
                        aria-label="試卷用題庫"
                      />
                      <span class="bank-grid-tile__label my-font-md-400 my-color-black text-break">試卷用題庫</span>
                      <span class="bank-grid-tile__subtitle my-font-sm-400 my-color-gray-1 text-break">example.zip</span>
                    </button>
                  </div>
                </div>
                <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-3">
                  <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-grid-tile · bank-grid-tile__label · bank-grid-tile__subtitle</code>
                  <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-grid-tile" :on-light-bg="false" />
                </div>
              </div>
            </section>

            <!-- 03 · 新增方塊 -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">03 · 新增方塊</div>
                <p class="my-font-sm-400 my-color-gray-1 mb-4">.bank-grid-tile--add（虛線框、透明底）</p>
                <div class="bank-grid-wrap" style="max-width: 12rem">
                  <div class="bank-grid">
                    <button type="button" class="bank-grid-tile bank-grid-tile--add">
                      <span class="bank-grid-tile__icon bank-grid-tile__icon--add" aria-hidden="true">
                        <i class="fa-solid fa-plus" />
                      </span>
                      <span class="bank-grid-tile__label my-font-md-400 my-color-gray-1">新增測驗題庫</span>
                    </button>
                  </div>
                </div>
                <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-3">
                  <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-grid-tile bank-grid-tile--add · fa-plus</code>
                  <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-grid-tile bank-grid-tile--add" :on-light-bg="false" />
                </div>
              </div>
            </section>

            <!-- 04 · 試卷用標記（create-exam-bank_2） -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">04 · 試卷用標記</div>
                <p class="my-font-sm-400 my-color-gray-1 mb-4">create-exam-bank_2 方塊右上角綠點；下拉選單項目內小圓點</p>
                <div class="d-flex flex-wrap align-items-center gap-4">
                  <span
                    class="bank-grid-tile__exam-dot rounded-circle d-inline-block my-bgcolor-green"
                    title="試卷用題庫"
                    aria-label="試卷用題庫"
                  />
                  <span class="d-flex align-items-center gap-2 my-font-sm-400 my-color-black">
                    <span
                      class="rounded-circle d-inline-block flex-shrink-0 my-bgcolor-green"
                      style="width: 0.5rem; height: 0.5rem"
                      title="試卷用題庫"
                      aria-label="試卷用題庫"
                    />
                    下拉選單內標籤
                  </span>
                </div>
                <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-3">
                  <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-grid-tile__exam-dot my-bgcolor-green</code>
                  <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-grid-tile__exam-dot my-bgcolor-green" :on-light-bg="false" />
                </div>
              </div>
            </section>

            <!-- 05 · 提示訊息 -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">05 · 提示訊息</div>
                <div class="d-flex flex-column gap-3">
                  <div class="my-alert-warning-soft my-font-sm-400 py-2">列表載入警告（ragListError / examListError）</div>
                  <div class="my-alert-danger-soft my-font-sm-400 py-2">建立失敗（exam_2 createExamError）</div>
                  <div class="my-alert-danger-soft my-font-sm-400 py-2">上傳失敗（create-exam-bank_2 newBankUploadError）</div>
                </div>
                <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-3">
                  <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-alert-warning-soft · my-alert-danger-soft</code>
                  <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-alert-warning-soft" :on-light-bg="false" />
                </div>
              </div>
            </section>

            <!-- 06 · 內頁頂列 -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">06 · 內頁頂列</div>
                <p class="my-font-sm-400 my-color-gray-1 mb-4">
                  exam_2：<code class="my-color-black">.exam-2-detail-bar</code>；
                  create-exam-bank_2：<code class="my-color-black">.create-exam-bank-2-detail-bar</code>
                </p>
                <header class="design-page-2-detail-bar flex-shrink-0 px-2 py-3 my-bgcolor-gray-4 border-bottom rounded-top">
                  <div class="design-page-2-detail-bar__start">
                    <button
                      type="button"
                      class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 py-1 flex-shrink-0"
                    >
                      <i class="fa-solid fa-arrow-left" aria-hidden="true" />
                      返回主頁
                    </button>
                  </div>
                  <div class="design-page-2-detail-bar__center min-w-0">
                    <input
                      type="text"
                      class="design-page-2-detail-bar__title my-font-lg-400 my-color-black text-truncate mb-0 text-center w-100 px-3 py-2 rounded-2"
                      value="可編輯標題"
                      readonly
                      aria-label="標題"
                    >
                  </div>
                  <div class="design-page-2-detail-bar__end">
                    <button
                      type="button"
                      class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-button-transparent-borderless design-page-2-detail-bar__menu-btn lh-1"
                      aria-label="選單"
                    >
                      <i class="fa-solid fa-bars" aria-hidden="true" />
                    </button>
                  </div>
                </header>
                <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-3">
                  <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill my-button-transparent-borderless · *-detail-bar__title</code>
                  <DesignPageCopyBtn
                    class="flex-shrink-0 ms-auto"
                    text="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 py-1"
                    :on-light-bg="false"
                  />
                </div>
              </div>
            </section>

            <!-- 07 · 切換下拉選單 -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">07 · 切換下拉選單</div>
                <p class="my-font-sm-400 my-color-gray-1 mb-4">頂列選單鈕 + dropdown-menu-end；刪除項 my-color-red</p>
                <div class="dropdown d-inline-block">
                  <button
                    type="button"
                    class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless design-page-2-detail-bar__menu-btn lh-1 dropdown-toggle my-dropdown-caret"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i class="fa-solid fa-bars" aria-hidden="true" />
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end design-page-2-switch-menu show position-static d-block shadow mt-2">
                    <li>
                      <button type="button" class="dropdown-item active">目前項目</button>
                    </li>
                    <li>
                      <button type="button" class="dropdown-item">
                        <span class="d-flex align-items-center gap-2">
                          <span
                            class="rounded-circle d-inline-block flex-shrink-0 my-bgcolor-green"
                            style="width: 0.5rem; height: 0.5rem"
                            aria-hidden="true"
                          />
                          <span class="text-truncate">試卷用題庫</span>
                        </span>
                      </button>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                      <button type="button" class="dropdown-item my-color-red">刪除此題庫</button>
                    </li>
                  </ul>
                </div>
                <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-3">
                  <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">dropdown-menu-end · dropdown-item my-color-red</code>
                  <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="dropdown-item my-color-red" :on-light-bg="false" />
                </div>
              </div>
            </section>

            <!-- 08 · 上傳 Modal（create-exam-bank_2） -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">08 · 上傳 Modal</div>
                <p class="my-font-sm-400 my-color-gray-1 mb-4">create-exam-bank_2 新增題庫；靜態預覽</p>
                <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3 rounded-4">
                  <div class="modal-header border-bottom-0 p-0">
                    <h5 class="modal-title my-color-black mb-0">上傳檔案</h5>
                  </div>
                  <div class="modal-body p-0 min-w-0">
                    <div class="my-zip-drop-zone text-center position-relative">
                      <span class="my-font-sm-400 my-color-gray-4">拖曳.zip檔到這裡，或點擊選擇檔案</span>
                      <div class="my-font-sm-400 my-color-gray-4 mt-2">單檔不可超過 50 MB</div>
                    </div>
                  </div>
                  <div class="modal-footer border-top-0 p-0 d-flex justify-content-end gap-2 w-100">
                    <button
                      type="button"
                      class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2"
                    >
                      確定上傳
                    </button>
                  </div>
                </div>
                <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-3">
                  <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-modal-backdrop · my-zip-drop-zone · my-button-white</code>
                  <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-zip-drop-zone" :on-light-bg="false" />
                </div>
              </div>
            </section>

            <!-- 09 · 刪除確認 -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">09 · 刪除確認</div>
                <p class="my-font-sm-400 my-color-black mb-0">
                  兩頁共用元件 <code class="my-color-black">ConfirmDeleteModal</code>（試卷／題庫刪除）
                </p>
              </div>
            </section>

            <!-- 10 · LoadingOverlay -->
            <section class="my-page-block-spacing mb-0">
              <div class="rounded-4 my-bgcolor-gray-3 p-4">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">10 · 載入遮罩</div>
                <p class="my-font-sm-400 my-color-black mb-0">
                  兩頁共用 <code class="my-color-black">LoadingOverlay</code>（九宮格初次載入、刪除中）
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* bank-grid：與 ExamPage2 / CreateExamQuizBankPage2 相同 */
.bank-grid-wrap {
  width: 100%;
}

.bank-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
}

@media (min-width: 768px) {
  .bank-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 992px) {
  .bank-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.bank-grid-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 9.5rem;
  padding: 1.25rem 1rem;
  border: 1px solid var(--my-color-gray-2, #e5e5e5);
  border-radius: 1rem;
  background: var(--my-color-gray-3, #f5f5f5);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.bank-grid-tile:hover:not(:disabled) {
  border-color: var(--my-color-gray-1, #999);
  box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 0.08);
  transform: translateY(-2px);
}

.bank-grid-tile--add {
  border-style: dashed;
  background: transparent;
}

.bank-grid-tile--add:hover:not(:disabled) {
  background: var(--my-color-gray-3, #f5f5f5);
}

.bank-grid-tile__exam-dot {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 0.5rem;
  height: 0.5rem;
}

.bank-grid-tile__icon--add {
  font-size: 2rem;
  line-height: 1;
  color: var(--my-color-gray-1, #999);
}

.bank-grid-tile__label {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  width: 100%;
}

.bank-grid-tile__subtitle {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  width: 100%;
}

/* detail bar：對齊 exam-2 / create-exam-bank-2 */
.design-page-2-detail-bar {
  display: grid;
  grid-template-columns: 1fr minmax(0, 50%) 1fr;
  align-items: center;
  gap: 0.75rem;
  border-color: var(--my-color-gray-2, #e5e5e5) !important;
}

.design-page-2-detail-bar__start {
  justify-self: start;
  min-width: 0;
}

.design-page-2-detail-bar__center {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
}

.design-page-2-detail-bar__title {
  display: block;
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  margin: 0;
  font-family: inherit;
  line-height: inherit;
  appearance: none;
  -webkit-appearance: none;
  transition: background-color 0.15s ease;
}

.design-page-2-detail-bar__title:hover:not(:disabled),
.design-page-2-detail-bar__title:focus:not(:disabled) {
  background-color: var(--my-color-gray-3, #f5f5f5);
}

.design-page-2-detail-bar__end {
  justify-self: end;
  min-width: 0;
}

.design-page-2-detail-bar__menu-btn {
  width: 2.375rem;
  height: 2.375rem;
  min-width: 2.375rem;
  min-height: 2.375rem;
  padding: 0;
}

.design-page-2-switch-menu {
  min-width: 10rem;
  max-height: min(60vh, 24rem);
}

.design-page-2-switch-menu .dropdown-item {
  width: 100%;
  white-space: nowrap;
}
</style>
