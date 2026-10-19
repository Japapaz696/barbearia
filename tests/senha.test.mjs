// Testes do tratamento de senha do cliente.
// Executa com: node --test tests/senha.test.mjs
//
// Cobre o que importa para a correcao: a senha nao fica em texto puro no
// localStorage, a verificacao aceita a senha certa e recusa a errada, e uma
// conta antiga (com senha em texto puro) continua entrando e e migrada.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { gerarHashSenha, verificarSenha, PREFIXO } = require(resolve(raiz, 'js/senha.js'));

test('o hash gerado nao contem a senha', async () => {
    const senha = 'minha-senha-secreta';
    const hash = await gerarHashSenha(senha);

    assert.ok(hash.startsWith(PREFIXO), 'usa o prefixo pbkdf2$');
    assert.ok(!hash.includes(senha), 'a senha nao aparece no valor guardado');
});

test('duas contas com a mesma senha geram valores diferentes', async () => {
    // O sal aleatorio faz o valor guardado ser unico por conta.
    const a = await gerarHashSenha('mesma-senha');
    const b = await gerarHashSenha('mesma-senha');

    assert.notEqual(a, b, 'o sal precisa ser diferente a cada conta');
});

test('a senha correta passa na verificacao', async () => {
    const senha = 'senha-correta-123';
    const hash = await gerarHashSenha(senha);

    const { confere, formato } = await verificarSenha(senha, hash);
    assert.equal(confere, true);
    assert.equal(formato, 'pbkdf2');
});

test('a senha errada e recusada', async () => {
    const hash = await gerarHashSenha('senha-correta-123');

    const { confere } = await verificarSenha('senha-errada-123', hash);
    assert.equal(confere, false);
});

test('senha vazia e valor ausente sao recusados', async () => {
    assert.equal((await verificarSenha('', 'pbkdf2$abc$def')).confere, false);
    assert.equal((await verificarSenha('qualquer', '')).confere, false);
    assert.equal((await verificarSenha('qualquer', null)).confere, false);
    assert.equal((await verificarSenha(null, 'pbkdf2$abc$def')).confere, false);
});

test('um hash adulterado nao passa', async () => {
    const hash = await gerarHashSenha('senha-correta-123');
    const partes = hash.split('$');

    const adulterado = `${partes[0]}$${partes[1]}$${'A'.repeat(partes[2].length)}`;
    const { confere } = await verificarSenha('senha-correta-123', adulterado);
    assert.equal(confere, false);
});

test('um valor malformado nao causa excecao', async () => {
    for (const invalido of ['pbkdf2$sozinho', 'pbkdf2$$', 'pbkdf2$a$b$c', 'pbkdf2$!!!$???']) {
        const { confere } = await verificarSenha('qualquer', invalido);
        assert.equal(confere, false, `valor invalido aceitou: ${invalido}`);
    }
});

test('conta antiga em texto puro ainda entra e e sinalizada para migracao', async () => {
    // Registro criado antes da correcao, com a senha em texto puro.
    const { confere, formato } = await verificarSenha('senha-antiga', 'senha-antiga');

    assert.equal(confere, true, 'a conta antiga precisa continuar entrando');
    assert.equal(formato, 'texto-puro', 'e precisa ser identificada para migracao');
});

test('conta antiga com a senha errada nao entra', async () => {
    const { confere } = await verificarSenha('outra-coisa', 'senha-antiga');
    assert.equal(confere, false);
});

test('a migracao troca o texto puro pelo derivador', async () => {
    const senha = 'senha-antiga';
    const { confere, formato } = await verificarSenha(senha, senha);
    assert.equal(confere, true);
    assert.equal(formato, 'texto-puro');

    // O que o login faz depois de um acerto com conta antiga.
    const migrado = await gerarHashSenha(senha);

    assert.notEqual(migrado, senha);
    assert.ok(!migrado.includes(senha));
    assert.equal((await verificarSenha(senha, migrado)).confere, true);
});
