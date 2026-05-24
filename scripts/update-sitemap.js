// scripts/update-sitemap.js
// Remplace tous les <lastmod> du sitemap par la date du jour (ISO YYYY-MM-DD).
// Appelé automatiquement via "prebuild" dans package.json.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sitemapPath = resolve(__dirname, '../public/sitemap.xml');
const today = new Date().toISOString().slice(0, 10);

const content = readFileSync(sitemapPath, 'utf-8');
const updated = content.replace(/<lastmod>[^<]+<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
writeFileSync(sitemapPath, updated, 'utf-8');

console.log(`[sitemap] lastmod → ${today}`);
