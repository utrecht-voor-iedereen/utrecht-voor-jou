# CLAUDE.md — Utrecht Voor Jou

Notas para agentes que trabajen en este repo. Lo que ya está en `README.md` y
`CONTRIBUTING.md` no se repite aquí: esto son solo los sitios donde una
suposición razonable sale mal.

## Este repo NO es parte del monorepo

Vive dentro de `~/projects/apps/sites/` pero tiene su propio git, y su remoto es
`github.com/utrecht-voor-iedereen/utrecht-voor-jou` (una organización). Desde el
monorepo aparece como carpeta *untracked*.

- Commit y push van a **este** repo, no a `zaswear/zaswear-projects`.
- Usa **npm**, no pnpm. No está en `pnpm-workspace.yaml` y no debe estarlo.
- No lo cubre el `pages-mirror.yml` del monorepo, y es deliberado: ese workflow
  espeja en una dirección con `--delete` y borraría PRs de contribuidores
  externos. Es un proyecto comunitario con licencia EUPL-1.2.
- Los mensajes de commit no llevan el scope de proyecto del monorepo.

## Los datos no son de fiar

Regla de fondo del repo. El catálogo se generó, no se investigó, y arrastra
errores que ninguna validación detecta. En julio de 2026, 36 de 48 `officialUrl`
daban 404, cuatro dominios no tenían ni registro DNS, una entrada estaba titulada
en nueve idiomas con el nombre de una organización inexistente, y una subvención
documentaba 8 participantes mínimos donde la fuente oficial dice 5.

- `npm run validate` comprueba **la forma** del JSON. No dice nada sobre si un
  dato es cierto.
- Antes de fiarte de un importe, un requisito o un nombre de programa, léelo en
  la página oficial. Si no puedes confirmarlo, `verificationStatus:
  "por-verificar"` es la respuesta correcta.
- `npm run check-links` hace peticiones reales a utrecht.nl y a las webs de las
  organizaciones. Úsalo al terminar un cambio de datos, no en bucle.
- Los trámites de la gemeente están en `loket.digitaal.utrecht.nl`, no en
  `utrecht.nl`. Fue la causa de la mitad de los 404.

## Editar `data/beneficios.json`

- **Nunca lo reescribas con `JSON.stringify`.** Reformatea el archivo entero
  (los arrays inline pasan a multilínea) y genera un diff de miles de líneas.
  Haz reemplazo de texto exacto sobre el contenido crudo, o edición por líneas.
- **Cuidado con `git checkout` sobre este archivo.** Se lleva por delante
  cualquier trabajo sin commitear. Pasó una vez con los `searchAliases` de las 50
  entradas.
- Los cuatro campos traducidos (`title`, `shortDescription`, `eligibility`,
  `howToApply`) llevan los 9 idiomas. Dejar el texto de otro idioma en un campo
  es un bug; conservar el término neerlandés oficial en el título es
  intencionado y está explicado en `CONTRIBUTING.md`.

## Analítica

`site.config.json` guarda el código de GoatCounter (`utrecht-voor-jou`) y el build
inyecta el snippet solo si hay código; sin él, cero peticiones externas. El script
se añade desde JS tras comprobar Do Not Track y Global Privacy Control, así que
buscarlo con `grep '<script.*goatcounter'` en `dist/` no lo encuentra: está en el
`data-goatcounter` que pone `renderAnalytics()`. El service worker ignora las
peticiones cross-origin, por lo que la analítica nunca se cachea.

## Locales y feedback

`npm run validate` ahora exige **paridad de claves** entre `nl.json` y los otros
ocho idiomas: una clave que falte no rompe el build, imprime literalmente
`undefined` en la página de ese idioma. Al añadir una cadena, añádela a los 9.

El botón de cada ficha construye una URL a `issues/new` con `template`, `title`,
`item_id` y `page_url` prellenados. Los nombres de esos parámetros son los `id`
de los campos de `.github/ISSUE_TEMPLATE/correccion.yml`: si renombras un campo
ahí, el prellenado deja de funcionar en silencio (GitHub ignora los parámetros
que no reconoce).

## Campos estructurados (`amount`, `documentsNeeded`, `budgetStatus`)

`amount` es **dinero que la persona recibe o toma prestado**. Un ahorro estimado
(Energiebox, «zo'n € 175 per jaar») o un límite de ingresos (Kwijtschelding) no
lo son: meterlos hace que «ordenar por importe» mienta. Solo se rellena si el
texto ya verificado de la propia ficha lo dice.

El total del checker **excluye los préstamos** (`type: "préstamo"`). Sin ese
filtro, la Restauratielening de € 300.000 domina la suma y el titular pasa de
«esto podrías pedir» a una cifra falsa.

Gotcha de i18n: el tipo es `préstamo` con acento pero la clave del locale es
`type_prestamo` sin él. `dict['type_' + item.type]` falla en silencio e imprime
`PRÉSTAMO` en las 9 lenguas; usa `typeLabel()` en el build y el mismo
`replace('é','e')` en `checker.js`.

Los enlaces construidos en el navegador (checker y rotador «Wist je dat...?»)
deben salir de `window.BASE_PATH`. Una ruta absoluta `/nl/beneficio/1/` funciona
en local y da 404 en GitHub Pages, que sirve el sitio bajo `/utrecht-voor-jou/`.

## QR y hojas imprimibles

`scripts/lib/qr.js` es un encoder QR escrito a mano (modo byte, nivel M,
versiones 1-10) porque `devDependencies` está vacío a propósito. Verificado
módulo a módulo contra la librería `qrcode` de Python: 17 payloads × 8 máscaras,
136 matrices idénticas. `scripts/lib/qr.test.js` congela ese resultado en
hashes; si tocas el encoder y el test falla, **no lo actualices sin volver a
comparar contra una implementación de referencia** — un QR mal generado no falla,
simplemente no escanea.

Detalle que no es obvio: la elección de máscara **no** coincide con la de
python-qrcode, y es correcto. Esa librería puntúa las máscaras con el área de
formato en blanco; aquí se puntúa el símbolo real, como la spec y la referencia
de nayuki. Por eso el test compara con máscara forzada.

Las hojas (`/<lang>/print/<categoria>/`) llevan `noindex` y se generan con
`catalogData: []`: sin eso cada hoja arrastra los ~300 KB del catálogo embebido
que necesita el buscador del home. El tamaño impreso del QR está fijado en
centímetros en el `@media print` (2,6 cm ≈ 0,58 mm por módulo); a los 78 px de
pantalla el código impreso queda al límite de lo escaneable.

## Desarrollo local

- El **service worker cachea los assets**. Tras abrir la web una vez en local,
  tus cambios de CSS o JS dejan de verse. Hard reload, o *Application → Service
  Workers → Update on reload* en las DevTools.
- `dist/` está gitignored. Publica el workflow `deploy.yml`; un build local no
  sube nada. No lo añadas al índice para "arreglar" un deploy.
- El SSG no tiene dependencias y corre con Node pelado. Mantenlo así:
  `devDependencies` está vacío a propósito.
- `agent-browser` sirve para leer webs que renderizan con JS — el buscador de
  utrecht.nl devuelve HTML vacío a `curl`, pero con `open` + `eval` sí se lee.
