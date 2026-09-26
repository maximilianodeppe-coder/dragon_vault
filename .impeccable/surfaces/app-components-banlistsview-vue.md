---
version: 1
slug: "app-components-banlistsview-vue"
primary_target: "app/components/RulesView.vue"
related_targets: ["app/components/DecksView.vue"]
---

# Banlists — Operate

Registro histórico de la primera implementación. `RulesView.vue` reemplaza el componente original y reúne formatos y banlists en «Listas y reglas». La dirección vigente está en [formats.md](formats.md); la descripción siguiente conserva el alcance anterior y no define la lista de permitidas de un formato.

## Direction contract
THESIS: Edit card limits and understand deck conflicts without removing any cards. Extend the existing editor, not a new visual identity.
OWN-WORLD: Inherit Dragon Vault's navy panels, gold actions, Marcellus headings and DM Sans controls. Card images remain intact; restrictions use text as well as color.
STORY: Create a named list, search the complete catalog, set 0–3 copies, then select it per deck. Unlisted cards allow three. All copies of a card share the limit.
FIRST VIEWPORT: Existing navigation gains Banlists; list selector and create action above two working columns: searchable catalog and restricted cards. Mobile stacks the columns. The deck board gains a selector and a conflict summary before its card zones.
FORM: Precisely scoped extension, code-led; no concept seed needed. Native selectors update saved rules immediately. Conflicts remain editable and visible, without animation or destructive automatic repair.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Permisos actuales

La consulta requiere sesión y la edición requiere administrador. Formatos y banlists se comparten entre cuentas; cada jugador conserva mazos privados. Ver `formats.md` para listas de permitidas y cupos compartidos, y `authentication.md` para acceso y usuarios.
