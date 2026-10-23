const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
const AxeBuilder = require(process.env.AXE_MODULE_PATH || '@axe-core/playwright').default;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../docs/p1/final');
fs.mkdirSync(out, { recursive: true });
const result = { generatedAt: new Date().toISOString(), checks: [], accessibility: [], layouts: [], errors: [], failedLocalRequests: [] };

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    const check = (name, pass) => { assert.ok(pass, name); result.checks.push(name); };
    try {
        const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', viewport: { width: 390, height: 1000 } });
        const page = await context.newPage();
        page.on('pageerror', error => result.errors.push(error.message));
        page.on('response', response => { if (response.url().startsWith('http://127.0.0.1:8080/') && response.status() >= 400) result.failedLocalRequests.push({ url: response.url(), status: response.status() }); });
        const go = url => page.goto(`http://127.0.0.1:8080/${url}`);
        await go('index.html');
        await page.locator('#heroServico').selectOption('Corte + Barba');
        await page.locator('#heroEscolha button').click();
        check('heroSelectsActualService', await page.locator('input[data-nome="Corte + Barba"]').isChecked());
        await page.locator('[data-service="Hidratação"]').click();
        check('catalogSelectionUpdatesBudget', (await page.locator('#total-final').textContent()).includes('117,00'));
        check('serviceSummaryIsReadonly', await page.locator('#servicosAgendamento').getAttribute('readonly') !== null);
        await page.locator('#cupomInput').fill('<img>');
        check('invalidCouponInline', await page.locator('#cupomInput').getAttribute('aria-invalid') === 'true');
        await page.locator('#cupomInput').fill('');
        await page.locator('.hamburger').click();
        check('mobileMenuExpanded', await page.locator('.hamburger').getAttribute('aria-expanded') === 'true');
        await page.keyboard.press('Escape');
        check('mobileMenuEscape', await page.locator('.hamburger').getAttribute('aria-expanded') === 'false');
        await page.locator('#faq summary').first().click();
        check('nativeFaqOpens', await page.locator('#faq details').first().getAttribute('open') !== null);

        await go('cliente/login.html');
        await page.locator('button[type=submit]').click();
        check('loginRequiredInlineError', await page.locator('[data-form-error]').isVisible());
        await page.locator('#telefoneLogin').fill('31900000000');
        await page.locator('#senhaLogin').fill('senha-incorreta');
        await page.locator('[data-password-target]').click();
        check('passwordReveal', await page.locator('#senhaLogin').getAttribute('type') === 'text');
        await page.locator('button[type=submit]').click();
        check('wrongCredentialsDoNotLogin', !await page.evaluate(() => sessionStorage.getItem('clienteLogado')));

        await go('cliente/cadastro.html');
        await page.locator('#nomeCadastro').fill('Cliente fictício');
        await page.locator('#telefoneCadastro').fill('31900000000');
        await page.locator('#emailCadastro').fill('teste@example.invalid');
        await page.locator('#senhaCadastro').fill('SenhaExclusivaTeste123');
        await page.locator('#confirmaSenha').fill('SenhaDiferente123');
        await page.locator('#aceitaPrivacidade').check();
        await page.locator('button[type=submit]').click();
        check('passwordMismatchInline', (await page.locator('[data-form-error]').textContent()).includes('coincidem'));
        await page.locator('#confirmaSenha').fill('SenhaExclusivaTeste123');
        const busy = await page.evaluate(() => { document.getElementById('formCadastro').requestSubmit(); return document.getElementById('formCadastro').getAttribute('aria-busy'); });
        check('signupBusyDuringRealHash', busy === 'true');
        await page.waitForURL('**/cliente/dashboard.html');
        check('sessionContainsNoPassword', await page.evaluate(() => !Object.hasOwn(JSON.parse(sessionStorage.getItem('clienteLogado')), 'senha')));
        await page.locator('#editNome').fill('');
        await page.locator('#formAtualizar button').click();
        check('emptyProfileNameRejected', await page.locator('[data-form-error]').isVisible());
        await page.locator('#editNome').fill('Cliente fictício');

        await go('index.html#orcamento');
        await page.locator('input[data-nome="Corte Masculino"]').check();
        const monday = await page.evaluate(() => { const date = new Date(); date.setDate(date.getDate() + 7); while (date.getDay() !== 1) date.setDate(date.getDate() + 1); return agenda.hojeLocal(date); });
        await page.locator('#dataAgendamento').fill(monday);
        await page.locator('#barbeiro').selectOption('João');
        await page.locator('.slot-button').filter({ hasText: '10:00' }).click();
        check('slotButtonUpdatesNativeSelect', await page.locator('#horarioAgendamento').inputValue() === '10:00');
        await page.locator('#formAgendamento button[type=submit]').click();
        await page.locator('dialog[open]').waitFor();
        check('honestAccessibleConfirmation', (await page.locator('dialog').textContent()).includes('Nenhum horário real'));
        const modalAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        result.accessibility.push({ page: 'confirmation', theme: 'dark', width: 390, violations: modalAxe.violations });
        await page.screenshot({ path: path.join(out, 'confirmacao-390.png'), animations: 'disabled' });
        await page.keyboard.press('Tab');
        check('nativeDialogTrapsFocus', await page.evaluate(() => !!document.activeElement.closest('dialog')));
        await page.keyboard.press('Escape');
        await page.locator('dialog').waitFor({ state: 'detached' });
        check('confirmationEscapeAndFocus', await page.locator('dialog').count() === 0 && await page.evaluate(() => document.activeElement === document.querySelector('#formAgendamento [type=submit]')));
        // Unobstructed true-viewport booking evidence: blur focus, hide the sticky header,
        // and scroll the filled form into view so nothing crosses the fields.
        await page.evaluate(() => {
            document.activeElement?.blur();
            window.scrollTo(0, 0);
            const header = document.querySelector('.site-header');
            if (header) header.style.visibility = 'hidden';
        });
        await page.locator('#agendamento').scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(out, 'agendamento-390.png'), animations: 'disabled' });
        await page.evaluate(() => { const header = document.querySelector('.site-header'); if (header) header.style.visibility = ''; });

        await go('admin/index.html');
        await page.locator('#sidebarToggle').click();
        check('adminDrawerInertsBackground', await page.locator('.main-content').getAttribute('inert') !== null);
        await page.locator('[data-tab="servicos"]').click();
        check('adminDrawerClosesOnNavigation', await page.locator('#sidebarToggle').getAttribute('aria-expanded') === 'false');
        await page.getByRole('button', { name: 'Novo serviço' }).click();
        check('adminNativeFormDialog', await page.locator('dialog[open]').count() === 1);
        await page.keyboard.press('Escape');
        await page.locator('dialog').waitFor({ state: 'detached' });
        await page.evaluate(() => showTab('cupons'));
        await page.getByRole('button', { name: 'Novo cupom' }).click();
        await page.locator('#dialog-codigo').fill('TESTEP1');
        await page.locator('#dialog-valor').fill('150');
        await page.getByRole('button', { name: 'Salvar na demo' }).click();
        check('couponPercentageInlineError', (await page.locator('dialog [data-form-error]').textContent()).includes('100%'));
        await page.keyboard.press('Escape');
        await page.locator('dialog').waitFor({ state: 'detached' });
        await page.evaluate(() => {
            const list = JSON.parse(localStorage.getItem('agendamentos'));
            const id = list[0].id;
            concluirAgendamento(id); concluirAgendamento(id);
        });
        check('concludeIdempotentInDemo', await page.evaluate(() => JSON.parse(localStorage.getItem('clientesConta'))[0].visitas === 1));

        // All figures below are explicitly fictitious test data in a disposable context.
        await go('cliente/dashboard.html');
        await page.getByRole('button', { name: 'Avaliar este atendimento' }).click();
        await page.locator('#dialog-comentario').fill('Comentário fictício usado apenas na validação da interface.');
        await page.getByRole('button', { name: 'Salvar na demo' }).click();
        check('reviewDialogSavesLocally', await page.evaluate(() => JSON.parse(localStorage.getItem('avaliacoes')).length === 1));

        for (const theme of ['dark', 'light']) {
            for (const width of [390, 1440]) {
                await page.setViewportSize({ width, height: 1000 });
                await page.evaluate(value => localStorage.setItem('darkMode', String(value === 'dark')), theme);
                for (const [name, url] of [['home', 'index.html'], ['login', 'cliente/login.html'], ['cadastro', 'cliente/cadastro.html'], ['conta', 'cliente/dashboard.html'], ['admin', 'admin/index.html']]) {
                    await go(url);
                    // Populate the entry forms with disposable synthetic values so the
                    // light/dark captures show real filled states, not placeholders.
                    if (name === 'login') {
                        await page.locator('#telefoneLogin').fill('31900000000');
                        await page.locator('#senhaLogin').fill('SenhaDeTeste123');
                    } else if (name === 'cadastro') {
                        await page.locator('#nomeCadastro').fill('Cliente fictício de teste');
                        await page.locator('#telefoneCadastro').fill('31900000000');
                        await page.locator('#emailCadastro').fill('teste@example.invalid');
                        await page.locator('#senhaCadastro').fill('SenhaDeTeste123');
                        await page.locator('#confirmaSenha').fill('SenhaDeTeste123');
                        await page.locator('#nascimentoCadastro').fill('1995-04-12');
                        await page.locator('#aceitaPrivacidade').check();
                    }
                    await page.evaluate(async () => { for (const img of document.images) img.loading = 'eager'; await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode().catch(() => {}))); });
                    const findings = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
                    result.accessibility.push({ page: name, theme, width, violations: findings.violations });
                    const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, imagesLoaded: [...document.images].every(img => img.naturalWidth > 0) }));
                    result.layouts.push({ page: name, theme, ...layout });
                    await page.screenshot({ path: path.join(out, `${name}-${theme}-${width}-dados-teste.png`), fullPage: true, animations: 'disabled' });
                }
            }
        }
        await context.close();
    } finally {
        await browser.close();
        fs.writeFileSync(path.join(out, 'interface-results.json'), JSON.stringify(result, null, 2));
    }
    assert.deepEqual(result.errors, [], 'Erros JavaScript');
    assert.deepEqual(result.failedLocalRequests, [], 'Assets locais ausentes');
    assert.deepEqual(result.layouts.filter(item => item.scroll > item.width || !item.imagesLoaded), [], 'Layout ou imagens');
    assert.deepEqual(result.accessibility.filter(item => item.violations.length), [], 'Violações WCAG automatizadas');
    console.log(JSON.stringify({ checks: result.checks.length, accessibility: result.accessibility.length, layouts: result.layouts.length, errors: result.errors.length }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
