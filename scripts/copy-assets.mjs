// Copies static node assets (nodes/**/*.svg) into the mirrored dist/ path,
// so the icons sit next to the compiled .node.js files n8n loads.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'nodes');
const targetDir = join(root, 'dist', 'nodes');

function copySvgs(dir) {
	let count = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const entryPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			count += copySvgs(entryPath);
		} else if (entry.isFile() && entry.name.endsWith('.svg')) {
			const target = join(targetDir, relative(sourceDir, entryPath));
			mkdirSync(dirname(target), { recursive: true });
			copyFileSync(entryPath, target);
			count += 1;
		}
	}
	return count;
}

const copied = copySvgs(sourceDir);
console.log(`copy-assets: copied ${copied} svg file(s) into dist/nodes`);
