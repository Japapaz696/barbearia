import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root)));
const sw = readFileSync(new URL('service-worker.js', root), 'utf8');

test('manifest permanece no escopo da subpasta', () => {
    const base = new URL('https://example.test/barbearia/manifest.json');
    for (const path of [manifest.id, manifest.start_url, manifest.scope, ...manifest.shortcuts.map(s => s.url)]) {
        assert.ok(new URL(path, base).href.startsWith('https://example.test/barbearia/'));
    }
});

test('ícones declarados existem ou são SVGs inline válidos', () => {
    for (const icon of [...manifest.icons, ...manifest.shortcuts.flatMap(s => s.icons || [])]) {
        if (icon.src.startsWith('data:image/svg+xml,')) {
            assert.match(decodeURIComponent(icon.src.split(',').slice(1).join(',')), /<svg\s/);
        } else {
            assert.ok(existsSync(fileURLToPath(new URL(icon.src, root))), icon.src);
        }
    }
});

test('todos os assets do SW existem e são relativos', () => {
    const block = sw.match(/const STATIC_ASSETS = \[([\s\S]*?)\]/);
    assert.ok(block);
    const paths = [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
    assert.ok(paths.length >= 17);
    for (const path of paths) {
        assert.ok(path.startsWith('./'), path);
        assert.ok(existsSync(fileURLToPath(new URL(path, root))), path);
    }
});
