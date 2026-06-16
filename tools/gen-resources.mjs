// Renders the sample documents in doc-templates.mjs to resources/.
// Each template declares a `format`:
//   'png'        → flat PNG image
//   'pdf-text'   → text-based PDF (selectable text, vector) via page.pdf()
//   'pdf-image'  → image-based "scanned" PDF (a rasterised PNG embedded in a PDF)
//
// Usage: npm run gen:resources   (requires `npx playwright install chromium` once)

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { templates } from './doc-templates.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'resources');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

async function renderPng(tpl, file) {
  const page = await browser.newPage({
    viewport: { width: tpl.width, height: tpl.height },
    deviceScaleFactor: 2,
  });
  await page.setContent(tpl.html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: file });
  await page.close();
}

async function renderTextPdf(tpl, file) {
  const page = await browser.newPage();
  await page.setContent(tpl.html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: file,
    width: `${tpl.width}px`,
    height: `${tpl.height}px`,
    printBackground: true,
    pageRanges: '1',
  });
  await page.close();
}

async function renderImagePdf(tpl, file) {
  // 1. rasterise the template, 2. wrap the image full-bleed, 3. print to PDF
  const shot = await browser.newPage({
    viewport: { width: tpl.width, height: tpl.height },
    deviceScaleFactor: 2,
  });
  await shot.setContent(tpl.html, { waitUntil: 'networkidle' });
  const buf = await shot.screenshot({ type: 'png' });
  await shot.close();

  const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
  const wrapper = `<!doctype html><html><head><style>
    @page{margin:0}*{margin:0;padding:0}
    img{display:block;width:${tpl.width}px;height:${tpl.height}px}
  </style></head><body><img src="${dataUrl}"></body></html>`;

  const page = await browser.newPage();
  await page.setContent(wrapper, { waitUntil: 'networkidle' });
  await page.pdf({
    path: file,
    width: `${tpl.width}px`,
    height: `${tpl.height}px`,
    printBackground: true,
    pageRanges: '1',
  });
  await page.close();
}

try {
  for (const tpl of templates) {
    const fmt = tpl.format || 'png';
    // remove any stale alternate-format file for this document
    for (const ext of ['png', 'pdf']) rmSync(resolve(outDir, `${tpl.name}.${ext}`), { force: true });

    if (fmt === 'pdf-text') {
      const file = resolve(outDir, `${tpl.name}.pdf`);
      await renderTextPdf(tpl, file);
      console.log('✓ resources/%s.pdf  (text PDF)', tpl.name);
    } else if (fmt === 'pdf-image') {
      const file = resolve(outDir, `${tpl.name}.pdf`);
      await renderImagePdf(tpl, file);
      console.log('✓ resources/%s.pdf  (image PDF)', tpl.name);
    } else {
      const file = resolve(outDir, `${tpl.name}.png`);
      await renderPng(tpl, file);
      console.log('✓ resources/%s.png  (PNG)', tpl.name);
    }
  }
  console.log('\nDone — %d specimen documents written to resources/.', templates.length);
} finally {
  await browser.close();
}
