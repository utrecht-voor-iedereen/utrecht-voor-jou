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
