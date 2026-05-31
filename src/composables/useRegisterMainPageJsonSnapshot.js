import { watchEffect, onUnmounted, onDeactivated } from 'vue';
import { useMainPageJsonSnapshotStore } from '../stores/mainPageJsonSnapshotStore.js';

/**
 * 向 mainPageJsonSnapshotStore 註冊目前主畫面 JSON（與詳細資訊 Modal「JSON資料」同源）。
 * @param {() => unknown} getData
 * @param {() => string} [getTitle]
 */
export function useRegisterMainPageJsonSnapshot(getData, getTitle = () => 'JSON資料') {
  const store = useMainPageJsonSnapshotStore();

  watchEffect(() => {
    store.setSnapshot(getData(), getTitle());
  });

  function clear() {
    store.clearSnapshot();
  }

  onUnmounted(clear);
  onDeactivated(clear);
}
