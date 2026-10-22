// === AGENDA: REGRAS DE DISPONIBILIDADE E CONFLITO ===
//
// Este módulo concentra a regra de negócio de agenda que antes vivia misturada
// ao DOM em `js/main.js`. Ele não toca em banco nem em rede: recebe os
// agendamentos existentes e devolve quais horários estão livres.
//
// Regras:
//  - domingo é fechado;
//  - o expediente termina às `fecha` (sábado em `sabadoAte`);
//  - um agendamento ocupa [horário, horário + duração). O próximo horário só
//    entra se começar exatamente no fim do anterior ou depois;
//  - o barbeiro "Qualquer um" ocupa todos os barbeiros: ninguém mais entra no
//    mesmo intervalo;
//  - "Qualquer um" só pode ser agendado se TODOS os barbeiros ativos estiverem
//    livres no intervalo;
//  - horários no passado ficam indisponíveis.
//
// Compartilhado entre navegador e Node (testes). Sem dependências de DOM.

(function (global) {
    'use strict';

    const DURACAO_PADRAO = 30;

    const CONFIG_PADRAO = {
        abre: 9,
        fecha: 20,
        sabadoAte: 18,
        intervaloMinutos: 30,
        barbeiros: ['João', 'Marcos', 'Rafael'],
        duracaoPadraoMinutos: DURACAO_PADRAO
    };

    function minutosDoDia(horario) {
        const partes = String(horario || '').split(':');
        const hora = parseInt(partes[0], 10);
        const minuto = parseInt(partes[1], 10);
        if (!Number.isFinite(hora) || !Number.isFinite(minuto)) return null;
        return hora * 60 + minuto;
    }

    function formatarHorario(minutos) {
        const hora = Math.floor(minutos / 60);
        const minuto = minutos % 60;
        return String(hora).padStart(2, '0') + ':' + String(minuto).padStart(2, '0');
    }

    // `data` no formato AAAA-MM-DD, interpretada como data local (não UTC).
    function diaDaSemana(data) {
        const partes = String(data || '').split('-');
        if (partes.length !== 3) return NaN;
        const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
        return d.getDay();
    }

    function horaFechamento(data, config) {
        const cfg = Object.assign({}, CONFIG_PADRAO, config || {});
        return diaDaSemana(data) === 6 ? cfg.sabadoAte : cfg.fecha;
    }

    // Instante "agora" comparável com data+horário locais.
    function agoraEhDepoisDe(data, horario, agora) {
        const base = agora instanceof Date ? agora : new Date();
        const minutos = minutosDoDia(horario);
        if (minutos === null) return true;
        const alvo = new Date(
            Number(String(data).split('-')[0]),
            Number(String(data).split('-')[1]) - 1,
            Number(String(data).split('-')[2]),
            Math.floor(minutos / 60),
            minutos % 60
        );
        return alvo.getTime() < base.getTime();
    }

    function intervaloDoAgendamento(ag, duracaoPadrao) {
        const inicio = minutosDoDia(ag && ag.horario);
        if (inicio === null) return null;
        let duracao = parseInt(ag && ag.duracao, 10);
        if (!Number.isFinite(duracao) || duracao <= 0) {
            // Registros antigos não tinham duração. Reconhece os serviços do
            // catálogo original para não encurtar um atendimento já gravado.
            const legados = { 'Corte Masculino': 30, 'Barba': 25, 'Corte + Barba': 50, 'Pigmentação': 40, 'Hidratação': 30, 'Dia do Noivo': 120, 'Sobrancelha': 15, 'Pézinho': 15 };
            const texto = String(ag && ag.servicos || '').trim();
            duracao = legados[texto] || texto.split(' + ').reduce((total, nome) => total + (legados[nome] || 0), 0);
            if (!duracao) duracao = Number.isFinite(duracaoPadrao) && duracaoPadrao > 0 ? duracaoPadrao : DURACAO_PADRAO;
        }
        return { inicio: inicio, fim: inicio + duracao };
    }

    function barbeiroEhQualquer(barbeiro) {
        return String(barbeiro || '').trim().toLowerCase() === 'qualquer um';
    }

    function intervalosSobrepoem(a, b) {
        return a.inicio < b.fim && b.inicio < a.fim;
    }

    /**
     * Verifica se um candidato colide com algum agendamento existente.
     *
     * @param {{data:string, horario:string, duracao?:number, barbeiro?:string}} candidato
     * @param {Array} agendamentos
     * @param {{ignorarId?:number|string}} opcoes
     * @returns {boolean}
     */
    function existeConflito(candidato, agendamentos, opcoes) {
        const opt = opcoes || {};
        const duracaoPadrao = Number.isFinite(opt.duracaoPadraoMinutos)
            ? opt.duracaoPadraoMinutos
            : DURACAO_PADRAO;
        const alvo = intervaloDoAgendamento(candidato, duracaoPadrao);
        if (!alvo) return true;

        const lista = Array.isArray(agendamentos) ? agendamentos : [];
        return lista.some((ag) => {
            if (!ag || ag.status === 'cancelado' || ag.status === 'concluido') return false;
            if (opt.ignorarId !== undefined && ag.id === opt.ignorarId) return false;
            if (ag.data !== candidato.data) return false;

            const outro = intervaloDoAgendamento(ag, duracaoPadrao);
            if (!outro || !intervalosSobrepoem(alvo, outro)) return false;

            // "Qualquer um" colide com qualquer barbeiro; caso contrário, só
            // colide se for o mesmo profissional.
            if (barbeiroEhQualquer(candidato.barbeiro) || barbeiroEhQualquer(ag.barbeiro)) {
                return true;
            }
            return candidato.barbeiro === ag.barbeiro;
        });
    }

    /**
     * Lista os horários do dia com o estado de disponibilidade para um barbeiro.
     *
     * @returns {Array<{horario:string, disponivel:boolean, motivo:string}>}
     */
    function gerarHorariosDoDia(data, duracaoMinutos, barbeiro, agendamentos, opcoes) {
        const opt = opcoes || {};
        const cfg = Object.assign({}, CONFIG_PADRAO, opt.config || {});
        const agora = opt.agora instanceof Date ? opt.agora : new Date();
        const duracao = Number.isFinite(duracaoMinutos) && duracaoMinutos > 0
            ? duracaoMinutos
            : cfg.duracaoPadraoMinutos;

        const resultado = [];
        const dia = diaDaSemana(data);
        if (!Number.isFinite(dia)) return resultado;
        if (dia === 0) return resultado; // domingo fechado

        const abertura = cfg.abre * 60;
        const fechamento = horaFechamento(data, cfg) * 60;
        if (fechamento <= abertura) return resultado;

        for (let inicio = abertura; inicio < fechamento; inicio += cfg.intervaloMinutos) {
            const horario = formatarHorario(inicio);
            const fim = inicio + duracao;
            let disponivel = true;
            let motivo = '';

            if (fim > fechamento) {
                disponivel = false;
                motivo = 'fora-do-expediente';
            } else if (agoraEhDepoisDe(data, horario, agora)) {
                disponivel = false;
                motivo = 'passado';
            } else if (existeConflito(
                { data: data, horario: horario, duracao: duracao, barbeiro: barbeiro },
                agendamentos,
                { duracaoPadraoMinutos: cfg.duracaoPadraoMinutos }
            )) {
                disponivel = false;
                motivo = 'ocupado';
            }

            resultado.push({ horario: horario, disponivel: disponivel, motivo: motivo });
        }
        return resultado;
    }

    // Data de hoje no fuso local, no formato AAAA-MM-DD (evita o bug de UTC).
    function hojeLocal(agora) {
        const d = agora instanceof Date ? agora : new Date();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + mes + '-' + dia;
    }

    const api = {
        DURACAO_PADRAO: DURACAO_PADRAO,
        CONFIG_PADRAO: CONFIG_PADRAO,
        minutosDoDia: minutosDoDia,
        formatarHorario: formatarHorario,
        diaDaSemana: diaDaSemana,
        horaFechamento: horaFechamento,
        existeConflito: existeConflito,
        gerarHorariosDoDia: gerarHorariosDoDia,
        hojeLocal: hojeLocal,
        barbeiroEhQualquer: barbeiroEhQualquer
    };

    if (typeof window !== 'undefined') window.agenda = api;
    if (typeof globalThis !== 'undefined') globalThis.agenda = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
