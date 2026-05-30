import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { usePackFolderPickModal } from './usePackFolderPickModal.js';

function setup({ blocked = false, groups = [['a', 'b', 'c']] } = {}) {
  const packGroupsEditBlocked = ref(blocked);
  const displayGroups = ref(groups);
  const setFolderGroup = vi.fn();
  const api = usePackFolderPickModal({ packGroupsEditBlocked, displayGroups, setFolderGroup });
  return { api, packGroupsEditBlocked, displayGroups, setFolderGroup };
}

describe('usePackFolderPickModal', () => {
  it('open 以該群組清單為草稿並開啟', () => {
    const { api } = setup({ groups: [['a', 'b']] });
    api.openPackFolderPickModal(0);
    expect(api.packFolderPickModalOpen.value).toBe(true);
    expect(api.isPackFolderPickDraftSelected('a')).toBe(true);
    expect(api.isPackFolderPickDraftSelected('z')).toBe(false);
  });

  it('toggle 勾選／取消', () => {
    const { api } = setup({ groups: [['a']] });
    api.openPackFolderPickModal(0);
    api.togglePackFolderPickDraft('a'); // 取消
    expect(api.isPackFolderPickDraftSelected('a')).toBe(false);
    api.togglePackFolderPickDraft('b'); // 新增
    expect(api.isPackFolderPickDraftSelected('b')).toBe(true);
  });

  it('confirm 寫回並關閉', () => {
    const { api, setFolderGroup } = setup({ groups: [['a', 'b']] });
    api.openPackFolderPickModal(0);
    api.togglePackFolderPickDraft('c');
    api.confirmPackFolderPick();
    expect(setFolderGroup).toHaveBeenCalledWith(0, ['a', 'b', 'c']);
    expect(api.packFolderPickModalOpen.value).toBe(false);
  });

  it('編輯鎖定時所有操作 no-op', () => {
    const { api, setFolderGroup } = setup({ blocked: true, groups: [['a']] });
    api.openPackFolderPickModal(0);
    expect(api.packFolderPickModalOpen.value).toBe(false);
    api.togglePackFolderPickDraft('a');
    api.confirmPackFolderPick();
    expect(setFolderGroup).not.toHaveBeenCalled();
  });

  it('close 重置草稿', () => {
    const { api } = setup({ groups: [['a']] });
    api.openPackFolderPickModal(0);
    api.closePackFolderPickModal();
    expect(api.packFolderPickModalOpen.value).toBe(false);
    expect(api.isPackFolderPickDraftSelected('a')).toBe(false);
  });
});
