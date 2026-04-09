import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * 將 Markdown 字串轉成可安全用 v-html 插入的 HTML（DOMPurify 消毒）。
 * @param {unknown} src
 * @returns {string}
 */
export function renderMarkdownToSafeHtml(src) {
  if (src == null) return '';
  const s = String(src).trim();
  if (!s) return '';
  const dirty = marked.parse(s);
  return DOMPurify.sanitize(dirty);
}
