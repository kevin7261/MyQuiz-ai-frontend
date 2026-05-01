<template>
  <button
    type="button"
    class="btn rounded-circle d-flex justify-content-center align-items-center my-btn-circle my-font-md-400 my-button-transparent-borderless lh-1 shadow-none flex-shrink-0 my-design-page-copy-btn"
    :class="{ 'my-design-page-copy-btn--light': onLightBg }"
    @click.prevent="onCopy"
  >
    <i class="fa-regular fa-copy" aria-hidden="true"></i>
  </button>
</template>

<script setup>
/**
 * DesignPageCopyBtn — 複製按鈕（圓形透明底）
 *
 * 點擊後將 `text` prop 寫入剪貼簿（Clipboard API）；
 * 不支援剪貼簿或非安全情境（non-HTTPS）時靜默忽略錯誤。
 *
 * 供 DesignPage 色票區塊使用。
 *
 * Props:
 *   text       String   要複製的文字（點擊時 trim 後寫入剪貼簿）
 *   onLightBg  Boolean  是否在淺底色票上（預設 true → 圖示顯示深色；深底時設 false）
 */
const props = defineProps({
  text: { type: String, default: '' },
  onLightBg: { type: Boolean, default: true },
});

async function onCopy() {
  try {
    await navigator.clipboard.writeText(String(props.text ?? '').trim());
  } catch {
    /* 非安全情境或瀏覽器不支援時略過 */
  }
}
</script>

<style scoped>
/* 淺底色票格：蓋過 .btn.my-button-transparent-borderless 預設淺字 */
.btn.my-button-transparent-borderless.my-design-page-copy-btn--light {
  color: var(--my-color-black);
}

.btn.my-button-transparent-borderless.my-design-page-copy-btn--light:hover,
.btn.my-button-transparent-borderless.my-design-page-copy-btn--light:focus-visible,
.btn.my-button-transparent-borderless.my-design-page-copy-btn--light:active {
  color: var(--my-color-black);
  background-color: color-mix(in srgb, var(--my-color-black) 8%, transparent);
}

.my-design-page-copy-btn:focus-visible {
  outline: 2px solid var(--my-color-gray-2);
  outline-offset: 2px;
}
</style>
