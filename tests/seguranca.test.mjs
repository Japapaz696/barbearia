// Testes do modulo de seguranca (escape de HTML).
// Executa com: node --test tests/seguranca.test.mjs
//
// Cobre o defeito P0-1 (XSS armazenado): todo dado de usuario precisa sair
// escapado quando entra em innerHTML.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { escaparHtml, escaparAtributo, jsonParaAtributo, inteiroLimitado } = require(resolve(raiz, 'js/seguranca.js'));

test('neutraliza a tag <img onerror> do P0-1', () => {
    const entrada = '<img src=x onerror="window.__xss=1">';
    const saida = escaparHtml(entrada);
    assert.ok(!saida.includes('<img'), 'nao sobra tag crua');
    assert.ok(saida.includes('&lt;img'), 'a tag vira texto');
    assert.ok(!/<[a-z]/i.test(saida), 'nao existe nenhum inicio de tag');
});

test('neutraliza <script> e quebra de atributo com aspas', () => {
    assert.equal(escaparHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(escaparHtml('" onmouseover="evil()'), '&quot; onmouseover&#61;&quot;evil()');
    assert.equal(escaparHtml("' onclick='evil()"), '&#39; onclick&#61;&#39;evil()');
});

test('escapa os cinco caracteres classicos', () => {
    assert.equal(escaparHtml('&'), '&amp;');
    assert.equal(escaparHtml('<'), '&lt;');
    assert.equal(escaparHtml('>'), '&gt;');
    assert.equal(escaparHtml('"'), '&quot;');
    assert.equal(escaparHtml("'"), '&#39;');
});

test('nao duplica escape de texto que ja e inofensivo', () => {
    assert.equal(escaparHtml('João da Silva'), 'João da Silva');
    assert.equal(escaparHtml('Corte + Barba'), 'Corte + Barba');
});

test('valores nulos ou ausentes viram string vazia', () => {
    assert.equal(escaparHtml(null), '');
    assert.equal(escaparHtml(undefined), '');
    assert.equal(escaparHtml(''), '');
});

test('escaparAtributo e equivalente a escaparHtml', () => {
    const entrada = 'a"b\'c<d>';
    assert.equal(escaparAtributo(entrada), escaparHtml(entrada));
});

test('jsonParaAtributo gera JSON sem aspas cruas', () => {
    const saida = jsonParaAtributo({ nome: '<b>x</b>' });
    assert.ok(!saida.includes('<b>'));
    assert.ok(!saida.includes('"'), 'as aspas do JSON tambem sao escapadas');
});

test('inteiroLimitado prende valores fora da faixa', () => {
    assert.equal(inteiroLimitado(3, 1, 5, 5), 3);
    assert.equal(inteiroLimitado(0, 1, 5, 5), 1);
    assert.equal(inteiroLimitado(9, 1, 5, 5), 5);
    assert.equal(inteiroLimitado('abc', 1, 5, 5), 5, 'entrada invalida cai no padrao');
    assert.equal(inteiroLimitado('4', 1, 5, 5), 4, 'string numerica funciona');
    assert.equal(inteiroLimitado(null, 1, 5, 5), 5);
});
