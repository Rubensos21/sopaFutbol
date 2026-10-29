# Sopa de Letras Futbolera

Juego local por turnos para exactamente tres personas en un mismo dispositivo. Aplicación completa con Vue 3, Composition API, TypeScript estricto y Vite, sin backend ni peticiones externas durante el juego.

## Ejecutar

Requisitos: Node.js 24 o superior y pnpm. Se conserva el `pnpm-lock.yaml` del proyecto.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abrir la dirección que indique Vite. Introducir tres nombres diferentes, de 2 a 30 caracteres, y pulsar «ARRANCAR EL PARTIDO».

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`pnpm typecheck` comprueba también las pruebas y los componentes Vue. `pnpm build` produce la aplicación en `dist/`.

## Cómo jugar

- Cada participante recibe una sopa independiente de 13 × 27 celdas y 20 futbolistas. El catálogo tiene 60 apellidos diferentes y pistas históricas en español.
- Tenés 30 segundos para tocar una letra de un apellido pendiente: se revela completo y suma 15 puntos. Después disponés de otros 30 segundos para asociar su pista y sumar otros 15.
- Una letra equivocada resta 10 y suma un error de letra. Expirar la búsqueda resta 10 sin sumar errores. Una pista equivocada o vencida resta 5 y conserva el descubrimiento.
- Cada intento de pista termina el turno. Fallar no consume la pista elegida de otro apellido; solo agota el intento del apellido descubierto.
- Los turnos siguen el orden circular y saltan a los eliminados. Treinta errores de letra eliminan al participante. Los puntos pueden ser negativos.
- El reloj global nunca se pausa. El partido acaba a los 20 minutos, al cerrar la última pista del vigésimo apellido o al quedar una sola persona sin eliminar.
- Gana la mayor puntuación entre los participantes no eliminados. Se respetan empates. El resultado presenta clasificación, estadísticas y todos los apellidos y pistas; «JUGAR DE NUEVO» limpia el estado.

Con teclado: Tab para entrar al tablero, flechas para recorrerlo y Enter/Espacio para tocar una letra. En móvil el tablero tiene desplazamiento horizontal y conserva celdas de 36 px; las pistas aparecen en dos columnas. El foco pasa a las pistas al descubrir una palabra y al título al terminar.

## Organización

- `src/data/footballers.ts`: catálogo tipado y local.
- `src/game/`: tipos, constantes, validación, RNG con semilla, generador verificable y motor puro. Sus funciones reciben el tiempo y no usan APIs del navegador.
- `src/composables/useMatch.ts`: única fuente de estado Vue, reloj de 150 ms, sincronización de visibilidad y limpieza de efectos.
- `src/views/`: preparación, partida y resultados.
- `src/components/`: instrucciones, cabecera, marcador, cuadrícula accesible, pistas, feedback e iconos SVG.
- `src/style.css` y `public/fonts/`: paleta de estadio, estilos responsive y fuentes condensadas locales WOFF2 con sus licencias. No se requiere Google Fonts.
- `src/tests/`: pruebas deterministas de reglas, generador, validación, render de componentes y ciclo de vida del reloj.
- `scripts/browser-tests.mjs`: prueba en Chromium con los cuatro tamaños de referencia, capturas y una partida real de veinte palabras.

## Decisiones del motor

Los cruces revelan únicamente el primer apellido pendiente en `placements`, cuyo orden es estable por longitud descendente y desempate con semilla. Todas las coordenadas se validan contra el modelo, nunca contra texto del DOM. El generador permite las ocho direcciones y cruces de letras iguales; tras intentos acotados dispone de una colocación horizontal de respaldo que garantiza las veinte palabras del catálogo.

Los cronómetros usan fechas límite absolutas. El límite global prevalece sobre cualquier expiración de fase. Si una pestaña suspendida vuelve antes de terminar el partido, se penaliza una sola vez la fase vencida y se abren treinta segundos nuevos para el siguiente participante. Una revisión por fase descarta eventos antiguos y una protección de 250 ms evita que un doble toque afecte al jugador siguiente, sin pausar el reloj.

Se usa el runner nativo de Node y el compilador SFC que ya aporta Vue, en lugar de instalar Vitest/jsdom: la instalación de dependencias adicionales no estuvo disponible en el entorno de entrega. Las pruebas siguen ejecutando los componentes reales y el composable, además del motor puro.

## Prueba visual en navegador

Con Chrome o Chromium instalado:

```sh
pnpm test:ui
# Si no se encuentra automáticamente el navegador:
BROWSER_PATH=/ruta/al/chromium pnpm test:ui
```

La prueba genera capturas en `docs/verification/` para 1376 × 768, 1440 × 900, 1024 × 768 y 390 × 844. Comprueba validación, puntuación, fases, final por tiempo, reinicio, veinte descubrimientos completos, ausencia de desbordamiento horizontal y errores de consola.

En el sandbox de entrega se aprobaron las comprobaciones de tipos, las pruebas automatizadas y la compilación de producción. La ejecución visual quedó pendiente: el entorno deniega sockets locales (`listen EPERM`) y la apertura de Chromium. Las referencias originales de `docs/references/` sí se inspeccionaron directamente y se implementaron sus composiciones en HTML/CSS; no se usan como fondos de la aplicación. Ver `docs/verification/STATUS.md`.
