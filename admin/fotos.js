/* =====================================================================
   fotos.js: aba "Fotos". Adicionar, editar, apagar, esconder e reordenar
   as fotos que aparecem na seção "Fotos de produto" do seu portfólio.
   A imagem é reduzida aqui mesmo e guardada no Storage do Supabase.
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Painel; if (!P) return;
  var esc = P.esc, $ = P.$;

  /* Lista provisória até a aba carregar a de verdade (ver entrar()), para o formulário nunca abrir sem opções. */
  var NICHOS = ['beleza', 'skincare', 'moda', 'comida', 'casa e decoração', 'fitness', 'pet', 'tech'];
  /* formato = a moldura em que a foto aparece no site */
  var FORMATOS = [['foto 4:5', 4 / 5], ['foto 1:1', 1], ['foto 3:4', 3 / 4], ['foto 2:3', 2 / 3], ['foto 9:16', 9 / 16], ['foto 16:9', 16 / 9], ['foto 3:2', 3 / 2]];
  var BUCKET = 'fotos', MAX_LADO = 1600, QUALIDADE = 0.86;
  var fotos = [];

  function montar(raiz) {
    raiz.innerHTML =
      '<div class="barra"><p class="vazio" style="flex:1;padding:0;min-width:240px">As fotos com o olhinho aberto aparecem sozinhas na seção "Fotos de produto" do seu portfólio, na ordem daqui. Arraste pela alcinha para mudar a ordem. Enquanto não houver nenhuma foto aqui, o site mostra os espaços de exemplo.</p>' +
        '<button class="btn" type="button" id="ft-novo">' + P.icone('mais') + 'Adicionar foto</button></div>' +
      '<div id="ft-lista"></div>';
    $('#ft-novo', raiz).addEventListener('click', function () { editar(null); });
  }

  function entrar() {
    return Promise.all([
      P.Dados.listar('fotos', { ordem: [['ordem', true], ['id', true]] }),
      P.listarNichos()
    ]).then(function (r) { fotos = r[0].dados; NICHOS = r[1]; desenhar(); });
  }

  function razao(formato) { var m = /(\d+):(\d+)/.exec(formato || ''); return m ? (+m[1] / +m[2]) : 0.8; }

  function desenhar() {
    var alvo = $('#ft-lista');
    if (!fotos.length) { alvo.innerHTML = '<div class="cartao"><p class="vazio">Nenhuma foto ainda. Clique em "Adicionar foto" e escolha uma imagem do seu computador ou celular.</p></div>'; return; }
    alvo.innerHTML = '<div class="tabela-caixa"><table><caption class="sr">Minhas fotos, em ordem de aparição no site</caption><thead><tr>' +
      '<th style="width:34px"></th><th style="width:84px">Foto</th><th>Título</th><th>Marca</th><th>Nicho</th><th>Formato</th><th class="acoes">Ações</th></tr></thead><tbody id="ft-corpo">' +
      fotos.map(function (f) {
        var img = f.imagem ? '<img class="mini" src="' + esc(f.imagem) + '" alt="" loading="lazy" style="aspect-ratio:' + razao(f.formato) + '">' : '<span class="mini vaz" title="Sem imagem ainda">sem foto</span>';
        return '<tr data-id="' + f.id + '" class="' + (f.visivel ? '' : 'oculto-linha') + '">' +
          '<td><span class="alca" title="Arraste para mudar a ordem">' + P.icone('alca') + '</span></td>' +
          '<td>' + img + '</td>' +
          '<td>' + esc(f.titulo || 'Sem título') + (f.exemplo ? '<span class="tag-ex">exemplo</span>' : '') + '</td>' +
          '<td>' + esc(f.marca) + '</td><td>' + esc(f.nicho) + '</td><td>' + esc(f.formato) + '</td>' +
          '<td class="acoes">' +
            '<button class="ib' + (f.visivel ? ' on' : '') + '" type="button" data-acao="olho" aria-pressed="' + (f.visivel ? 'true' : 'false') + '" aria-label="' + (f.visivel ? 'Esconder do site' : 'Mostrar no site') + '" title="' + (f.visivel ? 'Aparece no site. Clique para esconder' : 'Escondida. Clique para mostrar no site') + '">' + P.icone(f.visivel ? 'olho' : 'olhoOff') + '</button>' +
            '<button class="ib" type="button" data-acao="editar" aria-label="Editar">' + P.icone('editar') + '</button>' +
            '<button class="ib" type="button" data-acao="apagar" aria-label="Apagar">' + P.icone('lixo') + '</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';

    var corpo = $('#ft-corpo');
    corpo.addEventListener('click', function (e) {
      var b = e.target.closest('[data-acao]'); if (!b) return;
      var id = +b.closest('tr').getAttribute('data-id'), f = fotos.filter(function (x) { return x.id === id; })[0];
      if (!f) return;
      var acao = b.getAttribute('data-acao');
      if (acao === 'olho') {
        P.Dados.atualizar('fotos', id, { visivel: !f.visivel }).then(function (r) {
          if (!r.ok) { P.toast(r.texto || 'Não consegui mudar.', 'erro'); return; }
          f.visivel = !f.visivel; desenhar();
        });
      } else if (acao === 'editar') editar(f);
      else apagar(f);
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
        var el = document.elementFromPoint(ev.clientX, ev.clientY), alvo = el && el.closest ? el.closest('#ft-corpo tr') : null;
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
      var f = fotos.filter(function (x) { return x.id === id; })[0];
      if (f && f.ordem !== i + 1) { f.ordem = i + 1; mudou.push(P.Dados.atualizar('fotos', id, { ordem: i + 1 })); }
    });
    if (!mudou.length) return;
    Promise.all(mudou).then(function (rs) {
      var falhou = rs.some(function (r) { return !r.ok; });
      P.toast(falhou ? 'Não consegui salvar a nova ordem.' : 'Ordem salva.', falhou ? 'erro' : undefined);
      fotos.sort(function (a, b) { return a.ordem - b.ordem; });
    });
  }

  /* ---------- reduzir a imagem antes de enviar ---------- */
  function carregarImagem(arquivo) {
    return new Promise(function (ok, falha) {
      var url = URL.createObjectURL(arquivo), img = new Image();
      img.onload = function () { ok({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); falha(new Error('formato')); };
      img.src = url;
    });
  }
  function reduzir(arquivo) {
    return carregarImagem(arquivo).then(function (c) {
      var w = c.img.naturalWidth, h = c.img.naturalHeight, k = Math.min(1, MAX_LADO / Math.max(w, h));
      var cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
      var cx = cv.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, cv.width, cv.height);   /* PNG transparente fica com fundo branco */
      cx.drawImage(c.img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(c.url);
      return new Promise(function (ok, falha) {
        cv.toBlob(function (b) { if (b) ok(b); else falha(new Error('formato')); }, 'image/jpeg', QUALIDADE);
      });
    });
  }
  function formatoMaisProximo(w, h) {
    var r = w / h, melhor = FORMATOS[0][0], dist = Infinity;
    FORMATOS.forEach(function (f) { var d = Math.abs(Math.log(r / f[1])); if (d < dist) { dist = d; melhor = f[0]; } });
    return melhor;
  }

  /* ---------- enviar e apagar arquivos no Storage ---------- */
  function subir(arquivo) {
    if (!window.banco || !window.banco.storage) return Promise.resolve({ erro: 'Sem conexão com o Supabase agora.' });
    return reduzir(arquivo).then(function (blob) {
      var caminho = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      return Promise.resolve(window.banco.storage.from(BUCKET).upload(caminho, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })).then(function (r) {
        if (r.error) {
          var m = String(r.error.message || '').toLowerCase();
          if (/bucket not found|not found/.test(m)) return { erro: 'Falta criar o espaço de fotos no Supabase. Rode o arquivo fotos.sql no SQL Editor.' };
          if (/row-level security|violates|unauthorized|permission/.test(m)) return { erro: 'O Supabase não deixou enviar a foto. Confira se você entrou com o seu e-mail e se o fotos.sql foi rodado.' };
          return { erro: 'Não consegui enviar a foto agora. Detalhe: ' + r.error.message };
        }
        return { caminho: caminho, url: window.banco.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl };
      });
    }, function () { return { erro: 'Não consegui ler essa imagem. Use uma foto em JPG, PNG ou WebP.' }; });
  }
  function removerArquivo(caminho) {
    if (!caminho || !window.banco || !window.banco.storage) return;
    try { Promise.resolve(window.banco.storage.from(BUCKET).remove([caminho])).catch(function () { /* se falhar, sobra só um arquivo perdido */ }); } catch (e) { /* segue */ }
  }

  /* ---------- adicionar, editar, apagar ---------- */
  function editar(f) {
    var nichos = NICHOS.slice(); if (f && f.nicho && nichos.indexOf(f.nicho) < 0) nichos.push(f.nicho);
    var formatos = FORMATOS.map(function (x) { return x[0]; }); if (f && f.formato && formatos.indexOf(f.formato) < 0) formatos.push(f.formato);
    var proxima = fotos.reduce(function (m, x) { return Math.max(m, P.num(x.ordem)); }, 0) + 1;
    var precisaFoto = !f || !f.imagem;
    var previa;
    P.formulario({
      titulo: f ? 'Editar foto' : 'Adicionar foto',
      rotuloSalvando: 'Enviando...',
      valores: f || { formato: 'foto 4:5', nicho: '', visivel: true },
      campos: [
        { nome: 'arquivo', rotulo: 'Foto', tipo: 'file', obrigatorio: precisaFoto, dica: f && f.imagem ? 'Para trocar a imagem, escolha outra. Se não escolher, fica a atual.' : 'JPG, PNG ou WebP. O painel reduz o tamanho sozinho para o site carregar rápido.' },
        { nome: 'titulo', rotulo: 'Título (opcional)' },
        { nome: 'marca', rotulo: 'Marca (opcional)', meia: true },
        { nome: 'nicho', rotulo: 'Nicho', tipo: 'select', opcoes: [{ v: '', t: 'Sem nicho' }].concat(nichos.map(function (n) { return { v: n, t: n }; })), meia: true },
        { nome: 'formato', rotulo: 'Formato da moldura', tipo: 'select', opcoes: formatos },
        { nome: 'link', rotulo: 'Link ao clicar (opcional)', dica: 'https://...' },
        { nome: 'visivel', rotulo: 'Mostrar esta foto no meu site', tipo: 'checkbox' }
      ],
      aoAbrir: function (d) {
        previa = d.querySelector('#prev-arquivo');
        if (f && f.imagem) { previa.hidden = false; previa.innerHTML = '<img src="' + esc(f.imagem) + '" alt="Foto atual">'; }
        d.querySelector('#f-arquivo').addEventListener('change', function (e) {
          var arq = e.target.files && e.target.files[0]; if (!arq) return;
          carregarImagem(arq).then(function (c) {
            previa.hidden = false; previa.innerHTML = ''; c.img.alt = 'Prévia da foto escolhida'; previa.appendChild(c.img);
            var sel = d.querySelector('#f-formato'), fm = formatoMaisProximo(c.img.naturalWidth, c.img.naturalHeight);   /* sugere a moldura pela proporção da imagem */
            if (sel) sel.value = fm;
          }, function () { previa.hidden = false; previa.innerHTML = '<p class="msg-erro">Não consegui ler essa imagem. Use JPG, PNG ou WebP.</p>'; });
        });
      },
      salvar: function (v) {
        var arquivo = v.arquivo; delete v.arquivo;
        return (arquivo ? subir(arquivo) : Promise.resolve(null)).then(function (up) {
          if (up && up.erro) return { ok: false, texto: up.erro };
          if (up) { v.imagem = up.url; v.caminho = up.caminho; }
          if (f) {
            v.exemplo = false;
            return P.Dados.atualizar('fotos', f.id, v).then(function (r) { if (r.ok && up && f.caminho) removerArquivo(f.caminho); else if (!r.ok && up) removerArquivo(up.caminho); return r; });
          }
          v.ordem = proxima;
          return P.Dados.inserir('fotos', v).then(function (r) { if (!r.ok && up) removerArquivo(up.caminho); return r; });
        });
      },
      apagar: f ? function () { return P.Dados.apagar('fotos', f.id).then(function (r) { if (r.ok) removerArquivo(f.caminho); return r; }); } : null,
      aoSalvar: function () { P.recarregar(); }
    });
  }
  function apagar(f) {
    P.formulario({
      titulo: 'Apagar foto', valores: {}, campos: [], msgOk: 'Apagada.', rotuloSalvando: 'Apagando...',
      salvar: function () { return P.Dados.apagar('fotos', f.id).then(function (r) { if (r.ok) removerArquivo(f.caminho); return r; }); },
      aoSalvar: function () { P.recarregar(); }
    });
    P.$('#form-modal').insertAdjacentHTML('afterbegin', '<p style="margin-bottom:.6rem">Apagar ' + (f.titulo ? '"<b style="font-weight:500">' + esc(f.titulo) + '</b>"' : 'esta foto') + '? Não dá para desfazer. Se só quiser tirar do site por um tempo, use o olhinho.</p>');
    P.$('#bt-salvar').textContent = 'Apagar';
    P.$('#bt-salvar').className = 'btn btn-perigo';
  }

  P.registrar('fotos', { titulo: 'Fotos', montar: montar, entrar: entrar });
})();
