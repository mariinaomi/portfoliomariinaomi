/* =====================================================================
   nucleo.js: as peças que todas as abas do painel usam.
   Ícones, datas, acesso ao banco (com avisos amigáveis), janelas, menu.
   Regra de ouro: se algo falhar, o painel AVISA e continua funcionando.
   ===================================================================== */
window.Painel = (function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- números e datas (nunca devolvem NaN) ---------- */
  function num(x) { var n = typeof x === 'number' ? x : parseFloat(String(x == null ? '' : x).replace(',', '.')); return isFinite(n) ? n : 0; }
  function moeda(n) { return num(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function inteiro(n) { return Math.round(num(n)).toLocaleString('pt-BR'); }
  function doisDig(n) { return (n < 10 ? '0' : '') + n; }
  function paraISO(d) { return d.getFullYear() + '-' + doisDig(d.getMonth() + 1) + '-' + doisDig(d.getDate()); }
  function deISO(s) { var p = String(s || '').slice(0, 10).split('-'); if (p.length !== 3) return null; var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d.getTime()) ? null : d; }
  function hojeISO() { return paraISO(new Date()); }
  function dataBR(s) { var d = deISO(s); return d ? doisDig(d.getDate()) + '/' + doisDig(d.getMonth() + 1) + '/' + d.getFullYear() : ''; }
  function somarDias(iso, n) { var d = deISO(iso); if (!d) return ''; d.setDate(d.getDate() + n); return paraISO(d); }
  /* dias de "a" até "b" (positivo se b é depois de a) */
  function diasEntre(a, b) { var x = deISO(a), y = deISO(b); return (x && y) ? Math.round((y - x) / 86400000) : 0; }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  /* ---------- ícones de traço ---------- */
  var ICONES = {
    portfolio: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 9.5 5 2.5-5 2.5z"/>',
    fotos: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-9 9"/>',
    marcas: '<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-5h6v5"/><path d="M4 20h16"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    campanhas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    checklist: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
    sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    olhoOff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4"/><path d="M6.6 6.7C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    lixo: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    alca: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    baixar: '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
    estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    whats: '<path d="M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6L4 20z"/><path d="M9 9.5c.3 2.3 2.2 4.2 4.5 4.6l1.2-1.2-1.8-.9-.7.6a3.5 3.5 0 0 1-1.6-1.6l.6-.7-.9-1.8L9 9.5z"/>',
    insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".9" fill="currentColor"/>',
    esq: '<path d="m15 5-7 7 7 7"/>',
    dir: '<path d="m9 5 7 7-7 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    propostas: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    copiar: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    duplicar: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    prospeccao: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    enviar: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m21 3-10.5 10"/>',
    tela: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
  };
  function icone(n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[n] || '') + '</svg>'; }

  /* ---------- avisos do sistema (quando falta tabela ou campo) ---------- */
  var avisosAtivos = {};
  function avisar(chave, titulo, detalhe) {
    avisosAtivos[chave] = { t: titulo, d: detalhe || '' };
    desenharAvisos();
  }
  function desenharAvisos() {
    var caixa = $('#avisos'); if (!caixa) return;
    caixa.innerHTML = Object.keys(avisosAtivos).map(function (k) {
      var a = avisosAtivos[k];
      return '<div class="aviso"><b>' + esc(a.t) + '</b>' + (a.d ? '<small>' + esc(a.d) + '</small>' : '') + '</div>';
    }).join('');
  }

  /* Cada tabela nasce de um arquivo .sql: as mais novas têm o seu próprio arquivo. */
  var ARQUIVO_SQL = { fotos: 'fotos.sql', propostas: 'propostas.sql', email_envios: 'disparo.sql', email_optout: 'disparo.sql' };
  function arquivoSql(tabela) { return ARQUIVO_SQL[tabela] || 'banco.sql'; }

  /* Várias tabelas faltando viram UM aviso só, em vez de um cartão para cada tabela. */
  var tabelasFaltando = {};
  function avisarErro(tabela, info) {
    if (info.tipo === 'tabela') {
      tabelasFaltando[tabela] = true;
      var nomes = Object.keys(tabelasFaltando), arquivos = [];
      nomes.forEach(function (n) { var a = arquivoSql(n); if (arquivos.indexOf(a) < 0) arquivos.push(a); });
      avisar('tabelas-faltando',
        nomes.length === 1 ? 'Falta a tabela "' + nomes[0] + '" no banco.' : 'Faltam ' + nomes.length + ' tabelas no banco: ' + nomes.join(', ') + '.',
        'Abra o Supabase, vá em SQL Editor e rode ' + (arquivos.length === 1 ? 'o arquivo ' + arquivos[0] + (arquivos[0] === 'banco.sql' ? ' inteiro' : '') : 'estes arquivos, um de cada vez: ' + arquivos.join(', ')) + '. Depois recarregue esta página. O resto do painel continua funcionando.');
    } else avisar(tabela + ':' + info.tipo, info.t, info.d);
  }

  /* Transforma o erro do Supabase em uma frase clara e diz o que fazer. */
  function entenderErro(e, tabela) {
    var cod = String((e && e.code) || ''), msg = String((e && e.message) || '');
    var baixa = msg.toLowerCase();
    if (cod === '42P01' || cod === 'PGRST205' || /could not find the table|relation .* does not exist/.test(baixa)) {
      return { tipo: 'tabela', t: 'Não encontrei a tabela "' + tabela + '" no banco.', d: 'Abra o Supabase, vá em SQL Editor e rode o arquivo ' + arquivoSql(tabela) + '. O resto do painel continua funcionando.' };
    }
    if (cod === '42703' || cod === 'PGRST204' || /column .* does not exist|could not find the .* column/.test(baixa)) {
      var arq = /selecionada|email_enviado_em/.test(baixa) ? 'disparo.sql' : 'banco.sql';
      return { tipo: 'coluna', t: 'Falta um campo na tabela "' + tabela + '".', d: 'Rode o ' + arq + (arq === 'banco.sql' ? ' de novo' : '') + ' no Supabase para criar o que falta. Detalhe: ' + msg };
    }
    if (cod === '42501' || /permission denied|row-level security|violates row/.test(baixa)) {
      return { tipo: 'permissao', t: 'O banco não deixou acessar "' + tabela + '".', d: 'Confira se você entrou com o e-mail certo e se o banco.sql foi rodado por inteiro.' };
    }
    if (/failed to fetch|networkerror|load failed/.test(baixa)) {
      return { tipo: 'rede', t: 'Sem conexão com o banco agora.', d: 'Confira a internet e recarregue a página.' };
    }
    return { tipo: 'outro', t: 'Algo deu errado com "' + tabela + '".', d: msg };
  }

  /* ---------- acesso ao banco ---------- */
  var Dados = {
    /* Lê uma tabela. Se falhar, avisa e devolve lista vazia (o painel nunca abre em branco). */
    listar: function (tabela, opc) {
      opc = opc || {};
      if (!window.banco) { avisar('sem-banco', 'Não consegui conectar ao banco.', 'Confira a internet e recarregue a página.'); return Promise.resolve({ dados: [], ok: false }); }
      function montar(comOrdem) {
        var q = window.banco.from(tabela).select('*');
        (opc.filtros || []).forEach(function (f) { q = q[f[0]](f[1], f[2]); });
        if (comOrdem) (opc.ordem || []).forEach(function (o) { q = q.order(o[0], { ascending: o[1] !== false }); });
        return q;
      }
      /* Lê de 1000 em 1000 quando pedir "todas" (o banco entrega no máximo 1000 por vez). */
      function buscar(comOrdem) {
        if (!opc.todas) return Promise.resolve(montar(comOrdem));
        var juntas = [];
        function pagina(n) {
          return Promise.resolve(montar(comOrdem).range(n * 1000, n * 1000 + 999)).then(function (r) {
            if (r.error) return r;
            juntas = juntas.concat(r.data || []);
            if ((r.data || []).length < 1000 || n >= 29) return { data: juntas, error: null };
            return pagina(n + 1);
          });
        }
        return pagina(0);
      }
      return buscar(true).then(function (r) {
        if (r.error) {
          var info = entenderErro(r.error, tabela);
          if (info.tipo === 'coluna' && (opc.ordem || []).length) {
            /* Falta a coluna usada para ordenar: tenta de novo sem ordenar. */
            return buscar(false).then(function (r2) {
              if (r2.error) { avisarErro(tabela, info); return { dados: [], ok: false }; }
              avisar(tabela + ':coluna', info.t, info.d);
              return { dados: r2.data || [], ok: true };
            });
          }
          avisarErro(tabela, info);
          return { dados: [], ok: false };
        }
        return { dados: r.data || [], ok: true };
      }).catch(function (e) {
        var info = entenderErro(e, tabela); avisarErro(tabela, info);
        return { dados: [], ok: false };
      });
    },
    inserir: function (tabela, obj) {
      return Dados._escrever(tabela, function () { return window.banco.from(tabela).insert(obj).select(); });
    },
    atualizar: function (tabela, id, obj) {
      return Dados._escrever(tabela, function () { return window.banco.from(tabela).update(obj).eq('id', id).select(); });
    },
    apagar: function (tabela, id) {
      return Dados._escrever(tabela, function () { return window.banco.from(tabela).delete().eq('id', id).select(); });
    },
    /* Muda o mesmo campo em várias linhas de uma vez (de 200 em 200, para o pedido não ficar gigante). */
    atualizarVarios: function (tabela, ids, obj) {
      var partes = [];
      for (var i = 0; i < ids.length; i += 200) partes.push(ids.slice(i, i + 200));
      if (!partes.length) return Promise.resolve({ ok: true, dados: [] });
      return partes.reduce(function (cadeia, parte) {
        return cadeia.then(function (r) {
          if (!r.ok) return r;
          return Dados._escrever(tabela, function () { return window.banco.from(tabela).update(obj).in('id', parte).select('id'); });
        });
      }, Promise.resolve({ ok: true, dados: [] }));
    },
    /* Apaga uma linha pela chave dela (usado na lista de descadastro, onde a chave é o e-mail). */
    apagarPor: function (tabela, coluna, valor) {
      return Dados._escrever(tabela, function () { return window.banco.from(tabela).delete().eq(coluna, valor).select(); });
    },
    _escrever: function (tabela, fazer) {
      if (!window.banco) return Promise.resolve({ ok: false, texto: 'Sem conexão com o banco.' });
      return Promise.resolve(fazer()).then(function (r) {
        if (r.error) { var i = entenderErro(r.error, tabela); if (i.tipo !== 'outro') avisarErro(tabela, i); return { ok: false, texto: i.t + ' ' + i.d }; }
        return { ok: true, dados: r.data || [] };
      }).catch(function (e) { var i = entenderErro(e, tabela); return { ok: false, texto: i.t + ' ' + i.d }; });
    }
  };

  /* ---------- aviso rápido ---------- */
  function toast(msg, tipo) {
    var c = $('#toasts'); if (!c) return;
    var el = document.createElement('div'); el.className = 'toast' + (tipo === 'erro' ? ' erro' : ''); el.textContent = msg;
    c.appendChild(el); setTimeout(function () { el.remove(); }, tipo === 'erro' ? 6000 : 3200);
  }

  /* ---------- janela (modal) ---------- */
  var dlg = null;
  function abrirModal(html, opc) {
    dlg = $('#modal'); opc = opc || {};
    dlg.className = 'modal' + (opc.largo ? ' largo' : '');
    dlg.innerHTML = '<div class="modal-in">' + html + '</div>';
    if (!dlg.open) dlg.showModal();
    return dlg;
  }
  function fecharModal() { var d = $('#modal'); if (d && d.open) d.close(); }
  function cabecalhoModal(titulo) {
    return '<div class="modal-cab"><h2 id="modal-titulo">' + esc(titulo) + '</h2><button type="button" class="ib" data-fechar aria-label="Fechar">' + icone('x') + '</button></div>';
  }

  /* Formulário genérico. campos: [{nome, rotulo, tipo, opcoes, obrigatorio, dica, largura}] */
  function formulario(cfg) {
    var v = cfg.valores || {};
    var html = cabecalhoModal(cfg.titulo) + '<form id="form-modal" novalidate>';
    var abertoGrade = false;
    cfg.campos.forEach(function (c) {
      var meia = c.meia && !abertoGrade;
      var id = 'f-' + c.nome, val = v[c.nome] == null ? '' : v[c.nome], campo = '';
      if (c.tipo === 'select') {
        campo = '<select id="' + id + '" name="' + c.nome + '">' + c.opcoes.map(function (o) {
          var ov = typeof o === 'string' ? o : o.v, ot = typeof o === 'string' ? o : o.t;
          return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ot) + '</option>';
        }).join('') + '</select>';
      } else if (c.tipo === 'textarea') {
        campo = '<textarea id="' + id + '" name="' + c.nome + '">' + esc(val) + '</textarea>';
      } else if (c.tipo === 'checkbox') {
        campo = '<label style="display:flex;gap:.5rem;align-items:center;font-size:13.5px"><input type="checkbox" id="' + id + '" name="' + c.nome + '" style="width:18px;height:18px"' + (val ? ' checked' : '') + '> ' + esc(c.rotulo) + '</label>';
      } else if (c.tipo === 'file') {
        campo = '<input id="' + id + '" name="' + c.nome + '" type="file" accept="image/jpeg,image/png,image/webp,image/*">' + (c.dica ? '<p class="vazio" style="padding:.3rem 0 0">' + esc(c.dica) + '</p>' : '') + '<div class="previa" id="prev-' + c.nome + '" hidden></div>';
      } else {
        campo = '<input id="' + id + '" name="' + c.nome + '" type="' + (c.tipo || 'text') + '" value="' + esc(val) + '"' + (c.tipo === 'number' ? ' step="' + (c.passo || '1') + '" min="0" inputmode="decimal"' : '') + (c.dica ? ' placeholder="' + esc(c.dica) + '"' : '') + '>';
      }
      var bloco = '<div class="campo">' + (c.tipo === 'checkbox' ? '' : '<label class="c" for="' + id + '">' + esc(c.rotulo) + (c.obrigatorio ? ' *' : '') + '</label>') + campo + '</div>';
      if (c.meia) { html += (abertoGrade ? '' : '<div class="grade2">') + bloco; if (abertoGrade) { html += '</div>'; abertoGrade = false; } else abertoGrade = true; }
      else { if (abertoGrade) { html += '</div>'; abertoGrade = false; } html += bloco; }
    });
    if (abertoGrade) html += '</div>';
    html += '<p class="msg-erro" id="msg-modal" role="alert" hidden></p>' +
      '<div class="modal-pe" id="pe-modal">' +
      (cfg.apagar ? '<button type="button" class="btn btn-perigo esq" id="bt-apagar">Apagar</button>' : '') +
      '<button type="button" class="btn btn-sec" data-fechar>Cancelar</button>' +
      '<button type="submit" class="btn" id="bt-salvar">Salvar</button></div></form>';
    var d = abrirModal(html);
    var form = $('#form-modal', d), msg = $('#msg-modal', d);
    function erro(t) { msg.textContent = t; msg.hidden = !t; }
    var primeiro = form.querySelector('input,select,textarea'); if (primeiro) primeiro.focus();
    if (cfg.aoAbrir) cfg.aoAbrir(d);

    form.addEventListener('submit', function (e) {
      e.preventDefault(); erro('');
      var out = {}, falta = null;
      cfg.campos.forEach(function (c) {
        var el = form.elements[c.nome]; if (!el) return;
        var x = c.tipo === 'file' ? ((el.files && el.files[0]) || null) : c.tipo === 'checkbox' ? el.checked : (c.tipo === 'number' ? (el.value === '' ? 0 : num(el.value)) : el.value.trim());
        out[c.nome] = x;
        if (c.obrigatorio && (x === '' || x == null) && !falta) falta = c;
      });
      if (falta) { erro('Preencha: ' + falta.rotulo + '.'); form.elements[falta.nome].focus(); return; }
      var bt = $('#bt-salvar', d), rotuloAntes = bt.textContent; bt.disabled = true; bt.textContent = cfg.rotuloSalvando || 'Salvando...';
      Promise.resolve(cfg.salvar(out)).then(function (r) {
        bt.disabled = false; bt.textContent = rotuloAntes;
        if (r && r.ok === false) { erro(r.texto || 'Não consegui salvar.'); return; }
        fecharModal(); toast(cfg.msgOk || 'Salvo.'); if (cfg.aoSalvar) cfg.aoSalvar();
      });
    });
    if (cfg.apagar) {
      $('#bt-apagar', d).addEventListener('click', function () {
        var pe = $('#pe-modal', d);
        pe.innerHTML = '<span class="esq" style="margin-right:auto;font-weight:400">Apagar de verdade? Não dá para desfazer.</span>' +
          '<button type="button" class="btn btn-sec" id="bt-nao">Voltar</button><button type="button" class="btn btn-perigo" id="bt-sim">Sim, apagar</button>';
        $('#bt-nao', d).addEventListener('click', function () { fecharModal(); if (cfg.reabrir) cfg.reabrir(); });
        $('#bt-sim', d).addEventListener('click', function () {
          Promise.resolve(cfg.apagar()).then(function (r) {
            if (r && r.ok === false) { erro(r.texto || 'Não consegui apagar.'); return; }
            fecharModal(); toast('Apagado.'); if (cfg.aoSalvar) cfg.aoSalvar();
          });
        });
      });
    }
    return d;
  }

  /* ---------- copiar para a área de transferência (com plano B para navegadores mais antigos) ---------- */
  function copiarTexto(t) {
    t = String(t == null ? '' : t);
    function plano() {
      var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', '');
      a.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      var m = document.getElementById('modal');
      (m && m.open ? m : document.body).appendChild(a);
      a.select(); a.setSelectionRange(0, t.length);
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      a.remove(); return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return plano(); });
    }
    return Promise.resolve(plano());
  }

  /* ---------- CSV que abre certinho no Excel (com acento) ---------- */
  function baixarCSV(nome, cabecalho, linhas) {
    function cel(x) { var s = String(x == null ? '' : x); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
    var txt = [cabecalho].concat(linhas).map(function (l) { return l.map(cel).join(';'); }).join('\r\n');
    var blob = new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- teste da tranca: age como um visitante sem login ---------- */
  function testarTranca() {
    abrirModal(cabecalhoModal('Testar a tranca de segurança') + '<p class="vazio" id="tr-corpo">Testando como se eu fosse um visitante sem login...</p>');
    if (!window.supabase || !window.BANCO_URL) { $('#tr-corpo').textContent = 'Não consegui carregar o Supabase para testar.'; return; }
    var anon = window.supabase.createClient(window.BANCO_URL, window.BANCO_CHAVE, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'teste-visitante' } });
    var tabelas = ['videos', 'fotos', 'marcas', 'calendario', 'campanhas', 'marcados', 'visitas', 'propostas', 'email_envios', 'email_optout'];
    Promise.all(tabelas.map(function (t) {
      return Promise.resolve(anon.from(t).select('*').limit(1)).then(function (r) {
        if (r.error) {
          var cod = String(r.error.code || '');
          /* Tabela inexistente NÃO conta como trancada: ainda não há o que proteger. */
          if (cod === 'PGRST205' || cod === '42P01') return { t: t, estado: 'falta', txt: 'esta tabela ainda não existe no banco. Rode o ' + arquivoSql(t) + '.' };
          return { t: t, estado: 'ok', txt: 'trancada (o banco recusou a leitura)' };
        }
        if (!r.data || !r.data.length) return { t: t, estado: 'ok', txt: 'trancada (nenhuma linha voltou)' };
        return { t: t, estado: 'aberta', txt: 'ABERTA: um visitante conseguiu ler. Rode o banco.sql de novo.' };
      }).catch(function () { return { t: t, estado: 'falta', txt: 'não consegui testar (sem conexão?)' }; });
    })).then(function (rs) {
      var abertas = rs.filter(function (r) { return r.estado === 'aberta'; }).length;
      var faltam = rs.filter(function (r) { return r.estado === 'falta'; }).length;
      var resumo = abertas ? 'Atenção: alguma tabela está aberta.'
        : faltam ? 'Ainda não dá para garantir a tranca: faltam tabelas no banco. Rode o banco.sql e teste de novo.'
        : 'Tudo certo: nenhuma tabela pode ser lida por quem está de fora.';
      var pilula = { ok: ['p-cliente', 'ok'], aberta: ['et-vermelha', 'aberta'], falta: ['s2', 'falta'] };
      $('#tr-corpo').outerHTML = '<p style="margin-bottom:.7rem;font-weight:400">' + resumo + '</p>' +
        '<ul class="dia-lista">' + rs.map(function (r) {
          return '<li><span class="tx"><b style="font-weight:500">' + r.t + '</b>: ' + esc(r.txt) + '</span><span class="pil ' + pilula[r.estado][0] + '">' + pilula[r.estado][1] + '</span></li>';
        }).join('') + '</ul>' +
        '<p class="vazio">Só as marcas e as visitas aceitam ENVIO de quem está de fora (formulário e contagem de visitas). Ler, só você.</p>' +
        '<div class="modal-pe"><button class="btn" data-fechar>Fechar</button></div>';
    });
  }
  /* ---------- abas e menu ---------- */
  var abas = {}, atual = null;
  function registrar(id, def) { abas[id] = def; def._montada = false; }

  function ativar(id) {
    if (!abas[id]) id = 'portfolio';
    atual = id;
    /* Todas as seções da página, sem lista fixa: uma aba nova nunca fica escondida por esquecimento. */
    $$('.aba').forEach(function (sec) { sec.classList.toggle('ativa', sec.id === 'aba-' + id); });
    $$('.lat-nav a').forEach(function (a) {
      if (a.getAttribute('data-aba') === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var def = abas[id];
    $('#titulo-aba').textContent = def.titulo;
    document.title = def.titulo + ' | Painel';
    $('#acoes-aba').innerHTML = '';
    (def.acoes || []).forEach(function (ac) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.innerHTML = icone('mais') + esc(ac.rotulo);
      b.addEventListener('click', ac.aoClicar); $('#acoes-aba').appendChild(b);
    });
    var raiz = $('#aba-' + id);
    try {
      if (!def._montada) { def.montar(raiz); def._montada = true; }
      Promise.resolve(def.entrar && def.entrar(raiz)).catch(function (e) { falhaAba(raiz, e); });
    } catch (e) { falhaAba(raiz, e); }
    fecharGaveta(); window.scrollTo(0, 0);
  }
  function falhaAba(raiz, e) {
    if (window.console) console.error(e);
    avisar('erro-aba:' + atual, 'Esta aba teve um problema e não abriu por completo.', 'Recarregue a página. Se continuar, me avise. Detalhe: ' + (e && e.message ? e.message : e));
  }
  function recarregar() { var def = abas[atual]; if (def && def.entrar) return Promise.resolve(def.entrar($('#aba-' + atual))); }

  function abrirGaveta(sim) {
    document.body.classList.toggle('gaveta-aberta', sim);
    var b = $('#btn-gaveta'); if (b) { b.setAttribute('aria-expanded', sim ? 'true' : 'false'); b.setAttribute('aria-label', sim ? 'Fechar menu' : 'Abrir menu'); }
  }
  function fecharGaveta() { abrirGaveta(false); }

  /* Confere logo ao abrir se as 6 tabelas existem, para o aviso aparecer completo e uma vez só. */
  function verificarTabelas() {
    if (!window.banco) return;
    ['videos', 'fotos', 'marcas', 'calendario', 'campanhas', 'marcados', 'visitas', 'propostas', 'email_envios', 'email_optout'].forEach(function (t) {
      Promise.resolve(window.banco.from(t).select('*').limit(1)).then(function (r) {
        if (r && r.error) { var info = entenderErro(r.error, t); if (info.tipo === 'tabela') avisarErro(t, info); }
      }).catch(function () { /* sem conexão: os avisos normais cuidam disso */ });
    });
  }

  function iniciar() {
    $$('[data-i]').forEach(function (el) { el.innerHTML = icone(el.getAttribute('data-i')); });
    document.addEventListener('click', function (e) {
      var f = e.target.closest('[data-fechar]'); if (f) { fecharModal(); return; }
      if (e.target === $('#modal')) fecharModal(); /* clique no fundo escuro */
    });
    $('#btn-gaveta').addEventListener('click', function () { abrirGaveta(!document.body.classList.contains('gaveta-aberta')); });
    $('#fundo-gaveta').addEventListener('click', fecharGaveta);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharGaveta(); });
    $('#btn-tranca').addEventListener('click', testarTranca);
    $('#btn-sair').addEventListener('click', function () {
      Promise.resolve(window.banco && window.banco.auth.signOut()).then(function () { location.replace('../login/'); }, function () { location.replace('../login/'); });
    });
    window.addEventListener('hashchange', function () { ativar((location.hash || '').slice(1)); });

    window.PRONTO.then(function (sessao) {
      if (window.SEM_BANCO) avisar('sem-banco', 'Não consegui carregar o Supabase.', 'Confira a sua internet e recarregue a página.');
      $('#meu-email').textContent = (sessao && sessao.user && sessao.user.email) || '';
      verificarTabelas();
      ativar((location.hash || '').slice(1) || 'portfolio');
    });
  }

  return {
    $: $, $$: $$, esc: esc, num: num, moeda: moeda, inteiro: inteiro, plural: plural,
    hojeISO: hojeISO, dataBR: dataBR, deISO: deISO, paraISO: paraISO, somarDias: somarDias, diasEntre: diasEntre,
    icone: icone, avisar: avisar, Dados: Dados, toast: toast,
    abrirModal: abrirModal, fecharModal: fecharModal, cabecalhoModal: cabecalhoModal, formulario: formulario,
    baixarCSV: baixarCSV, copiarTexto: copiarTexto, registrar: registrar, recarregar: recarregar, iniciar: iniciar
  };
})();
