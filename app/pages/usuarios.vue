<script setup>
const vault = useVault();
const selectedUser = ref(null);
const users = ref([]), username = ref(''), password = ref(''), role = ref('player'), busy = ref(false), error = ref(''), success = ref('');
async function load() {
  try { users.value = await $fetch('/api/admin/users', { retry: 0 }); }
  catch (e) { error.value = e.data?.message || 'No se pudieron cargar los usuarios. Volvé a intentar.'; }
}
await load();
async function create() {
  busy.value = true; error.value = ''; success.value = '';
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: { username: username.value, password: password.value, role: role.value }, retry: 0 });
    success.value = `Cuenta ${username.value} creada.`;
    username.value = ''; password.value = ''; role.value = 'player'; await load();
  } catch (e) { error.value = e.data?.message || 'No se pudo crear la cuenta. Volvé a intentar.'; }
  finally { busy.value = false; }
}
async function update(user, field, value) {
  busy.value = true; error.value = ''; success.value = '';
  try {
    await $fetch('/api/admin/users', { method: 'PATCH', body: { id: user.id, role: user.role, blocked: user.blocked, [field]: value }, retry: 0 });
    success.value = `Cuenta ${user.username} actualizada.`;
  } catch (e) { error.value = e.data?.message || 'No se pudo actualizar la cuenta.'; }
  finally { await load(); busy.value = false; }
}
async function credit(user, event) {
  const amount = Number(new FormData(event.target).get('amount'));
  busy.value = true; error.value = ''; success.value = '';
  try {
    await $fetch('/api/admin/coins', { method: 'POST', body: { id: user.id, amount }, retry: 0 });
    success.value = `${amount} monedas agregadas a ${user.username}.`; event.target.reset(); await vault.refresh();
  } catch (e) { error.value = e.data?.message || 'No se pudo confirmar la recarga. Revisá el saldo antes de repetir.'; }
  finally { busy.value = false; }
}
useHead({ title: 'Usuarios · Dragon Vault' });
</script>
<template>
  <AdminCollection v-if="selectedUser" :key="selectedUser.id" :user="selectedUser" @close="selectedUser = null" />
  <section v-else class="users-page">
    <h1>Usuarios</h1><p>Creá cuentas y administrá el acceso a Dragon Vault.</p>
    <p v-if="error" class="vault-error" role="alert">{{ error }}</p><p v-if="success" role="status">{{ success }}</p>
    <form class="user-create" @submit.prevent="create">
      <h2>Crear una cuenta</h2>
      <label>Usuario<input v-model="username" required minlength="3" maxlength="32" pattern="[a-zA-Z0-9_.\-]+" autocomplete="off" autocapitalize="none" /></label>
      <label>Contraseña inicial<input v-model="password" type="password" required minlength="12" autocomplete="new-password" aria-describedby="password-help" /></label>
      <label>Rol<select v-model="role"><option value="player">Jugador</option><option value="admin">Administrador</option></select></label>
      <p id="password-help" class="micro">Al menos 12 caracteres; hasta 72 bytes. Entregá las credenciales al usuario por un canal privado.</p>
      <button class="primary" :disabled="busy">{{ busy ? 'Guardando…' : 'Crear cuenta' }}</button>
    </form>
    <div class="section-heading"><h2>Cuentas existentes</h2><button @click="load" :disabled="busy">Actualizar</button></div>
    <ul class="user-list">
      <li v-for="user in users" :key="user.id">
        <div><strong>{{ user.username }}</strong><p>{{ user.blocked ? 'Bloqueado' : 'Activo' }}{{ user.id === vault.data.auth.user.id ? ' · Tu cuenta' : '' }}</p></div>
        <label>Rol<select :value="user.role" :disabled="busy || user.id === vault.data.auth.user.id" @change="update(user, 'role', $event.target.value)"><option value="player">Jugador</option><option value="admin">Administrador</option></select></label>
        <button :disabled="busy || user.id === vault.data.auth.user.id" @click="update(user, 'blocked', !user.blocked)">{{ user.blocked ? 'Desbloquear' : 'Bloquear' }}</button>
        <button :disabled="busy" :aria-label="'Administrar colección de ' + user.username" @click="selectedUser = user">Administrar colección</button>
        <form class="coin-grant" @submit.prevent="credit(user, $event)"><label>Monedas a agregar<input name="amount" type="number" min="1" max="1000000" step="1" required /></label><button :disabled="busy">Agregar monedas</button></form>
      </li>
    </ul>
  </section>
</template>
