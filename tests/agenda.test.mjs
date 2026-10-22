// Testes das regras de agenda (disponibilidade e conflito).
// Executa com: node --test tests/agenda.test.mjs
//
// Estes testes cobrem exatamente os defeitos P0-2 (conflito/dupla reserva) e
// P0-3 (domingo aberto). Sao a rede de seguranca da correcao: se alguem voltar
// a ignorar a duracao do servico ou o barbeiro "Qualquer um", quebram aqui.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const agenda = require(resolve(raiz, 'js/agenda.js'));

const CONFIG = {
    abre: 9,
    fecha: 20,
    sabadoAte: 18,
    intervaloMinutos: 30,
    barbeiros: ['João', 'Marcos', 'Rafael'],
    duracaoPadraoMinutos: 30
};

// Uma segunda-feira qualquer, para nao cair em domingo.
const SEGUNDA = '2026-10-26';
const SABADO = '2026-10-31';
const DOMINGO = '2026-10-25';

function horarios(data, duracao, barbeiro, agendamentos) {
    return agenda.gerarHorariosDoDia(data, duracao, barbeiro, agendamentos, {
        config: CONFIG,
        agora: new Date('2026-10-01T08:00:00')
    });
}

test('domingo nao tem nenhum horario (loja fechada)', () => {
    assert.equal(agenda.diaDaSemana(DOMINGO), 0);
    assert.deepEqual(horarios(DOMINGO, 30, 'João', []), []);
});

test('segunda-feira abre 09:00 e fecha antes das 20:00', () => {
    const lista = horarios(SEGUNDA, 30, 'João', []).filter((h) => h.disponivel);
    assert.equal(lista[0].horario, '09:00');
    assert.equal(lista[lista.length - 1].horario, '19:30');
});

test('sabado fecha mais cedo (18:00)', () => {
    const lista = horarios(SABADO, 30, 'João', []).filter((h) => h.disponivel);
    assert.equal(lista[lista.length - 1].horario, '17:30');
});

test('conflito respeita a duracao: 10:00 por 50min bloqueia 10:30', () => {
    const existente = [
        { id: 1, data: SEGUNDA, horario: '10:00', duracao: 50, barbeiro: 'João', status: 'confirmado' }
    ];
    const lista = horarios(SEGUNDA, 30, 'João', existente);
    assert.equal(lista.find((h) => h.horario === '10:00').disponivel, false);
    assert.equal(lista.find((h) => h.horario === '10:30').disponivel, false, '10:30 colide com o intervalo de 10:00-10:50');
    assert.equal(lista.find((h) => h.horario === '11:00').disponivel, true, '11:00 ja esta livre');
});

test('existeConflito confirma sobreposicao parcial', () => {
    const existente = [
        { id: 1, data: SEGUNDA, horario: '10:00', duracao: 50, barbeiro: 'João', status: 'confirmado' }
    ];
    assert.equal(
        agenda.existeConflito({ data: SEGUNDA, horario: '10:30', duracao: 30, barbeiro: 'João' }, existente, {}),
        true
    );
    assert.equal(
        agenda.existeConflito({ data: SEGUNDA, horario: '10:30', duracao: 30, barbeiro: 'Marcos' }, existente, {}),
        false
    );
});

test('horario de um barbeiro nao bloqueia outro barbeiro', () => {
    const existente = [
        { id: 1, data: SEGUNDA, horario: '10:00', duracao: 30, barbeiro: 'João', status: 'confirmado' }
    ];
    const rafael = horarios(SEGUNDA, 30, 'Rafael', existente);
    assert.equal(rafael.find((h) => h.horario === '10:00').disponivel, true, 'Rafael continua livre as 10:00');
});

test('barbeiro "Qualquer um" colide com qualquer profissional', () => {
    const existente = [
        { id: 1, data: SEGUNDA, horario: '10:00', duracao: 30, barbeiro: 'João', status: 'confirmado' }
    ];
    const qualquer = horarios(SEGUNDA, 30, 'Qualquer um', existente);
    assert.equal(qualquer.find((h) => h.horario === '10:00').disponivel, false);
});

test('agendamento de "Qualquer um" ocupa todos os barbeiros', () => {
    const existente = [
        { id: 1, data: SEGUNDA, horario: '14:00', duracao: 30, barbeiro: 'Qualquer um', status: 'confirmado' }
    ];
    for (const nome of ['João', 'Marcos', 'Rafael']) {
        const lista = horarios(SEGUNDA, 30, nome, existente);
        assert.equal(lista.find((h) => h.horario === '14:00').disponivel, false, `${nome} deveria estar ocupado`);
    }
});

test('agendamento cancelado nao bloqueia o horario', () => {
    const existente = [
        { id: 1, data: SEGUNDA, horario: '15:00', duracao: 30, barbeiro: 'João', status: 'cancelado' }
    ];
    const lista = horarios(SEGUNDA, 30, 'João', existente);
    assert.equal(lista.find((h) => h.horario === '15:00').disponivel, true);
});

test('horarios no passado ficam indisponiveis', () => {
    const lista = agenda.gerarHorariosDoDia(SEGUNDA, 30, 'João', [], {
        config: CONFIG,
        agora: new Date(2026, 9, 26, 12, 15) // 26/10/2026 12:15 local
    });
    assert.equal(lista.find((h) => h.horario === '09:00').disponivel, false);
    assert.equal(lista.find((h) => h.horario === '12:00').disponivel, false);
    assert.equal(lista.find((h) => h.horario === '12:30').disponivel, true);
});

test('atendimento concluído não continua bloqueando a agenda', () => {
    const lista = horarios(SEGUNDA, 30, 'João', [
        { data: SEGUNDA, horario: '10:00', barbeiro: 'João', status: 'concluido' }
    ]);
    assert.equal(lista.find(h => h.horario === '10:00').disponivel, true);
});

test('servico que passa do fechamento nao e oferecido', () => {
    // Dia do Noivo = 120 min. As 19:00 terminaria 21:00, depois do fechamento.
    const lista = horarios(SEGUNDA, 120, 'João', []);
    assert.equal(lista.find((h) => h.horario === '19:00').disponivel, false);
    assert.equal(lista.find((h) => h.horario === '17:30').disponivel, true, '17:30 + 120min = 19:30, ainda antes das 20:00');
});

test('duracao ausente usa o padrao', () => {
    const existente = [
        { id: 1, data: SEGUNDA, horario: '10:00', barbeiro: 'João', status: 'confirmado' }
    ];
    const lista = horarios(SEGUNDA, 30, 'João', existente);
    assert.equal(lista.find((h) => h.horario === '10:00').disponivel, false);
    assert.equal(lista.find((h) => h.horario === '10:30').disponivel, true);
});

test('registro legado sem duração reconhece Corte + Barba de 50 minutos', () => {
    const lista = horarios(SEGUNDA, 30, 'João', [
        { data: SEGUNDA, horario: '10:00', barbeiro: 'João', servicos: 'Corte + Barba', status: 'confirmado' }
    ]);
    assert.equal(lista.find(h => h.horario === '10:30').disponivel, false);
});

test('ignorarId permite reagendar o proprio horario', () => {
    const existente = [
        { id: 7, data: SEGUNDA, horario: '10:00', duracao: 30, barbeiro: 'João', status: 'confirmado' }
    ];
    assert.equal(
        agenda.existeConflito(
            { data: SEGUNDA, horario: '10:00', duracao: 30, barbeiro: 'João' },
            existente,
            { ignorarId: 7 }
        ),
        false
    );
});

test('hojeLocal usa a data local, nao UTC', () => {
    // 22/10/2026 as 22:00 em Brasilia (UTC-3) ainda e dia 22, mesmo sendo
    // 23/10 em UTC.
    const local = new Date(2026, 9, 22, 22, 0, 0);
    assert.equal(agenda.hojeLocal(local), '2026-10-22');
});
