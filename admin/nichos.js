/* =====================================================================
   nichos.js: aba "Nichos". As categorias que aparecem no portfólio, na
   frase "meu portfólio inclui conteúdos voltados para" e nos filtros de
   vídeos ("Conteúdos por nicho"). Adicionar, editar, apagar, esconder e
   reordenar. As abas Portfólio e Fotos usam esta mesma lista para o
   campo "Nicho" de cada vídeo e foto.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Painel; if (!P) return;
  var esc = P.esc, $ = P.$;

  var nichos = [];

  function montar(raiz) {
    raiz.innerHTML =
      '<div class="barra"><p class="vazio" style="flex:1;padding:0;min-width:240px">Estas são as categorias do seu portfólio: aparecem na frase "meu portfólio inclui conteúdos voltados para" e nos filtros de "Conteúdos por nicho". Arraste pela alcinha para mudar a ordem. Esconder um nicho aqui só o tira dessa lista: vídeos e fotos que já usam esse nicho continuam aparecendo no site.</p>' +
        '<button class="btn" type="button" id="nc-novo">' + P.icone('mais') + 'Adicionar nicho</button></div>' +
      '<div id="nc-lista"></div>';
    $('#nc-novo', raiz).addEventListener('click', function () { editar(null); });
  }

  function entrar() {
    return P.Dados.listar('nichos', { ordem: [['ordem', true], ['id', true]] }).then(function (r) { nichos = r.dados; desenhar(); });
  }

  function desenhar() {
    var alvo = $('#nc-lista');
    if (!nichos.length) {
      alvo.innerHTML = '<div class="cartao"><p class="vazio">Nenhum nicho ainda. Clique em "Adicionar nicho" para criar o primeiro. Enquanto não houver nenhum aqui, o site usa a lista padrão (beleza, skincare, moda, comida, casa e decoração, fitness, pet, tech).</p></div>';
      return;
    }
    alvo.innerHTML = '<div class="tabela-caixa"><table><caption class="sr">Meus nichos, em ordem de aparição no site</caption><thead><tr>' +
      '<th style="width:34px"></th><th>Nicho</th><th class="acoes">Ações</th></tr></thead><tbody id="nc-corpo">' +
      nichos.map(function (n) {
        return '<tr data-id="' + n.id + '" class="' + (n.visivel ? '' : 'oculto-linha') + '">' +
          '<td><span class="alca" title="Arraste para mudar a ordem">' + P.icone('alca') + '</span></td>' +
          '<td>' + esc(n.nome) + '</td>' +
          '<td class="acoes">' +
            '<button class="ib' + (n.visivel ? ' on' : '') + '" type="button" data-acao="olho" aria-pressed="' + (n.visivel ? 'true' : 'false') + '" aria-label="' + (n.visivel ? 'Esconder do site' : 'Mostrar no site') + '" title="' + (n.visivel ? 'Aparece no site. Clique para esconder' : 'Escondido. Clique para mostrar no site') + '">' + P.icone(n.visivel ? 'olho' : 'olhoOff') + '</button>' +
            '<button class="ib" type="button" data-acao="editar" aria-label="Editar">' + P.icone('editar') + '</button>' +
            '<button class="ib" type="button" data-acao="apagar" aria-label="Apagar">' + P.icone('lixo') + '</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';

    var corpo = $('#nc-corpo');
    corpo.addEventListener('click', function (e) {
      var b = e.target.closest('[data-acao]'); if (!b) return;
      var id = +b.closest('tr').getAttribute('data-id'), n = nichos.filter(function (x) { return x.id === id; })[0];
      if (!n) return;
      var acao = b.getAttribute('data-acao');
      if (acao === 'olho') {
        P.Dados.atualizar('nichos', id, { visivel: !n.visivel }).then(function (r) {
          if (!r.ok) { P.toast(r.texto || 'Não consegui mudar.', 'erro'); return; }
          n.visivel = !n.visivel; desenhar();
        });
      } else if (acao === 'editar') editar(n);
      else apagar(n);
    });
    arrastar(corpo);
  }

  /* ---------- arrastar pela alcinha (mouse e dedo) ---------- */
  function arrastar(corpo) {
    corpo.addEventListener('pointerdown', function (e) {
      var alca = e.target.closest('.alca'); if (!alca) return;
      var linha = alca.closest('tr'); if (!linha) return;
      e.preventDefault(); linha.classList.add('arrastando');
      try { alca.setPointerCapture(e.pointerId); } catch (x) { /* segue sem captura */ }
      function mover(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY), alvo = el && el.closest ? el.closest('#nc-corpo tr') : null;
        if (!alvo || alvo === linha) return;
        var r = alvo.getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) corpo.insertBefore(linha, alvo); else corpo.insertBefore(linha, alvo.nextSibling);
      }
      function soltar() {
        alca.removeEventListener('pointermove', mover); alca.removeEventListener('pointerup', soltar); alca.removeEventListener('pointercancel', soltar);
        linha.classList.remove('arrastando'); salvarOrdem(corpo);
      }
      alca.addEventListener('pointermove', mover); alca.addEventListener('pointerup', soltar); alca.addEventListener('pointercancel', soltar);
    });
  }
  function salvarOrdem(corpo) {
    var ids = Array.prototype.map.call(corpo.querySelectorAll('tr'), function (tr) { return +tr.getAttribute('data-id'); });
    var mudou = [];
    ids.forEach(function (id, i) {
      var n = nichos.filter(function (x) { return x.id === id; })[0];
      if (n && n.ordem !== i + 1) { n.ordem = i + 1; mudou.push(P.Dados.atualizar('nichos', id, { ordem: i + 1 })); }
    });
    if (!mudou.length) return;
    Promise.all(mudou).then(function (rs) {
      var falhou = rs.some(function (r) { return !r.ok; });
      P.toast(falhou ? 'Não consegui salvar a nova ordem.' : 'Ordem salva.', falhou ? 'erro' : undefined);
      nichos.sort(function (a, b) { return a.ordem - b.ordem; });
    });
  }

  /* ---------- adicionar, editar, apagar ---------- */
  function editar(n) {
    var proxima = nichos.reduce(function (m, x) { return Math.max(m, P.num(x.ordem)); }, 0) + 1;
    P.formulario({
      titulo: n ? 'Editar nicho' : 'Adicionar nicho',
      valores: n || { visivel: true },
      campos: [
        { nome: 'nome', rotulo: 'Nome do nicho', obrigatorio: true, dica: 'Ex.: beleza, viagem, maternidade...' },
        { nome: 'visivel', rotulo: 'Mostrar este nicho no meu site', tipo: 'checkbox' }
      ],
      salvar: function (v) {
        v.nome = v.nome.trim().toLowerCase();
        if (!v.nome) return { ok: false, texto: 'Escreva um nome para o nicho.' };
        var repetido = nichos.some(function (x) { return x.nome.toLowerCase() === v.nome && (!n || x.id !== n.id); });
        if (repetido) return { ok: false, texto: 'Já existe um nicho com esse nome.' };
        if (n) return P.Dados.atualizar('nichos', n.id, v);
        v.ordem = proxima;
        return P.Dados.inserir('nichos', v);
      },
      apagar: n ? function () { return P.Dados.apagar('nichos', n.id); } : null,
      aoSalvar: function () { P.recarregar(); }
    });
  }
  function apagar(n) {
    P.formulario({
      titulo: 'Apagar nicho', valores: {}, campos: [], msgOk: 'Apagado.', rotuloSalvando: 'Apagando...',
      salvar: function () { return P.Dados.apagar('nichos', n.id); },
      aoSalvar: function () { P.recarregar(); }
    });
    P.$('#form-modal').insertAdjacentHTML('afterbegin', '<p style="margin-bottom:.6rem">Apagar "<b style="font-weight:500">' + esc(n.nome) + '</b>"? Não dá para desfazer. Vídeos e fotos que já usam esse nicho continuam aparecendo no site, só some da lista e dos filtros novos.</p>');
    P.$('#bt-salvar').textContent = 'Apagar';
    P.$('#bt-salvar').className = 'btn btn-perigo';
  }

  P.registrar('nichos', { titulo: 'Nichos', montar: montar, entrar: entrar });
})();
