// Execução opcional: requer playwright-core instalado fora ou dentro do projeto.
// PLAYWRIGHT_MODULE_PATH pode apontar para o pacote; EDGE_PATH para o navegador.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.AUDIT_URL || 'http://127.0.0.1:8080/';
const output = path.resolve(__dirname, '../docs/evidencias');
const report = { base, generatedAt: new Date().toISOString(), checks: [], layouts: [], errors: [] };
fs.mkdirSync(output, { recursive: true });

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    try {
        const context = await browser.newContext({ serviceWorkers: 'block' });
        const page = await context.newPage();
        page.on('pageerror', error => report.errors.push(error.message));
        await page.goto(base);
        const logic = await page.evaluate(async () => {
            const result = {};
            const future = new Date(); future.setDate(future.getDate() + 7);
            while (future.getDay() !== 1) future.setDate(future.getDate() + 1);
            const monday = agenda.hojeLocal(future);
            future.setDate(future.getDate() - 1);
            const sunday = agenda.hojeLocal(future);
            const attack = '<img src=x onerror="window.__xss=1">';
            localStorage.setItem('avaliacoes', JSON.stringify([{ nota: 999, nome: attack, comentario: attack }]));
            initAvaliacao();
            result.reviewEscaped = !document.querySelector('#depoimentosDinamicos img');
            localStorage.setItem('agendamentos', JSON.stringify([{ id: 1, data: monday, horario: '10:00', servicos: 'Corte + Barba', barbeiro: 'João', status: 'confirmado' }]));
            const data = document.getElementById('dataAgendamento');
            const barber = document.getElementById('barbeiro');
            const time = document.getElementById('horarioAgendamento');
            data.value = monday; barber.value = 'João'; data.dispatchEvent(new Event('change'));
            result.legacyOverlapBlocked = time.querySelector('option[value="10:30"]').disabled;
            barber.value = 'Rafael'; barber.dispatchEvent(new Event('change'));
            result.otherBarberFree = !time.querySelector('option[value="10:30"]').disabled;
            data.value = sunday; data.dispatchEvent(new Event('change'));
            result.sundayClosed = time.options.length === 1 && time.options[0].value === '';
            localStorage.setItem('cupons', JSON.stringify({ BIG50: { valor: 50, tipo: 'fixo', ativo: true } }));
            document.querySelector('input[data-nome="Pézinho"]').checked = true;
            document.getElementById('cupomInput').value = 'BIG50'; atualizarOrcamento();
            result.zeroFloor = JSON.parse(localStorage.getItem('orcamentoAtual')).total === 0;
            localStorage.setItem('agendamentos', '[]');
            document.getElementById('nomeCliente').value = 'Teste fictício';
            document.getElementById('telefone').value = '31900000000';
            data.value = monday; data.dispatchEvent(new Event('change')); time.value = '10:00';
            await salvarAgendamento({ preventDefault() {}, target: document.getElementById('formAgendamento') });
            result.localSave = JSON.parse(localStorage.getItem('agendamentos')).length === 1;
            result.honestModal = document.querySelector('.modal-overlay').textContent.includes('Nenhum horário real');
            document.querySelector('.modal-overlay').remove();
            document.querySelector('input[data-nome="Pézinho"]').checked = false;
            atualizarOrcamento();
            document.getElementById('nomeCliente').value = 'Outro teste fictício';
            document.getElementById('telefone').value = '31900000000';
            document.getElementById('servicosAgendamento').value = 'Dia do Noivo';
            data.value = monday; data.dispatchEvent(new Event('change')); time.value = '19:30';
            await salvarAgendamento({ preventDefault() {}, target: document.getElementById('formAgendamento') });
            result.closingRejectedOnSave = JSON.parse(localStorage.getItem('agendamentos')).length === 1;
            return result;
        });
        for (const [name, pass] of Object.entries(logic)) { assert.equal(pass, true, name); report.checks.push(name); }

        const secondTab = await context.newPage();
        await secondTab.goto(base);
        for (const tab of [page, secondTab]) {
            await tab.evaluate(() => {
                const future = new Date(); future.setDate(future.getDate() + 7);
                while (future.getDay() !== 1) future.setDate(future.getDate() + 1);
                document.getElementById('nomeCliente').value = 'Concorrência fictícia';
                document.getElementById('telefone').value = '31900000000';
                document.getElementById('servicosAgendamento').value = 'Corte Masculino';
                document.getElementById('barbeiro').value = 'João';
                const date = document.getElementById('dataAgendamento');
                date.value = agenda.hojeLocal(future); date.dispatchEvent(new Event('change'));
                document.getElementById('horarioAgendamento').value = '14:00';
            });
        }
        await Promise.all([page, secondTab].map(tab => tab.evaluate(() => salvarAgendamento({ preventDefault() {}, target: document.getElementById('formAgendamento') }))));
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('agendamentos')).filter(a => a.horario === '14:00').length), 1);
        report.checks.push('concurrentTabsSingleSave');
        await secondTab.close();

        // Cadastro com marketing desmarcado, seguido de logout e novo login.
        await page.goto(new URL('cliente/cadastro.html', base).href);
        await page.locator('#nomeCadastro').fill('Cliente fictício');
        await page.locator('#telefoneCadastro').fill('31900000000');
        await page.locator('#emailCadastro').fill('teste@example.invalid');
        await page.locator('#senhaCadastro').fill('SenhaExclusivaTeste123');
        await page.locator('#confirmaSenha').fill('SenhaExclusivaTeste123');
        await page.locator('#aceitaPrivacidade').check();
        await page.locator('button[type=submit]').click();
        await page.waitForURL('**/cliente/dashboard.html');
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('clientesConta'))[0].aceitaPromocoes), false);
        await page.getByText('Sair', { exact: true }).click();
        await page.waitForURL('**/cliente/login.html');
        await page.locator('#telefoneLogin').fill('31900000000');
        await page.locator('#senhaLogin').fill('SenhaExclusivaTeste123');
        await page.locator('button[type=submit]').click();
        await page.waitForURL('**/cliente/dashboard.html');
        report.checks.push('signupWithoutMarketing', 'logout', 'login');

        // Testa também o contexto JavaScript dos handlers, não só texto HTML.
        await page.evaluate(() => {
            const payload = `');window.__xss=1;//<img src=x onerror="window.__xss=1">`;
            const client = JSON.parse(localStorage.getItem('clientesConta'))[0];
            localStorage.setItem('agendamentos', JSON.stringify([{ id: 5, clienteId: client.id, nome: payload, telefone: client.telefone, data: '2026-10-26', horario: '10:00', barbeiro: payload, servicos: payload, observacoes: payload, status: 'confirmado', valorTotal: 25 }]));
        });
        for (const url of ['admin/index.html', 'cliente/dashboard.html']) {
            await page.goto(new URL(url, base).href);
            assert.equal(await page.locator('img[src="x"]').count(), 0);
            if (url.startsWith('admin')) {
                await page.evaluate(() => {
                    window.enviarWhatsCliente = (phone, name) => { window.__receivedName = name; };
                    showTab('agendamentos');
                    document.querySelector('#listaAgendamentosAdmin .btn-whatsapp').click();
                });
                assert.ok(await page.evaluate(() => window.__receivedName.includes('window.__xss')));
            }
            assert.equal(await page.evaluate(() => !!window.__xss), false);
            report.checks.push(`xssBlocked:${url}`);
        }

        // Remove as cargas maliciosas antes das capturas; preserva só a conta fictícia.
        await page.evaluate(() => {
            localStorage.setItem('agendamentos', '[]');
            localStorage.setItem('avaliacoes', '[]');
            localStorage.removeItem('cupons');
            localStorage.removeItem('orcamentoAtual');
            localStorage.removeItem('notifAdmin');
        });
        for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const [name, url] of [['home', 'index.html'], ['login', 'cliente/login.html'], ['cadastro', 'cliente/cadastro.html'], ['conta', 'cliente/dashboard.html'], ['admin', 'admin/index.html']]) {
                await page.goto(new URL(url, base).href);
                await page.evaluate(async () => {
                    for (const img of document.images) img.loading = 'eager';
                    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
                });
                await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
                const layout = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth, images: [...document.images].map(img => ({ loaded: img.naturalWidth > 0, src: img.currentSrc })), offenders: [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1; }).slice(0, 8).map(el => el.className) }));
                report.layouts.push({ page: name, width, ...layout });
            }
        }
        await context.close();

        // Contexto separado com SW ativo: caches de páginas exatas e isolamento.
        const pwaContext = await browser.newContext();
        const pwa = await pwaContext.newPage();
        await pwa.goto(base);
        await pwa.evaluate(() => navigator.serviceWorker.ready);
        await pwa.reload();
        await pwa.evaluate(() => caches.open('outro-projeto-evidencia').then(c => c.put('/sentinel', new Response('preservar'))));
        await pwaContext.setOffline(true);
        await pwa.goto(new URL('cliente/login.html', base).href);
        assert.equal(await pwa.locator('#formLogin').count(), 1);
        await pwa.goto(new URL('cliente/cadastro.html', base).href);
        assert.equal(await pwa.locator('#formCadastro').count(), 1);
        report.checks.push('offlineLogin', 'offlineCadastro');
        await pwaContext.close();
    } finally {
        await browser.close();
        fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(report, null, 2));
    }
    assert.deepEqual(report.errors, [], 'Erros JavaScript');
    const overflow = report.layouts.filter(row => row.scroll > row.viewport);
    assert.deepEqual(overflow, [], 'Overflow horizontal');
    console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
