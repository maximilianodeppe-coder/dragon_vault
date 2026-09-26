---
name: Dragon Vault
description: "La bóveda del coleccionista: cartas clásicas sobre azul noche y oro antiguo."
colors:
  bg: "#0c111b"
  panel: "#131d2b"
  line: "#293343"
  muted: "#a5b1c3"
  gold: "#e5c58b"
  text: "#f1f3f8"
  button: "#1a2535"
  button-hover: "#253247"
  primary-ink: "#17202e"
  primary-hover: "#f6dcae"
  primary-hover-ink: "#101a29"
  field: "#141e2d"
  field-line: "#3e4b60"
  white: "#ffffff"
  rarity-common: "#8794a7"
  rarity-rare: "#8dc9ff"
  rarity-super: "#b59aff"
  rarity-ultra-secret: "#f4ca6a"
  danger-text: "#ffc2bd"
  danger-bg: "#42252c"
  danger-line: "#aa5959"
typography:
  display:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "clamp(32px, 3.2vw, 48px)"
    fontWeight: 400
    lineHeight: 1.13
  headline:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "28px"
    fontWeight: 400
  title:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: "23px"
    fontWeight: 400
  body:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "16px"
    fontWeight: 400
  paragraph:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "16px"
    lineHeight: 1.65
  card-name:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "14px"
    lineHeight: 1.3
  eyebrow:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "12px"
    letterSpacing: "2.4px"
  tag:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "11px"
    letterSpacing: "1.5px"
rounded:
  card: "5px"
  field: "6px"
  button: "7px"
  panel: "10px"
  workspace: "12px"
  dialog: "14px"
  starter: "16px"
spacing:
  gap-small: "8px"
  gap-control: "12px"
  gap-medium: "16px"
  inset-small: "20px"
  gap-large: "24px"
  gap-section: "28px"
components:
  button:
    backgroundColor: "{colors.button}"
    textColor: "{colors.text}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  button-hover:
    backgroundColor: "{colors.button-hover}"
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-hover-ink}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  button-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-text}"
    rounded: "{rounded.button}"
    padding: "11px 18px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.white}"
    rounded: "{rounded.field}"
    padding: "12px"
  navigation-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "0"
    padding: "10px"
  tag:
    textColor: "{colors.gold}"
    typography: "{typography.tag}"
  market-card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "12px"
---

# Design System: Dragon Vault

## Overview

**Creative North Star: "La bóveda del coleccionista"**

Dragon Vault presenta las cartas como piezas valiosas de una colección personal. Su carácter es oscuro, sobrio y nostálgico, con momentos de emoción al revelar cartas. El azul noche sostiene la interfaz; el oro antiguo destaca acciones, selección y datos relevantes.

Los controles son sobrios y claros, al servicio de las cartas. Las superficies se distinguen por tonos y bordes discretos. Las imágenes, los brillos de rareza y la apertura de sobres concentran la expresión visual. La densidad aumenta en colección y construcción de mazos para facilitar la consulta.

**Key Characteristics:**

- Fondos azul noche y acentos de oro antiguo.
- Títulos con Marcellus y controles con DM Sans.
- Imágenes de cartas protagonistas, conservando sus proporciones.
- Paneles discretos; luz y movimiento ligados a las cartas.
- Interfaz de colección densa y adaptable a pantallas pequeñas.

La extracción original partió de `dist/style.css` y los componentes de `dist/`, sin verificación renderizada en ese momento. La implementación vigente está en `app/assets/css/` y `app/components/`; las extensiones de cuentas y gestión de usuarios tuvieron revisión de capturas de escritorio y móvil. Esta actualización describe el código actual y conserva la identidad original, sin implicar una auditoría visual integral. Las declaraciones posteriores de la hoja de estilos prevalecen sobre las anteriores. Los nombres de roles añadidos aquí describen valores existentes; no implican que todos sean variables CSS actuales.

## Colors

La paleta combina neutrales azulados oscuros con un acento cálido; los colores de rareza aportan información sobre las cartas.

### Primary

**Oro antiguo** (`gold`) identifica acciones primarias, navegación activa, títulos auxiliares, enlaces de fuentes y progreso. El estado hover del botón primario usa `primary-hover`, con tinta oscura para el texto.

### Neutral

- **Azul noche** (`bg`): fondo general.
- **Azul de panel** (`panel`): filtros y contenedores de tienda.
- **Borde pizarra** (`line`): divisores y contornos discretos.
- **Plata azulada** (`muted`): texto secundario y controles de baja prioridad.
- **Blanco frío** (`text`): texto principal.
- `button`, `button-hover`, `field` y `field-line`: variaciones funcionales de las superficies oscuras.

### Semantic colors

Las comunes usan gris azulado; las raras, azul claro; las súper raras, violeta; las ultra raras y secretas, dorado. Las secretas añaden un borde más claro y un brillo particular. Las etiquetas escritas acompañan al color. Las acciones destructivas usan fondo rojizo, borde rojo apagado y texto rosado.

**The Rarity Rule.** Donde se representa una rareza concreta, conservar la correspondencia entre rareza, etiqueta, borde y brillo. La grilla de Mi colección es la excepción: agrupa por carta/variante, omite etiquetas de rareza y usa un marco neutro; las cantidades por rareza se consultan en la ficha. El oro de acción y el dorado de rareza tienen funciones diferentes aunque pertenezcan a la misma familia.

## Typography

**Display Font:** Marcellus, con Georgia y serif como alternativas.
**Body Font:** DM Sans, con sans-serif como alternativa.

Marcellus aporta una presencia clásica a títulos y nombres de secciones. DM Sans mantiene legibles controles, cantidades, filtros y metadatos. Las fuentes se solicitan actualmente a Google Fonts; su carga no fue verificada en esta extracción.

### Hierarchy

- **Display:** título principal, con tamaño fluido definido en el frontmatter.
- **Headline:** títulos de productos iniciales y fichas individuales.
- **Title:** encabezados de secciones, filtros y áreas de trabajo.
- **Body:** texto general y controles; los párrafos amplían el interlineado.
- **Card name:** nombre bajo la imagen; baja a 12px en la regla móvil general.
- **Eyebrow / tag:** etiquetas pequeñas con espaciado de letras.
- Los títulos de expansión usan 45px e interlineado 1.06; a 800px bajan a 34px. Son una variante del producto, no el tamaño global de todos los títulos.
- El constructor usa metadatos compactos de 10–13px. Se registran como estado actual, no como certificación de accesibilidad.

No existe una escala tipográfica proporcional única; conservar los roles antes que inventar una.

## Layout

El encabezado y el contenido general, incluido el constructor de mazos, ocupan el ancho disponible sin un tope máximo. El relleno lateral usa `clamp(16px, 2vw, 48px)`. El encabezado usa grid: marca, monedas y respaldo en la primera fila, navegación centrada en la segunda; desde 1400px, todos se distribuyen en una sola fila. Los párrafos introductorios y los textos del encabezado de sección limitan su lectura a 75ch.

La colección y la base de datos separan filtros laterales y resultados. La barra lateral mide 290px, con separación de 28px; pasa a 230px con separación de 16px a 850px. A 600px se apila y deja de ser fija. La grilla general usa columnas automáticas de al menos 145px; los resultados de colección usan columnas automáticas de al menos 160px, que bajan a 130px hasta 600px.

El constructor divide biblioteca y mazo en proporción aproximada 0.9/1.1. El tablero es sticky en escritorio y pasa a flujo normal a 1000px. A 500px, sus grillas usan tres columnas. Los mazos iniciales pasan de dos columnas a una a 1000px; los sobres especiales, a 800px.

Otros cortes existentes: 850px para filtros y revelado; 800px para estructura general y fichas; 650px para selectores de expansión; 600px para colección y revelado; 560px para encabezado; 520px para productos iniciales; 500px para filtros y mazos. Son reglas por componente, no una escala unificada de dispositivos.

El ritmo combina separaciones de 8–28px, con más aire entre secciones. No imponer una cuadrícula de espaciado uniforme que el código actual no tiene.

## Elevation & Depth

La profundidad se construye principalmente con fondos azulados, bordes finos y variaciones tonales. Los paneles de trabajo permanecen discretos. Las sombras, auras y brillos se concentran en las cartas, las ilustraciones de productos y la apertura de sobres. Los diálogos aíslan el contenido con un fondo oscuro translúcido y desenfoque.

### Shadow Vocabulary

- **Rareza rara:** `0 0 9px #71bcff40`.
- **Rareza súper:** `0 0 13px #b899ff65`.
- **Rareza ultra:** `0 0 16px #f4ca6a80, 0 0 3px #fff3cb`.
- **Rareza secreta:** `0 0 17px #f4ca6a80, 3px 0 8px #c8aaff55`.
- **Producto inicial:** `0 12px 30px #0008`.
- **Sobre sellado:** `0 18px 35px #0009`.
- **Fondo de diálogo:** `#020713cf`, con `backdrop-filter: blur(7px)`.

**The Card Spotlight Rule.** Mantener discretos los paneles de gestión y reservar la mayor intensidad de luz para las cartas y sus revelados.

## Shapes

Las cartas conservan su silueta vertical y usan imágenes contenidas, sin recorte. Las esquinas son suaves: menores en cartas y controles, mayores en áreas de trabajo, diálogos y productos. Los bordes habituales son de 1px; las imágenes usan un marco de 2px más 2px de separación interna; la grilla de colección mantiene ese marco neutro.

Las zonas de arrastre usan bordes discontinuos. La selección y el destino de arrastre se refuerzan con oro. La navegación utiliza pestañas rectas con subrayado; no adopta la forma redondeada de los botones comunes.

## Components

### Buttons

Sobrios y claros. El botón estándar combina superficie azulada, borde fino y esquinas suaves. El primario usa oro con texto oscuro y peso 700; al pasar el puntero se aclara. El botón discreto mantiene fondo transparente y texto secundario; el destructivo usa la variante rojiza.

Los botones, enlaces y elementos summary tienen foco explícito de 2px en oro, separado 4px. Los botones deshabilitados usan opacidad 0.5 y cursor de espera. La acción principal de apertura ocupa el ancho del panel y aumenta el relleno a 16px 20px.

### Inputs / Fields

Campos y selectores oscuros con borde pizarra, texto blanco y relleno de 12px. Los filtros compactos reducen su relleno y tamaño de texto. Las casillas usan el acento dorado.

La hoja vigente define `input:focus-visible` y `select:focus-visible`, además del foco explícito de botones y enlaces. Conservar el indicador visible en formularios de acceso, usuarios y editores.

### Navigation

Pestañas de texto secundario sobre fondo transparente. La pestaña activa usa oro y una línea inferior de 2px. La versión final admite varias filas y centra los elementos; a 560px reduce texto y relleno. Los contadores son pequeñas insignias rectangulares.

### Tags and card metadata

Las etiquetas de producto usan oro y espaciado entre letras, sin cápsula de fondo. Los contadores de copias se superponen en la esquina superior derecha de la carta, con fondo oscuro translúcido y borde claro o de rareza.

Los nombres identifican las cartas; sus códigos no se muestran ni se solicitan en el editor. Las ofertas y fichas abiertas desde Tienda indican «Común · No vendible»; el inventario marca las copias de ese origen como no vendibles y conserva la rareza de las compras antiguas.

### Cards / Containers

La carta de colección es una imagen interactiva sin panel exterior añadido. El nombre y las copias completan su lectura. Mi colección no muestra rareza en la grilla; las otras superficies pueden representarla cuando corresponde a una copia o producto concreto. Al pasar el puntero, la imagen sube 6px durante 0.2s. Las cartas no poseídas reducen saturación y opacidad; las agotadas eliminan el brillo.

Los nombres de la grilla ocupan una sola línea y se abrevian con puntos suspensivos cuando no caben. La vista previa al pasar el puntero o enfocar la carta muestra el nombre completo, tipo, estadísticas, copias y un extracto del efecto de hasta siete líneas; usa el panel azul existente y un ancho máximo de 360px limitado al espacio disponible. La ficha conserva la lectura completa al abrir la carta.

La tienda envuelve la carta en un panel con precio, existencias y acciones. Los productos iniciales usan superficies con gradiente radial violeta o azul, ilustración inclinada y sombra. Son tratamientos específicos de esos productos.

La selección de Sobres muestra hasta cinco cartas reales de cada producto en abanico, con la carta de portada en el centro. Los paneles conservan el fondo azul y usan acentos azul, violeta u oro para distinguir expansiones. Al pasar el puntero o recibir foco, el abanico se abre con desplazamiento y rotación durante 420ms. En dispositivos sin hover o con movimiento reducido permanece abierto y estático.

El editor de productos comparte campos y vista previa para expansiones y mazos de inicio: formulario y panel de resumen en escritorio, apilados en móvil. El selector de tipo adapta las etiquetas, el resumen y las cantidades al contenido fijo del mazo. Los mazos publicados reutilizan la presentación de productos iniciales, con portada, precio, total de cartas y acceso al contenido.

### Acceso y administración

`/login` conserva fondo azul noche, tipografía y controles del sistema: presentación y formulario en dos columnas en escritorio, una columna hasta 700px. Usa campos etiquetados de usuario/contraseña, acción Ingresar y estados de espera/error; no ofrece registro público.

`/usuarios` presenta creación de cuentas y filas con rol, bloqueo y recarga de monedas. Los controles se apilan en móvil. La navegación y acciones administrativas se muestran según el rol; el servidor valida los mismos permisos. Salir identifica la cuenta y cierra la sesión actual. La importación requiere confirmación por su efecto sobre progreso propio y existencias compartidas.

### Variantes de erratas

Las variantes post-errata se identifican mediante una E en un círculo y nombre accesible, conservando la imagen de la carta. En Mi colección, las versiones histórica y actual tienen entradas y cantidades separadas, sin etiquetas ni colores de rareza. La ficha muestra un resumen de cantidades por rareza y el detalle de expansión/formato. La revisión administrativa de cambios está dentro de Base de datos; no presenta cada cambio de texto como una variante funcional aprobada.

### Collection and deck workspace

Los filtros se agrupan en un panel lateral; los controles avanzados se despliegan. Biblioteca y mazo tienen contenedores propios. Las zonas principal y de fusiones usan bordes discontinuos; al recibir un arrastre pasan a borde e inserto dorados. Mantener los botones alternativos para agregar y quitar cartas.

### Dialogs and feedback

Los diálogos usan esquinas amplias, borde azulado, ancho máximo de 820px limitado a 94vw y altura máxima de 90vh. El revelado amplía el ancho a 1150px limitado a 96vw. El aviso breve aparece abajo y centrado, con fondo oro y texto oscuro.

La ficha de carta amplía el diálogo a 1080px limitado a 94vw: imagen de 240px a la izquierda y contenido de lectura a la derecha. El efecto o descripción aparece antes del inventario de copias y las fuentes, con texto de 16px e interlineado 1.75. Hasta 700px, la ficha pasa a una columna, centra una imagen de 120px y distribuye las estadísticas en dos columnas.

El texto del efecto usa blanco tanto en la ficha como en la vista previa; los metadatos secundarios conservan el tono atenuado.

Editar tienda conserva el diálogo y los controles existentes. Cada oferta muestra el nombre encima de los campos etiquetados «Precio» y «Existencias», junto a «Retirar». Los controles reparten el ancho disponible y admiten pasar a otra línea en pantallas estrechas.

### Pack reveal

El sobre sellado final es una lámina violeta y dorada con motivo del Milenio, sin texto, de 190 × 365px; en pantallas de hasta 600px mide 170 × 330px. La secuencia combina temblor, corte, desprendimiento superior y revelado de cartas. El reverso utiliza una imagen; el patrón CSS anterior está sustituido.

El giro dura 0.65s con `cubic-bezier(.2,.7,.2,1)`. Las cartas se distribuyen en cinco columnas y pasan a tres a 600px. El aura responde a la rareza y se omite para comunes. Las secretas incorporan un destello.

**The Reduced Motion Rule.** Conservar la regla existente de movimiento reducido que desactiva animaciones y transiciones. La apertura debe seguir siendo utilizable sin ellas.

## Do's and Don'ts

### Do:

- **Do** conservar Azul noche, Oro antiguo y Plata azulada en sus roles actuales.
- **Do** mantener Marcellus para títulos y DM Sans para lectura y controles.
- **Do** mostrar las cartas completas y acompañar la rareza con texto.
- **Do** mantener discretos los paneles y concentrar brillos en cartas y revelados.
- **Do** conservar alternativas al arrastre y respeto al movimiento reducido.

### Don't:

- **Don't** sustituir la identidad actual por los estilos predeterminados de Nuxt UI durante la migración.
- **Don't** aplicar el brillo de rareza como decoración general de paneles y formularios.
- **Don't** recortar ilustraciones de cartas para llenar contenedores de otra proporción.
- **Don't** confundir selectores antiguos de la hoja CSS con la apariencia final que resulta de sus sobrescrituras.
- **Don't** presentar esta extracción como una auditoría de accesibilidad o una verificación visual renderizada.
