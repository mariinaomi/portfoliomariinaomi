/* =====================================================================
   prospeccao.js: aba "Prospecção". Manda o seu e-mail de apresentação
   para várias marcas de uma vez, chamando cada uma pelo nome.

   De onde vêm os e-mails: SEMPRE da aba Marcas (tabela "marcas").
   Como sai: pela função "enviar-emails" do Supabase (Resend), ou no modo
   rascunho, uma marca por vez pelo seu Gmail, que funciona sem Resend.
   A chave do Resend NÃO existe neste arquivo: ela vive só no Supabase.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Painel; if (!P) return;
  var esc = P.esc, $ = P.$;

  var MEU_EMAIL = 'otamariana.0295@gmail.com';   /* para onde vão as respostas e o teste */
  var MEU_NOME = 'Mari Naomi';
  var SITE = 'https://mariinaomi.github.io/portfoliomariinaomi/';
  var LOTE = 100;                                /* quantos e-mails por chamada ao carteiro */
  var K_RASCUNHO = 'prospeccao-rascunho-v1', K_TESTE = 'prospeccao-teste-v1';
  var RODAPE_SAIR = 'Se você não quiser receber mais e-mails meus, é só responder com a palavra SAIR.';

  var PADRAO = {
    modo: 'texto', envio: 'resend', lista: 'selecionadas', pular: true,
    assunto: 'Parceria de conteúdo UGC com a {{marca}}',
    texto: 'Olá, {{nome}}, tudo bem?\n\nMe chamo Mari Naomi, sou criadora de conteúdo UGC em São Paulo e acompanho a {{marca}} com muito carinho.\n\nFaço vídeos e fotos em estilo natural, com luz do dia e situações reais do dia a dia, pensados para gerar identificação com o público da marca.\n\nPosso te enviar uma proposta para a {{marca}}? É só responder este e-mail.\n\nUm abraço,\nMari Naomi\n@littlethings_bymarii',
    html: '', btnTxt: 'Ver meu portfólio', btnLink: SITE
  };

  var dados = { marcas: [], envios: [], optouts: [] };
  var lidas = { marcas: true, envios: true, optout: true };   /* false = a tabela não existe ainda */
  var est = Object.assign({}, PADRAO);
  var busca = '', quantosHist = 50, ocupado = false, fila = null, filaMsg = '', montado = false, temporizador = null;

  /* ---------- guardar coisas no navegador (se não der, tudo continua funcionando) ---------- */
  function guardar(k, v, sessao) { try { (sessao ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* sem armazenamento: segue */ } }
  function ler(k, sessao) { try { return (sessao ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } }
  function carregarRascunho() {
    try {
      var s = JSON.parse(ler(K_RASCUNHO) || 'null');
      if (s && typeof s === 'object') Object.keys(PADRAO).forEach(function (k) { if (s[k] != null && typeof s[k] === typeof PADRAO[k]) est[k] = s[k]; });
    } catch (e) { /* rascunho ilegível: usa o padrão */ }
  }
  function salvarRascunho() { guardar(K_RASCUNHO, JSON.stringify(est)); }

  /* ---------- pequenas ajudas ---------- */
  function emailValido(e) { return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(String(e || '').trim()); }
  function normEmail(e) { return String(e || '').trim().toLowerCase(); }
  function primeiroNome(marca) { var t = String(marca || '').trim(); return t ? t.split(/\s+/)[0] : ''; }
  function traco(n) { return n == null ? '-' : P.inteiro(n); }
  function hash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); }
  function marcasReais() { return dados.marcas.filter(function (m) { return !m.exemplo; }); }
  function conjuntoOptout() { var s = {}; dados.optouts.forEach(function (o) { s[normEmail(o.email)] = true; }); return s; }
  function trocarChaves(t, nome, marca, comoHtml) {
    var n = comoHtml ? esc(nome) : String(nome), m = comoHtml ? esc(marca) : String(marca);
    return String(t == null ? '' : t).replace(/\{\{\s*nome\s*\}\}/gi, function () { return n; }).replace(/\{\{\s*marca\s*\}\}/gi, function () { return m; });
  }
  function dataHora(iso) {
    var d = new Date(iso); if (isNaN(d.getTime())) return '';
    return P.dataBR(P.paraISO(d)) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* ---------- montar o e-mail ---------- */
  function linkSeguro(l) {
    l = String(l || '').trim(); if (!l) return '';
    if (/^(https?:\/\/|mailto:)/i.test(l)) return l;
    if (/^www\./i.test(l)) return 'https://' + l;
    return '';
  }
  function linkificar(txtEscapado) {
    return txtEscapado.replace(/(https?:\/\/[^\s<]+)/g, function (u) {
      var fim = ''; var m = /[.,;:!?)]+$/.exec(u); if (m) { fim = m[0]; u = u.slice(0, u.length - fim.length); }
      return '<a href="' + u + '" style="color:#b5563a;text-decoration:underline;">' + u + '</a>' + fim;
    });
  }
  function paragrafos(blocos) {
    return blocos.map(function (b) {
      return '<p style="margin:0 0 16px 0;">' + linkificar(esc(b)).replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
  }
  /* Onde o botão entra no texto: {{botao}} escolhe o lugar exato; sem ele, o botão fica ANTES da despedida
     (Att, Um abraço, Atenciosamente...) e, se não houver despedida, no fim. Devolve o que vem antes e depois dele. */
  var RE_MARCADOR_BOTAO = /\{\{\s*bot[aã]o\s*\}\}/i;
  var RE_DESPEDIDA = /^\s*(att\.?|atenciosamente|abra[cç]os?|um abra[cç]o|cordialmente|obrigad[oa]s?|beijos?|grat[oa]|at[eé] (mais|breve|logo))(?![a-zà-ú])/i;
  function repartirTexto(texto) {
    var blocos = String(texto || '').replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).filter(function (b) { return b.trim(); });
    for (var k = 0; k < blocos.length; k++) {
      if (!RE_MARCADOR_BOTAO.test(blocos[k])) continue;
      var partes = blocos[k].split(new RegExp(RE_MARCADOR_BOTAO.source, 'ig')), antes = blocos.slice(0, k), depois = [];
      if (partes[0].trim()) antes.push(partes[0].trim());
      var resto = partes.slice(1).join('').trim(); if (resto) depois.push(resto);
      return { antes: antes, depois: depois.concat(blocos.slice(k + 1)) };
    }
    if (blocos.length >= 2 && RE_DESPEDIDA.test(blocos[blocos.length - 1])) return { antes: blocos.slice(0, -1), depois: blocos.slice(-1) };
    return { antes: blocos, depois: [] };
  }
  function botaoHtml(txt, link) {
    var l = linkSeguro(link); txt = String(txt || '').trim();
    if (!txt || !l) return '';
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px 0;"><tr><td style="border-radius:999px;background:#b5563a;">' +
      '<a href="' + esc(l) + '" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:999px;">' + esc(txt) + '</a></td></tr></table>';
  }
  /* O e-mail limpo do modo "texto fácil": fundo branco, letra escura, no máximo 560 px, rodapé do SAIR. */
  function htmlSimples(texto, btnTxt, btnLink) {
    var partes = repartirTexto(texto);
    return '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title></title>\n</head>\n' +
      '<body style="margin:0;padding:0;background:#ffffff;">\n' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;"><tr><td align="center" style="padding:24px 16px;">\n' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;"><tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#2b2b2b;text-align:left;">\n' +
      paragrafos(partes.antes) + '\n' + botaoHtml(btnTxt, btnLink) + '\n' + paragrafos(partes.depois) + '\n' +
      '<p style="margin:32px 0 0 0;font-size:12px;line-height:1.5;color:#8a8a8a;">' + esc(RODAPE_SAIR) + '</p>\n' +
      '</td></tr></table>\n</td></tr></table>\n</body>\n</html>';
  }
  function htmlFinal() { return est.modo === 'html' ? est.html : htmlSimples(est.texto, est.btnTxt, est.btnLink); }
  function temConteudo() { return !!(est.assunto.trim() && (est.modo === 'html' ? est.html.trim() : est.texto.trim())); }
  function htmlSemSair() { return est.modo === 'html' && est.html.trim() && !/sair/i.test(est.html); }
  function htmlParaTexto(html) {
    var t = String(html || '').replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
    t = t.replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, function (m, href, dentro) {
      var r = String(dentro).replace(/<[^>]+>/g, '').trim(); return (!r || r === href) ? href : r + ' (' + href + ')';
    });
    t = t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n\n').replace(/<[^>]+>/g, '');
    t = t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    return t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  /* O texto puro que vai para o Gmail (modo rascunho) ou para copiar. */
  function textoParaMarca(nome, marca) {
    if (est.modo === 'html') return htmlParaTexto(trocarChaves(est.html, nome, marca, true));
    var partes = repartirTexto(trocarChaves(est.texto, nome, marca, false));
    var l = linkSeguro(est.btnLink), bt = est.btnTxt.trim();
    var bloco = (bt && l) ? [bt + ': ' + l] : [];   /* o botão vira uma linha com o link, no mesmo lugar do e-mail */
    return partes.antes.concat(bloco, partes.depois).join('\n\n') + '\n\n' + RODAPE_SAIR;
  }

  /* ---------- quem vai receber ---------- */
  function nomeSituacao(v) { return { lead: 'os leads', conversando: 'quem está conversando', cliente: 'quem já é cliente', parada: 'as marcas paradas' }[v] || ('situação "' + v + '"'); }
  function situacoesPresentes() {
    var ordem = ['lead', 'conversando', 'cliente', 'parada'], achadas = {};
    marcasReais().forEach(function (m) { if (m.situacao) achadas[m.situacao] = true; });
    var extras = Object.keys(achadas).filter(function (s) { return ordem.indexOf(s) < 0; }).sort();
    return ordem.filter(function (s) { return achadas[s]; }).concat(extras);
  }
  function baseDaLista(chave) {
    return marcasReais().filter(function (m) {
      if (chave === 'selecionadas') return !!m.selecionada;
      if (chave === 'todas') return true;
      if (chave.indexOf('sit:') === 0) return m.situacao === chave.slice(4);
      return false;
    });
  }
  function rotuloLista(chave) {
    if (chave === 'selecionadas') return 'só as marcas selecionadas';
    if (chave === 'teste') return 'só para mim (teste)';
    if (chave === 'todas') return 'todas as marcas com e-mail';
    return 'só ' + nomeSituacao(chave.slice(4));
  }
  /* Calcula, ao vivo, tudo sobre a lista escolhida. */
  function calcular() {
    var chave = est.lista, r = { chave: chave, rotulo: rotuloLista(chave), marcas: [], semEmail: 0, unicos: [], repetidos: 0, descad: 0, jaTem: 0, alvo: [] };
    if (chave === 'teste') {
      var t = { email: MEU_EMAIL, marca: 'Marca de teste', nome: 'Mari', ids: [] };
      r.marcas = [t]; r.unicos = [t]; r.alvo = [t]; return r;
    }
    var base = baseDaLista(chave);
    r.marcas = base.filter(function (m) { return emailValido(m.email); });
    r.semEmail = base.length - r.marcas.length;
    var mapa = {};
    r.marcas.forEach(function (m) {
      var e = normEmail(m.email);
      if (mapa[e]) { mapa[e].ids.push(m.id); r.repetidos++; }
      else { mapa[e] = { email: e, marca: m.nome, nome: primeiroNome(m.nome), ids: [m.id] }; r.unicos.push(mapa[e]); }
    });
    var optout = conjuntoOptout();
    r.alvo = r.unicos.filter(function (u) { if (optout[u.email]) { r.descad++; return false; } return true; });
    if (est.pular && lidas.envios) {
      var tem = {}; dados.envios.forEach(function (e) { if (e.status === 'ok') tem[normEmail(e.email) + '||' + e.assunto] = true; });
      r.alvo = r.alvo.filter(function (u) { if (tem[u.email + '||' + trocarChaves(est.assunto, u.nome, u.marca, false)]) { r.jaTem++; return false; } return true; });
    }
    return r;
  }
  function contarLista(chave) { return baseDaLista(chave).filter(function (m) { return emailValido(m.email); }).length; }
  function amostra() {
    var c = calcular(), u = c.alvo[0] || c.unicos[0];
    return u ? { nome: u.nome || 'Marca', marca: u.marca || 'Marca Exemplo', real: c.chave !== 'teste' } : { nome: 'Marca', marca: 'Marca Exemplo', real: false };
  }

  /* ---------- números ---------- */
  function numeros() {
    var reais = marcasReais(), com = reais.filter(function (m) { return emailValido(m.email); });
    var optout = conjuntoOptout(), recebeu = {}, falhou = {}, totalOk = 0;
    dados.envios.forEach(function (e) { var k = normEmail(e.email); if (e.status === 'ok') { recebeu[k] = true; totalOk++; } });
    dados.envios.forEach(function (e) { var k = normEmail(e.email); if (e.status === 'erro' && !recebeu[k]) falhou[k] = true; });
    var jaEnviou = Object.assign({}, recebeu); reais.forEach(function (m) { if (m.email_enviado_em && emailValido(m.email)) jaEnviou[normEmail(m.email)] = true; });
    var unicos = {}; com.forEach(function (m) { unicos[normEmail(m.email)] = true; });
    var aEnviar = Object.keys(unicos).filter(function (e) { return !optout[e] && !jaEnviou[e]; }).length;
    return {
      comEmail: lidas.marcas ? com.length : null, emailsUnicos: Object.keys(unicos).length,
      aEnviar: (lidas.marcas && lidas.optout && lidas.envios) ? aEnviar : null,
      receberam: lidas.envios ? Object.keys(recebeu).length : null,
      falhas: lidas.envios ? Object.keys(falhou).length : null,
      descad: lidas.optout ? dados.optouts.length : null,
      totalOk: lidas.envios ? totalOk : null
    };
  }

  /* ---------- a aba: esqueleto ---------- */
  function montar(raiz) {
    raiz.innerHTML =
      '<div class="pr">' +
      '<section class="pr-capa" aria-label="Resumo da Prospecção">' +
        '<div class="pr-capa-topo">' +
          '<span class="pr-capa-ic">' + P.icone('prospeccao') + '</span>' +
          '<div class="pr-capa-tx"><h2>Prospecção</h2><p>Manda o seu e-mail de apresentação para várias marcas da sua base de uma vez, chamando cada uma pelo nome.</p></div>' +
          '<div class="pr-capa-num"><b id="pr-total">-</b><span>enviados até agora</span></div>' +
        '</div>' +
        '<ul class="pr-etiquetas"><li>Teste antes, sempre</li><li>A chave vive no Supabase</li><li>Quem responde SAIR sai da lista</li></ul>' +
      '</section>' +
      '<div class="pr-kpis" id="pr-kpis"></div>' +
      '<div id="pr-vazio"></div>' +
      '<div class="pr-grade" id="pr-grade">' +
        '<div class="pr-col">' +
          '<section class="cartao pr-card" aria-labelledby="pr-h-destino"><h2 id="pr-h-destino">Para quem vai</h2>' +
            '<p class="pr-origem">' + P.icone('marcas') + '<span>Os e-mails vêm da sua aba <a href="#marcas">Marcas</a>.</span></p>' +
            '<div class="campo"><label class="c" for="pr-lista">Lista de destinatários</label><select id="pr-lista"></select></div>' +
            '<div id="pr-resumo-lista" class="pr-resumo" role="status"></div>' +
            '<div id="pr-aviso-lista"></div>' +
            '<label class="pr-check"><input type="checkbox" id="pr-pular"> <span>Pular quem já recebeu este mesmo assunto</span></label>' +
            '<p class="vazio" style="padding:.2rem 0 0">Deixe marcada para continuar um disparo que parou no meio sem mandar duas vezes para a mesma pessoa.</p>' +
          '</section>' +
          '<section class="cartao pr-card" aria-labelledby="pr-h-email"><h2 id="pr-h-email">O e-mail</h2>' +
            '<div class="grupo pr-modos" id="pr-modo" role="group" aria-label="Jeito de escrever o e-mail"><button type="button" data-modo="texto">Texto fácil</button><button type="button" data-modo="html">HTML</button></div>' +
            '<div class="campo"><label class="c" for="pr-assunto">Assunto</label><input id="pr-assunto" type="text" maxlength="200" autocomplete="off" placeholder="Ex.: Parceria de conteúdo UGC com a {{marca}}"></div>' +
            '<div id="pr-modo-texto">' +
              '<div class="campo"><label class="c" for="pr-texto">Mensagem</label>' +
                '<div class="chips-var" role="group" aria-label="Inserir campo no texto"><span>Inserir:</span><button type="button" data-ins="nome" title="O primeiro nome da marca">{{nome}}</button><button type="button" data-ins="marca" title="O nome completo da marca">{{marca}}</button><button type="button" data-ins="botao" title="O lugar onde o botão aparece no e-mail">{{botao}}</button></div>' +
                '<textarea id="pr-texto" class="corpo-grande" placeholder="Escreva o e-mail do jeito que você escreve normalmente."></textarea>' +
                '<p class="vazio" style="padding:.3rem 0 0">Use {{nome}} e {{marca}} onde o nome da marca deve entrar. Links que você escrever no meio do texto viram clicáveis sozinhos. Linha em branco separa os parágrafos. O botão (se preenchido) entra sozinho antes da despedida, como "Att," ou "Um abraço". Para escolher outro lugar, escreva {{botao}} onde quiser.</p></div>' +
              '<div class="grade2"><div class="campo"><label class="c" for="pr-btn-txt">Texto do botão (opcional)</label><input id="pr-btn-txt" type="text" maxlength="60" placeholder="Ver meu portfólio"></div>' +
              '<div class="campo"><label class="c" for="pr-btn-link">Link do botão</label><input id="pr-btn-link" type="url" placeholder="https://..."></div></div>' +
            '</div>' +
            '<div id="pr-modo-html" hidden>' +
              '<div class="barra" style="margin-bottom:.5rem"><button type="button" class="btn btn-sec" id="pr-modelo">Começar do modelo pronto</button><span class="vazio" style="padding:0;flex:1;min-width:200px">Cola no campo o HTML do modo texto fácil, para você partir dele.</span></div>' +
              '<div class="campo"><label class="c" for="pr-html">HTML do e-mail</label><textarea id="pr-html" class="codigo" spellcheck="false" placeholder="Cole aqui o HTML pronto. {{nome}} e {{marca}} continuam funcionando."></textarea>' +
              '<p class="vazio" style="padding:.3rem 0 0">Neste modo sai exatamente o que estiver aqui, sem nada acrescentado. O rodapé com a palavra SAIR precisa estar no seu HTML.</p></div>' +
              '<div id="pr-aviso-sair"></div>' +
            '</div>' +
          '</section>' +
          '<section class="cartao pr-card" aria-labelledby="pr-h-enviar"><h2 id="pr-h-enviar">Enviar</h2>' +
            '<div class="grupo pr-modos" id="pr-envio" role="group" aria-label="Como enviar"><button type="button" data-envio="resend">Automático (Resend)</button><button type="button" data-envio="gmail">Rascunho (Gmail)</button></div>' +
            '<div id="pr-envio-resend">' +
              '<p class="vazio" style="padding:0 0 .7rem">O painel manda um e-mail de cada vez, com o nome de cada marca. Comece sempre pelo teste: ele vai só para o seu e-mail.</p>' +
              '<div class="pr-botoes"><button type="button" class="btn btn-sec" id="pr-teste">' + P.icone('enviar') + 'Enviar teste pra mim</button><button type="button" class="btn" id="pr-disparar">' + P.icone('enviar') + 'Disparar para as marcas</button></div>' +
              '<p class="pr-dica" id="pr-dica" role="status"></p>' +
              '<div id="pr-progresso" hidden><div class="prog"><i id="pr-prog-barra" style="width:0"></i></div><p class="vazio" id="pr-prog-txt" style="padding:.3rem 0 0"></p></div>' +
              '<div id="pr-resultado" role="status"></div>' +
            '</div>' +
            '<div id="pr-envio-gmail" hidden>' +
              '<p class="vazio" style="padding:0 0 .7rem">Plano B, sem Resend nenhum: o painel monta o e-mail de cada marca e você envia pelo seu Gmail, uma por vez. Ao marcar como enviada, ela sai da fila e fica registrada na sua base, com a data.</p>' +
              '<div class="pr-botoes"><button type="button" class="btn" id="pr-montar-fila">' + P.icone('enviar') + 'Montar a fila</button></div>' +
              '<div id="pr-fila"></div>' +
            '</div>' +
          '</section>' +
        '</div>' +
        '<aside class="pr-lado" aria-label="Prévia do e-mail"><div class="pr-lado-in">' +
          '<div class="pr-lado-topo"><h2>Prévia</h2><button type="button" class="btn btn-sec" id="pr-tela">' + P.icone('tela') + 'Ver em tela cheia</button></div>' +
          '<div class="pr-palco"><article class="pr-janela" id="pr-janela"></article></div>' +
          '<p class="pr-nota" id="pr-nota"></p>' +
        '</div></aside>' +
      '</div>' +
      '<div class="pr-baixo">' +
        '<section class="cartao pr-card" aria-labelledby="pr-h-opt"><h2 id="pr-h-opt">Descadastrados</h2>' +
          '<p class="vazio" style="padding:0 0 .6rem">Quem respondeu SAIR entra aqui e nunca mais recebe, em nenhum disparo. Quando alguém responder SAIR, escreva o e-mail da pessoa abaixo.</p>' +
          '<form class="pr-opt-form" id="pr-opt-form"><input id="pr-opt-email" type="email" placeholder="e-mail de quem pediu para sair" aria-label="E-mail de quem pediu para sair"><button class="btn" type="submit">Adicionar</button></form>' +
          '<div id="pr-opt-lista"></div>' +
        '</section>' +
        '<section class="cartao pr-card" aria-labelledby="pr-h-hist"><h2 id="pr-h-hist">Histórico de envios</h2>' +
          '<div class="barra"><div class="busca"><span class="sr">Buscar por e-mail</span>' + P.icone('busca') + '<input type="search" id="pr-busca" placeholder="Buscar por e-mail, marca ou assunto"></div></div>' +
          '<div id="pr-hist"></div>' +
        '</section>' +
      '</div>' +
      '</div>';
    ligar(raiz);
  }

  function ligar(raiz) {
    carregarRascunho();
    var $$ = function (s) { return $(s, raiz); };
    $$('#pr-assunto').value = est.assunto; $$('#pr-texto').value = est.texto; $$('#pr-html').value = est.html;
    $$('#pr-btn-txt').value = est.btnTxt; $$('#pr-btn-link').value = est.btnLink; $$('#pr-pular').checked = est.pular;

    function mudou() { salvarRascunho(); agendarPrevia(); desenharDestino(); desenharEnvio(); }
    [['#pr-assunto', 'assunto'], ['#pr-texto', 'texto'], ['#pr-html', 'html'], ['#pr-btn-txt', 'btnTxt'], ['#pr-btn-link', 'btnLink']].forEach(function (p) {
      $$(p[0]).addEventListener('input', function (e) { est[p[1]] = e.target.value; mudou(); });
    });
    $$('#pr-pular').addEventListener('change', function (e) { est.pular = e.target.checked; salvarRascunho(); desenharDestino(); desenharEnvio(); });
    $$('#pr-lista').addEventListener('change', function (e) { est.lista = e.target.value; salvarRascunho(); fila = null; filaMsg = ''; desenharFila(); desenharDestino(); desenharEnvio(); agendarPrevia(); });
    $$('#pr-modo').addEventListener('click', function (e) { var b = e.target.closest('[data-modo]'); if (!b) return; est.modo = b.getAttribute('data-modo'); salvarRascunho(); desenharModos(); agendarPrevia(); desenharEnvio(); });
    $$('#pr-envio').addEventListener('click', function (e) { var b = e.target.closest('[data-envio]'); if (!b || ocupado) return; est.envio = b.getAttribute('data-envio'); salvarRascunho(); desenharModos(); });
    $$('#pr-modo-texto .chips-var').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ins]'); if (!b) return;
      var ta = $$('#pr-texto'), txt = '{{' + b.getAttribute('data-ins') + '}}', ini = ta.selectionStart, fim = ta.selectionEnd;
      if (typeof ini !== 'number') { ini = fim = ta.value.length; }
      ta.value = ta.value.slice(0, ini) + txt + ta.value.slice(fim); ta.focus(); ta.setSelectionRange(ini + txt.length, ini + txt.length);
      est.texto = ta.value; mudou();
    });
    $$('#pr-modelo').addEventListener('click', function () {
      function colar() { est.html = htmlSimples(est.texto, est.btnTxt, est.btnLink); $$('#pr-html').value = est.html; mudou(); P.toast('Modelo colado. Agora é só mexer no que quiser.'); }
      if (est.html.trim()) perguntar({ titulo: 'Trocar o HTML que está no campo?', html: '<p>O HTML que você já colou será substituído pelo modelo pronto.</p>', sim: 'Sim, trocar', aoSim: colar });
      else colar();
    });
    $$('#pr-teste').addEventListener('click', enviarTeste);
    $$('#pr-disparar').addEventListener('click', dispararClique);
    $$('#pr-montar-fila').addEventListener('click', montarFila);
    $$('#pr-tela').addEventListener('click', telaCheia);
    $$('#pr-busca').addEventListener('input', function (e) { busca = e.target.value.trim().toLowerCase(); quantosHist = 50; desenharHistorico(); });
    $$('#pr-opt-form').addEventListener('submit', function (e) { e.preventDefault(); adicionarOptout(); });
    $$('#pr-hist').addEventListener('click', function (e) { if (e.target.closest('[data-mais]')) { quantosHist += 50; desenharHistorico(); } });
    $$('#pr-opt-lista').addEventListener('click', function (e) { var b = e.target.closest('[data-tirar]'); if (b) tirarOptout(b.getAttribute('data-tirar')); });
    raiz.addEventListener('click', function (e) { var b = e.target.closest('[data-ir]'); if (b) location.hash = b.getAttribute('data-ir'); });
    montado = true;
  }

  /* ---------- carregar os dados e desenhar tudo ---------- */
  function entrar() {
    return Promise.all([
      P.Dados.listar('marcas', { todas: true, ordem: [['id', true]] }),
      P.Dados.listar('email_envios', { todas: true, ordem: [['criado_em', false], ['id', false]] }),
      P.Dados.listar('email_optout', { todas: true, ordem: [['criado_em', false]] })
    ]).then(function (rs) {
      dados.marcas = rs[0].dados; dados.envios = rs[1].dados; dados.optouts = rs[2].dados;
      lidas.marcas = rs[0].ok; lidas.envios = rs[1].ok; lidas.optout = rs[2].ok;
      desenharTudo();
    });
  }
  function recarregarDados() { return entrar(); }

  function desenharTudo() {
    desenharCapa(); desenharKpis(); desenharVazio(); desenharDestino(); desenharModos(); desenharEnvio(); desenharPrevia(); desenharDescad(); desenharHistorico(); desenharFila();
  }

  function desenharCapa() { var n = numeros().totalOk; $('#pr-total').textContent = n ? P.inteiro(n) : '-'; }

  function desenharKpis() {
    var n = numeros();
    var itens = [
      ['principal', n.comEmail, 'Marcas com e-mail', n.comEmail == null ? '' : (n.emailsUnicos === n.comEmail ? 'na sua base' : n.emailsUnicos + ' e-mails diferentes')],
      ['verde', n.aEnviar, 'A enviar', 'ainda não receberam'],
      ['ambar', n.receberam, 'Já receberam', 'e-mails diferentes'],
      ['azul', n.falhas, 'Falhas', 'para limpar da base'],
      ['vermelho', n.descad, 'Descadastrados', 'nunca mais recebem']
    ];
    $('#pr-kpis').innerHTML = itens.map(function (i) {
      return '<div class="pr-kpi pr-' + i[0] + '"><b>' + traco(i[1]) + '</b><span class="n">' + esc(i[2]) + '</span>' + (i[3] ? '<small>' + esc(i[3]) + '</small>' : '') + '</div>';
    }).join('');
  }

  function desenharVazio() {
    var sem = !lidas.marcas || !marcasReais().some(function (m) { return emailValido(m.email); });
    $('#pr-grade').hidden = sem;
    $('#pr-vazio').innerHTML = sem
      ? '<div class="cartao pr-vazio"><h2>' + (lidas.marcas ? 'A sua base ainda está sem e-mail' : 'Não consegui ler a sua aba Marcas') + '</h2>' +
        '<p class="vazio" style="padding-top:0">' + (lidas.marcas
          ? 'Nenhuma marca da sua base tem e-mail preenchido, então ainda não há para quem mandar. Cadastre os e-mails na aba Marcas (botão Adicionar marca, ou clicando numa marca para editar) e volte aqui.'
          : 'Confira o aviso amarelo lá em cima, recarregue a página e tente de novo.') + '</p>' +
        '<button class="btn" type="button" data-ir="marcas">' + P.icone('marcas') + 'Ir para a aba Marcas</button></div>'
      : '';
  }

  function desenharDestino() {
    if (!montado) return;
    var sel = $('#pr-lista'), sits = situacoesPresentes();
    var opcoes = [
      ['selecionadas', 'Só as marcas selecionadas (' + baseDaLista('selecionadas').filter(function (m) { return emailValido(m.email); }).length + ')'],
      ['teste', 'Só para mim (teste)'],
      ['todas', 'Todas as marcas que têm e-mail (' + contarLista('todas') + ')']
    ].concat(sits.map(function (s) { return ['sit:' + s, 'Só ' + nomeSituacao(s) + ' (' + contarLista('sit:' + s) + ')']; }));
    if (!opcoes.some(function (o) { return o[0] === est.lista; })) est.lista = 'selecionadas';
    sel.innerHTML = opcoes.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === est.lista ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');

    var c = calcular(), linhas = [];
    if (c.chave === 'teste') linhas.push('<b>1</b> e-mail: o seu (' + esc(MEU_EMAIL) + ').');
    else {
      linhas.push('<b>' + c.marcas.length + '</b> ' + (c.marcas.length === 1 ? 'marca com e-mail' : 'marcas com e-mail') + ' nesta lista.');
      if (c.semEmail) linhas.push(P.plural(c.semEmail, 'ficou', 'ficaram') + ' de fora por não ter e-mail.');
      if (c.repetidos) linhas.push(P.plural(c.repetidos, 'e-mail repetido', 'e-mails repetidos') + ' (agência): cada e-mail recebe uma vez só.');
      if (c.descad) linhas.push(P.plural(c.descad, 'descadastrada será pulada', 'descadastradas serão puladas') + '.');
      if (c.jaTem) linhas.push(P.plural(c.jaTem, 'já recebeu este assunto e será pulada', 'já receberam este assunto e serão puladas') + '.');
      linhas.push('Vão receber: <b>' + c.alvo.length + '</b>.');
    }
    $('#pr-resumo-lista').innerHTML = linhas.map(function (l) { return '<div>' + l + '</div>'; }).join('');

    $('#pr-aviso-lista').innerHTML = (c.chave === 'selecionadas' && !c.marcas.length)
      ? '<div class="prop-falta">Você ainda não selecionou nenhuma marca. Escolha na aba Marcas quem vai receber o e-mail. <button type="button" class="btn" data-ir="marcas" style="margin-top:.5rem">Ir para a aba Marcas</button></div>' : '';
  }

  function desenharModos() {
    $('#pr-modo').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-modo') === est.modo)); });
    $('#pr-modo-texto').hidden = est.modo !== 'texto'; $('#pr-modo-html').hidden = est.modo !== 'html';
    $('#pr-envio').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-envio') === est.envio)); });
    $('#pr-envio-resend').hidden = est.envio !== 'resend'; $('#pr-envio-gmail').hidden = est.envio !== 'gmail';
    $('#pr-aviso-sair').innerHTML = htmlSemSair() ? '<div class="prop-falta">O seu HTML não tem a palavra SAIR. Sem o rodapé, quem não quiser mais receber não vai saber como pedir. Acrescente o rodapé antes de disparar.</div>' : '';
  }

  /* ---------- a prévia: uma janela de e-mail dentro de um palco ---------- */
  function agendarPrevia() { clearTimeout(temporizador); temporizador = setTimeout(function () { desenharPrevia(); $('#pr-aviso-sair').innerHTML = htmlSemSair() ? '<div class="prop-falta">O seu HTML não tem a palavra SAIR. Sem o rodapé, quem não quiser mais receber não vai saber como pedir. Acrescente o rodapé antes de disparar.</div>' : ''; }, 150); }
  function corpoDaPrevia(a) {
    var vazio = est.modo === 'html' ? !est.html.trim() : !est.texto.trim();
    if (vazio) return '<p style="font-family:Arial,sans-serif;color:#999;padding:16px">Escreva o texto do e-mail para ver a prévia aqui.</p>';
    var html = trocarChaves(htmlFinal(), a.nome, a.marca, true), base = '<base target="_blank">';
    /* os links da prévia abrem em outra aba; o <base> vai dentro do <head> para não tirar a página do modo correto */
    return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (m) { return m + base; }) : base + html;
  }
  function janelaHtml(a) {
    return '<header class="pr-jan-cab"><span class="pr-avatar" aria-hidden="true">' + esc(MEU_NOME.charAt(0)) + '</span><div class="pr-jan-quem">' +
      '<b class="pr-jan-assunto">' + esc(trocarChaves(est.assunto || '(sem assunto)', a.nome, a.marca, false)) + '</b>' +
      '<div class="pr-jan-de"><b>' + esc(MEU_NOME) + '</b> &lt;' + esc(MEU_EMAIL) + '&gt;</div><div class="pr-jan-para">para você</div></div></header>' +
      '<div class="pr-jan-corpo"><iframe class="pr-quadro" title="Prévia do e-mail" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" scrolling="no"></iframe></div>';
  }
  function preencherQuadro(no, a) {
    var q = no.querySelector('iframe'); if (!q) return;
    q.addEventListener('load', function () {
      try { var h = q.contentDocument.documentElement.scrollHeight; q.style.height = Math.max(160, h) + 'px'; } catch (e) { q.style.height = '480px'; }
    });
    q.srcdoc = corpoDaPrevia(a);
  }
  function desenharPrevia() {
    if (!montado) return;
    var a = amostra(), j = $('#pr-janela');
    j.innerHTML = janelaHtml(a); preencherQuadro(j, a);
    $('#pr-nota').innerHTML = 'Prévia com o nome de <b>' + esc(a.marca) + '</b>' + (a.real ? '' : ' (exemplo)') + '. Antes de disparar, mande o teste para você mesma e abra no celular.';
  }
  function telaCheia() {
    var a = amostra();
    var d = P.abrirModal(P.cabecalhoModal('Como vai chegar') + '<div class="pr-palco pr-palco-cheio"><article class="pr-janela">' + janelaHtml(a) + '</article></div>' +
      '<div class="modal-pe"><button type="button" class="btn" data-fechar>Fechar</button></div>', { largo: true });
    d.classList.add('cheio'); preencherQuadro(d, a);
  }

  /* ---------- janelinha de confirmação ---------- */
  function perguntar(cfg) {
    var d = P.abrirModal(P.cabecalhoModal(cfg.titulo) + '<div class="pr-pergunta">' + cfg.html + '</div>' +
      '<div class="modal-pe"><button type="button" class="btn btn-sec" id="pg-nao" data-fechar>' + esc(cfg.nao || 'Cancelar') + '</button><button type="button" class="btn' + (cfg.perigo ? ' btn-perigo' : '') + '" id="pg-sim">' + esc(cfg.sim || 'Sim') + '</button></div>');
    $('#pg-nao', d).focus();   /* o foco começa em "Cancelar": um Enter sem querer nunca confirma */
    $('#pg-sim', d).addEventListener('click', function () { P.fecharModal(); if (cfg.aoSim) cfg.aoSim(); });
    if (cfg.aoNao) $('#pg-nao', d).addEventListener('click', cfg.aoNao);
  }

  /* ---------- o botão de enviar e as travas ---------- */
  function tabelasProntas() { return lidas.envios && lidas.optout; }
  function testeFeito() { return ler(K_TESTE, true) === hash(est.modo + '|' + est.assunto + '|' + htmlFinal()); }
  function situacaoEnvio() {
    var c = calcular();
    if (ocupado) return { pode: false, teste: false, dica: 'Enviando... não feche esta página.' };
    if (!temConteudo()) return { pode: false, teste: false, dica: 'Escreva o assunto e a mensagem para liberar os botões.' };
    var teste = true;
    if (c.chave !== 'teste' && !tabelasProntas()) return { pode: false, teste: teste, dica: 'Falta rodar o arquivo disparo.sql no Supabase. Sem ele o painel não consegue guardar quem já recebeu. O teste para você já funciona.' };
    if (c.chave === 'selecionadas' && !c.marcas.length) return { pode: false, teste: teste, dica: 'Nenhuma marca selecionada. Escolha na aba Marcas.' };
    if (!c.alvo.length) return { pode: false, teste: teste, dica: 'Ninguém para receber: todas já receberam este assunto ou estão descadastradas.' };
    if (c.chave !== 'teste' && !testeFeito()) return { pode: false, teste: teste, dica: 'Envie o teste para você antes. O disparo só libera depois que o teste deste texto for enviado.' };
    return { pode: true, teste: teste, dica: 'Tudo pronto: vão receber ' + c.alvo.length + '. Você ainda confirma antes de sair.' };
  }
  function desenharEnvio() {
    if (!montado) return;
    var s = situacaoEnvio();
    $('#pr-teste').disabled = !s.teste || ocupado || !temConteudo();
    $('#pr-disparar').disabled = !s.pode;
    $('#pr-montar-fila').disabled = ocupado || !temConteudo() || !calcular().alvo.length;
    $('#pr-dica').textContent = s.dica;
  }

  /* ---------- falar com o carteiro (a função enviar-emails, no Supabase) ---------- */
  function lerErroFuncao(err) {
    var resp = err && err.context;
    function porStatus(st) {
      if (st === 404) return 'O carteiro ainda não foi criado no Supabase (função enviar-emails). Siga o passo a passo para subir a função.';
      if (st === 401) return 'A sua sessão venceu. Saia do painel e entre de novo.';
      if (st === 403) return 'Este login não tem permissão para enviar e-mails.';
      return 'O carteiro não respondeu direito' + (st ? ' (erro ' + st + ')' : '') + '. Tente de novo em instantes.';
    }
    if (resp && typeof resp.json === 'function') {
      return resp.json().then(function (j) { return { ok: false, status: resp.status, erro: (j && j.mensagem) || porStatus(resp.status) }; }, function () { return { ok: false, status: resp.status, erro: porStatus(resp.status) }; });
    }
    return Promise.resolve({ ok: false, erro: 'Não consegui falar com o carteiro. Confira a internet e se a função enviar-emails foi criada no Supabase.' });
  }
  function chamarFuncao(payload) {
    if (!window.banco || !window.banco.functions) return Promise.resolve({ ok: false, erro: 'Sem conexão com o Supabase agora.' });
    return Promise.resolve(window.banco.functions.invoke('enviar-emails', { body: payload })).then(function (r) {
      if (r && r.error) return lerErroFuncao(r.error);
      return { ok: true, dados: (r && r.data) || {} };
    }, function (e) { return lerErroFuncao(e); });
  }
  function textoParada(parou) {
    if (parou === 'chave') return 'O Resend não aceitou a chave. Confira, no painel do Supabase, o segredo RESEND_API_KEY (Edge Functions, Secrets).';
    if (parou === 'dominio') return 'O Resend só entrega para o seu próprio e-mail enquanto você não verificar um domínio seu. Até lá, use o modo Rascunho (Gmail) para as marcas.';
    if (parou === 'tempo') return 'O envio foi pausado para não estourar o tempo. Dispare de novo, com a caixinha de pular quem já recebeu marcada, para continuar.';
    return '';
  }

  /* ---------- teste ---------- */
  function enviarTeste() {
    if (ocupado || !temConteudo()) return;
    var a = amostra(); ocupado = true; desenharEnvio();
    var bt = $('#pr-teste'), antes = bt.innerHTML; bt.textContent = 'Enviando teste...';
    chamarFuncao({ destinatarios: [{ email: MEU_EMAIL, marca: a.marca, nome: a.nome }], assunto: est.assunto.trim(), html: htmlFinal(), teste: true }).then(function (r) {
      ocupado = false; bt.innerHTML = antes;
      var caixa = $('#pr-resultado');
      if (r.ok && r.dados.enviados === 1) {
        guardar(K_TESTE, hash(est.modo + '|' + est.assunto + '|' + htmlFinal()), true);
        caixa.innerHTML = '<div class="pr-ok">' + P.icone('check') + '<span>Teste enviado para <b>' + esc(MEU_EMAIL) + '</b>. Abra no celular e confira se o seu nome e o nome da marca entraram nos lugares certos. Agora o disparo está liberado.</span></div>';
        P.toast('Teste enviado.');
      } else {
        var d = r.ok ? r.dados : {}, motivo = r.ok ? (textoParada(d.parou) || ((d.resultados && d.resultados[0] && d.resultados[0].motivo) || 'O teste não saiu.')) : r.erro;
        caixa.innerHTML = '<div class="prop-falta"><b>O teste não saiu.</b> ' + esc(motivo) + '</div>';
      }
      desenharEnvio();
    });
  }

  /* ---------- disparo ---------- */
  function dispararClique() {
    var s = situacaoEnvio(); if (!s.pode) return;
    var c = calcular(), extras = '';
    if (c.descad) extras += '<li>' + P.plural(c.descad, 'descadastrada vai ser pulada', 'descadastradas vão ser puladas') + '.</li>';
    if (c.jaTem) extras += '<li>' + P.plural(c.jaTem, 'já recebeu este assunto e vai ser pulada', 'já receberam este assunto e vão ser puladas') + '.</li>';
    if (c.repetidos) extras += '<li>' + P.plural(c.repetidos, 'e-mail repetido conta', 'e-mails repetidos contam') + ' uma vez só.</li>';
    var alerta = htmlSemSair() ? '<div class="prop-falta" style="margin-top:.7rem"><b>Atenção:</b> o seu HTML não tem a palavra SAIR. Quem receber não saberá como pedir para sair.</div>' : '';
    perguntar({
      titulo: 'Confirmar o disparo',
      html: '<p class="pr-conf">Vai para <b>' + c.alvo.length + '</b> ' + (c.alvo.length === 1 ? 'marca' : 'marcas') + ', da lista <b>' + esc(c.rotulo) + '</b>, e <b>não dá pra desfazer</b>.</p>' +
        (extras ? '<ul class="pr-conf-lista">' + extras + '</ul>' : '') +
        '<p class="vazio" style="padding:.4rem 0 0">Assunto: ' + esc(trocarChaves(est.assunto, c.alvo[0].nome, c.alvo[0].marca, false)) + '</p>' + alerta,
      sim: htmlSemSair() ? 'Disparar mesmo assim' : 'Sim, disparar', perigo: false,
      aoSim: function () { executarDisparo(c); }
    });
  }

  function mostrarProgresso(feitos, total) {
    $('#pr-progresso').hidden = false;
    $('#pr-prog-barra').style.width = (total ? Math.round(feitos / total * 100) : 0) + '%';
    $('#pr-prog-txt').textContent = feitos + ' de ' + total + ' já processados. Não feche esta página.';
  }
  function marcarComoEnviadas(resultados) {
    var oks = {}; (resultados || []).forEach(function (r) { if (r.status === 'ok') oks[normEmail(r.email)] = true; });
    var ids = [], hoje = P.hojeISO();
    marcasReais().forEach(function (m) { if (oks[normEmail(m.email)]) { ids.push(m.id); m.email_enviado_em = hoje; m.ultimo_contato = hoje; } });
    if (!ids.length) return Promise.resolve();
    return P.Dados.atualizarVarios('marcas', ids, { email_enviado_em: hoje, ultimo_contato: hoje }).then(function (r) {
      if (!r.ok) P.toast('Os e-mails saíram, mas não consegui marcar a data na aba Marcas. ' + (r.texto || ''), 'erro');
    });
  }
  function executarDisparo(c) {
    var alvo = c.alvo.slice(), total = alvo.length, feitos = 0, tot = { enviados: 0, falhas: 0, pulados: 0 };
    var cota = false, parou = '', erro = '', lotes = [], ehTeste = c.chave === 'teste';
    for (var i = 0; i < alvo.length; i += LOTE) lotes.push(alvo.slice(i, i + LOTE));
    ocupado = true; window.onbeforeunload = function () { return 'Um envio está em andamento.'; };
    $('#pr-resultado').innerHTML = ''; mostrarProgresso(0, total); desenharEnvio();

    function lote(k) {
      if (k >= lotes.length) return Promise.resolve();
      return chamarFuncao({
        destinatarios: lotes[k].map(function (u) { return { email: u.email, marca: u.marca, nome: u.nome }; }),
        assunto: est.assunto.trim(), html: htmlFinal(), teste: ehTeste, pular_ja_recebidos: est.pular
      }).then(function (r) {
        if (!r.ok) { erro = r.erro; return; }
        var d = r.dados;
        tot.enviados += d.enviados || 0; tot.falhas += d.falhas || 0; tot.pulados += d.pulados || 0;
        feitos += (d.enviados || 0) + (d.falhas || 0) + (d.pulados || 0);
        return (ehTeste ? Promise.resolve() : marcarComoEnviadas(d.resultados)).then(function () {
          mostrarProgresso(feitos, total);
          if (d.cota_esgotada) { cota = true; return; }
          if (d.parou) { parou = d.parou; return; }
          if (d.interrompido) { parou = 'tempo'; return; }
          return lote(k + 1);
        });
      });
    }
    lote(0).then(function () {
      ocupado = false; window.onbeforeunload = null;
      $('#pr-progresso').hidden = true;
      var faltam = Math.max(0, total - feitos), html = '';
      html += '<div class="pr-resumo-final"><div><b>' + tot.enviados + '</b><span>enviados</span></div><div><b>' + tot.falhas + '</b><span>falhas</span></div><div><b>' + tot.pulados + '</b><span>pulados</span></div></div>';
      if (cota) html += '<div class="prop-falta"><b>A cota diária do Resend acabou.</b> Foram enviados ' + tot.enviados + ' e ficaram faltando ' + faltam + '. Volte amanhã, abra esta aba, cole o mesmo assunto e o mesmo texto e deixe marcada a caixinha "Pular quem já recebeu este mesmo assunto". Assim ele manda só para quem faltou.</div>';
      else if (parou) html += '<div class="prop-falta"><b>O envio parou.</b> ' + esc(textoParada(parou)) + ' Ficaram faltando ' + faltam + '.</div>';
      else if (erro) html += '<div class="prop-falta"><b>O envio foi interrompido.</b> ' + esc(erro) + ' Até aqui: ' + tot.enviados + ' enviados. Para continuar, dispare de novo com a caixinha "Pular quem já recebeu este mesmo assunto" marcada: ele manda só para quem faltou.</div>';
      else if (tot.falhas) html += '<div class="pr-ok">' + P.icone('check') + '<span>Terminou. Os e-mails com erro ficaram registrados no histórico, para você limpar a base depois.</span></div>';
      else html += '<div class="pr-ok">' + P.icone('check') + '<span>Terminou sem nenhum erro.</span></div>';
      $('#pr-resultado').innerHTML = html;
      recarregarDados().then(function () { perguntarLimparSelecao(c); });
    });
  }
  function perguntarLimparSelecao(c) {
    var marcadas = dados.marcas.filter(function (m) { return m.selecionada; });
    if (c.chave !== 'selecionadas' || !marcadas.length) return;
    perguntar({
      titulo: 'Limpar a seleção?', html: '<p>Você tem <b>' + marcadas.length + '</b> ' + (marcadas.length === 1 ? 'marca selecionada' : 'marcas selecionadas') + '. Se for mandar a mesma lista de novo, pode manter. Quer limpar a seleção agora?</p>',
      nao: 'Manter a seleção', sim: 'Limpar a seleção',
      aoSim: function () {
        var ids = marcadas.map(function (m) { return m.id; });
        P.Dados.atualizarVarios('marcas', ids, { selecionada: false }).then(function (r) {
          if (!r.ok) { P.toast(r.texto || 'Não consegui limpar a seleção.', 'erro'); return; }
          marcadas.forEach(function (m) { m.selecionada = false; }); P.toast('Seleção limpa.'); desenharTudo();
        });
      }
    });
  }

  /* ---------- modo rascunho: uma marca por vez, pelo Gmail ---------- */
  function montarFila() {
    if (ocupado || !temConteudo()) return;
    var c = calcular(); if (!c.alvo.length) { P.toast('Ninguém para a fila.', 'erro'); return; }
    fila = { itens: c.alvo.slice(), total: c.alvo.length, feitas: 0, chave: c.chave, rotulo: c.rotulo }; filaMsg = '';
    desenharFila();
  }
  function urlGmail(item, assunto, corpo) {
    return 'https://mail.google.com/mail/u/' + encodeURIComponent(MEU_EMAIL) + '/?view=cm&fs=1&to=' + encodeURIComponent(item.email) + '&su=' + encodeURIComponent(assunto) + '&body=' + encodeURIComponent(corpo);
  }
  function desenharFila() {
    if (!montado) return;
    var alvo = $('#pr-fila');
    if (!fila) { alvo.innerHTML = filaMsg; return; }
    if (!fila.itens.length) {
      filaMsg = '<div class="pr-ok">' + P.icone('check') + '<span>Fila terminada: ' + fila.feitas + ' de ' + fila.total + ' marcadas como enviadas.</span></div>';
      alvo.innerHTML = filaMsg;
      var ultima = fila; fila = null;
      if (ultima.feitas) recarregarDados().then(function () { perguntarLimparSelecao({ chave: ultima.chave }); });
      return;
    }
    var it = fila.itens[0], assunto = trocarChaves(est.assunto, it.nome, it.marca, false), corpo = textoParaMarca(it.nome, it.marca);
    var n = fila.total - fila.itens.length + 1;
    alvo.innerHTML = '<div class="pr-fila-card"><div class="pr-fila-topo"><span class="pil s2">' + n + ' de ' + fila.total + '</span><b>' + esc(it.marca) + '</b><span class="pr-fila-email">' + esc(it.email) + '</span></div>' +
      '<label class="c">Assunto</label><div class="prop-msg prop-assunto-pv">' + esc(assunto) + '</div>' +
      '<label class="c" style="margin-top:.6rem">Texto</label><div class="prop-msg">' + esc(corpo) + '</div>' +
      '<div class="pr-botoes" style="margin-top:.8rem"><button type="button" class="btn btn-sec" data-fila="copiar">' + P.icone('copiar') + 'Copiar o texto</button>' +
      '<a class="btn btn-sec" data-fila="gmail" href="' + esc(urlGmail(it, assunto, corpo)) + '" target="_blank" rel="noopener noreferrer">' + P.icone('email') + 'Abrir no Gmail</a>' +
      '<button type="button" class="btn" data-fila="enviada">' + P.icone('check') + 'Marcar como enviada</button>' +
      (fila.itens.length > 1 ? '<button type="button" class="btn btn-sec" data-fila="pular">Pular por enquanto</button>' : '') + '</div>' +
      '<p class="vazio" style="padding:.5rem 0 0">O Gmail abre já com o destinatário, o assunto e o texto. Envie por lá e volte aqui para marcar como enviada.</p></div>';
  }
  function cliqueFila(e) {
    var b = e.target.closest('[data-fila]'); if (!b || !fila || !fila.itens.length) return;
    var acao = b.getAttribute('data-fila'), it = fila.itens[0];
    if (acao === 'copiar') {
      P.copiarTexto(textoParaMarca(it.nome, it.marca)).then(function (ok) { P.toast(ok ? 'Texto copiado.' : 'Não consegui copiar sozinho. Selecione o texto e use Ctrl+C.', ok ? undefined : 'erro'); });
    } else if (acao === 'pular') { fila.itens.push(fila.itens.shift()); desenharFila(); }
    else if (acao === 'enviada') marcarRascunhoEnviado(it);
  }
  function marcarRascunhoEnviado(it) {
    var chave = fila.chave, assunto = trocarChaves(est.assunto, it.nome, it.marca, false);
    var tarefas = [];
    if (chave !== 'teste') {
      tarefas.push(P.Dados.inserir('email_envios', { email: it.email, marca: it.marca, assunto: assunto, status: 'ok', erro: '', resend_id: 'gmail' }));
      tarefas.push(marcarComoEnviadas([{ email: it.email, status: 'ok' }]));
    }
    Promise.all(tarefas).then(function (rs) {
      if (rs[0] && rs[0].ok === false) P.toast('Marquei na fila, mas não consegui anotar no registro. ' + (rs[0].texto || ''), 'erro');
      fila.itens.shift(); fila.feitas++;
      if (chave !== 'teste' && rs[0] && rs[0].ok) dados.envios.unshift({ email: it.email, marca: it.marca, assunto: assunto, status: 'ok', erro: '', resend_id: 'gmail', criado_em: new Date().toISOString() });
      desenharFila(); desenharCapa(); desenharKpis(); desenharDestino(); desenharHistorico(); desenharEnvio(); agendarPrevia();
    });
  }

  /* ---------- descadastrados ---------- */
  function desenharDescad() {
    var alvo = $('#pr-opt-lista'); if (!alvo) return;
    if (!lidas.optout) { alvo.innerHTML = '<p class="vazio">A tabela de descadastro ainda não existe. Rode o disparo.sql no Supabase.</p>'; return; }
    if (!dados.optouts.length) { alvo.innerHTML = '<p class="vazio">Ninguém pediu para sair ainda.</p>'; return; }
    alvo.innerHTML = '<ul class="pr-chips">' + dados.optouts.map(function (o) {
      return '<li><span>' + esc(o.email) + '</span><button type="button" class="ib" data-tirar="' + esc(o.email) + '" aria-label="Tirar ' + esc(o.email) + ' da lista de descadastro" title="Tirar da lista">' + P.icone('x') + '</button></li>';
    }).join('') + '</ul>';
  }
  function adicionarOptout() {
    var campo = $('#pr-opt-email'), e = normEmail(campo.value);
    if (!emailValido(e)) { P.toast('Escreva um e-mail válido.', 'erro'); campo.focus(); return; }
    if (dados.optouts.some(function (o) { return normEmail(o.email) === e; })) { P.toast('Esse e-mail já está na lista.'); campo.value = ''; return; }
    P.Dados.inserir('email_optout', { email: e }).then(function (r) {
      if (!r.ok) { P.toast(r.texto || 'Não consegui adicionar.', 'erro'); return; }
      dados.optouts.unshift({ email: e, criado_em: new Date().toISOString() }); lidas.optout = true; campo.value = '';
      P.toast('Pronto: esse e-mail nunca mais recebe.'); desenharDescad(); desenharKpis(); desenharDestino(); desenharEnvio();
    });
  }
  function tirarOptout(email) {
    perguntar({
      titulo: 'Tirar da lista de descadastro?', html: '<p><b>' + esc(email) + '</b> voltará a poder receber os seus e-mails. Só faça isso se a própria pessoa pediu para voltar.</p>',
      sim: 'Sim, tirar', perigo: true,
      aoSim: function () {
        P.Dados.apagarPor('email_optout', 'email', email).then(function (r) {
          if (!r.ok) { P.toast(r.texto || 'Não consegui tirar.', 'erro'); return; }
          dados.optouts = dados.optouts.filter(function (o) { return normEmail(o.email) !== normEmail(email); });
          P.toast('Tirado da lista.'); desenharDescad(); desenharKpis(); desenharDestino(); desenharEnvio();
        });
      }
    });
  }

  /* ---------- histórico ---------- */
  function desenharHistorico() {
    var alvo = $('#pr-hist'); if (!alvo) return;
    if (!lidas.envios) { alvo.innerHTML = '<p class="vazio">A tabela de registro ainda não existe. Rode o disparo.sql no Supabase.</p>'; return; }
    if (!dados.envios.length) { alvo.innerHTML = '<p class="vazio">Nenhum e-mail enviado ainda. Quando você enviar, cada destinatário aparece aqui.</p>'; return; }
    var lista = dados.envios.filter(function (e) { return !busca || [e.email, e.marca, e.assunto].join(' ').toLowerCase().indexOf(busca) >= 0; });
    if (!lista.length) { alvo.innerHTML = '<p class="vazio">Nada encontrado com essa busca.</p>'; return; }
    var parte = lista.slice(0, quantosHist);
    alvo.innerHTML = '<div class="tabela-caixa" style="box-shadow:none;margin-bottom:.5rem"><table><caption class="sr">Histórico de envios</caption><thead><tr><th>Para quem</th><th>Assunto</th><th>Quando</th><th>Situação</th></tr></thead><tbody>' +
      parte.map(function (e) {
        return '<tr><td>' + (e.marca ? '<b style="font-weight:500">' + esc(e.marca) + '</b><br>' : '') + '<span class="pr-mini">' + esc(e.email) + '</span></td>' +
          '<td style="max-width:260px;overflow-wrap:anywhere">' + esc(e.assunto) + '</td><td style="white-space:nowrap">' + esc(dataHora(e.criado_em)) + '</td>' +
          '<td>' + (e.status === 'ok' ? '<span class="pil p-cliente">enviado</span>' + (e.resend_id === 'gmail' ? ' <span class="pr-mini">Gmail</span>' : '') : '<span class="pil et-vermelha" style="margin:0">erro</span><br><span class="pr-mini">' + esc(e.erro) + '</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="vazio" style="padding:0">' + P.plural(lista.length, 'registro', 'registros') + (lista.length > parte.length ? '. ' : '.') + '</p>' +
      (lista.length > parte.length ? '<button type="button" class="btn btn-sec" data-mais="1">Mostrar mais</button>' : '');
  }

  P.registrar('prospeccao', {
    titulo: 'Prospecção',
    montar: function (raiz) { montar(raiz); raiz.addEventListener('click', cliqueFila); },
    entrar: entrar
  });
})();
