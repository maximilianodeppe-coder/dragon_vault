# Banlists — Operate

## Direction contract
THESIS: Edit card limits and understand deck conflicts without removing any cards. Extend the existing editor, not a new visual identity.
OWN-WORLD: Inherit Dragon Vault's navy panels, gold actions, Marcellus headings and DM Sans controls. Card images remain intact; restrictions use text as well as color.
STORY: Create a named list, search the complete catalog, set 0–3 copies, then select it per deck. Unlisted cards allow three. All copies of a card share the limit.
FIRST VIEWPORT: Existing navigation gains Banlists; list selector and create action above two working columns: searchable catalog and restricted cards. Mobile stacks the columns. The deck board gains a selector and a conflict summary before its card zones.
FORM: Precisely scoped extension, code-led; no concept seed needed. Native selectors update saved rules immediately. Conflicts remain editable and visible, without animation or destructive automatic repair.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Estado del registro

Este contrato corresponde a la primera implementación y se conserva como antecedente. La superficie vigente es `RulesView.vue`, documentada en `surfaces/formats.md`: reúne listas de permitidas y banlists individuales o de cupos compartidos. Las reglas son globales y solo las edita el administrador; los jugadores las consultan y seleccionan restricciones para sus propios mazos. La ausencia permite tres solo en la banlist adicional; en la lista de permitidas del formato, ausencia significa exclusión.
