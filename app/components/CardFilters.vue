<script setup>
import {
  cards,
  names,
  types,
  attrs,
  races,
  SETS,
  starters,
  isPublished,
} from "~/utils/catalog.js";
import { defaultFilters } from "~/utils/filters.js";
const model = defineModel({ type: Object, required: true });
const props = defineProps({
  error: String,
  deck: Boolean,
  catalog: Boolean,
  sourceCards: { type: Array, default: () => cards },
});
const { data } = useVault();
const products = computed(() => [
  ...SETS,
  ...starters,
  ...data.progress.economy.customPacks.filter(isPublished),
]);
const groups = computed(() => [
  [
    "categories",
    "Categoría de carta",
    {
      monster: "Monstruos",
      spell: "Mágicas",
      trap: "Trampas",
      other: "Fichas y habilidades",
    },
  ],
  ["attributes", "Atributo", attrs],
  [
    "types",
    "Tipo de carta",
    Object.fromEntries(
      [...new Set(props.sourceCards.map((c) => c.type))]
        .sort()
        .map((t) => [t, types[t] || t]),
    ),
  ],
  [
    "races",
    "Tipo de monstruo",
    Object.fromEntries(
      [
        ...new Set(
          props.sourceCards
            .filter((c) => c.type.includes("Monster"))
            .map((c) => c.race)
            .filter(Boolean),
        ),
      ]
        .sort()
        .map((r) => [r, races[r] || r]),
    ),
  ],
  [
    "properties",
    "Clase de mágica / trampa",
    Object.fromEntries(
      Object.entries(races).filter(([v]) =>
        props.sourceCards.some(
          (c) => !c.type.includes("Monster") && c.race === v,
        ),
      ),
    ),
  ],
]);
const orders = {
  name: "Nombre en español",
  name_en: "Nombre en inglés",
  atk: "Ataque",
  def: "Defensa",
  level: "Nivel",
  rarity: "Rareza",
  copies: "Copias obtenidas",
  set: "Expansión",
};
</script>
<template>
  <aside class="collection-sidebar" aria-label="Filtros de cartas">
    <h2>Buscar y filtrar</h2>
    <div class="toolbar">
      <input
        v-model="model.search"
        type="search"
        placeholder="Buscar por nombre en español o inglés…"
        aria-label="Buscar cartas"
      />
      <select v-model="model.set" aria-label="Expansión">
        <option value="">Todas las expansiones</option>
        <option
          v-for="product in products"
          :key="product.id"
          :value="product.id"
        >
          {{ product.name }}
        </option>
      </select>
      <select v-model="model.rarity" aria-label="Rareza">
        <option value="">Todas las rarezas</option>
        <option v-for="(name, rarity) in names" :key="rarity" :value="rarity">
          {{ name }}
        </option>
      </select>
      <label v-if="!deck"
        ><input v-model="model.onlyOwned" type="checkbox" /> Solo las que
        tengo</label
      >
    </div>
    <div class="collection-sort">
      <label
        >Ordenar por
        <select v-model="model.sort">
          <option v-for="(name, value) in orders" :key="value" :value="value">
            {{ name }}
          </option>
        </select></label
      >
      <label
        >Dirección
        <select v-model="model.direction">
          <option value="asc">Menor a mayor / A–Z</option>
          <option value="desc">Mayor a menor / Z–A</option>
        </select></label
      >
      <button
        @click="
          model = {
            ...defaultFilters(),
            onlyOwned: !!deck,
            searchEffect: !!deck,
          }
        "
      >
        Limpiar filtros
      </button>
    </div>
    <details class="advanced-filters" :open="!deck">
      <summary>Filtros avanzados</summary>
      <p>
        Combiná los grupos para afinar la búsqueda. Dentro de cada grupo podés
        elegir varias opciones.
      </p>
      <div v-if="catalog" class="catalog-extra-filters">
        <label
          >Arquetipo<input
            v-model="model.archetype"
            type="search"
            placeholder="Ej.: Blue-Eyes" /></label
        ><label
          >Edición oficial<input
            v-model="model.officialSet"
            type="search"
            placeholder="Nombre de la edición"
        /></label>
      </div>
      <div class="filter-ranges">
        <fieldset
          v-for="[key, label] in [
            ['atk', 'Ataque (ATK)'],
            ['def', 'Defensa (DEF)'],
            ['level', 'Nivel'],
            ['copies', 'Copias obtenidas'],
          ]"
          :key="key"
        >
          <legend>{{ label }}</legend>
          <div>
            <label
              >Desde<input
                v-model="model[key + 'Min']"
                type="number"
                min="0"
                placeholder="Sin mínimo" /></label
            ><label
              >Hasta<input
                v-model="model[key + 'Max']"
                type="number"
                min="0"
                placeholder="Sin máximo"
            /></label>
          </div>
        </fieldset>
      </div>
      <div class="filter-groups">
        <details v-for="[key, label, values] in groups" :key="key">
          <summary>{{ label }}</summary>
          <div class="filter-checks">
            <label v-for="(name, value) in values" :key="value"
              ><input v-model="model[key]" type="checkbox" :value="value" />
              {{ name }}</label
            >
          </div>
        </details>
      </div>
      <div class="filter-extra">
        <label v-if="!deck"
          >Disponibilidad
          <select v-model="model.ownership">
            <option value="">Todas</option>
            <option value="missing">Me faltan</option>
            <option value="duplicates">Tengo repetidas</option>
          </select></label
        ><label
          ><input v-model="model.searchEffect" type="checkbox" /> Buscar también
          en el texto del efecto</label
        >
      </div>
      <p class="micro">
        Los rangos excluyen cartas sin ese dato. Al ordenar, esas cartas quedan
        al final.
      </p>
    </details>
    <p v-if="error" class="vault-error" role="alert">{{ error }}</p>
  </aside>
</template>
