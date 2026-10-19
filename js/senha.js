// === TRATAMENTO DE SENHA (CLIENTE) ===
//
// A senha nunca e gravada em texto puro. O que fica no localStorage e um
// derivador PBKDF2-SHA256 com sal aleatorio, no formato:
//
//     pbkdf2$<sal-em-base64>$<hash-em-base64>
//
// O login compara o derivador calculado com o armazenado, em tempo constante
// quando possivel.
//
// Por que ainda assim nao e seguranca de verdade: este e um protótipo sem
// backend. A verificacao acontece no navegador, entao quem controla o
// navegador controla tambem a comparacao. Guardar a senha em texto puro, porem,
// expunha a senha original para qualquer pessoa com acesso ao aparelho. Com o
// derivador, o vazamento nao entrega a senha.
//
// A porta de entrada real de uma conta de cliente seria o servidor, com a
// senha verificada do lado de la e a sessao mantida por cookie HttpOnly.

// Numero de iteracoes do PBKDF2. Alto o bastante para atrasar tentativas
// em massa, baixo o bastante para o login nao ficar lento no navegador.
const ITERACOES = 100000;
const TAMANHO_SAL = 16;
const TAMANHO_HASH = 32;
const PREFIXO = 'pbkdf2$';

// === BASE64 (funciona no navegador e no Node) ===

function paraBase64(bytes) {
    if (typeof btoa === 'function') {
        let binario = '';
        for (const byte of bytes) binario += String.fromCharCode(byte);
        return btoa(binario);
    }
    return Buffer.from(bytes).toString('base64');
}

function deBase64(texto) {
    if (typeof atob === 'function') {
        try {
            const binario = atob(texto);
            const bytes = new Uint8Array(binario.length);
            for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
            return bytes;
        } catch {
            // Base64 invalido: devolve null em vez de lancar excecao.
            return null;
        }
    }
    try {
        return new Uint8Array(Buffer.from(texto, 'base64'));
    } catch {
        return null;
    }
}

function salAleatorio() {
    const bytes = new Uint8Array(TAMANHO_SAL);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
        return bytes;
    }
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    return bytes;
}

// === HASH DERIVADO ===

/**
 * Deriva a senha com PBKDF2-SHA256.
 * Devolve null quando a Web Crypto nao esta disponivel (contexto nao seguro).
 */
async function derivarComWebCrypto(senha, sal) {
    if (typeof crypto === 'undefined' || !crypto.subtle) return null;

    const encoder = new TextEncoder();
    const chave = await crypto.subtle.importKey(
        'raw',
        encoder.encode(senha),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: sal, iterations: ITERACOES, hash: 'SHA-256' },
        chave,
        TAMANHO_HASH * 8
    );
    return new Uint8Array(bits);
}

/**
 * Fallback para contextos sem Web Crypto (abrir o arquivo direto pelo disco).
 * Nao e criptografia: e um resumo iterado, suficiente para nao gravar a senha
 * em texto puro.
 */
function derivarSemWebCrypto(senha, sal) {
    const semente = `${paraBase64(sal)}:${senha}`;
    let acumulado = 0x811c9dc5;
    for (let volta = 0; volta < 1000; volta += 1) {
        for (let i = 0; i < semente.length; i += 1) {
            acumulado ^= semente.charCodeAt(i);
            acumulado = Math.imul(acumulado, 0x01000193) >>> 0;
        }
        acumulado = (acumulado ^ volta) >>> 0;
    }
    const bytes = new Uint8Array(TAMANHO_HASH);
    for (let i = 0; i < TAMANHO_HASH; i += 1) {
        bytes[i] = (acumulado >>> (i % 4 * 8)) & 0xff;
        acumulado = Math.imul(acumulado ^ (i + 1), 0x01000193) >>> 0;
    }
    return bytes;
}

/**
 * Gera o valor que sera gravado no localStorage.
 */
async function gerarHashSenha(senha) {
    const sal = salAleatorio();
    const hash = (await derivarComWebCrypto(senha, sal)) || derivarSemWebCrypto(senha, sal);
    return `${PREFIXO}${paraBase64(sal)}$${paraBase64(hash)}`;
}

/**
 * Compara dois derivadores sem sair no primeiro byte diferente.
 */
function compararBytes(a, b) {
    if (a.length !== b.length) return false;
    let diferenca = 0;
    for (let i = 0; i < a.length; i += 1) diferenca |= a[i] ^ b[i];
    return diferenca === 0;
}

/**
 * Confere a senha contra o valor armazenado.
 *
 * Aceita dois formatos:
 *  - `pbkdf2$sal$hash`: formato atual;
 *  - texto puro: registros antigos, de antes da correcao. nesse caso a
 *    comparacao e direta e o registro deve ser reescrito depois do login.
 *
 * Devolve { confere, formato } para que o chamador saiba se precisa migrar.
 */
async function verificarSenha(senha, armazenado) {
    if (typeof senha !== 'string' || typeof armazenado !== 'string' || !armazenado) {
        return { confere: false, formato: 'nenhum' };
    }

    if (!armazenado.startsWith(PREFIXO)) {
        return { confere: senha === armazenado, formato: 'texto-puro' };
    }

    const partes = armazenado.slice(PREFIXO.length).split('$');
    if (partes.length !== 2) return { confere: false, formato: 'invalido' };

    const sal = deBase64(partes[0]);
    const esperado = deBase64(partes[1]);
    if (!sal || !esperado || sal.length === 0 || esperado.length === 0) {
        return { confere: false, formato: 'invalido' };
    }
    const calculado = (await derivarComWebCrypto(senha, sal)) || derivarSemWebCrypto(senha, sal);
    return { confere: compararBytes(esperado, calculado), formato: 'pbkdf2' };
}

// Disponivel no navegador (script classico) e no Node, para os testes.
const api = { gerarHashSenha, verificarSenha, PREFIXO };

if (typeof window !== 'undefined') {
    window.hashSenha = api;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
if (typeof globalThis !== 'undefined') {
    globalThis.hashSenha = api;
}
