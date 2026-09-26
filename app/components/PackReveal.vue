<script setup>
import { names, image, rarityClass } from "~/utils/catalog.js";
const { data } = useVault();
const pack = data.reveal;
const dialog = ref(),
  ready = ref(false),
  revealed = ref([]);
let timer;
onMounted(() => {
  dialog.value.showModal();
  timer = setTimeout(
    () => {
      ready.value = true;
    },
    matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1500,
  );
});
onBeforeUnmount(() => clearTimeout(timer));
function reveal(i) {
  if (!revealed.value.includes(i)) revealed.value.push(i);
}
</script>
<template>
  <dialog
    ref="dialog"
    class="pack-reveal"
    :class="rarityClass(pack.cards.at(-1))"
    aria-label="Apertura de sobre"
    @close="data.reveal = null"
  >
    <div class="reveal-heading">
      <span class="eyebrow">{{ pack.name }}</span>
      <h2>Tu próxima sorpresa.</h2>
      <p role="status">
        {{
          !ready
            ? "Abriendo el sobre…"
            : revealed.length === pack.cards.length
              ? "¡Sobre completo! Todas las cartas están en tu colección."
              : revealed.length
                ? `${revealed.length} de ${pack.cards.length} cartas reveladas`
                : "Tocá cada carta para revelarla · de menor a mayor rareza"
        }}
      </p>
    </div>
    <div v-if="!ready" class="sealed-stage">
      <div class="foil-pack">
        <div class="foil-top"></div>
        <div class="cut-line"></div>
        <svg class="millennium-art" viewBox="0 0 200 300" aria-hidden="true">
          <defs>
            <linearGradient id="goldFoil" x2="1" y2="1">
              <stop stop-color="#fff0b4" />
              <stop offset=".4" stop-color="#ad7930" />
              <stop offset=".65" stop-color="#ffe6a0" />
              <stop offset="1" stop-color="#7d4b1d" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#goldFoil)">
            <path d="M100 20 186 260H14Z" stroke-width="3" />
            <path d="M100 44 167 247H33Z" stroke-width="1" />
            <path
              d="M100 260 100 294M14 260 100 294 186 260"
              stroke-width="3"
            />
            <circle cx="100" cy="159" r="56" stroke-width="1" />
            <path
              d="M43 158Q100 108 157 158Q100 207 43 158Z"
              stroke-width="5"
            />
            <path
              d="M47 149Q85 115 142 140M151 159 166 145M53 175 42 195 75 187M116 181Q139 210 114 218"
              stroke-width="5"
            />
            <path
              d="M100 101V88M100 228V217M30 159H18M182 159H170"
              stroke-width="2"
            />
          </g>
          <ellipse cx="100" cy="158" rx="17" ry="26" fill="url(#goldFoil)" />
          <ellipse cx="100" cy="158" rx="6" ry="20" fill="#160d21" />
        </svg>
      </div>
      <div class="pack-aura"></div>
    </div>
    <div v-else class="reveal-cards">
      <button
        v-for="(card, i) in pack.cards"
        :key="i"
        class="flip-card"
        :class="[rarityClass(card), { flipped: revealed.includes(i) }]"
        :aria-label="
          revealed.includes(i)
            ? card.name_es + ' · ' + names[card.rarity]
            : 'Revelar carta ' + (i + 1)
        "
        :aria-pressed="revealed.includes(i)"
        @click="reveal(i)"
      >
        <span class="flip-inner"
          ><span class="card-back" :aria-hidden="revealed.includes(i)"
            ><CardImage
              src="/assets/card-back.jpg"
              alt="Reverso de carta Yu-Gi-Oh!"
              draggable="false" /></span
          ><span class="card-front" :aria-hidden="!revealed.includes(i)"
            ><CardImage
              :src="image(card)"
              :alt="revealed.includes(i) ? card.name_en : ''"
            /><span>{{ card.name_es }}</span
            ><small>{{ names[card.rarity] }}</small></span
          ></span
        >
      </button>
    </div>
    <div class="reveal-actions">
      <button
        v-if="ready && revealed.length < pack.cards.length"
        @click="revealed = pack.cards.map((_, i) => i)"
      >
        Revelar todas</button
      ><button class="quiet" @click="dialog.close()">Continuar</button>
    </div>
    <p class="micro">
      Las {{ pack.cards.length }} cartas ya están guardadas en tu colección.
    </p>
  </dialog>
</template>
