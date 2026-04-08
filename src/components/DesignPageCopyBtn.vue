<template>
  <button
    type="button"
    class="design-page-copy-btn btn btn-link d-inline-flex align-items-center justify-content-center flex-shrink-0 rounded-circle p-1 lh-1 shadow-none text-decoration-none border-0"
    :class="onLightBg ? 'design-page-copy-btn--light' : 'design-page-copy-btn--dark'"
    @click.prevent="onCopy"
  >
    <i class="fa-regular fa-copy small" aria-hidden="true"></i>
  </button>
</template>

<script setup>
const props = defineProps({
  text: { type: String, required: true },
  /** 淺底（黃／淺灰／白區塊） */
  onLightBg: { type: Boolean, default: false },
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
/* 權杖色；勿用 Bootstrap link-*／語意 text-* */
.design-page-copy-btn--dark {
  color: var(--my-color-gray-light);
}

.design-page-copy-btn--dark:hover,
.design-page-copy-btn--dark:focus-visible,
.design-page-copy-btn--dark:active {
  color: var(--my-color-white);
  background-color: color-mix(in srgb, var(--my-color-white) 12%, transparent);
}

.design-page-copy-btn--light {
  color: var(--my-color-black);
}

.design-page-copy-btn--light:hover,
.design-page-copy-btn--light:focus-visible,
.design-page-copy-btn--light:active {
  color: var(--my-color-black);
  background-color: color-mix(in srgb, var(--my-color-black) 8%, transparent);
}

.design-page-copy-btn:focus-visible {
  outline: 2px solid var(--my-select-focus-ring);
  outline-offset: 2px;
}
</style>
