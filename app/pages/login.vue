<script setup>
const vault = useVault();
const username = ref(''), password = ref(''), busy = ref(false), error = ref(vault.data.auth.error);
async function submit() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    await vault.login(username.value, password.value);
    password.value = '';
    await navigateTo('/formatos');
  } catch (e) { error.value = e.data?.message || 'No se pudo ingresar. Revisá tu conexión y volvé a intentar.'; }
  finally { busy.value = false; }
}
useHead({ title: 'Ingresar · Dragon Vault' });
</script>
<template>
  <section class="auth-page">
    <div class="auth-intro"><span class="brand">DRAGON <b>VAULT</b></span><h1>Tu colección te espera.</h1><p>Ingresá para abrir sobres, descubrir cartas y preparar tu próximo mazo.</p></div>
    <form class="auth-form" @submit.prevent="submit" :aria-busy="busy">
      <h2>Ingresar a tu cuenta</h2>
      <label for="username">Usuario</label><input id="username" v-model="username" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="32" autofocus />
      <label for="password">Contraseña</label><input id="password" v-model="password" type="password" autocomplete="current-password" required />
      <p v-if="error" class="vault-error" role="alert">{{ error }}</p>
      <button class="primary" :disabled="busy">{{ busy ? 'Ingresando…' : 'Ingresar' }}</button>
      <p class="micro">Las cuentas las crea el administrador. Si necesitás acceso, pedile tu usuario y contraseña.</p>
    </form>
  </section>
</template>
