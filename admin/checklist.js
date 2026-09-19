/* =====================================================================
   checklist.js: aba "Checklist Portfólio", com 5 sub-abas.
   Todo o conteúdo vem de js/biblioteca.js (window.Biblioteca), sem mudar nada.
   O que você marca fica salvo na tabela "marcados".
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Painel; if (!P) return;
  var esc = P.esc, $ = P.$;

  var SUBS = [
    { id: 'lista', t: 'Checklist do portfólio' }, { id: 'refs', t: 'Referências de vídeo' },
    { id: 'roteiros', t: 'Roteiros' }, { id: 'nichos', t: 'Ideias por nicho' }, { id: 'revisar', t: 'Revisar meu roteiro' }
  ];
  var sub = 'lista', marcados = {}, filtroEstilo = '', filtroAud = '';
  var B = function () { return window.Biblioteca || null; };

  function montar(raiz) {
    raiz.innerHTML = '<div class="subabas" role="tablist" aria-label="Partes do checklist" id="ck-subs"></div><div id="ck-corpo"></div>';
    $('#ck-subs', raiz).addEventListener('click', function (e) {
      var b = e.target.closest('button[data-sub]'); if (!b) return; sub = b.getAttribute('data-sub'); desenhar();
    });
    var corpo = $('#ck-corpo', raiz);
    corpo.addEventListener('change', function (e) {
      var c = e.target.closest('input[data-chave]'); if (c) alternar(c);
      var s = e.target.closest('select[data-filtro]');
      if (s) { if (s.getAttribute('data-filtro') === 'estilo') filtroEstilo = s.value; else filtroAud = s.value; desenharRefs(); }
    });
    corpo.addEventListener('click', function (e) {
      var r = e.target.closest('.ref[data-ref]'); if (r) { fichaReferencia(r.getAttribute('data-ref')); return; }
      if (e.target.closest('#rv-limpar')) { var t = $('#rv-texto'); t.value = ''; guardarRascunho(''); t.focus(); }
    });
    corpo.addEventListener('input', function (e) { if (e.target.id === 'rv-texto') guardarRascunho(e.target.value); });
  }

  function entrar() {
    return P.Dados.listar('marcados', {}).then(function (r) {
      marcados = {}; r.dados.forEach(function (m) { marcados[m.chave] = true; });
      desenhar();
    });
  }

  function desenhar() {
    $('#ck-subs').innerHTML = SUBS.map(function (s) {
      return '<button type="button" role="tab" data-sub="' + s.id + '" aria-selected="' + (sub === s.id) + '">' + s.t + '</button>';
    }).join('');
    var corpo = $('#ck-corpo');
    if (!B()) { corpo.innerHTML = '<div class="cartao"><p class="vazio">Não encontrei o arquivo js/biblioteca.js. Sem ele, esta aba fica vazia. O resto do painel continua funcionando.</p></div>'; return; }
    ({ lista: desenharLista, refs: desenharRefs, roteiros: desenharRoteiros, nichos: desenharNichos, revisar: desenharRevisar })[sub]();
  }

  /* ---------- 1. checklist do portfólio ---------- */
  function contar(secao) {
    var feitos = 0;
    secao.itens.forEach(function (_, i) { if (marcados['ck:' + secao.id + ':' + i]) feitos++; });
    return { feitos: feitos, total: secao.itens.length };
  }
  function pct(f, t) { return t > 0 ? Math.round(f / t * 100) : 0; }

  function desenharLista() {
    var secoes = B().CHECKLIST || [], geralF = 0, geralT = 0;
    secoes.forEach(function (s) { var c = contar(s); geralF += c.feitos; geralT += c.total; });
    $('#ck-corpo').innerHTML =
      '<div class="cartao"><div class="prog-linha"><b style="font-weight:500;color:var(--tinta)">Tudo pronto</b><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct(geralF, geralT) + '" id="ck-geral-barra"><i style="width:' + pct(geralF, geralT) + '%"></i></div><span id="ck-geral-txt">' + geralF + ' de ' + geralT + ' (' + pct(geralF, geralT) + '%)</span></div></div>' +
      secoes.map(function (s) {
        var c = contar(s);
        return '<details class="sec" data-secao="' + esc(s.id) + '"><summary><span aria-hidden="true">' + esc(s.emoji) + '</span><span>' + esc(s.nome) + '<span class="sec-resumo" style="display:block">' + esc(s.resumo) + '</span></span>' +
          '<span class="sec-resumo" style="margin-left:auto;margin-right:.6rem" data-txt="' + esc(s.id) + '">' + c.feitos + '/' + c.total + '</span></summary>' +
          '<div class="sec-corpo"><div class="prog" style="margin-bottom:.8rem"><i data-barra="' + esc(s.id) + '" style="width:' + pct(c.feitos, c.total) + '%"></i></div>' +
          '<div class="porque"><b style="font-weight:500">Por quê: </b>' + esc(s.porque) + '</div>' +
          s.itens.map(function (it, i) {
            var chave = 'ck:' + s.id + ':' + i, on = !!marcados[chave];
            return '<label class="item' + (on ? ' feito' : '') + '"><input type="checkbox" data-chave="' + esc(chave) + '"' + (on ? ' checked' : '') + '><span style="color:var(--tinta)"><b>' + esc(it.t) + '</b><span>' + esc(it.d) + '</span></span></label>';
          }).join('') + '</div></details>';
      }).join('');
  }

  function alternar(cx) {
    var chave = cx.getAttribute('data-chave'), ligar = cx.checked, rotulo = cx.closest('.item');
    var acao = ligar
      ? function () { return window.banco.from('marcados').insert({ chave: chave }); }
      : function () { return window.banco.from('marcados').delete().eq('chave', chave); };
    if (ligar) marcados[chave] = true; else delete marcados[chave];
    rotulo.classList.toggle('feito', ligar); atualizarProgresso();
    P.Dados._escrever('marcados', acao).then(function (r) {
      if (r.ok) return;
      /* não salvou: desfaz na tela e avisa */
      if (ligar) delete marcados[chave]; else marcados[chave] = true;
      cx.checked = !ligar; rotulo.classList.toggle('feito', !ligar); atualizarProgresso();
      P.toast('Não consegui salvar essa marcação.', 'erro');
    });
  }
  function atualizarProgresso() {
    var geralF = 0, geralT = 0;
    (B().CHECKLIST || []).forEach(function (s) {
      var c = contar(s); geralF += c.feitos; geralT += c.total;
      var barra = $('[data-barra="' + s.id + '"]'), txt = $('[data-txt="' + s.id + '"]');
      if (barra) barra.style.width = pct(c.feitos, c.total) + '%';
      if (txt) txt.textContent = c.feitos + '/' + c.total;
    });
    var g = $('#ck-geral-barra'); if (g) { g.firstChild.style.width = pct(geralF, geralT) + '%'; g.setAttribute('aria-valuenow', pct(geralF, geralT)); }
    var t = $('#ck-geral-txt'); if (t) t.textContent = geralF + ' de ' + geralT + ' (' + pct(geralF, geralT) + '%)';
  }

  /* ---------- 2. referências de vídeo ---------- */
  function desenharRefs() {
    var b = B(), refs = b.REFERENCIAS || [];
    var opEst = '<option value="">Todos os estilos</option>' + (b.ESTILOS || []).map(function (e) { return '<option value="' + esc(e) + '"' + (filtroEstilo === e ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('');
    var opAud = '<option value="">Todas as audiências</option>' + (b.AUDIENCIAS || []).map(function (a) { return '<option value="' + esc(a.v) + '"' + (filtroAud === a.v ? ' selected' : '') + '>' + esc(a.t) + '</option>'; }).join('');
    var lista = refs.filter(function (r) { return (!filtroEstilo || r.estilo === filtroEstilo) && (!filtroAud || r.audiencia === filtroAud); });
    $('#ck-corpo').innerHTML =
      '<div class="barra"><select data-filtro="estilo" aria-label="Filtrar por estilo" style="width:auto">' + opEst + '</select><select data-filtro="aud" aria-label="Filtrar por audiência" style="width:auto">' + opAud + '</select></div>' +
      (lista.length ? '<div class="refs">' + lista.map(function (r) {
        return '<button type="button" class="ref" data-ref="' + esc(r.id) + '"><div class="capa cor-' + esc(r.cor) + '" aria-hidden="true">' + esc(r.emoji) + '</div>' +
          '<div class="tx"><b>' + esc(r.titulo) + '</b><span>' + esc(r.estilo) + ' · ' + esc(r.duracao) + '<br>' + esc(r.marca) + '</span></div></button>';
      }).join('') + '</div>' : '<div class="cartao"><p class="vazio">Nenhuma referência com esse filtro.</p></div>');
  }

  function blocos(lista) {
    return (lista || []).map(function (x) { return '<div class="bloco-t"><span class="t">' + esc(x.t) + '</span><span>' + x.o + '</span></div>'; }).join('');   /* "o" traz negrito e itálico prontos */
  }
  function fichaReferencia(id) {
    var r = (B().REFERENCIAS || []).filter(function (x) { return x.id === id; })[0]; if (!r) return;
    P.abrirModal(P.cabecalhoModal(r.emoji + ' ' + r.titulo) + '<div class="ficha">' +
      '<p class="vazio" style="padding:0">' + esc(r.estilo) + ' · ' + esc(r.audiencia) + ' · ' + esc(r.duracao) + ' · ' + esc(r.marca) + '</p>' +
      '<h3>Gancho</h3><p>' + esc(r.gancho) + '</p><h3>Por que funciona</h3><p>' + esc(r.porque) + '</p>' +
      '<h3>O diferencial</h3><p>' + esc(r.diferencial) + '</p><h3>Erro comum</h3><p>' + esc(r.erro) + '</p>' +
      '<h3>Roteiro em blocos de tempo</h3>' + blocos(r.roteiro) + '</div>' +
      '<div class="modal-pe"><button class="btn btn-sec" data-fechar>Fechar</button>' +
      (r.youtube ? '<a class="btn" href="' + esc(r.youtube) + '" target="_blank" rel="noopener noreferrer">' + P.icone('play') + 'Assistir</a>' : '') + '</div>', { largo: true });
  }

  /* ---------- 3. roteiros ---------- */
  function desenharRoteiros() {
    $('#ck-corpo').innerHTML = (B().TIPOS || []).map(function (t) {
      return '<details class="sec"><summary><span aria-hidden="true">' + esc(t.emoji) + '</span><span>' + esc(t.nome) + '<span class="sec-resumo" style="display:block">' + esc(t.duracao) + '</span></span></summary>' +
        '<div class="sec-corpo ficha"><h3 style="margin-top:0">Quando usar</h3><p>' + esc(t.porque) + '</p><h3>Blocos de tempo</h3>' + blocos(t.beats) +
        ((t.erros || []).length ? '<h3>Erros comuns</h3><ul style="margin:.2rem 0 0 1.1rem;padding:0;font-size:13.5px">' + t.erros.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' : '') +
        '</div></details>';
    }).join('');
  }

  /* ---------- 4. ideias por nicho ---------- */
  function desenharNichos() {
    var dicas = B().COMO_USAR || [];
    $('#ck-corpo').innerHTML =
      (dicas.length ? '<details class="sec"><summary><span>Como usar os ganchos</span></summary><div class="sec-corpo"><ol style="margin:0 0 0 1.1rem;padding:0;display:grid;gap:.4rem;font-size:13.5px">' + dicas.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ol></div></details>' : '') +
      (B().NICHOS || []).map(function (n) {
        return '<details class="sec"><summary><span aria-hidden="true">' + esc(n.emoji) + '</span><span>' + esc(n.nome) + '</span></summary><div class="sec-corpo">' +
          (n.ideias || []).map(function (i) { return '<div class="ideia"><b>' + esc(i.t) + '</b><span>Gancho: ' + esc(i.gancho) + '</span></div>'; }).join('') + '</div></details>';
      }).join('');
  }

  /* ---------- 5. revisar meu roteiro ---------- */
  function lerRascunho() { try { return localStorage.getItem('rascunho-roteiro') || ''; } catch (e) { return ''; } }
  function guardarRascunho(v) { try { localStorage.setItem('rascunho-roteiro', v); } catch (e) { /* sem armazenamento: segue sem guardar */ } }
  function desenharRevisar() {
    $('#ck-corpo').innerHTML =
      '<div class="cartao"><h2>Cole o seu roteiro aqui</h2><textarea id="rv-texto" class="roteiro-caixa" placeholder="Cole ou escreva o roteiro e confira os itens abaixo."></textarea>' +
      '<div class="modal-pe" style="margin-top:.5rem"><button class="btn btn-sec" type="button" id="rv-limpar">Limpar</button></div>' +
      '<p class="vazio" style="padding:0">O texto fica guardado só neste navegador. As marcações abaixo servem só para esta conferência e não são salvas.</p></div>' +
      (B().REVISAO || []).map(function (bl) {
        return '<div class="cartao"><h2><span aria-hidden="true">' + esc(bl.emoji) + '</span> ' + esc(bl.bloco) + '</h2>' +
          bl.itens.map(function (it) { return '<label class="item"><input type="checkbox"><span style="color:var(--tinta)"><b>' + esc(it.t) + '</b><span>' + esc(it.d) + '</span></span></label>'; }).join('') + '</div>';
      }).join('');
    $('#rv-texto').value = lerRascunho();
  }

  P.registrar('checklist', { titulo: 'Checklist Portfólio', montar: montar, entrar: entrar });
})();
