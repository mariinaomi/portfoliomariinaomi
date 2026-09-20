/* =====================================================================
   propostas.js: aba "Propostas". Seus modelos de mensagem para mandar
   às marcas (e-mail, WhatsApp, Instagram...). Criar, editar, duplicar,
   apagar e copiar. Palavras entre chaves duplas, como {{marca}}, viram
   campos para preencher na hora de copiar.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Painel; if (!P) return;
  var esc = P.esc, $ = P.$, T = 'propostas';

  var CANAIS = [
    { v: 'email', t: 'E-mail', i: 'email', destino: 'e-mail' },
    { v: 'whatsapp', t: 'WhatsApp', i: 'whats', destino: 'WhatsApp' },
    { v: 'instagram', t: 'Instagram', i: 'insta', destino: 'Instagram' },
    { v: 'outro', t: 'Outras redes', i: 'propostas', destino: 'aplicativo' }
  ];
  var ETAPAS = ['Primeiro contato', 'Proposta', 'Follow-up', 'Negociação', 'Fechamento', 'Pós-entrega'];
  var VARIAVEIS = [['nome', 'Nome de quem recebe'], ['marca', 'Marca'], ['produto', 'Produto'], ['valor', 'Valor'], ['prazo', 'Prazo de entrega']];

  var lista = [];
  var filtro = { canal: 'todos', etapa: '', busca: '', ordem: 'favoritos' };
  var lembrar = { nome: '', marca: '' };   /* só na memória desta visita: ajuda a mandar vários modelos para a mesma marca */

  /* ---------- modelos prontos (ela edita do jeito dela) ---------- */
  var ASSINATURA = 'Mariana Naomi\n@littlethings_bymarii\n(11) 97132-0520';
  var SITE = 'https://mariinaomi.github.io/portfoliomariinaomi/';
  var PRONTOS = [
    { titulo: 'Apresentação por e-mail', canal: 'email', etapa: 'Primeiro contato', assunto: 'Parceria de conteúdo UGC com a {{marca}}',
      corpo: 'Olá, {{nome}}, tudo bem?\n\nMe chamo Mariana Naomi, sou criadora de conteúdo UGC em São Paulo e acompanho a {{marca}} com muito carinho. Gosto muito do {{produto}} e vejo bastante conexão com o que eu crio.\n\nFaço vídeos e fotos em estilo natural, com luz do dia e situações reais do dia a dia, pensados para gerar identificação com o público da marca.\n\nMeu portfólio está aqui: ' + SITE + '\n\nPosso te enviar uma proposta para a {{marca}}? Fico à disposição para conversar.\n\nUm abraço,\n' + ASSINATURA },
    { titulo: 'Apresentação por WhatsApp', canal: 'whatsapp', etapa: 'Primeiro contato', assunto: '',
      corpo: 'Oi, {{nome}}! Tudo bem?\n\nAqui é a Mari, criadora de conteúdo UGC. Conheci a {{marca}} e gostei muito do {{produto}}.\n\nCrio vídeos e fotos naturais, do dia a dia, que geram identificação com o público. Posso te mandar meu portfólio e uma proposta?\n\n' + SITE },
    { titulo: 'Apresentação por mensagem direta', canal: 'instagram', etapa: 'Primeiro contato', assunto: '',
      corpo: 'Oi, {{nome}}! Tudo bem? Sou a Mari, criadora de conteúdo UGC. Acompanho a {{marca}} e criei conteúdos pensando no jeito de vocês. Posso te enviar meu portfólio por aqui ou por e-mail?' },
    { titulo: 'Proposta comercial por e-mail', canal: 'email', etapa: 'Proposta', assunto: 'Proposta de conteúdo UGC para a {{marca}}',
      corpo: 'Olá, {{nome}}, tudo bem?\n\nConforme conversamos, segue a minha proposta de conteúdo para a {{marca}}.\n\nO que está incluso:\n- Produto em foco: {{produto}}\n- Vídeos verticais para Reels e TikTok, mais fotos do produto\n- Roteiro, gravação, edição e legendas\n- Entrega em até {{prazo}}\n- Valor: {{valor}}\n\nSe fizer sentido para vocês, é só me avisar que eu já reservo a data na minha agenda. Fico à disposição para ajustar o que for preciso.\n\nUm abraço,\n' + ASSINATURA },
    { titulo: 'Lembrete depois da proposta', canal: 'whatsapp', etapa: 'Follow-up', assunto: '',
      corpo: 'Oi, {{nome}}! Tudo bem?\n\nPassando para saber se você conseguiu ver a proposta que enviei para a {{marca}}. Se tiver qualquer dúvida ou quiser ajustar algo, me chama por aqui que eu resolvo com você.\n\nObrigada!' },
    { titulo: 'Agradecimento depois da entrega', canal: 'email', etapa: 'Pós-entrega', assunto: 'Obrigada pela parceria, {{marca}}!',
      corpo: 'Olá, {{nome}}, tudo bem?\n\nQuero agradecer pela confiança na parceria com a {{marca}}. Foi um prazer criar esse conteúdo e espero que tenha ficado do jeito que vocês imaginavam.\n\nSe puder, me conte o que achou e se quiser ajustar alguma coisa, é só falar. Também fico feliz em criar novos conteúdos quando fizer sentido para a marca.\n\nUm abraço,\n' + ASSINATURA }
  ];

  /* ---------- pequenas ajudas ---------- */
  function canalDe(v) { return CANAIS.filter(function (c) { return c.v === v; })[0] || CANAIS[CANAIS.length - 1]; }
  function semAcento(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function novoRE() { return /\{\{\s*([^{}\s]+)\s*\}\}/g; }
  function variaveisDe(texto) {
    var re = novoRE(), m, achou = [];
    while ((m = re.exec(texto || ''))) { var k = m[1].toLowerCase(); if (achou.indexOf(k) < 0) achou.push(k); }
    /* campos conhecidos na ordem de sempre (nome, marca, produto...), os inventados por último */
    function pos(k) { for (var i = 0; i < VARIAVEIS.length; i++) if (VARIAVEIS[i][0] === k) return i; return VARIAVEIS.length; }
    return achou.map(function (k, i) { return [k, i]; }).sort(function (a, b) { return (pos(a[0]) - pos(b[0])) || (a[1] - b[1]); }).map(function (x) { return x[0]; });
  }
  function rotuloVar(k) { var v = VARIAVEIS.filter(function (x) { return x[0] === k; })[0]; return v ? v[1] : k.charAt(0).toUpperCase() + k.slice(1); }
  function preencher(texto, valores) {
    return String(texto || '').replace(novoRE(), function (todo, k) { var v = String(valores[k.toLowerCase()] || '').trim(); return v || todo; });
  }
  function htmlPrevia(texto, valores) {
    var re = novoRE(), m, out = '', ult = 0; texto = String(texto || '');
    while ((m = re.exec(texto))) {
      out += esc(texto.slice(ult, m.index));
      var v = String(valores[m[1].toLowerCase()] || '').trim();
      out += v ? '<span class="pv">' + esc(v) + '</span>' : '<mark>' + esc(m[0]) + '</mark>';
      ult = m.index + m[0].length;
    }
    return out + esc(texto.slice(ult));
  }
  function dataLocal(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? '' : P.dataBR(P.paraISO(d)); }
  function usoTexto(p) {
    var n = Math.round(P.num(p.usos));
    if (!n) return 'Ainda não usado';
    var d = p.ultimo_uso ? dataLocal(p.ultimo_uso) : '';
    return 'Usado ' + P.plural(n, 'vez', 'vezes') + (d ? ', última em ' + d : '');
  }
  function acharPorId(id) { return lista.filter(function (x) { return x.id === id; })[0]; }
  function pilCanal(v) { var c = canalDe(v); return '<span class="pil c-' + c.v + '">' + P.icone(c.i) + esc(c.t) + '</span>'; }

  function copiarTexto(t) {
    function plano() {
      var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', '');
      a.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      (document.getElementById('modal') && document.getElementById('modal').open ? document.getElementById('modal') : document.body).appendChild(a);
      a.select(); a.setSelectionRange(0, t.length);
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      a.remove(); return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return plano(); });
    }
    return Promise.resolve(plano());
  }

  /* ---------- a aba ---------- */
  function montar(raiz) {
    raiz.innerHTML =
      '<div class="barra">' +
        '<div class="busca">' + P.icone('busca') + '<input type="search" id="pr-busca" placeholder="Buscar por título ou texto" aria-label="Buscar modelos"></div>' +
        '<select id="pr-etapa" aria-label="Filtrar por etapa" style="width:auto"></select>' +
        '<select id="pr-ordem" aria-label="Ordenar os modelos" style="width:auto">' +
          '<option value="favoritos">Favoritos primeiro</option><option value="usados">Mais usados</option><option value="recentes">Mais recentes</option><option value="az">De A a Z</option></select>' +
        '<button class="btn btn-sec" type="button" data-acao="prontos" title="Adiciona modelos de exemplo que você pode editar">Modelos prontos</button>' +
      '</div>' +
      '<div class="barra"><div class="grupo" id="pr-canais" role="group" aria-label="Filtrar por canal"></div><span class="vazio" id="pr-resumo" style="padding:0" role="status"></span></div>' +
      '<div id="pr-lista"></div>';

    $('#pr-busca', raiz).addEventListener('input', function (e) { filtro.busca = e.target.value; desenhar(); });
    $('#pr-etapa', raiz).addEventListener('change', function (e) { filtro.etapa = e.target.value; desenhar(); });
    $('#pr-ordem', raiz).addEventListener('change', function (e) { filtro.ordem = e.target.value; desenhar(); });
    $('#pr-canais', raiz).addEventListener('click', function (e) {
      var b = e.target.closest('[data-canal]'); if (!b) return;
      filtro.canal = b.getAttribute('data-canal'); desenhar();
    });
    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('[data-acao]'); if (!b) return;
      var acao = b.getAttribute('data-acao');
      if (acao === 'prontos') { adicionarProntos(); return; }
      if (acao === 'novo') { editar(null); return; }
      if (acao === 'limpar') { filtro = { canal: 'todos', etapa: '', busca: '', ordem: filtro.ordem }; $('#pr-busca').value = ''; desenhar(); return; }
      var card = b.closest('[data-id]'); if (!card) return;
      var p = acharPorId(+card.getAttribute('data-id')); if (!p) return;
      if (acao === 'usar' || acao === 'copiar') usar(p);
      else if (acao === 'editar') editar(p);
      else if (acao === 'duplicar') duplicar(p);
      else if (acao === 'apagar') apagar(p);
      else if (acao === 'fav') favoritar(p);
    });
  }

  function entrar() {
    return P.Dados.listar(T, { ordem: [['id', false]] }).then(function (r) { lista = r.dados; desenhar(); });
  }

  function filtrar() {
    var q = semAcento(filtro.busca).trim();
    var vis = lista.filter(function (p) {
      if (filtro.canal !== 'todos' && p.canal !== filtro.canal) return false;
      if (filtro.etapa && p.etapa !== filtro.etapa) return false;
      if (q && semAcento(p.titulo + ' ' + p.assunto + ' ' + p.corpo).indexOf(q) < 0) return false;
      return true;
    });
    vis.sort(function (a, b) {
      if (filtro.ordem === 'favoritos' && !!a.favorito !== !!b.favorito) return a.favorito ? -1 : 1;
      if (filtro.ordem === 'usados' && P.num(a.usos) !== P.num(b.usos)) return P.num(b.usos) - P.num(a.usos);
      if (filtro.ordem === 'az') return semAcento(a.titulo).localeCompare(semAcento(b.titulo));
      var x = String(b.atualizado_em || b.criado_em || ''), y = String(a.atualizado_em || a.criado_em || '');
      return x < y ? -1 : x > y ? 1 : b.id - a.id;
    });
    return vis;
  }

  function desenharFiltros() {
    /* canais com contagem */
    var cont = { todos: lista.length };
    CANAIS.forEach(function (c) { cont[c.v] = lista.filter(function (p) { return p.canal === c.v; }).length; });
    var htmlCanais = '<button type="button" data-canal="todos" aria-pressed="' + (filtro.canal === 'todos') + '">Todos (' + cont.todos + ')</button>' +
      CANAIS.filter(function (c) { return cont[c.v] || filtro.canal === c.v; }).map(function (c) {
        return '<button type="button" data-canal="' + c.v + '" aria-pressed="' + (filtro.canal === c.v) + '">' + esc(c.t) + ' (' + cont[c.v] + ')</button>';
      }).join('');
    $('#pr-canais').innerHTML = htmlCanais;
    /* etapas: as fixas mais qualquer outra que exista nos modelos */
    var etapas = ETAPAS.slice();
    lista.forEach(function (p) { if (p.etapa && etapas.indexOf(p.etapa) < 0) etapas.push(p.etapa); });
    var sel = $('#pr-etapa');
    sel.innerHTML = '<option value="">Todas as etapas</option>' + etapas.map(function (e) { return '<option value="' + esc(e) + '"' + (e === filtro.etapa ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('');
    $('#pr-ordem').value = filtro.ordem;
  }

  function desenhar() {
    var alvo = $('#pr-lista'); if (!alvo) return;
    desenharFiltros();
    if (!lista.length) {
      $('#pr-resumo').textContent = '';
      alvo.innerHTML = '<div class="cartao"><h2>Nenhum modelo ainda</h2>' +
        '<p class="vazio" style="padding-top:0">Aqui ficam as suas mensagens prontas para mandar às marcas, por e-mail, WhatsApp ou Instagram. Você escreve uma vez e copia quando precisar. Use palavras como {{marca}} e {{nome}} no texto: na hora de copiar, o painel pede o nome e troca tudo sozinho.</p>' +
        '<div class="barra" style="margin:0"><button class="btn" type="button" data-acao="prontos">' + P.icone('propostas') + 'Começar com modelos prontos</button>' +
        '<button class="btn btn-sec" type="button" data-acao="novo">Criar do zero</button></div></div>';
      return;
    }
    var vis = filtrar();
    $('#pr-resumo').textContent = vis.length === lista.length ? '' : 'Mostrando ' + vis.length + ' de ' + lista.length;
    if (!vis.length) {
      alvo.innerHTML = '<div class="cartao"><p class="vazio" style="padding:0 0 .6rem">Nenhum modelo com esses filtros.</p><button class="btn btn-sec" type="button" data-acao="limpar">Limpar filtros</button></div>';
      return;
    }
    alvo.innerHTML = '<div class="prop-grade">' + vis.map(function (p) {
      var previa = String(p.corpo || '').replace(/\s+\n/g, '\n').slice(0, 320);
      return '<article class="prop" data-id="' + p.id + '">' +
        '<div class="prop-topo">' + pilCanal(p.canal) + (p.etapa ? '<span class="pil">' + esc(p.etapa) + '</span>' : '') +
          '<button class="ib estrela' + (p.favorito ? ' on' : '') + '" type="button" data-acao="fav" aria-pressed="' + (p.favorito ? 'true' : 'false') + '" aria-label="' + (p.favorito ? 'Tirar dos favoritos' : 'Marcar como favorito') + '" title="' + (p.favorito ? 'Favorito' : 'Marcar como favorito') + '">' + P.icone('estrela') + '</button></div>' +
        '<h3><button type="button" class="prop-titulo" data-acao="usar" title="Preencher e copiar">' + esc(p.titulo || 'Sem título') + '</button></h3>' +
        (p.canal === 'email' && p.assunto ? '<p class="prop-assunto">Assunto: ' + esc(p.assunto) + '</p>' : '') +
        '<p class="prop-previa" data-acao="usar">' + esc(previa) + '</p>' +
        '<div class="prop-pe"><span class="prop-uso">' + esc(usoTexto(p)) + '</span>' +
          '<button class="btn" type="button" data-acao="copiar">' + P.icone('copiar') + 'Copiar</button>' +
          '<span class="prop-ib"><button class="ib" type="button" data-acao="editar" aria-label="Editar" title="Editar">' + P.icone('editar') + '</button>' +
          '<button class="ib" type="button" data-acao="duplicar" aria-label="Duplicar" title="Duplicar para criar uma variação">' + P.icone('duplicar') + '</button>' +
          '<button class="ib" type="button" data-acao="apagar" aria-label="Apagar" title="Apagar">' + P.icone('lixo') + '</button></span></div>' +
      '</article>';
    }).join('') + '</div>';
  }

  /* ---------- favorito e uso ---------- */
  function favoritar(p) {
    var novo = !p.favorito;
    P.Dados.atualizar(T, p.id, { favorito: novo }).then(function (r) {
      if (!r.ok) { P.toast(r.texto || 'Não consegui mudar.', 'erro'); return; }
      p.favorito = novo; desenhar();
    });
  }
  function usou(p) {
    p.usos = Math.round(P.num(p.usos)) + 1; p.ultimo_uso = new Date().toISOString();
    P.Dados.atualizar(T, p.id, { usos: p.usos, ultimo_uso: p.ultimo_uso });   /* se falhar, só não conta o uso */
    desenhar();
  }

  /* ---------- usar: preencher os campos e copiar ---------- */
  function usar(p) {
    var canal = canalDe(p.canal), vars = variaveisDe((p.assunto || '') + '\n' + (p.corpo || ''));
    var valores = {}; vars.forEach(function (k) { valores[k] = (k === 'nome' || k === 'marca') ? (lembrar[k] || '') : ''; });
    var email = canal.v === 'email', zap = canal.v === 'whatsapp';

    var html = P.cabecalhoModal(p.titulo || 'Modelo') +
      '<p class="prop-topo" style="margin-bottom:.8rem">' + pilCanal(p.canal) + (p.etapa ? '<span class="pil">' + esc(p.etapa) + '</span>' : '') + '</p>' +
      (vars.length
        ? '<p class="vazio" style="padding:0 0 .5rem">Preencha e veja a mensagem ficar pronta. O que estiver em amarelo ainda falta.</p><div class="grade-var">' +
          vars.map(function (k, i) { return '<div class="campo"><label class="c" for="uv-' + i + '">' + esc(rotuloVar(k)) + '</label><input id="uv-' + i + '" type="text" data-var="' + esc(k) + '" autocomplete="off" value="' + esc(valores[k]) + '"></div>'; }).join('') + '</div>'
        : '<p class="vazio" style="padding:0 0 .5rem">Este modelo não tem campos para preencher. É só copiar.</p>') +
      (email ? '<div class="campo"><label class="c">Assunto</label><div class="prop-msg prop-assunto-pv" id="us-assunto"></div></div>' : '') +
      '<div class="campo"><label class="c">Mensagem</label><div class="prop-msg" id="us-msg" tabindex="0"></div></div>' +
      '<div class="prop-falta" id="us-falta" hidden></div>' +
      (email || zap ? '<div class="campo" style="margin-top:.8rem"><label class="c" for="us-contato">' + (email ? 'E-mail da marca (opcional)' : 'WhatsApp da marca com DDD (opcional)') + '</label>' +
        '<input id="us-contato" type="' + (email ? 'email' : 'tel') + '" autocomplete="off" placeholder="' + (email ? 'contato@marca.com.br' : '(11) 90000-0000') + '"><p class="vazio" style="padding:.3rem 0 0">Só serve para abrir a conversa já com a mensagem. Não fica guardado.</p></div>' : '') +
      '<div class="modal-pe fixo"><button type="button" class="btn btn-sec" data-fechar>Fechar</button>' +
      (email ? '<button type="button" class="btn btn-sec" id="us-copiar-assunto">Copiar assunto</button><a class="btn btn-sec" id="us-abrir" href="#">Abrir no e-mail</a>' : '') +
      (zap ? '<a class="btn btn-sec" id="us-abrir" href="#" target="_blank" rel="noopener">Abrir no WhatsApp</a>' : '') +
      '<button type="button" class="btn" id="us-copiar">' + P.icone('copiar') + 'Copiar mensagem</button></div>';

    var d = P.abrirModal(html, { largo: true });
    var caixaMsg = $('#us-msg', d), caixaAss = $('#us-assunto', d), falta = $('#us-falta', d), abrir = $('#us-abrir', d), contato = $('#us-contato', d);
    var longo = false, textoFinal = '', assuntoFinal = '';

    function atualizar() {
      $$campos().forEach(function (el) { valores[el.getAttribute('data-var')] = el.value; });
      lembrar.nome = valores.nome != null ? valores.nome : lembrar.nome; lembrar.marca = valores.marca != null ? valores.marca : lembrar.marca;
      textoFinal = preencher(p.corpo, valores); assuntoFinal = preencher(p.assunto, valores);
      caixaMsg.innerHTML = htmlPrevia(p.corpo, valores);
      if (caixaAss) caixaAss.innerHTML = htmlPrevia(p.assunto, valores) || '<span style="opacity:.6">Sem assunto neste modelo</span>';
      var faltam = vars.filter(function (k) { return !String(valores[k] || '').trim(); });
      falta.hidden = !faltam.length;
      if (faltam.length) falta.textContent = 'Ainda falta preencher: ' + faltam.map(rotuloVar).join(', ') + '. Se copiar assim, o texto vai com as chaves.';
      if (abrir) {
        var c = contato ? contato.value.trim() : '', href;
        if (email) {
          href = 'mailto:' + c + '?subject=' + encodeURIComponent(assuntoFinal) + '&body=' + encodeURIComponent(textoFinal.replace(/\r?\n/g, '\r\n'));
          longo = href.length > 1900;
        } else {
          var dig = c.replace(/\D/g, ''); if (dig.length === 10 || dig.length === 11) dig = '55' + dig;
          href = 'https://wa.me/' + dig + '?text=' + encodeURIComponent(textoFinal);
          longo = href.length > 6000;
        }
        abrir.setAttribute('href', href);
        abrir.classList.toggle('desativado', longo);
        abrir.title = longo ? 'A mensagem é grande demais para abrir direto. Use "Copiar mensagem".' : '';
      }
    }
    function $$campos() { return Array.prototype.slice.call(d.querySelectorAll('[data-var]')); }

    /* o ouvinte fica dentro do conteúdo da janela (que é recriado a cada abertura), senão se acumularia no <dialog> */
    d.querySelector('.modal-in').addEventListener('input', atualizar);
    atualizar();
    var vazios = $$campos().filter(function (el) { return !el.value; });
    if (vazios[0]) vazios[0].focus();

    function feito(ok, o_que) {
      if (!ok) { P.toast('Não consegui copiar sozinho. Selecione o texto e use Ctrl+C.', 'erro'); return; }
      var pendente = vars.some(function (k) { return !String(valores[k] || '').trim(); });
      P.toast(o_que === 'assunto' ? 'Assunto copiado.' : 'Mensagem copiada. É só colar no ' + canal.destino + '.' + (pendente ? ' Atenção: ainda tem campo sem preencher.' : ''), pendente && o_que !== 'assunto' ? 'erro' : undefined);
      if (o_que !== 'assunto') usou(p);
    }
    $('#us-copiar', d).addEventListener('click', function () { atualizar(); copiarTexto(textoFinal).then(function (ok) { feito(ok, 'mensagem'); }); });
    var bAss = $('#us-copiar-assunto', d);
    if (bAss) bAss.addEventListener('click', function () { atualizar(); copiarTexto(assuntoFinal).then(function (ok) { feito(ok, 'assunto'); }); });
    if (abrir) abrir.addEventListener('click', function (e) {
      if (longo) { e.preventDefault(); P.toast('Mensagem grande demais para abrir direto. Use "Copiar mensagem".', 'erro'); return; }
      usou(p);
    });
  }

  /* ---------- criar e editar ---------- */
  function editar(p) {
    var v = p || { canal: 'email', etapa: 'Proposta', titulo: '', assunto: '', corpo: '', favorito: false };
    var etapas = ETAPAS.slice(); if (v.etapa && etapas.indexOf(v.etapa) < 0) etapas.push(v.etapa);
    var html = P.cabecalhoModal(p ? 'Editar modelo' : 'Novo modelo') + '<form id="form-modal" novalidate>' +
      '<div class="campo"><label class="c" for="f-titulo">Título do modelo *</label><input id="f-titulo" name="titulo" type="text" placeholder="Ex.: Apresentação para marcas de beleza" value="' + esc(v.titulo) + '"></div>' +
      '<div class="grade2"><div class="campo"><label class="c" for="f-canal">Onde vou enviar</label><select id="f-canal" name="canal">' +
        CANAIS.map(function (c) { return '<option value="' + c.v + '"' + (c.v === v.canal ? ' selected' : '') + '>' + esc(c.t) + '</option>'; }).join('') + '</select></div>' +
      '<div class="campo"><label class="c" for="f-etapa">Etapa da conversa</label><select id="f-etapa" name="etapa">' +
        etapas.map(function (e) { return '<option value="' + esc(e) + '"' + (e === v.etapa ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="campo" id="campo-assunto"><label class="c" for="f-assunto">Assunto do e-mail</label><input id="f-assunto" name="assunto" type="text" value="' + esc(v.assunto) + '"></div>' +
      '<div class="campo"><label class="c" for="f-corpo">Mensagem *</label>' +
        '<div class="chips-var" role="group" aria-label="Inserir campo no texto"><span>Inserir campo:</span>' +
          VARIAVEIS.map(function (x) { return '<button type="button" data-ins="' + x[0] + '" title="' + esc(x[1]) + '">{{' + x[0] + '}}</button>'; }).join('') + '</div>' +
        '<textarea id="f-corpo" name="corpo" class="corpo-grande" placeholder="Escreva a mensagem. Use os campos acima onde o texto muda de marca para marca.">' + esc(v.corpo) + '</textarea>' +
        '<p class="vazio" style="padding:.3rem 0 0" id="info-corpo"></p></div>' +
      '<div class="campo"><label style="display:flex;gap:.5rem;align-items:center;font-size:13.5px"><input type="checkbox" id="f-favorito" name="favorito" style="width:18px;height:18px"' + (v.favorito ? ' checked' : '') + '> Marcar como favorito (aparece primeiro)</label></div>' +
      '<p class="msg-erro" id="msg-modal" role="alert" hidden></p>' +
      '<div class="modal-pe fixo">' + (p ? '<button type="button" class="btn btn-perigo esq" id="bt-apagar">Apagar</button>' : '') +
      '<button type="button" class="btn btn-sec" data-fechar>Cancelar</button><button type="submit" class="btn" id="bt-salvar">Salvar</button></div></form>';
    var d = P.abrirModal(html, { largo: true });
    var form = $('#form-modal', d), msg = $('#msg-modal', d), corpo = $('#f-corpo', d), canalSel = $('#f-canal', d);
    function erro(t) { msg.textContent = t; msg.hidden = !t; }

    function info() {
      var vars = variaveisDe($('#f-assunto', d).value + '\n' + corpo.value), n = corpo.value.length;
      var t = P.inteiro(n) + ' ' + (n === 1 ? 'caractere' : 'caracteres') + '.';
      if (vars.length) t += ' Campos usados: ' + vars.map(rotuloVar).join(', ') + '.';
      else t += ' As palavras entre {{ }} viram campos para preencher na hora de copiar.';
      if (canalSel.value === 'instagram' && n > 1000) t += ' Passa do limite de mensagem direta do Instagram (cerca de 1000 caracteres).';
      $('#info-corpo', d).textContent = t;
    }
    function mostrarAssunto() { $('#campo-assunto', d).hidden = canalSel.value !== 'email'; }
    canalSel.addEventListener('change', function () { mostrarAssunto(); info(); });
    corpo.addEventListener('input', info); $('#f-assunto', d).addEventListener('input', info);
    mostrarAssunto(); info();
    $('#f-titulo', d).focus();

    d.querySelector('.chips-var').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ins]'); if (!b) return;
      var txt = '{{' + b.getAttribute('data-ins') + '}}', ini = corpo.selectionStart, fim = corpo.selectionEnd;
      if (typeof ini !== 'number') { ini = fim = corpo.value.length; }
      corpo.value = corpo.value.slice(0, ini) + txt + corpo.value.slice(fim);
      corpo.focus(); corpo.setSelectionRange(ini + txt.length, ini + txt.length); info();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault(); erro('');
      var dados = {
        titulo: form.elements.titulo.value.trim(), canal: form.elements.canal.value, etapa: form.elements.etapa.value,
        assunto: form.elements.assunto.value.trim(), corpo: corpo.value.trim(), favorito: form.elements.favorito.checked
      };
      if (!dados.titulo) { erro('Dê um título ao modelo.'); form.elements.titulo.focus(); return; }
      if (!dados.corpo) { erro('Escreva a mensagem.'); corpo.focus(); return; }
      if (dados.corpo.length > 10000) { erro('A mensagem passou de 10.000 caracteres. Encurte um pouco.'); return; }
      dados.atualizado_em = new Date().toISOString();
      var bt = $('#bt-salvar', d); bt.disabled = true; bt.textContent = 'Salvando...';
      (p ? P.Dados.atualizar(T, p.id, dados) : P.Dados.inserir(T, dados)).then(function (r) {
        bt.disabled = false; bt.textContent = 'Salvar';
        if (!r.ok) { erro(r.texto || 'Não consegui salvar.'); return; }
        P.fecharModal(); P.toast(p ? 'Modelo salvo.' : 'Modelo criado.'); P.recarregar();
      });
    });
    if (p) $('#bt-apagar', d).addEventListener('click', function () { P.fecharModal(); apagar(p); });
  }

  function duplicar(p) {
    var c = { titulo: (p.titulo || 'Modelo') + ' (cópia)', canal: p.canal, etapa: p.etapa, assunto: p.assunto || '', corpo: p.corpo || '', favorito: false };
    P.Dados.inserir(T, c).then(function (r) {
      if (!r.ok) { P.toast(r.texto || 'Não consegui duplicar.', 'erro'); return; }
      var novo = (r.dados || [])[0];
      if (novo) { lista.unshift(novo); desenhar(); P.toast('Modelo duplicado. Ajuste o que quiser.'); editar(novo); }
      else { P.toast('Modelo duplicado.'); P.recarregar(); }
    });
  }

  function apagar(p) {
    P.formulario({
      titulo: 'Apagar modelo', valores: {}, campos: [], msgOk: 'Modelo apagado.', rotuloSalvando: 'Apagando...',
      salvar: function () { return P.Dados.apagar(T, p.id); },
      aoSalvar: function () { P.recarregar(); }
    });
    P.$('#form-modal').insertAdjacentHTML('afterbegin', '<p style="margin-bottom:.6rem">Apagar "<b style="font-weight:500">' + esc(p.titulo || 'este modelo') + '</b>"? Não dá para desfazer. Se quiser guardar uma versão parecida, use antes o botão de duplicar.</p>');
    P.$('#bt-salvar').textContent = 'Apagar';
    P.$('#bt-salvar').className = 'btn btn-perigo';
  }

  function adicionarProntos() {
    var tem = lista.map(function (p) { return semAcento(p.titulo); });
    var faltam = PRONTOS.filter(function (x) { return tem.indexOf(semAcento(x.titulo)) < 0; });
    if (!faltam.length) { P.toast('Todos os modelos prontos já estão aqui.'); return; }
    P.Dados.inserir(T, faltam.map(function (x) { return { titulo: x.titulo, canal: x.canal, etapa: x.etapa, assunto: x.assunto, corpo: x.corpo, favorito: false }; })).then(function (r) {
      if (!r.ok) { P.toast(r.texto || 'Não consegui adicionar.', 'erro'); return; }
      P.toast(P.plural(faltam.length, 'modelo adicionado', 'modelos adicionados') + '. Edite do seu jeito.'); P.recarregar();
    });
  }

  P.registrar('propostas', {
    titulo: 'Propostas', montar: montar, entrar: entrar,
    acoes: [{ rotulo: 'Novo modelo', aoClicar: function () { editar(null); } }]
  });
})();
