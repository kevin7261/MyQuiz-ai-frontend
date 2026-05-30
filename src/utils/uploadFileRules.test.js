import { describe, it, expect } from 'vitest';
import {
  UPLOAD_ACCEPT_ATTR,
  UPLOAD_MAX_FILE_BYTES,
  uploadFileExceedsMaxSize,
  fileHasAllowedUploadExtension,
} from './uploadFileRules.js';

describe('upload constants', () => {
  it('accept 屬性為 .zip；大小上限 50×10⁶', () => {
    expect(UPLOAD_ACCEPT_ATTR).toBe('.zip');
    expect(UPLOAD_MAX_FILE_BYTES).toBe(50 * 1000 * 1000);
  });
});

describe('uploadFileExceedsMaxSize', () => {
  it('超過上限才為 true；無效 size 視為未超過', () => {
    expect(uploadFileExceedsMaxSize({ size: UPLOAD_MAX_FILE_BYTES + 1 })).toBe(true);
    expect(uploadFileExceedsMaxSize({ size: UPLOAD_MAX_FILE_BYTES })).toBe(false);
    expect(uploadFileExceedsMaxSize({ size: 0 })).toBe(false);
    expect(uploadFileExceedsMaxSize(null)).toBe(false);
    expect(uploadFileExceedsMaxSize({})).toBe(false);
  });
});

describe('fileHasAllowedUploadExtension', () => {
  it('僅 .zip（不分大小寫）', () => {
    expect(fileHasAllowedUploadExtension({ name: 'a.zip' })).toBe(true);
    expect(fileHasAllowedUploadExtension({ name: 'A.ZIP' })).toBe(true);
    expect(fileHasAllowedUploadExtension({ name: 'a.pdf' })).toBe(false);
    expect(fileHasAllowedUploadExtension({})).toBe(false);
    expect(fileHasAllowedUploadExtension(null)).toBe(false);
  });
});
