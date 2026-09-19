/* =====================================================================
   marcas.js: aba "Marcas". Sua base de contatos de empresas, em planilha.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Painel; if (!P) return;
  var esc = P.esc, $ = P.$;

  var SITUACOES = [
    { v: 'lead', t: 'Lead' }, { v: 'conversando', t: 'Conversando' },
    { v: 'cliente', t: 'Cliente' }, { v: 'parada', t: 'Parada' }
  ];
  function nomeSit(v) { var s = SITUACOES.filter(function (x) { return x.v === v; })[0]; return s ? s.t : (v || ''); }

  var marcas = [], filtro = 'todas', termo = '';

  function montar(raiz) {
    raiz.innerHTML =
      '<div class="barra">' +
        '<label class="busca"><span class="sr">Buscar por nome, @ ou e-mail</span>' + P.icone('busca') + '<input type="search" id="mc-busca" placeholder="Buscar por nome, @ ou e-mail"></label>' +
        '<div class="grupo" id="mc-filtro" role="group" aria-label="Filtrar por situação"></div>' +
        '<button class="btn btn-sec" type="button" id="mc-baixar">' + P.icone('baixar') + 'Baixar CSV</button>' +
        '<button class="btn" type="button" id="mc-novo">' + P.icone('mais') + 'Adicionar marca</button>' +
      '</div>' +
      '<div id="mc-lista"></div>';
    $('#mc-busca', raiz).addEventListener('input', function (e) { termo = e.target.value.trim().toLowerCase(); desenhar(); });
    $('#mc-filtro', raiz).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; filtro = b.getAttribute('data-f'); desenhar();
    });
    $('#mc-novo', raiz).addEventListener('click', function () { editar(null); });
    $('#mc-baixar', raiz).addEventListener('click', baixar);
    $('#mc-lista', raiz).addEventListener('click', function (e) {
      if (e.target.closest('a')) return; /* WhatsApp e Instagram abrem sozinhos, sem abrir a edição */
      var tr = e.target.closest('tr[data-id]'); if (!tr) return;
      var m = marcas.filter(function (x) { return String(x.id) === tr.getAttribute('data-id'); })[0];
      if (m) editar(m);
    });
    $('#mc-lista', raiz).addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.target.tagName !== 'TR') return; e.target.click();
    });
  }

  function entrar() {
    return P.Dados.listar('marcas', { ordem: [['criado_em', false], ['id', false]] }).then(function (r) { marcas = r.dados; desenhar(); });
  }

  function igInfo(ig) {
    var h = String(ig || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[\/?#].*$/, '');
    return h ? { arroba: '@' + h, url: 'https://instagram.com/' + encodeURIComponent(h) } : null;
  }
  function zapUrl(tel) {
    var d = String(tel || '').replace(/\D/g, '');
    if (!d || /^0+$/.test(d)) return '';
    if (d.length <= 11) d = '55' + d;
    return 'https://wa.me/' + d;
  }

  function visiveis() {
    return marcas.filter(function (m) {
      if (filtro !== 'todas' && m.situacao !== filtro) return false;
      if (!termo) return true;
      return [m.nome, m.instagram, m.email].join(' ').toLowerCase().indexOf(termo) >= 0;
    });
  }

  function desenhar() {
    var cont = { todas: marcas.length };
    SITUACOES.forEach(function (s) { cont[s.v] = marcas.filter(function (m) { return m.situacao === s.v; }).length; });
    $('#mc-filtro').innerHTML = [{ v: 'todas', t: 'Todas' }].concat(SITUACOES).map(function (s) {
      return '<button type="button" data-f="' + s.v + '" aria-pressed="' + (filtro === s.v) + '">' + s.t + ' (' + cont[s.v] + ')</button>';
    }).join('');

    var lista = visiveis(), alvo = $('#mc-lista');
    if (!marcas.length) { alvo.innerHTML = '<div class="cartao"><p class="vazio">Nenhuma marca ainda. Quem preencher o formulário do seu site entra aqui como Lead. Você também pode adicionar à mão.</p></div>'; return; }
    if (!lista.length) { alvo.innerHTML = '<div class="cartao"><p class="vazio">Nenhuma marca encontrada com essa busca ou filtro.</p></div>'; return; }
    alvo.innerHTML = '<div class="tabela-caixa"><table><caption class="sr">Base de marcas</caption><thead><tr>' +
      '<th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th></tr></thead><tbody>' +
      lista.map(function (m) {
        var ig = igInfo(m.instagram), zap = zapUrl(m.telefone);
        return '<tr class="clic" data-id="' + m.id + '" tabindex="0">' +
          '<td>' + esc(m.nome) + (m.exemplo ? '<span class="tag-ex">exemplo</span>' : '') + '</td>' +
          '<td>' + (ig ? '<a href="' + esc(ig.url) + '" target="_blank" rel="noopener noreferrer" title="Abrir no Instagram" style="display:inline-flex;align-items:center;gap:.3rem">' + P.icone('insta') + esc(ig.arroba) + '</a>' : '') + '</td>' +
          '<td>' + esc(m.email) + '</td>' +
          '<td>' + esc(m.telefone) + (zap ? ' <a class="ib" href="' + esc(zap) + '" target="_blank" rel="noopener noreferrer" aria-label="Chamar no WhatsApp" title="Chamar no WhatsApp">' + P.icone('whats') + '</a>' : '') + '</td>' +
          '<td><span class="pil p-' + esc(m.situacao) + '">' + esc(nomeSit(m.situacao)) + '</span></td>' +
          '<td style="max-width:260px;overflow-wrap:anywhere">' + esc(m.obs) + '</td>' +
          '<td>' + esc(P.dataBR(m.ultimo_contato)) + '</td></tr>';
      }).join('') + '</tbody></table><div class="rodape-tab">' + P.plural(lista.length, 'marca', 'marcas') + '. Clique numa linha para editar.</div></div>';
  }

  function baixar() {
    var linhas = visiveis().map(function (m) {
      return [m.nome, m.instagram, m.email, m.telefone, nomeSit(m.situacao), m.obs, P.dataBR(m.ultimo_contato)];
    });
    P.baixarCSV('marcas-' + P.hojeISO() + '.csv', ['Marca', 'Instagram', 'E-mail', 'Telefone', 'Situação', 'Observação', 'Último contato'], linhas);
    P.toast(linhas.length ? 'Base baixada.' : 'Baixei o arquivo, mas ele está vazio.');
  }

  function editar(m) {
    P.formulario({
      titulo: m ? 'Editar marca' : 'Adicionar marca',
      valores: m || { situacao: 'lead', ultimo_contato: '' },
      campos: [
        { nome: 'nome', rotulo: 'Marca', obrigatorio: true },
        { nome: 'instagram', rotulo: 'Instagram', dica: '@usuario', meia: true },
        { nome: 'email', rotulo: 'E-mail', tipo: 'email', meia: true },
        { nome: 'telefone', rotulo: 'Telefone', dica: '(00) 00000-0000', meia: true },
        { nome: 'situacao', rotulo: 'Situação', tipo: 'select', opcoes: SITUACOES.map(function (s) { return { v: s.v, t: s.t }; }), meia: true },
        { nome: 'ultimo_contato', rotulo: 'Último contato', tipo: 'date' },
        { nome: 'obs', rotulo: 'Observação', tipo: 'textarea' }
      ],
      salvar: function (v) {
        v.ultimo_contato = v.ultimo_contato || null;
        if (m) { v.exemplo = false; return P.Dados.atualizar('marcas', m.id, v); }
        return P.Dados.inserir('marcas', v);
      },
      apagar: m ? function () { return P.Dados.apagar('marcas', m.id); } : null,
      aoSalvar: function () { P.recarregar(); }
    });
  }

  P.registrar('marcas', { titulo: 'Marcas', montar: montar, entrar: entrar });
})();
