/* =====================================================================
   portfolio.js: aba "Portfólio". Métricas de visitas + seus vídeos.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Painel; if (!P) return;
  var esc = P.esc, $ = P.$;

  /* Lista provisória até a aba carregar a de verdade (ver entrar()), para o formulário nunca abrir sem opções. */
  var NICHOS = ['beleza', 'skincare', 'moda', 'comida', 'casa e decoração', 'fitness', 'pet', 'tech'];
  var FORMATOS = ['vídeo 9:16', 'vídeo 4:5', 'vídeo 1:1', 'vídeo 16:9'];
  var videos = [];

  function montar(raiz) {
    raiz.innerHTML =
      '<div class="kpis" id="pf-kpis" aria-label="Resumo do portfólio"></div>' +
      '<div class="duas">' +
        '<div class="cartao"><h2>Visitas nos últimos 14 dias</h2><div id="pf-grafico"></div></div>' +
        '<div class="cartao"><h2>Por onde as pessoas chegaram</h2><div id="pf-origens"></div></div>' +
      '</div>' +
      '<label class="vazio" style="display:flex;gap:.5rem;align-items:center;padding-top:0"><input type="checkbox" id="pf-nao-contar" style="width:18px;height:18px"> Não contar as minhas visitas neste navegador (vale só para este aparelho)</label>' +
      '<div class="barra"><h2 style="font-size:14px;font-weight:500;flex:1">Meus vídeos</h2>' +
        '<button class="btn" type="button" id="pf-novo">' + P.icone('mais') + 'Adicionar vídeo</button></div>' +
      '<p class="vazio" style="margin-top:-.4rem">O que estiver com o olhinho aberto aparece no seu portfólio sozinho, sem publicar de novo. Arraste pela alcinha para mudar a ordem. Vídeos com "destaque" preenchido (ex.: 2,4M views) podem entrar na seção de destaques do site.</p>' +
      '<div id="pf-videos"></div>';
    $('#pf-novo', raiz).addEventListener('click', function () { editar(null); });
    /* "Não contar as minhas visitas": guarda uma marca neste navegador. O site lê essa marca antes de registrar a visita. */
    var caixa = $('#pf-nao-contar', raiz);
    try { caixa.checked = localStorage.getItem('naoContarVisitas') === '1'; } catch (e) { /* segue */ }
    caixa.addEventListener('change', function () {
      try { if (caixa.checked) localStorage.setItem('naoContarVisitas', '1'); else localStorage.removeItem('naoContarVisitas'); P.toast(caixa.checked ? 'Combinado: as suas visitas deste navegador não vão contar.' : 'Agora as suas visitas deste navegador voltam a contar.'); }
      catch (e) { P.toast('Este navegador não deixou guardar a escolha.', 'erro'); }
    });
  }

  function entrar() {
    var hoje = P.hojeISO(), inicio = P.somarDias(hoje, -13);
    return Promise.all([
      P.Dados.listar('videos', { ordem: [['ordem', true], ['id', true]] }),
      P.Dados.listar('visitas', { filtros: [['gte', 'data', inicio]], todas: true, ordem: [['id', true]] }),
      P.listarNichos()
    ]).then(function (r) {
      videos = r[0].dados;
      NICHOS = r[2];
      desenharMetricas(r[1].dados, hoje);
      desenharVideos();
    });
  }

  /* ---------- métricas ---------- */
  function topo(lista, campo) {
    var cont = {}, melhor = null;
    lista.forEach(function (x) { var k = (x[campo] || '').trim(); if (k) cont[k] = (cont[k] || 0) + 1; });
    Object.keys(cont).forEach(function (k) { if (!melhor || cont[k] > cont[melhor]) melhor = k; });
    return melhor ? { nome: melhor, qtd: cont[melhor] } : null;
  }

  function desenharMetricas(visitas, hoje) {
    var dias = [], porDia = {}, i;
    for (i = 13; i >= 0; i--) { var d = P.somarDias(hoje, -i); dias.push(d); porDia[d] = 0; }
    visitas.forEach(function (v) { var d = String(v.data || '').slice(0, 10); if (d in porDia) porDia[d]++; });
    var total = 0, maior = 0;
    dias.forEach(function (d) { total += porDia[d]; if (porDia[d] > maior) maior = porDia[d]; });

    var noAr = videos.filter(function (v) { return v.visivel && !v.exemplo; });
    var nicho = topo(noAr, 'nicho');
    var origem = topo(visitas, 'origem');

    $('#pf-kpis').innerHTML =
      kpi('Visitas em 14 dias', P.inteiro(total), '') +
      kpi('Visitas hoje', P.inteiro(porDia[hoje] || 0), '') +
      kpi('Vídeos no ar', P.inteiro(noAr.length), '') +
      kpi('Nicho mais forte', nicho ? esc(nicho.nome) : 'Sem dados', nicho ? P.plural(nicho.qtd, 'vídeo', 'vídeos') : 'Aparece quando houver vídeos no ar') +
      kpi('De onde mais vêm', origem ? esc(origem.nome) : 'Sem dados', origem ? P.plural(origem.qtd, 'visita', 'visitas') : 'Aparece com as primeiras visitas');

    /* gráfico: sem visita nenhuma, explica em vez de mostrar barras vazias */
    if (maior === 0) {
      $('#pf-grafico').innerHTML = '<p class="vazio">Ainda não houve nenhuma visita. Quando as pessoas começarem a abrir o seu portfólio, aqui vai aparecer um gráfico com as visitas de cada dia, nos últimos 14 dias.</p>';
    } else {
      $('#pf-grafico').innerHTML = '<div class="grafico" role="img" aria-label="Visitas por dia nos últimos 14 dias">' + dias.map(function (d) {
        var n = porDia[d], h = Math.max(2, Math.round(n / maior * 100));
        var dt = P.deISO(d);
        return '<div class="barra-col" title="' + esc(P.dataBR(d)) + ': ' + n + '"><span class="n">' + (n || '') + '</span><div class="b' + (d === hoje ? ' hoje' : '') + '" style="height:' + h + '%"></div><span class="d">' + (dt ? dt.getDate() : '') + '</span></div>';
      }).join('') + '</div>';
    }

    /* origens */
    var cont = {}; visitas.forEach(function (v) { var k = (v.origem || 'Direto').trim() || 'Direto'; cont[k] = (cont[k] || 0) + 1; });
    var nomes = Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; }).slice(0, 6);
    if (!nomes.length) {
      $('#pf-origens').innerHTML = '<p class="vazio">Aqui vai aparecer por onde as pessoas chegaram ao seu site: Instagram, WhatsApp, Google ou link direto.</p>';
    } else {
      var t = visitas.length || 1;
      $('#pf-origens').innerHTML = '<ul class="origens">' + nomes.map(function (n) {
        var pc = Math.round(cont[n] / t * 100);
        return '<li><span>' + esc(n) + '</span><span>' + cont[n] + ' (' + pc + '%)</span><span class="fio"><i style="width:' + pc + '%"></i></span></li>';
      }).join('') + '</ul>';
    }
  }
  function kpi(r, v, s) { return '<div class="kpi"><div class="r">' + r + '</div><div class="v">' + v + '</div><div class="s">' + (s || '&nbsp;') + '</div></div>'; }

  /* ---------- tabela de vídeos ---------- */
  function desenharVideos() {
    var alvo = $('#pf-videos');
    if (!videos.length) {
      alvo.innerHTML = '<div class="cartao"><p class="vazio">Nenhum vídeo ainda. Clique em "Adicionar vídeo" para começar.</p></div>';
      return;
    }
    alvo.innerHTML = '<div class="tabela-caixa"><table><caption class="sr">Meus vídeos, em ordem de aparição no site</caption><thead><tr>' +
      '<th style="width:34px"></th><th>Título</th><th>Marca</th><th>Nicho</th><th>Formato</th><th>Destaque</th><th class="acoes">Ações</th></tr></thead><tbody id="pf-corpo">' +
      videos.map(function (v) {
        return '<tr data-id="' + v.id + '" class="' + (v.visivel ? '' : 'oculto-linha') + '">' +
          '<td><span class="alca" title="Arraste para mudar a ordem">' + P.icone('alca') + '</span></td>' +
          '<td>' + esc(v.titulo) + (v.exemplo ? '<span class="tag-ex">exemplo</span>' : '') + '</td>' +
          '<td>' + esc(v.marca) + '</td><td>' + esc(v.nicho) + '</td><td>' + esc(v.formato) + '</td><td>' + esc(v.destaque) + '</td>' +
          '<td class="acoes">' +
            (v.link ? '<a class="ib" href="' + esc(v.link) + '" target="_blank" rel="noopener noreferrer" aria-label="Abrir o vídeo">' + P.icone('play') + '</a>' : '') +
            '<button class="ib' + (v.visivel ? ' on' : '') + '" type="button" data-acao="olho" aria-pressed="' + (v.visivel ? 'true' : 'false') + '" aria-label="' + (v.visivel ? 'Esconder do site' : 'Mostrar no site') + '" title="' + (v.visivel ? 'Aparece no site. Clique para esconder' : 'Escondido. Clique para mostrar no site') + '">' + P.icone(v.visivel ? 'olho' : 'olhoOff') + '</button>' +
            '<button class="ib" type="button" data-acao="editar" aria-label="Editar">' + P.icone('editar') + '</button>' +
            '<button class="ib" type="button" data-acao="apagar" aria-label="Apagar">' + P.icone('lixo') + '</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';

    var corpo = $('#pf-corpo');
    corpo.addEventListener('click', function (e) {
      var b = e.target.closest('[data-acao]'); if (!b) return;
      var id = +b.closest('tr').getAttribute('data-id'), v = videos.filter(function (x) { return x.id === id; })[0];
      if (!v) return;
      if (b.getAttribute('data-acao') === 'olho') {
        P.Dados.atualizar('videos', id, { visivel: !v.visivel }).then(function (r) {
          if (!r.ok) { P.toast(r.texto || 'Não consegui mudar.', 'erro'); return; }
          v.visivel = !v.visivel; desenharVideos(); P.recarregar();
        });
      } else if (b.getAttribute('data-acao') === 'editar') editar(v);
      else apagarVideo(v);
    });
    ativarArrastar(corpo);
  }

  /* arrastar pela alcinha (funciona com mouse e com o dedo) */
  function ativarArrastar(corpo) {
    corpo.addEventListener('pointerdown', function (e) {
      var alca = e.target.closest('.alca'); if (!alca) return;
      var linha = alca.closest('tr'); if (!linha) return;
      e.preventDefault(); linha.classList.add('arrastando');
      try { alca.setPointerCapture(e.pointerId); } catch (x) { /* segue sem captura */ }
      function mover(ev) {
        var el = document.elementFromPoint(ev.clientX, ev.clientY), alvo = el && el.closest ? el.closest('#pf-corpo tr') : null;
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
      var v = videos.filter(function (x) { return x.id === id; })[0];
      if (v && v.ordem !== i + 1) { v.ordem = i + 1; mudou.push(P.Dados.atualizar('videos', id, { ordem: i + 1 })); }
    });
    if (!mudou.length) return;
    Promise.all(mudou).then(function (rs) {
      var falhou = rs.some(function (r) { return !r.ok; });
      P.toast(falhou ? 'Não consegui salvar a nova ordem.' : 'Ordem salva.', falhou ? 'erro' : undefined);
      videos.sort(function (a, b) { return a.ordem - b.ordem; });
    });
  }

  /* ---------- adicionar, editar, apagar ---------- */
  function editar(v) {
    var nichos = NICHOS.slice(); if (v && v.nicho && nichos.indexOf(v.nicho) < 0) nichos.push(v.nicho);
    var formatos = FORMATOS.slice(); if (v && v.formato && formatos.indexOf(v.formato) < 0) formatos.push(v.formato);
    var proxima = videos.reduce(function (m, x) { return Math.max(m, P.num(x.ordem)); }, 0) + 1;
    P.formulario({
      titulo: v ? 'Editar vídeo' : 'Adicionar vídeo',
      valores: v || { formato: 'vídeo 9:16', nicho: nichos[0], visivel: true },
      campos: [
        { nome: 'titulo', rotulo: 'Título', obrigatorio: true },
        { nome: 'link', rotulo: 'Link do vídeo', dica: 'https://instagram.com/reel/...' },
        { nome: 'marca', rotulo: 'Marca', meia: true },
        { nome: 'nicho', rotulo: 'Nicho', tipo: 'select', opcoes: nichos, meia: true },
        { nome: 'formato', rotulo: 'Formato', tipo: 'select', opcoes: formatos, meia: true },
        { nome: 'destaque', rotulo: 'Destaque (número forte)', dica: 'ex: 2,4M views', meia: true },
        { nome: 'capa', rotulo: 'Endereço da imagem de capa (opcional)', dica: 'https://...' },
        { nome: 'visivel', rotulo: 'Mostrar este vídeo no meu site', tipo: 'checkbox' }
      ],
      salvar: function (vals) {
        if (v) { vals.exemplo = false; return P.Dados.atualizar('videos', v.id, vals); }
        vals.ordem = proxima; return P.Dados.inserir('videos', vals);
      },
      apagar: v ? function () { return P.Dados.apagar('videos', v.id); } : null,
      aoSalvar: function () { P.recarregar(); }
    });
  }
  function apagarVideo(v) {
    P.formulario({
      titulo: 'Apagar vídeo', valores: {}, campos: [],
      salvar: function () { return P.Dados.apagar('videos', v.id); },
      msgOk: 'Apagado.',
      aoSalvar: function () { P.recarregar(); }
    });
    var corpo = P.$('#form-modal');
    corpo.insertAdjacentHTML('afterbegin', '<p style="margin-bottom:.6rem">Apagar "<b style="font-weight:500">' + esc(v.titulo) + '</b>"? Não dá para desfazer. Se só quiser tirar do site por um tempo, use o olhinho.</p>');
    P.$('#bt-salvar').textContent = 'Apagar';
    P.$('#bt-salvar').className = 'btn btn-perigo';
  }

  P.registrar('portfolio', { titulo: 'Portfólio', montar: montar, entrar: entrar });
})();
