'use strict';
function showWallet(){modal(`<h2>Tus monedas</h2><p class="wallet-balance">◉ ${state.coins.toLocaleString('es-AR')}</p><p>Cada sobre cuesta <strong>5 monedas</strong> y cada mazo de inicio, <strong>500 monedas</strong>.</p><p>Recibís 1.000 monedas iniciales. El saldo se guarda junto con tu colección y se incluye en las copias de seguridad.</p><button id="addTestCoins" class="primary">＋ 1.000 monedas de prueba</button><p class="micro">Monedas virtuales, sin dinero real. Esta recarga permite probar el sistema.</p>`);$('#addTestCoins').onclick=()=>{state.coins=Math.min(1e9,state.coins+1000);save();showWallet();};}
$('#wallet').onclick=showWallet;
save();
showView('iniciales');
