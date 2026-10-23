// Shared presentation helpers. No authentication, synchronization or business rules.
(function () {
    'use strict';
    let preference = 'true';
    try { preference = localStorage.getItem('darkMode') ?? 'true'; } catch (_) { /* Theme is optional. */ }
    document.documentElement.dataset.theme = preference === 'false' ? 'light' : 'dark';

    function initTema() {
        const button = document.getElementById('darkModeToggle');
        if (!button || button.dataset.ready) return;
        button.dataset.ready = 'true';
        function label() {
            const dark = document.documentElement.dataset.theme === 'dark';
            button.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
            button.setAttribute('aria-pressed', String(dark));
            button.innerHTML = dark ? '<i class="fas fa-sun" aria-hidden="true"></i>' : '<i class="fas fa-moon" aria-hidden="true"></i>';
        }
        button.addEventListener('click', () => {
            const dark = document.documentElement.dataset.theme !== 'dark';
            document.documentElement.dataset.theme = dark ? 'dark' : 'light';
            try { localStorage.setItem('darkMode', String(dark)); } catch (_) { /* Theme still works for this page. */ }
            label();
        });
        label();
    }

    function erroFormulario(form, message) {
        const output = form?.querySelector('[data-form-error]');
        if (!output) return;
        output.textContent = message;
        output.hidden = !message;
        if (message) output.focus({ preventScroll: true });
    }

    const originalButtons = new WeakMap();
    function estadoEnvio(form, busy, text) {
        const button = form?.querySelector('[type="submit"]');
        if (!button) return;
        form.setAttribute('aria-busy', String(busy));
        if (busy) {
            originalButtons.set(button, [...button.childNodes].map(node => node.cloneNode(true)));
            button.textContent = text;
        } else if (originalButtons.has(button)) {
            button.replaceChildren(...originalButtons.get(button));
            originalButtons.delete(button);
        }
        button.disabled = busy;
    }

    function ativarDialogo(dialog, invoker) {
        const previous = invoker || document.activeElement;
        dialog.addEventListener('close', () => {
            dialog.remove();
            if (previous?.isConnected) previous.focus({ preventScroll: true });
        }, { once: true });
        dialog.addEventListener('click', event => {
            if (event.target.closest('[data-close-dialog]')) dialog.close();
        });
        dialog.addEventListener('keydown', event => {
            if (event.key !== 'Tab') return;
            const items = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')];
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        dialog.showModal();
    }

    function formularioDialogo(title, fields, submit) {
        const dialog = document.createElement('dialog');
        dialog.className = 'modal-overlay';
        dialog.setAttribute('aria-labelledby', 'dialogFormTitle');
        const content = document.createElement('div');
        content.className = 'modal-content';
        const heading = document.createElement('h2');
        heading.id = 'dialogFormTitle';
        heading.textContent = title;
        const form = document.createElement('form');
        form.className = 'dialog-form';
        for (const field of fields) {
            const group = document.createElement('div');
            group.className = 'form-group';
            const label = document.createElement('label');
            label.htmlFor = `dialog-${field.name}`;
            label.textContent = field.label;
            const input = document.createElement(field.options ? 'select' : field.type === 'textarea' ? 'textarea' : 'input');
            input.id = label.htmlFor;
            input.name = field.name;
            if (field.options) {
                for (const option of field.options) {
                    const element = document.createElement('option');
                    element.value = option.value;
                    element.textContent = option.label;
                    input.appendChild(element);
                }
            } else if (field.type !== 'textarea') input.type = field.type || 'text';
            for (const attribute of ['min', 'max', 'step', 'maxLength']) {
                if (field[attribute] !== undefined) input[attribute] = field[attribute];
            }
            input.required = Boolean(field.required);
            input.value = field.value ?? '';
            group.append(label, input);
            form.appendChild(group);
        }
        const error = document.createElement('div');
        error.className = 'form-error'; error.dataset.formError = ''; error.hidden = true;
        error.setAttribute('role', 'alert'); error.tabIndex = -1;
        const actions = document.createElement('div'); actions.className = 'dialog-actions';
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-secondary'; cancel.textContent = 'Cancelar'; cancel.dataset.closeDialog = '';
        const save = document.createElement('button'); save.type = 'submit'; save.className = 'btn btn-primary'; save.textContent = 'Salvar na demo';
        actions.append(cancel, save); form.append(error, actions); content.append(heading, form); dialog.appendChild(content);
        form.addEventListener('submit', async event => {
            event.preventDefault();
            erroFormulario(form, '');
            estadoEnvio(form, true, 'Salvando…');
            try {
                const result = await submit(Object.fromEntries(new FormData(form)));
                if (typeof result === 'string') erroFormulario(form, result);
                else dialog.close();
            } catch (_) { erroFormulario(form, 'Não foi possível salvar. Confira os dados e o armazenamento deste navegador.'); }
            finally { estadoEnvio(form, false); }
        });
        document.body.appendChild(dialog);
        ativarDialogo(dialog);
        return dialog;
    }

    document.addEventListener('DOMContentLoaded', () => {
        initTema();
        document.querySelectorAll('[data-password-target]').forEach(button => {
            button.addEventListener('click', () => {
                const input = document.getElementById(button.dataset.passwordTarget);
                const reveal = input.type === 'password';
                input.type = reveal ? 'text' : 'password';
                button.setAttribute('aria-pressed', String(reveal));
                button.setAttribute('aria-label', reveal ? 'Ocultar senha' : 'Mostrar senha');
                button.innerHTML = reveal ? '<i class="far fa-eye-slash" aria-hidden="true"></i>' : '<i class="far fa-eye" aria-hidden="true"></i>';
            });
        });
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('input', () => erroFormulario(form, ''));
            form.addEventListener('invalid', event => {
                const label = form.querySelector(`label[for="${event.target.id}"]`);
                erroFormulario(form, `Confira o campo ${label?.textContent.trim() || 'indicado'} para continuar.`);
            }, true);
        });
    });

    window.interfaceBarbados = { initTema, erroFormulario, estadoEnvio, ativarDialogo, formularioDialogo };
})();
