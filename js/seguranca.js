// === SEGURANÇA: ESCAPE DE HTML ===
//
// Todo texto que vem de localStorage ou de formulário é dado de terceiro. Ele
// NUNCA deve ser concatenado cru dentro de innerHTML, senão vira XSS
// armazenado: um nome ou comentário com <img onerror> executa script no
// navegador de quem abrir a página — inclusive no painel admin.
//
// Use `escaparHtml(texto)` para montar innerHTML e `escaparAtributo(texto)`
// quando o valor entra dentro de um atributo. Para JSON inline use
// `jsonParaAtributo(valor)`.
//
// Este arquivo é compartilhado entre navegador e Node (para os testes de
// regressão), sem depender de DOM.

(function (global) {
    'use strict';

    const MAPA = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;',
        '=': '&#61;'
    };

    function escaparHtml(texto) {
        if (texto === null || texto === undefined) return '';
        return String(texto).replace(/[&<>"'`=]/g, (caractere) => MAPA[caractere]);
    }

    function escaparAtributo(texto) {
        return escaparHtml(texto);
    }

    // Converte um valor para JSON seguro de embutir dentro de um atributo HTML.
    // Também fecha e reabre aspas para não escapar do atributo em nenhuma
    // combinação de aspas.
    function jsonParaAtributo(valor) {
        return escaparAtributo(JSON.stringify(valor));
    }

    // Normaliza inteiro dentro de um intervalo. Devolve o padrão quando o valor
    // não é um número finito. Usado para notas de avaliação etc.
    function inteiroLimitado(valor, minimo, maximo, padrao) {
        const numero = parseInt(valor, 10);
        if (!Number.isFinite(numero)) return padrao;
        if (numero < minimo) return minimo;
        if (numero > maximo) return maximo;
        return numero;
    }

    const api = { escaparHtml, escaparAtributo, jsonParaAtributo, inteiroLimitado };

    if (typeof window !== 'undefined') window.seguranca = api;
    if (typeof globalThis !== 'undefined') globalThis.seguranca = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
