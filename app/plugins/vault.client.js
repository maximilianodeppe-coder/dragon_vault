import { reactive, computed } from "vue";
import {
  cards,
  allCards,
  byId,
  names,
  SETS,
  registerCatalog,
  registerSpanish,
  gameCards,
} from "~/utils/catalog.js";
import { packCard, hasDraftChanges } from "~/utils/expansions.js";
import { formatOf, formatLimit } from '~/utils/formats.js';
import {
  createProgress,
  validate,
  clone,
  storageKeys,
  deckCounts,
} from "~/utils/progress.js";

export default defineNuxtPlugin(async (nuxtApp) => {
  const auth = reactive({ user: null, error: '' });
  let catalogError = "";
  async function loadCatalog() {
  try {
    registerCatalog(
      await $fetch("/api/catalog/cards", { timeout: 30000, retry: 0 }),
    );
  } catch {
    catalogError =
      "No se pudo cargar el catálogo completo. Recargá la página para reintentar. Tus guardados no se sobrescriben si requieren cartas ausentes.";
  }
  try {
    registerSpanish(
      await $fetch("/api/catalog/es", { timeout: 30000, retry: 0 }),
    );
  } catch {
    catalogError +=
      " No se pudieron cargar los textos españoles. Recargá para reintentar.";
  }
  }
  const data = reactive({
    auth,
    busy: false,
    revision: '',
    progress: createProgress(),
    dialog: null,
    toast: "",
    storageError: "",
    currentDeck: null,
    lastPack: [],
    lastPackName: "",
    reveal: null,
    undo: null,
    draft: {},
    draftKind: "pack",
    draftName: "",
    draftCost: 5,
    draftSize: 5,
    draftBoxPacks: 100,
    draftSource: null,
    draftFormat: 'official',
    activeFormat: 'official',
    editingPack: null,
    draftDescription: "",
    draftCover: "",
    draftRarities: {},
    catalogError,
  });
  let toastTimer;
  function notify(message) {
    data.toast = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      data.toast = "";
    }, 4500);
  }
  const isAdmin = computed(() => auth.user?.role === 'admin');
  function accept(response) {
    response.progress.selectedSet = data.progress.selectedSet;
    data.progress = response.progress;
    data.revision = response.revision;
    data.undo = response.canUndo;
    data.storageError = '';
  }
  async function refresh(background = false) {
    const revision = data.revision;
    const response = await $fetch('/api/vault', { retry: 0 });
    if (!background || (!data.busy && data.revision === revision)) accept(response);
  }
  async function request(type, payload = {}) {
    if (data.busy) return { ok: false };
    if (data.storageError) { notify(data.storageError); return { ok: false }; }
    data.busy = true;
    try {
      const response = await $fetch('/api/vault/action', { method: 'POST', body: { ...payload, type }, retry: 0 });
      accept(response);
      return { ok: true, result: response.result };
    } catch (error) {
      if (error.status === 401 || error.statusCode === 401) {
        auth.user = null;
        data.progress = createProgress();
        data.dialog = null;
        data.reveal = null;
        await navigateTo('/login');
      } else {
        try { await refresh(); } catch { /* Keep last confirmed state on connection failure. */ }
      }
      notify(error.data?.message || 'No se pudo confirmar la operación. Revisá el estado antes de volver a intentar.');
      return { ok: false };
    } finally { data.busy = false; }
  }
  async function commit(action) {
    if (data.storageError || data.busy) { notify(data.storageError || 'Esperá a que termine la operación actual.'); return { ok: false }; }
    if (!isAdmin.value) { notify('Esta acción requiere una cuenta administradora.'); return { ok: false }; }
    try {
      const next = clone(data.progress);
      const result = action(next);
      validate(next);
      const response = await request('adminCommit', { progress: next, revision: data.revision });
      return { ...response, result: response.ok ? result : undefined };
    } catch (error) { notify(error.message); return { ok: false }; }
  }
  async function startSession() {
    await loadCatalog();
    data.catalogError = catalogError;
    await refresh();
  }
  async function reloadProgress() {
    try { await startSession(); }
    catch { notify('No se pudo cargar tu progreso. Revisá tu conexión y volvé a intentar.'); }
  }
  async function login(username, password) {
    const response = await $fetch('/api/auth/login', { method: 'POST', body: { username, password }, retry: 0 });
    auth.user = response.user;
    try { await startSession(); }
    catch (error) { auth.user = null; throw error; }
  }
  async function logout() {
    try { await $fetch('/api/auth/logout', { method: 'POST', body: {}, retry: 0 }); }
    catch (error) { if (error.status !== 401 && error.statusCode !== 401) { notify('No se pudo cerrar la sesión. Volvé a intentar.'); return; } }
    auth.user = null;
    data.progress = createProgress(); data.dialog = null; data.reveal = null; data.undo = null;
    data.currentDeck = null; data.lastPack = []; resetDraft();
    await navigateTo('/login');
  }
  try {
    auth.user = (await $fetch('/api/auth/session', { retry: 0 })).user;
    await startSession();
  } catch (error) {
    if (auth.user) data.storageError = 'No se pudo cargar tu progreso. Recargá para reintentar.';
    else if (error.status !== 401 && error.statusCode !== 401) auth.error = 'No se pudo conectar con el servidor. Volvé a intentar.';
  }

  function download(text, name, type = "application/json") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportData() {
    download(
      JSON.stringify(data.progress, null, 2),
      `dragon-vault-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }
  function downloadStored() {
    try {
      const saved = storageKeys
        .map((key) => localStorage.getItem(key))
        .find(Boolean);
      if (!saved) throw Error("No hay un guardado accesible para descargar.");
      download(saved, "dragon-vault-recuperacion.json");
    } catch (error) {
      notify(error.message);
    }
  }
  async function importProgress(value) {
    try {
      const next = validate(clone(value));
      const response = await request('import', { progress: next, revision: data.revision });
      if (!response.ok) return;
      data.storageError = "";
      data.undo = null;
      data.currentDeck = null;
      data.activeFormat = 'official';
      data.lastPack = [];
      data.dialog = null;
      notify("Copia importada a tu cuenta y al inventario compartido");
    } catch (error) {
      notify(error.message);
    }
  }
  function importLocal() {
    try {
      const saved = storageKeys.map(key => localStorage.getItem(key)).find(Boolean);
      if (!saved) return notify('No hay progreso local en este navegador. Elegí el archivo de respaldo.');
      const next = validate(JSON.parse(saved));
      confirm('¿Importar tu progreso local?', 'Reemplaza tu colección, monedas y mazos, y también las cajas, ofertas y reglas compartidas. El guardado del navegador se conserva.', () => importProgress(next), 'Importar progreso');
    } catch (error) { notify(error.message); }
  }
  function confirm(title, message, action, label = "Confirmar") {
    data.dialog = { kind: "confirm", title, message, action, label };
  }
  function reveal(ids, name, pack = null) {
    const rank = Object.keys(names);
    data.lastPack = ids
      .map((id) => (pack ? packCard(pack, id) : byId.get(String(id))))
      .sort((a, b) => rank.indexOf(a.rarity) - rank.indexOf(b.rarity));
    data.lastPackName = name;
    data.reveal = { cards: data.lastPack, name };
  }
  async function open(set) {
    if (data.reveal) return;
    const result = await request('open', { id: set });
    if (result.ok) reveal(result.result, SETS.find((s) => s.id === set).name);
  }
  async function openCustom(id) {
    if (data.reveal) return;
    const pack = data.progress.economy.customPacks.find((p) => p.id === id);
    const result = await request('openCustom', { id });
    if (result.ok) reveal(result.result, pack.name, pack);
  }
  async function clearCollection() {
    const result = await request('clear');
    if (result.ok) {
      data.lastPack = [];
      data.dialog = null;
    }
  }
  async function undoClear() {
    if (!data.undo) return;
    const result = await request('undoClear');
    if (result.ok) {
      data.undo = null;
      notify("Cartas restauradas");
    }
  }
  function addDraft(id) {
    if (!isAdmin.value) return;
    if (!byId.has(String(id))) return;
    const rarity = byId.get(String(id)).rarity;
    const initial = data.draftKind === 'starter' ? 1 : ({ Rare: 5, 'Super Rare': 3 }[rarity] || 1);
    data.draft[id] = data.draft[id] ? Math.min(1000, data.draft[id] + 1) : initial;
    data.draftRarities[id] ||= byId.get(String(id)).rarity;
    notify(
      data.draftKind === "starter"
        ? "Carta sumada al borrador del mazo"
        : "Carta sumada al borrador de la expansión",
    );
  }
  function changeDraft(action) {
    const saved = data.progress.economy.customPacks.find((p) => p.id === data.editingPack);
    if (!hasDraftChanges(data, saved)) return action();
    confirm("Reemplazar el borrador en edición", "Tenés cambios sin guardar. Se perderán si abrís otro producto; los productos guardados se conservan.", () => {
      data.dialog = null;
      action();
    }, "Reemplazar borrador");
  }
  function editProduct(pack) {
    if (!isAdmin.value) return;
    changeDraft(() => {
    Object.assign(data, {
      editingPack: pack.id || null,
      draftKind: pack.kind || "pack",
      draftName: pack.name,
      draftDescription: pack.description || "",
      draftCover: pack.coverId || pack.entries[0]?.id || "",
      draftCost: pack.cost,
      draftSize: pack.size,
      draftBoxPacks: pack.boxPacks || "",
      draftSource: pack.officialSource ? { ...pack.officialSource } : null,
      draftFormat: formatOf(pack),
      draft: Object.fromEntries(pack.entries.map((e) => [e.id, e.copies])),
      draftRarities: Object.fromEntries(pack.entries.map((e) => [e.id, e.rarity || byId.get(e.id).rarity])),
    });
    navigateTo(pack.officialSource ? "/expansiones?editor=1" : "/especiales");
    });
  }
  function resetDraft() {
    Object.assign(data, {
      draft: {}, draftKind: 'pack', draftRarities: {}, editingPack: null,
      draftName: '', draftDescription: '', draftCover: '', draftCost: 5,
      draftSize: 5, draftBoxPacks: 100, draftSource: null, draftFormat: data.activeFormat,
    });
  }
  function newProduct() {
    if (!isAdmin.value) return;
    changeDraft(() => {
      resetDraft();
      navigateTo('/especiales');
    });
  }
  async function addOffer(id) {
    if (!formatLimit(data.progress, 'official', id)) return notify('La tienda pertenece a Oficial. Habilitá esta carta en su lista de permitidas primero.');
    if (!gameCards(data.progress).some((c) => String(c.id) === String(id)))
      return notify(
        "Publicá una expansión con esta carta antes de ofrecerla en la tienda.",
      );
    if (data.progress.economy.offers.some((o) => o.id === String(id)))
      return notify(
        "Esa carta ya está en la tienda. Podés editar sus existencias.",
      );
    if (
      (await commit((state) => state.economy.offers.push({ id: String(id), stock: 3 })))
        .ok
    )
      notify("Carta agregada a la tienda con 3 copias");
  }
  nuxtApp.hook("app:mounted", () => {
    if (!document.modelContext?.registerTool) return;
    try {
      Promise.resolve(
        document.modelContext.registerTool({
          name: "read_lob_collection",
          title: "Consultar colección LOB",
          description:
            "Lee las cartas obtenidas y los mazos guardados en este dispositivo.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute(input) {
            if (input && Object.keys(input).length)
              throw Error("No se admiten parámetros");
            return {
              cartas: Object.entries(data.progress.owned).map(([id, n]) => ({
                id,
                nombre: byId.get(id).name_es,
                copias: n,
              })),
              mazos: data.progress.decks.map((d) => ({
                nombre: d.name,
                ...deckCounts(d),
              })),
              sobres: data.progress.packs,
            };
          },
        }),
      ).catch(() => {});
    } catch {
      /* Optional browser integration; the collection remains usable without it. */
    }
  });
  nuxtApp.hook('page:finish', async () => {
    if (!auth.user || data.busy || data.dialog || data.storageError) return;
    try { await refresh(true); } catch { /* Commands always revalidate against the server. */ }
  });
  return {
    provide: {
      vault: {
        data,
        isAdmin,
        login,
        logout,
        request,
        refresh,
        reloadProgress,
        importLocal,
        commit,
        notify,
        confirm,
        exportData,
        downloadStored,
        download,
        importProgress,
        open,
        openCustom,
        clearCollection,
        undoClear,
        addDraft,
        editProduct,
        changeDraft,
        resetDraft,
        newProduct,
        addOffer,
        gameCards: computed(() => gameCards(data.progress)),
      },
    },
  };
});
