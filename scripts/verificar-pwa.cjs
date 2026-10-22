const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    const results = [];
    try {
        for (const base of ['http://127.0.0.1:8080/', 'http://127.0.0.1:8081/barbearia-p0/']) {
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.goto(new URL('politica-privacidade.html', base).href);
            await page.evaluate(() => caches.open('outro-projeto').then(cache => cache.put('/sentinel', new Response('preservar'))));
            await page.goto(base);
            await page.evaluate(() => navigator.serviceWorker.ready);
            await page.reload();
            const state = await page.evaluate(async () => ({
                scope: (await navigator.serviceWorker.getRegistration()).scope,
                unrelatedPreserved: (await caches.keys()).includes('outro-projeto'),
                controlled: !!navigator.serviceWorker.controller,
                manifest: await fetch('manifest.json').then(r => r.json())
            }));
            assert.equal(state.scope, base);
            assert.ok(state.unrelatedPreserved);
            assert.ok(state.controlled);
            await context.setOffline(true);
            for (const [url, selector] of [['index.html', '#formAgendamento'], ['cliente/login.html', '#formLogin'], ['cliente/cadastro.html', '#formCadastro'], ['admin/index.html', '#sidebar']]) {
                await page.goto(new URL(url, base).href);
                assert.equal(await page.locator(selector).count(), 1, url);
            }
            results.push({ base, scope: state.scope, unrelatedPreserved: true, controlled: true, offlinePages: 4 });
            await context.close();
        }
    } finally {
        await browser.close();
        fs.writeFileSync(path.resolve(__dirname, '../docs/evidencias/pwa-results.json'), JSON.stringify(results, null, 2));
    }
    console.log(JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
