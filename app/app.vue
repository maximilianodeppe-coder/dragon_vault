<script setup>
const vault = useVault();
const { data } = vault;
const links = computed(() => [
  ["formatos", "Formatos"],
  ["coleccion", "Mi colección"],
  ["mazos", "Mis mazos"],
  ["banlists", "Listas y reglas"],
  ["tienda", "Tienda"],
  ["catalogo", "Base de datos"],
  ["expansiones", "Expansiones"],
  ["usuarios", "Usuarios"],
].filter(([path]) => vault.isAdmin.value || !['usuarios', 'expansiones'].includes(path)));
const unique = computed(
  () => Object.values(data.progress.owned).filter((n) => n > 0).length,
);
</script>

<template>
  <UApp>
    <header v-if="data.auth.user && $route.path !== '/login'">
      <NuxtLink class="brand" to="/formatos"
        ><span class="brand-icon">◇</span> DRAGON <b>VAULT</b></NuxtLink
      >
      <nav aria-label="Secciones">
        <NuxtLink v-for="[path, label] in links" :key="path" :to="'/' + path"
          >{{ label }}
          <span v-if="path === 'coleccion'">{{ unique }}</span></NuxtLink
        >
      </nav>
      <button
        id="wallet"
        class="coin-wallet"
        aria-label="Monedas y saldo"
        @click="data.dialog = { kind: 'wallet' }"
      >
        ◉ {{ data.progress.coins.toLocaleString("es-AR") }}
      </button>
      <button
        id="backup"
        class="quiet"
        @click="data.dialog = { kind: 'backup' }"
      >
        {{ vault.isAdmin.value ? 'Guardar / cargar' : 'Descargar copia' }}
      </button>
      <button class="quiet" @click="vault.logout" :disabled="data.busy">Salir · {{ data.auth.user.username }}</button>
    </header>
    <main>
      <UAlert
        v-if="data.storageError"
        color="error"
        variant="soft"
        title="El guardado necesita atención"
        :description="data.storageError"
      />
      <div v-if="data.storageError" class="backup-actions">
        <button @click="vault.reloadProgress">Reintentar carga</button>
        <button v-if="vault.isAdmin.value" @click="vault.downloadStored">Descargar guardado local original</button>
      </div>
      <NuxtPage v-if="!data.storageError" />
      <footer v-if="data.auth.user">
        <span>DRAGON VAULT <small>· Proyecto de estudio no oficial</small></span
        ><button class="quiet" @click="data.dialog = { kind: 'sources' }">
          Fuentes y edición
        </button>
      </footer>
    </main>
    <VaultDialog v-if="data.auth.user" />
    <PackReveal v-if="data.reveal" />
    <div id="toast" role="status" :class="{ show: data.toast }">
      {{ data.toast }}
    </div>
    <div v-if="data.busy" class="saving-state" role="status">Guardando…</div>
  </UApp>
</template>
