import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { useTranscriptEditModal } from './useTranscriptEditModal.js';

function setup({ blocked = false, loaded = true, busy = false, text = 'hello' } = {}) {
  const packGroupsEditBlocked = ref(blocked);
  const setMarkdownAt = vi.fn();
  const api = useTranscriptEditModal({
    packGroupsEditBlocked,
    transcriptLoadedAt: () => loaded,
    transcriptBusy: () => busy,
    transcriptTextAt: () => text,
    setMarkdownAt,
  });
  return { api, packGroupsEditBlocked, setMarkdownAt };
}

describe('useTranscriptEditModal', () => {
  it('open 帶入逐字稿文字並開啟', () => {
    const { api } = setup({ text: 'abc' });
    api.openTranscriptEditModal(2);
    expect(api.transcriptEditModalOpen.value).toBe(true);
    expect(api.transcriptEditModalGi.value).toBe(2);
    expect(api.transcriptEditModalDraft.value).toBe('abc');
  });

  it('鎖定／未載入／處理中時不開啟', () => {
    expect(setup({ blocked: true }).api.transcriptEditModalOpen.value).toBe(false);
    const a = setup({ loaded: false });
    a.api.openTranscriptEditModal(0);
    expect(a.api.transcriptEditModalOpen.value).toBe(false);
    const b = setup({ busy: true });
    b.api.openTranscriptEditModal(0);
    expect(b.api.transcriptEditModalOpen.value).toBe(false);
  });

  it('apply 寫回 markdown 並關閉', () => {
    const { api, setMarkdownAt } = setup();
    api.openTranscriptEditModal(3);
    api.transcriptEditModalDraft.value = '新內容';
    api.applyTranscriptEditModal();
    expect(setMarkdownAt).toHaveBeenCalledWith(3, '新內容');
    expect(api.transcriptEditModalOpen.value).toBe(false);
  });

  it('disabled computed 反映鎖定狀態', () => {
    expect(setup({ loaded: true, busy: false }).api.transcriptEditModalDisabled.value).toBe(false);
    expect(setup({ busy: true }).api.transcriptEditModalDisabled.value).toBe(true);
  });
});
