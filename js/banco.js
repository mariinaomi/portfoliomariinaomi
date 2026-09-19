/* =====================================================================
   banco.js: os dados de acesso ao Supabase, guardados UMA vez só.
   É usado pelo portfólio, pela tela de login e pelo painel admin.

   Aqui só entra a chave PÚBLICA (publishable). Ela pode ficar visível no site
   sem problema, porque quem manda de verdade é a tranca (RLS) do banco.
   NUNCA coloque neste arquivo (nem em nenhum outro) a chave secreta.

   Precisa vir DEPOIS da tag do Supabase (CDN) em cada página.
   No portfólio, as duas tags carregam sem travar a página, então este
   arquivo espera o Supabase chegar (até 10 segundos) antes de criar o "banco".
   ===================================================================== */
(function () {
  'use strict';

  var URL_DO_PROJETO = "https://gakuzpwnwmzxuaefiohf.supabase.co";
  var CHAVE_PUBLICA = "sb_publishable_hQY4int8_A5U167q-OO0VA_w2RlVkQs";

  window.BANCO_URL = URL_DO_PROJETO;
  window.BANCO_CHAVE = CHAVE_PUBLICA;
  window.banco = null;          /* fica nulo se o Supabase não carregar (sem internet, por exemplo) */
  window.bancoPronto = false;   /* vira verdadeiro quando terminou de tentar, deu certo ou não */

  function terminar() {
    window.bancoPronto = true;
    try { document.dispatchEvent(new Event('banco-pronto')); } catch (e) { /* segue */ }
  }
  function existe() { return window.supabase && typeof window.supabase.createClient === 'function'; }
  function criar() {
    window.banco = window.supabase.createClient(URL_DO_PROJETO, CHAVE_PUBLICA);
    terminar();
  }

  if (existe()) { criar(); return; }

  var tentativas = 0;
  var espera = setInterval(function () {
    tentativas++;
    if (existe()) { clearInterval(espera); criar(); }
    else if (tentativas >= 100) { clearInterval(espera); terminar(); }
  }, 100);
})();
