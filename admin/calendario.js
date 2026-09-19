/* =====================================================================
   calendario.js: aba "Calendário". Visão do mês, segunda a domingo.
   Os prazos das campanhas entram sozinhos, puxados da tabela campanhas.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Painel; if (!P) return;
  var esc = P.esc, $ = P.$;

  var TIPOS = [{ v: 'gravar', t: 'Gravar' }, { v: 'editar', t: 'Editar' }, { v: 'postar', t: 'Postar' }];
  var SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  var itens = [], camps = [], filtro = 'todos';
  var mes = (function () { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();

  function rotuloTipo(v) { if (v === 'prazo') return 'Prazo'; var t = TIPOS.filter(function (x) { return x.v === v; })[0]; return t ? t.t : v; }

  /* junta o que você digitou com os prazos das campanhas, tudo no mesmo formato */
  function eventos() {
    var lista = itens.map(function (i) {
      return { fonte: 'cal', id: i.id, titulo: i.titulo, marca: i.marca, tipo: i.tipo, data: String(i.data || '').slice(0, 10), feito: i.status === 'feito', exemplo: i.exemplo };
    });
    camps.forEach(function (c) {
      if (!c.prazo) return;
      lista.push({ fonte: 'camp', id: c.id, titulo: c.campanha, marca: c.cliente, tipo: 'prazo', data: String(c.prazo).slice(0, 10), feito: c.status === 'Entregue', exemplo: c.exemplo });
    });
    return lista.filter(function (e) { return e.data && (filtro === 'todos' || e.tipo === filtro); });
  }

  function montar(raiz) {
    raiz.innerHTML =
      '<div class="cal-cab">' +
        '<button class="ib" type="button" id="cal-ant" aria-label="Mês anterior">' + P.icone('esq') + '</button>' +
        '<div class="cal-mes" id="cal-mes" aria-live="polite"></div>' +
        '<button class="ib" type="button" id="cal-prox" aria-label="Próximo mês">' + P.icone('dir') + '</button>' +
        '<button class="btn btn-sec" type="button" id="cal-hoje">Este mês</button>' +
        '<div class="grupo" id="cal-filtro" role="group" aria-label="Filtrar por tipo" style="margin-left:auto"></div>' +
        '<button class="btn" type="button" id="cal-novo">' + P.icone('mais') + 'Adicionar</button>' +
      '</div>' +
      '<div class="cal-grade" id="cal-grade" role="grid"></div>' +
      '<div class="cartao" style="margin-top:1rem"><h2>Ficou pra trás</h2><div id="cal-atras"></div></div>';
    $('#cal-ant', raiz).addEventListener('click', function () { mes = new Date(mes.getFullYear(), mes.getMonth() - 1, 1); desenhar(); });
    $('#cal-prox', raiz).addEventListener('click', function () { mes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1); desenhar(); });
    $('#cal-hoje', raiz).addEventListener('click', function () { var d = new Date(); mes = new Date(d.getFullYear(), d.getMonth(), 1); desenhar(); });
    $('#cal-novo', raiz).addEventListener('click', function () { editar(null, P.hojeISO()); });
    $('#cal-filtro', raiz).addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; filtro = b.getAttribute('data-f'); desenhar(); });

    var grade = $('#cal-grade', raiz);
    grade.addEventListener('click', function (e) {
      var it = e.target.closest('.cal-it'), mais = e.target.closest('.cal-mais'), dia = e.target.closest('.cal-dia');
      if (it) { abrirEvento(it.getAttribute('data-fonte'), +it.getAttribute('data-id')); return; }
      if (mais) { abrirDia(mais.getAttribute('data-data')); return; }
      if (dia) editar(null, dia.getAttribute('data-data'));
    });
    grade.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.classList.contains('cal-dia')) editar(null, e.target.getAttribute('data-data'));
    });
    $('#cal-atras', raiz).addEventListener('click', function (e) {
      var b = e.target.closest('[data-feito]'); if (!b) return;
      P.Dados.atualizar('calendario', +b.getAttribute('data-feito'), { status: 'feito' }).then(function (r) {
        if (!r.ok) { P.toast(r.texto || 'Não consegui marcar.', 'erro'); return; } P.toast('Marcado como feito.'); entrar();
      });
    });
  }

  function entrar() {
    return Promise.all([
      P.Dados.listar('calendario', { ordem: [['data', true], ['id', true]] }),
      P.Dados.listar('campanhas', { ordem: [['prazo', true]] })
    ]).then(function (r) { itens = r[0].dados; camps = r[1].dados; desenhar(); });
  }

  function desenhar() {
    var hoje = P.hojeISO(), ev = eventos(), porDia = {};
    ev.forEach(function (e) { (porDia[e.data] = porDia[e.data] || []).push(e); });

    var nomeMes = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    $('#cal-mes').textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    $('#cal-filtro').innerHTML = [{ v: 'todos', t: 'Todos' }].concat(TIPOS, [{ v: 'prazo', t: 'Prazos' }]).map(function (t) {
      return '<button type="button" data-f="' + t.v + '" aria-pressed="' + (filtro === t.v) + '">' + t.t + '</button>';
    }).join('');

    var primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    var desloc = (primeiro.getDay() + 6) % 7;                       /* segunda = 0 */
    var diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    var semanas = Math.ceil((desloc + diasNoMes) / 7);
    var html = SEMANA.map(function (s) { return '<div class="cal-sem" role="columnheader">' + s + '</div>'; }).join('');
    for (var i = 0; i < semanas * 7; i++) {
      var d = new Date(mes.getFullYear(), mes.getMonth(), 1 - desloc + i), iso = P.paraISO(d);
      var lista = porDia[iso] || [], fora = d.getMonth() !== mes.getMonth();
      html += '<div class="cal-dia' + (fora ? ' fora' : '') + (iso === hoje ? ' hoje' : '') + '" data-data="' + iso + '" role="gridcell" tabindex="0" aria-label="' + esc(P.dataBR(iso)) + (lista.length ? ', ' + P.plural(lista.length, 'item', 'itens') : '') + '">' +
        '<span class="cal-n">' + d.getDate() + '</span>' +
        '<button class="cal-mais-btn" type="button" tabindex="-1" aria-hidden="true" title="Adicionar neste dia">+</button>';
      lista.slice(0, 3).forEach(function (e) {
        html += '<button type="button" class="cal-it t-' + e.tipo + (e.feito ? ' feito' : '') + '" data-fonte="' + e.fonte + '" data-id="' + e.id + '" title="' + esc(rotuloTipo(e.tipo) + ': ' + e.titulo) + '">' + esc(e.titulo) + '</button>';
      });
      if (lista.length > 3) html += '<button type="button" class="cal-mais" data-data="' + iso + '">+' + (lista.length - 3) + ' mais</button>';
      html += '</div>';
    }
    $('#cal-grade').innerHTML = html;
    desenharAtras(hoje);
  }

  function desenharAtras(hoje) {
    var atrasados = [];
    itens.forEach(function (i) {
      var d = String(i.data || '').slice(0, 10);
      if (i.status !== 'feito' && d && d < hoje) atrasados.push({ fonte: 'cal', id: i.id, titulo: i.titulo, tipo: i.tipo, data: d });
    });
    camps.forEach(function (c) {
      var d = String(c.prazo || '').slice(0, 10);
      if (!c.exemplo && d && d < hoje && c.status !== 'Entregue') atrasados.push({ fonte: 'camp', id: c.id, titulo: c.campanha, tipo: 'prazo', data: d });
    });
    atrasados.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    $('#cal-atras').innerHTML = !atrasados.length ? '<p class="vazio">Nada atrasado. Está tudo em dia.</p>' :
      '<ul class="atras">' + atrasados.map(function (a) {
        var n = P.diasEntre(a.data, hoje);
        return '<li><span class="pil t-' + a.tipo + ' cal-it" style="width:auto;margin:0">' + esc(rotuloTipo(a.tipo)) + '</span><span>' + esc(a.titulo) + '</span>' +
          '<span class="q">há ' + P.plural(n, 'dia', 'dias') + '</span>' +
          (a.fonte === 'cal' ? '<button class="btn btn-sec" type="button" data-feito="' + a.id + '" style="margin-left:auto;min-height:30px">Marcar como feito</button>'
            : '<a class="btn btn-sec" href="#campanhas" style="margin-left:auto;min-height:30px">Abrir campanhas</a>') + '</li>';
      }).join('') + '</ul>';
  }

  /* ---------- clique num item ou num dia ---------- */
  function abrirEvento(fonte, id) {
    if (fonte === 'camp') {
      var c = camps.filter(function (x) { return x.id === id; })[0]; if (!c) return;
      P.abrirModal(P.cabecalhoModal('Prazo de campanha') +
        '<p><b style="font-weight:500">' + esc(c.campanha) + '</b></p><p class="vazio">' + esc(c.cliente) + '. Prazo em ' + esc(P.dataBR(c.prazo)) + '. Este prazo vem da aba Campanhas: para mudar, edite lá.</p>' +
        '<div class="modal-pe"><button class="btn btn-sec" data-fechar>Fechar</button><a class="btn" href="#campanhas" data-fechar>Abrir campanhas</a></div>');
      return;
    }
    var i = itens.filter(function (x) { return x.id === id; })[0]; if (i) editar(i, i.data);
  }

  function abrirDia(iso) {
    var lista = eventos().filter(function (e) { return e.data === iso; });
    P.abrirModal(P.cabecalhoModal(P.dataBR(iso)) + '<ul class="dia-lista">' + lista.map(function (e) {
      return '<li><span class="pil t-' + e.tipo + ' cal-it" style="width:auto;margin:0">' + esc(rotuloTipo(e.tipo)) + '</span><span class="tx' + (e.feito ? '" style="text-decoration:line-through' : '') + '">' + esc(e.titulo) + (e.marca ? ' <span class="vazio">(' + esc(e.marca) + ')</span>' : '') + '</span>' +
        '<button class="btn btn-sec" type="button" data-abrir="' + e.fonte + ':' + e.id + '" style="min-height:30px">' + (e.fonte === 'cal' ? 'Editar' : 'Ver') + '</button></li>';
    }).join('') + '</ul><div class="modal-pe"><button class="btn btn-sec" data-fechar>Fechar</button><button class="btn" type="button" id="dia-add">' + P.icone('mais') + 'Adicionar neste dia</button></div>');
    $('#dia-add').addEventListener('click', function () { editar(null, iso); });
    $('#modal').querySelectorAll('[data-abrir]').forEach(function (b) {
      b.addEventListener('click', function () { var p = b.getAttribute('data-abrir').split(':'); abrirEvento(p[0], +p[1]); });
    });
  }

  function editar(i, data) {
    P.formulario({
      titulo: i ? 'Editar item' : 'Adicionar ao calendário',
      valores: i || { tipo: 'gravar', status: 'a fazer', data: data || P.hojeISO() },
      campos: [
        { nome: 'titulo', rotulo: 'O que é', obrigatorio: true },
        { nome: 'marca', rotulo: 'Marca' },
        { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', opcoes: TIPOS.map(function (t) { return { v: t.v, t: t.t }; }), meia: true },
        { nome: 'data', rotulo: 'Data', tipo: 'date', obrigatorio: true, meia: true },
        { nome: 'status', rotulo: 'Situação', tipo: 'select', opcoes: [{ v: 'a fazer', t: 'A fazer' }, { v: 'feito', t: 'Feito' }] }
      ],
      salvar: function (v) {
        if (i) { v.exemplo = false; return P.Dados.atualizar('calendario', i.id, v); }
        return P.Dados.inserir('calendario', v);
      },
      apagar: i ? function () { return P.Dados.apagar('calendario', i.id); } : null,
      aoSalvar: function () { P.recarregar(); }
    });
  }

  P.registrar('calendario', { titulo: 'Calendário', montar: montar, entrar: entrar });
})();
