// src/constants/materialTemplates.ts
// 教材の表紙テンプレート一覧。AddMaterial / MaterialEditDialog で共用。

export interface MaterialTemplate {
  id: string;
  url: string;
  label: string;
}

export const TEMPLATES: MaterialTemplate[] = [
  // 本
  { id: 'book_blue',        url: '/images/templates/book_blue.png',         label: '青色の本' },
  { id: 'book_gray',        url: '/images/templates/book_gray.png',         label: '灰色の本' },
  { id: 'book_green',       url: '/images/templates/book_green.png',        label: '緑色の本' },
  { id: 'book_lightblue',   url: '/images/templates/book_lightblue.png',    label: '水色の本' },
  { id: 'book_lightgreen',  url: '/images/templates/book_lightgreen.png',   label: '黄緑色の本' },
  { id: 'book_purple',      url: '/images/templates/book_purple.png',       label: '紫色の本' },
  { id: 'book_red',         url: '/images/templates/book_red.png',          label: '赤色の本' },
  { id: 'book_yellow',      url: '/images/templates/book_yellow.png',       label: '黄色の本' },
  // プリント
  { id: 'paper_blue',       url: '/images/templates/paper_blue.png',        label: '青色のプリント' },
  { id: 'paper_gray',       url: '/images/templates/paper_gray.png',        label: '灰色のプリント' },
  { id: 'paper_green',      url: '/images/templates/paper_green.png',       label: '緑色のプリント' },
  { id: 'paper_lightblue',  url: '/images/templates/paper_lightblue.png',   label: '水色のプリント' },
  { id: 'paper_lightgreen', url: '/images/templates/paper_lightgreen.png',  label: '黄緑色のプリント' },
  { id: 'paper_purple',     url: '/images/templates/paper_purple.png',      label: '紫色のプリント' },
  { id: 'paper_red',        url: '/images/templates/paper_red.png',         label: '赤色のプリント' },
  { id: 'paper_yellow',     url: '/images/templates/paper_yellow.png',      label: '黄色のプリント' },
  // 音声
  { id: 'audio',            url: '/images/templates/audio.png',             label: '音声教材' },
];

/** テンプレート URL かどうかを判定するユーティリティ */
export const isTemplateUrl = (url: string): boolean =>
  TEMPLATES.some(t => t.url === url);