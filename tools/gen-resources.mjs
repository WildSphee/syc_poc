// Renders the sample documents in doc-templates.mjs to PNG files in resources/.
// Usage: npm run gen:resources   (requires `npx playwright install chromium` once)

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { templates } from './doc-templates.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'resources');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  for (const tpl of templates) {
    const page = await browser.newPage({
      viewport: { width: tpl.width, height: tpl.height },
      deviceScaleFactor: 2,
    });
    await page.setContent(tpl.html, { waitUntil: 'networkidle' });
    const file = resolve(outDir, `${tpl.name}.png`);
    await page.screenshot({ path: file });
    await page.close();
    console.log('✓ resources/%s.png', tpl.name);
  }
  console.log('\nDone — %d specimen documents written to resources/.', templates.length);
} finally {
  await browser.close();
}
