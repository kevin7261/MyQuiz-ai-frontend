import { ref, watch } from 'vue';

/**
 * 訊息 Modal：watch 錯誤 ref／getter 非空時自動開啟；關閉時可選清除來源。
 */
export function useMessageModal() {
  const open = ref(false);
  const title = ref('提示');
  const message = ref('');
  const confirmButtonClass = ref('my-button-black');
  let onCloseCallback = null;

  function show(nextTitle, nextMessage, options = {}) {
    const text = String(nextMessage ?? '').trim();
    if (!text) return;
    title.value = String(nextTitle ?? '提示').trim() || '提示';
    message.value = text;
    const btnClass = options.confirmButtonClass;
    confirmButtonClass.value = typeof btnClass === 'function'
      ? btnClass()
      : (btnClass || 'my-button-black');
    onCloseCallback = typeof options.onClose === 'function' ? options.onClose : null;
    open.value = true;
  }

  function close() {
    open.value = false;
    onCloseCallback?.();
    onCloseCallback = null;
    message.value = '';
  }

  /** @param {import('vue').Ref<string>} sourceRef */
  function bindErrorRef(sourceRef, modalTitle, options = {}) {
    return watch(sourceRef, (msg) => {
      const text = String(msg ?? '').trim();
      if (!text) return;
      show(modalTitle, text, {
        ...options,
        onClose: () => {
          sourceRef.value = '';
          options.onClose?.();
        },
      });
    });
  }

  /** @param {() => unknown} getter @param {(val: string) => void} setter */
  function bindErrorGetter(getter, modalTitle, setter, options = {}) {
    return watch(getter, (msg) => {
      const text = String(msg ?? '').trim();
      if (!text) return;
      show(modalTitle, text, {
        ...options,
        onClose: () => {
          setter('');
          options.onClose?.();
        },
      });
    });
  }

  return {
    open,
    title,
    message,
    confirmButtonClass,
    show,
    close,
    bindErrorRef,
    bindErrorGetter,
  };
}
