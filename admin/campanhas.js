/* =====================================================================
   campanhas.js: aba "Campanhas". Faixa de números, filtros e tabela
   que ordena em qualquer coluna (status segue a ordem do funil).
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Painel; if (!P) return;
  var esc = P.esc, $ = P.$;

  /* O funil, nesta ordem. Ordenar por status segue esta lista, nunca o alfabeto. */
  var FUNIL = ['Briefing', 'Roteiro', 'Aprovação Roteiro', 'Gravação', 'Edição', 'Aprovado', 'Entregue'];
  var TIPOS = ['Conteúdo', 'Publicidade'];
  var COLUNAS = [
    { k: 'favorita', t: 'Favorita', icone: true }, { k: 'campanha', t: 'Campanha' }, { k: 'cliente', t: 'Cliente' },
    { k: 'tipo', t: 'Tipo' }, { k: 'status', t: 'Status' }, { k: 'qtd', t: 'Qtd', num: true },
    { k: 'valor', t: 'Valor', num: true }, { k: 'prazo', t: 'Prazo' }, { k: 'pagamento', t: 'Pagamento' }
  ];
  var lista = [], filtro = 'todas', termo = '', ord = { col: null, dir: 1 };

  function montar(raiz) {
    raiz.innerHTML =
      '<div class="kpis" id="cp-kpis" aria-label="Resumo das campanhas"></div>' +
      '<div class="barra">' +
        '<div class="grupo" id="cp-filtro" role="group" aria-label="Filtrar campanhas"></div>' +
        '<label class="busca"><span class="sr">Buscar campanha ou cliente</span>' + P.icone('busca') + '<input type="search" id="cp-busca" placeholder="Buscar campanha ou cliente"></label>' +
        '<button class="btn btn-sec" type="button" id="cp-baixar">' + P.icone('baixar') + 'Baixar CSV</button>' +
        '<button class="btn" type="button" id="cp-novo">' + P.icone('mais') + 'Adicionar campanha</button>' +
      '</div>' +
      '<div id="cp-tabela"></div>';
    $('#cp-busca', raiz).addEventListener('input', function (e) { termo = e.target.value.trim().toLowerCase(); desenhar(); });
    $('#cp-filtro', raiz).addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; filtro = b.getAttribute('data-f'); desenhar(); });
    $('#cp-novo', raiz).addEventListener('click', function () { editar(null); });
    $('#cp-baixar', raiz).addEventListener('click', baixar);
    $('#cp-tabela', raiz).addEventListener('click', function (e) {
      var th = e.target.closest('th button[data-col]');
      if (th) { var c = th.getAttribute('data-col'); if (ord.col === c) ord.dir = -ord.dir; else { ord.col = c; ord.dir = 1; } desenhar(); return; }
      var est = e.target.closest('[data-estrela]');
      if (est) { alternarEstrela(+est.getAttribute('data-estrela')); return; }
      var tr = e.target.closest('tr[data-id]'); if (!tr) return;
      var c2 = lista.filter(function (x) { return String(x.id) === tr.getAttribute('data-id'); })[0]; if (c2) editar(c2);
    });
    $('#cp-tabela', raiz).addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'TR') e.target.click(); });
  }

  function entrar() {
    return P.Dados.listar('campanhas', { ordem: [['id', false]] }).then(function (r) { lista = r.dados; desenhar(); });
  }

  function alternarEstrela(id) {
    var c = lista.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    P.Dados.atualizar('campanhas', id, { favorita: !c.favorita }).then(function (r) {
      if (!r.ok) { P.toast(r.texto || 'Não consegui destacar.', 'erro'); return; } c.favorita = !c.favorita; desenhar();
    });
  }

  /* ---------- números da faixa (as linhas de exemplo não contam) ---------- */
  function desenharKpis() {
    var reais = lista.filter(function (c) { return !c.exemplo; }), totalValor = 0, totalQtd = 0, receber = 0, recebido = 0, ativas = 0;
    reais.forEach(function (c) {
      var v = P.num(c.valor); totalValor += v; totalQtd += P.num(c.qtd);
      if (c.pagamento === 'pago') recebido += v; else receber += v;
      if (c.ativa) ativas++;
    });
    var ticket = totalQtd > 0 ? totalValor / totalQtd : 0;      /* nunca divide por zero */
    $('#cp-kpis').innerHTML =
      '<div class="kpi"><div class="r">Total de campanhas</div><div class="v">' + P.inteiro(reais.length) + '</div><div class="s">&nbsp;</div></div>' +
      '<div class="kpi"><div class="r">Ativas</div><div class="v">' + P.inteiro(ativas) + '</div><div class="s">&nbsp;</div></div>' +
      '<div class="kpi"><div class="r">Valor total</div><div class="v">' + P.moeda(totalValor) + '</div><div class="s">Ticket médio por vídeo: ' + P.moeda(ticket) + '</div></div>' +
      '<div class="kpi"><div class="r">A receber</div><div class="v">' + P.moeda(receber) + '</div><div class="s">Já recebido: ' + P.moeda(recebido) + '</div></div>';
  }

  /* ---------- ordenar ---------- */
  function chave(c, col) {
    switch (col) {
      case 'favorita': return c.favorita ? 0 : 1;
      case 'status': var i = FUNIL.indexOf(c.status); return i < 0 ? 99 : i;
      case 'qtd': case 'valor': return P.num(c[col]);
      case 'pagamento': return c.pagamento === 'pago' ? 1 : 0;
      case 'prazo': return c.prazo ? String(c.prazo).slice(0, 10) : '';
      default: return String(c[col] || '').toLowerCase();
    }
  }
  function ordenar(arr) {
    if (!ord.col) return arr;
    var idx = {}; arr.forEach(function (c, i) { idx[c.id] = i; });
    return arr.slice().sort(function (a, b) {
      var x = chave(a, ord.col), y = chave(b, ord.col);
      if (ord.col === 'prazo') { if (!x && y) return 1; if (x && !y) return -1; }   /* sem prazo vai sempre para o fim */
      var r = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
      return r !== 0 ? r * ord.dir : idx[a.id] - idx[b.id];
    });
  }

  function etiquetaPrazo(c, hoje) {
    if (!c.prazo || c.status === 'Entregue') return '';      /* entregue não recebe aviso */
    var d = P.diasEntre(hoje, String(c.prazo).slice(0, 10));
    if (d < 0) return '<span class="et et-vermelha">Atrasado há ' + P.plural(-d, 'dia', 'dias') + '</span>';
    if (d <= 3) return '<span class="et et-amarela">' + (d === 0 ? 'Vence hoje' : d === 1 ? 'Vence amanhã' : 'Vence em ' + d + ' dias') + '</span>';
    return '';
  }
  function classeStatus(s) { var i = FUNIL.indexOf(s); return 's' + (i < 0 ? 1 : i + 1); }

  function visiveis() {
    return lista.filter(function (c) {
      if (filtro === 'ativas' && !c.ativa) return false;
      if (filtro === 'finalizadas' && c.ativa) return false;
      return !termo || [c.campanha, c.cliente].join(' ').toLowerCase().indexOf(termo) >= 0;
    });
  }

  function desenhar() {
    desenharKpis();
    var n = { todas: lista.length, ativas: lista.filter(function (c) { return c.ativa; }).length };
    n.finalizadas = n.todas - n.ativas;
    $('#cp-filtro').innerHTML = [['todas', 'Todas'], ['ativas', 'Ativas'], ['finalizadas', 'Finalizadas']].map(function (f) {
      return '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + f[1] + ' (' + n[f[0]] + ')</button>';
    }).join('');

    var linhas = ordenar(visiveis()), hoje = P.hojeISO(), alvo = $('#cp-tabela');
    if (!lista.length) { alvo.innerHTML = '<div class="cartao"><p class="vazio">Nenhuma campanha ainda. Clique em "Adicionar campanha" para começar.</p></div>'; return; }
    if (!linhas.length) { alvo.innerHTML = '<div class="cartao"><p class="vazio">Nenhuma campanha encontrada com esse filtro ou busca.</p></div>'; return; }

    var cab = COLUNAS.map(function (c) {
      var ativo = ord.col === c.k, sort = ativo ? (ord.dir === 1 ? 'ascending' : 'descending') : 'none';
      var seta = ativo ? (ord.dir === 1 ? '▲' : '▼') : '⇅';
      return '<th scope="col" aria-sort="' + sort + '"' + (c.num ? ' class="num"' : '') + '><button type="button" data-col="' + c.k + '" title="Ordenar por ' + esc(c.t) + '">' +
        (c.icone ? '<span class="sr">' + c.t + '</span>' + P.icone('estrela') : esc(c.t)) + ' <span class="seta" aria-hidden="true">' + seta + '</span></button></th>';
    }).join('');

    alvo.innerHTML = '<div class="tabela-caixa"><table><caption class="sr">Campanhas</caption><thead><tr>' + cab + '</tr></thead><tbody>' +
      linhas.map(function (c) {
        return '<tr class="clic' + (c.favorita ? ' fav' : '') + '" data-id="' + c.id + '" tabindex="0">' +
          '<td><button type="button" class="ib estrela' + (c.favorita ? ' on' : '') + '" data-estrela="' + c.id + '" aria-pressed="' + (!!c.favorita) + '" aria-label="' + (c.favorita ? 'Tirar destaque' : 'Destacar') + '">' + P.icone('estrela') + '</button></td>' +
          '<td>' + esc(c.campanha) + (c.exemplo ? '<span class="tag-ex">exemplo</span>' : '') + '</td><td>' + esc(c.cliente) + '</td>' +
          '<td><span class="pil ' + (c.tipo === 'Publicidade' ? 'p-publicidade' : 'p-conteudo') + '">' + esc(c.tipo) + '</span></td>' +
          '<td><span class="pil ' + classeStatus(c.status) + '">' + esc(c.status) + '</span></td>' +
          '<td class="num">' + P.inteiro(c.qtd) + '</td><td class="num">' + P.moeda(c.valor) + '</td>' +
          '<td>' + esc(P.dataBR(c.prazo)) + etiquetaPrazo(c, hoje) + '</td>' +
          '<td><span class="pil p-' + esc(c.pagamento) + '">' + (c.pagamento === 'pago' ? 'Pago' : 'Pendente') + '</span></td></tr>';
      }).join('') + '</tbody></table><div class="rodape-tab">' + P.plural(linhas.length, 'campanha', 'campanhas') + '. Clique numa linha para editar e nos títulos para ordenar.</div></div>';
  }

  function baixar() {
    var linhas = ordenar(visiveis()).map(function (c) {
      return [c.campanha, c.cliente, c.tipo, c.status, P.num(c.qtd), P.num(c.valor).toFixed(2).replace('.', ','), P.dataBR(c.prazo), c.pagamento === 'pago' ? 'Pago' : 'Pendente', c.ativa ? 'Sim' : 'Não', c.favorita ? 'Sim' : 'Não'];
    });
    P.baixarCSV('campanhas-' + P.hojeISO() + '.csv', ['Campanha', 'Cliente', 'Tipo', 'Status', 'Qtd', 'Valor', 'Prazo', 'Pagamento', 'Ativa', 'Favorita'], linhas);
    P.toast(linhas.length ? 'Campanhas baixadas.' : 'Baixei o arquivo, mas ele está vazio.');
  }

  function editar(c) {
    var d = P.formulario({
      titulo: c ? 'Editar campanha' : 'Adicionar campanha',
      valores: c || { tipo: 'Conteúdo', status: 'Briefing', pagamento: 'pendente', ativa: true, qtd: 0, valor: 0 },
      campos: [
        { nome: 'campanha', rotulo: 'Campanha', obrigatorio: true },
        { nome: 'cliente', rotulo: 'Cliente' },
        { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: TIPOS, meia: true },
        { nome: 'status', rotulo: 'Status', tipo: 'select', opcoes: FUNIL, meia: true },
        { nome: 'qtd', rotulo: 'Quantidade de vídeos', tipo: 'number', meia: true },
        { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'number', passo: '0.01', meia: true },
        { nome: 'prazo', rotulo: 'Prazo', tipo: 'date', meia: true },
        { nome: 'pagamento', rotulo: 'Pagamento', tipo: 'select', opcoes: [{ v: 'pendente', t: 'Pendente' }, { v: 'pago', t: 'Pago' }], meia: true },
        { nome: 'ativa', rotulo: 'Campanha ativa', tipo: 'checkbox' },
        { nome: 'favorita', rotulo: 'Destacar com estrela', tipo: 'checkbox' }
      ],
      salvar: function (v) {
        v.prazo = v.prazo || null;
        if (c) { v.exemplo = false; return P.Dados.atualizar('campanhas', c.id, v); }
        return P.Dados.inserir('campanhas', v);
      },
      apagar: c ? function () { return P.Dados.apagar('campanhas', c.id); } : null,
      aoSalvar: function () { P.recarregar(); }
    });
    /* Ao escolher "Entregue", a campanha deixa de estar ativa (você pode reativar). */
    var st = d.querySelector('#f-status'), at = d.querySelector('#f-ativa');
    if (st && at) st.addEventListener('change', function () { if (st.value === 'Entregue') at.checked = false; });
  }

  P.registrar('campanhas', { titulo: 'Campanhas', montar: montar, entrar: entrar });
})();
