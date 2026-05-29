/**
 * 應用程式全域常數 Store（Pinia）
 *
 * 職責：
 * - 存放前端目前版本等不隨使用者操作變動的常數
 */
import { defineStore } from 'pinia';

/** 前端應用程式目前版本 */
export const APP_VERSION = '1.0';

export const useAppStore = defineStore('app', () => {
  /** @type {typeof APP_VERSION} 目前版本（唯讀常數） */
  const currentVersion = APP_VERSION;

  return {
    currentVersion,
  };
});
