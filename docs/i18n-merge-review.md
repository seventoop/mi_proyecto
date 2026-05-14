# I18n Merge Review

## Resumen

Esta rama corrige el bug por el cual, al cambiar el idioma de espanol a ingles, algunas partes visibles de la UI publica seguian mostrando textos en espanol. El cambio queda acotado a infraestructura i18n, diccionarios, componentes publicos visibles, metadata localizada, carrusel de testimonios y auditoria preventiva.

El diff contra `main` fue revisado despues de limpiar la rama y queda limitado a archivos relacionados con i18n. No quedan cambios netos en dashboard, Prisma, migraciones, Tour360, Masterplan, Logictoop, `package-lock.json` ni features no relacionadas.

## Cambios principales

### Flujo de idioma

- `LanguageProvider` mantiene `locale` y `dictionary` sincronizados en cliente.
- `POST /api/set-language` valida el locale con helpers compartidos y guarda la cookie `NEXT_LOCALE`.
- `middleware.ts` permite `/api/set-language` como excepcion publica puntual para el selector de idioma.
- El matcher de `middleware.ts` conserva el alcance original de `main` y suma solo `/api/set-language`.
- No se usa `/api/:path*`, para evitar cambiar el comportamiento global de APIs no relacionadas.
- `app/layout.tsx` lee `NEXT_LOCALE`, resuelve un locale valido y carga el diccionario correcto para la aplicacion.

### Diccionarios y helpers

- Se ampliaron `es.json` y `en.json` para cubrir textos visibles de landing y componentes publicos.
- Se agregaron helpers en `lib/i18n/format.ts` para validar locales, interpolar mensajes, formatear moneda/numeros y centralizar locales de `date-fns`.
- Se agrego `lib/i18n/client-dictionaries.ts` para que el cliente pueda actualizar el diccionario sin quedar en estado mixto.
- Se agrego `lib/i18n/metadata.ts` para centralizar metadata localizada.

### UI publica

- Se reemplazaron textos hardcodeados por claves de diccionario en formularios, navegacion publica, galeria, unidades, noticias, banners, previews y mensajes dinamicos.
- Placeholders, labels, `aria-label`, titles, errores de validacion y mensajes de envio ahora dependen del diccionario activo.
- La metadata de home/root layout queda localizada en espanol e ingles.
- La metadata espanola fue corregida para conservar acentos en el codigo fuente.

### Carrusel de testimonios

- El carrusel ya no muestra testimonios de base de datos en espanol cuando el usuario esta en ingles.
- En espanol puede seguir usando testimonios reales aprobados de DB.
- En ingles usa testimonios curados desde el diccionario hasta que la base de datos soporte contenido bilingue.
- La decision temporal queda documentada en `components/public/testimonios-carousel.md`.

### Prevencion

- Se agrego `__tests__/i18n/dictionaries.test.ts` para validar paridad profunda de claves, ausencia de strings vacios y helpers criticos.
- Se agrego `scripts/audit-i18n.mjs` con:
  - `npm run i18n:audit`, que bloquea problemas estructurales de diccionario.
  - `npm run i18n:audit:strict-hardcoded`, que tambien bloquea candidatos hardcodeados.
- CI incluye un job `i18n-audit`.

## Por que es correcto para mergear

- Resuelve el bug reportado en la superficie publica: selector de idioma, landing y carrusel de testimonios.
- El alcance fue recortado contra `main` y no mezcla features ajenas.
- No introduce migraciones, cambios de schema, cambios en `package-lock.json`, APIs nuevas de negocio ni dependencias nuevas.
- Mantiene el sistema i18n propio del proyecto, sin migrar a `react-i18next`, `next-intl` u otra dependencia.
- Agrega pruebas y auditoria para evitar que los diccionarios vuelvan a desalinearse.
- El middleware queda acotado: `/api/set-language` funciona sin abrir middleware a todo `/api`.

## Validacion ejecutada

Estos comandos fueron ejecutados sobre la rama:

```bash
git diff main --check
npm run test
npm run test -- __tests__/i18n/dictionaries.test.ts
npm run i18n:audit
npm run typecheck
npm run lint
npm run build
```

Resultado:

- `git diff main --check`: OK.
- `npm run test`: OK, 18 archivos y 79 tests.
- `npm run test -- __tests__/i18n/dictionaries.test.ts`: OK, 5 tests.
- `npm run i18n:audit`: OK.
- `npm run typecheck`: OK.
- `npm run lint`: OK, con warnings preexistentes del repo.
- `npm run build`: OK, con warnings conocidos/preexistentes del entorno local.
- Verificacion especifica de middleware: `middleware.ts` no contiene `/api/:path*`.

Warnings no bloqueantes observados:

- Next intenta corregir dependencias SWC faltantes en lockfile y no puede parchearlo automaticamente.
- Hay warnings de Sentry/OpenTelemetry por dependencias dinamicas.
- Algunas rutas dashboard reportan uso dinamico durante build.
- En local falta `DATABASE_URL`, por eso Prisma muestra errores durante generacion estatica, pero el build termina con exit code 0.

## Riesgos residuales

- `npm run i18n:audit` sigue reportando candidatos hardcodeados en auth/dashboard como advertencia. Eso es deuda existente y queda fuera del alcance de esta rama.
- El dashboard completo no queda traducido en esta iteracion.
- El carrusel en ingles usa contenido curado, no DB bilingue. La solucion definitiva seria extender el modelo editorial/testimonios con campos o traducciones por idioma.
- Conviene hacer una verificacion manual final en navegador antes del merge:
  - abrir `http://localhost:5000`,
  - cambiar a ingles,
  - revisar landing publica,
  - confirmar que el carrusel muestra testimonios en ingles,
  - confirmar que el selector de idioma sigue funcionando,
  - confirmar en Network que `POST /api/set-language` responde correctamente.

## Recomendacion

La rama esta tecnicamente lista para mergear a `main` despues de una ultima verificacion visual en navegador. Si esa prueba manual confirma que la landing, el selector y el carrusel funcionan correctamente en ingles, el merge es recomendable.
