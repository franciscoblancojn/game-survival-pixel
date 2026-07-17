import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, rmdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const htmlFile = join(distDir, 'index.html');

if (!existsSync(htmlFile)) {
  console.error('dist/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

let html = readFileSync(htmlFile, 'utf-8');
const scriptRegex = /<script\s+src="([^"]+)"[^>]*><\/script>/g;
const matches = [...html.matchAll(scriptRegex)];

for (const match of matches) {
  const src = match[0];
  const scriptPath = match[1];
  const fullPath = join(distDir, scriptPath);

  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, 'utf-8');
    html = html.replace(src, `<script type="module">\n${content}\n</script>`);
    unlinkSync(fullPath);
    console.log(`  Inlined: ${scriptPath}`);
  }
}

writeFileSync(htmlFile, html);

try {
  const astroDir = join(distDir, '_astro');
  if (existsSync(astroDir)) {
    const files = readdirSync(astroDir);
    if (files.length === 0) {
      rmdirSync(astroDir);
      console.log('  Removed empty _astro/ directory');
    }
  }
} catch {}

console.log('Post-build: JS inlined into single HTML file');
