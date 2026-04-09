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
const props = defineProps({
  text: { type: String, required: true },
  /** 淺底（Design 頁預設白底；深填色票上請設為 false） */
  onLightBg: { type: Boolean, default: true },
})

async function onCopy() {
  try {
    await navigator.clipboard.writeText(props.text.trim())
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
