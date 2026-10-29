# AGENTS.md — Sopa de Letras Futbolera

> **Instrucciones operativas para Codex.** Este documento es la especificación principal para **diseñar, implementar, probar y entregar** una aplicación web de juego de sopa de letras futbolera, inspirada visual y funcionalmente en las dos capturas de pantalla facilitadas por el usuario. **No es una propuesta ni un simple prototipo**: debes producir una aplicación terminada y ejecutable en el proyecto existente.

## 1. Rol, objetivo y forma de trabajo

Actúa como un **ingeniero frontend senior especializado en Vue 3, TypeScript, Vite, interfaces de videojuegos web, accesibilidad y pruebas automatizadas**. Implementa una web de juego local por turnos para **exactamente tres participantes** que usan un mismo dispositivo. Cada participante dispone de una **sopa de letras propia con 20 apellidos de futbolistas**. En su turno, intenta descubrir un apellido haciendo clic en una letra de la cuadrícula y, posteriormente, asociar el apellido revelado con su pista. La partida se resuelve por puntos y tiene un límite de tiempo global.

**Stack obligatorio:**

- Vite como servidor de desarrollo y herramienta de construcción.
- Vue 3, Composition API y componentes Single File Component (`.vue`) con `<script setup lang="ts">`.
- TypeScript estricto para estado, modelos, motor del juego, generación de tableros y componentes.
- HTML semántico y CSS moderno (CSS normal, CSS Modules o estilos `scoped`). No utilizar React, Angular, jQuery ni sustituir Vue.
- Aplicación frontend autocontenida, sin backend, cuentas de usuario, base de datos ni API externa para jugar.

**Forma de ejecución esperada de Codex:**

1. Inspecciona el repositorio y detecta su estructura, dependencias, gestor de paquetes, scripts y configuración actuales.
2. Mantén Vue + Vite + TypeScript y reaprovecha la infraestructura existente. Si ya hay decisiones técnicas compatibles, respétalas. No reconstruyas ni borres archivos ajenos a la funcionalidad sin necesidad.
3. Implementa la solución completa: pantallas, motor de reglas, catálogo futbolero, cuadrículas, temporizadores, estado global, estilos, responsive, accesibilidad y pruebas.
4. Ejecuta instalación solo si es necesaria, comprobación de tipos, pruebas y compilación. Corrige los problemas detectados.
5. Documenta brevemente en `README.md` cómo ejecutar la aplicación y entrega un resumen de los archivos modificados, comandos ejecutados y resultados. No declares completada la tarea con errores pendientes.
6. **No te detengas después de crear la estructura** ni respondas únicamente con recomendaciones o pseudocódigo. Programa todos los archivos necesarios para que el sitio sea utilizable de principio a fin.

Si una decisión menor no está explícitamente definida, toma la opción que preserve la mecánica descrita, sea mantenible y se parezca más a la referencia visual. **No hagas preguntas innecesarias ni omitas funcionalidades importantes.**

## 2. Fuentes de verdad y capturas de referencia

las imágenes están adjuntas en el contexto de trabajo o existen en el repositorio (`docs/references/`).
La interfaz debe reproducir el concepto, la composición, la jerarquía, los colores, los textos y la experiencia mostrados en:

1. **`indicaciones.jpg`**: pantalla de registro de los tres participantes e instrucciones. indicaciones.jpg Referencia original de aproximadamente **1176 × 1098 px**.

2. **`sopadeletras_ejemplo.jpeg`**: pantalla de partida con cronómetros, marcador, tablero y 20 pistas. sopadeletras_ejemplo.jpeg Referencia original de aproximadamente **1376 × 768 px**.

 **inspecciónalas directamente** antes de programar. Si Codex no tiene acceso a ellas en su entorno, **usa las descripciones exhaustivas de este documento**, que son suficientes para implementar el producto; no bloquees el trabajo por no encontrarlas. Las imágenes son referencias de diseño, **no fondos que se deban colocar como capturas**: toda la UI debe ser HTML/CSS/Vue interactiva.

**Prioridad ante conflictos:** las reglas funcionales escritas en las secciones 4–9 prevalecen sobre ambigüedades de una captura estática; las capturas prevalecen para composición y estilo cuando esta especificación no indica otra cosa.

## 3. Alcance y experiencia completa

La aplicación tendrá **tres estados o vistas funcionales**:

- **Preparación**: formulario de nombres de 3 participantes junto con instrucciones numeradas. Botón principal `ARRANCAR EL PARTIDO ▶`.
- **Partida**: cronómetro general, indicador de turno y cuenta regresiva de la fase, marcador de 3 participantes, **tablero individual del jugador activo**, panel de 20 pistas e información contextual sobre los aciertos/errores.
- **Resultado**: conclusión de la partida, ganador o empate, clasificación, puntuaciones, palabras halladas, pistas acertadas, errores, razón de finalización y opción `JUGAR DE NUEVO`.

**Flujo básico:** abrir web → introducir tres nombres → iniciar → alternar turnos con tablero propio → asociar apellidos y pistas → acabar por objetivo, tiempo o eliminación → consultar resultado → jugar otra partida.

No crear páginas incompletas, botones decorativos sin acciones, temporizadores ficticios, sopas de letras de texto estático, enlaces sin destino o pistas cuya respuesta no aparezca en el tablero.

## 4. Reglas del juego: contrato funcional obligatorio

### 4.1 Participantes y tableros

- Participan **exactamente tres personas**, denominadas Jugador 1, Jugador 2 y Jugador 3 antes de introducir su nombre.
- Se juega **por turnos en orden circular**: 1 → 2 → 3 → 1. Se saltan siempre los eliminados.
- Cada uno dispone de **su tablero independiente** con **20 apellidos ocultos**, un catálogo de 20 pistas correspondientes y estados de avance independientes. **No mostrar el tablero de otro participante** durante el turno actual.
- Cada uno empieza con **0 puntos, 0 errores de letra, 0 apellidos encontrados y 0 pistas asociadas**.
- Los 20 apellidos de cada tablero deben existir realmente como entradas del modelo; el contador `X/20` refleja cuántos apellidos ya fueron encontrados, con independencia de si la pista posterior se acertó o falló.
- Los tableros deben ser reproducibles desde una semilla para permitir pruebas; en partida normal la semilla puede ser aleatoria. Dos participantes no deben recibir un tablero idéntico. Preferir grupos de 20 futbolistas distintos por jugador si el catálogo proporciona al menos 60.

### 4.2 Dos fases consecutivas por turno

**Fase A — Buscar apellido (`searching`):**

1. El jugador activo tiene **30 segundos** para pulsar **una celda que pertenezca a un apellido todavía oculto de su tablero**. No hay que arrastrar ni seleccionar las letras de todo el apellido: **basta con tocar una letra correcta**, tal como especifica la pantalla de reglas.
2. Cuando la celda pertenece a uno o más apellidos sin descubrir, se identifica de forma determinista uno de ellos, se **revela el apellido completo visualmente** sobre sus celdas y se indica su nombre de manera accesible; se otorgan **+15 puntos** y aumenta `encontrados` en 1.
3. Inmediatamente se pasa a la **fase B**, con **otros 30 segundos** para escoger la pista correspondiente al apellido recién revelado. El reloj global de 20 minutos sigue avanzando y **no se pausa** durante el cambio de fase, animaciones o lectura.
4. Si se toca una celda que **no pertenece a ningún apellido todavía oculto**, se registra un error de letra, se restan **10 puntos**, se incrementa en **1** el contador de errores `X/30` y **termina el turno**. Una letra perteneciente únicamente a palabras ya encontradas se considera incorrecta para esta fase.
5. Si transcurren los 30 segundos **sin tocar ninguna letra válida**, se restan **10 puntos**, **no se incrementa** el contador de errores de letra (no hubo una pulsación incorrecta) y termina el turno.

**Fase B — Asociar pista (`matching`):**

1. La palabra revelada y sus celdas continúan destacadas. Se habilitan los botones de las pistas pertinentes **del tablero del participante actual**. Las pistas pertenecientes a asociaciones ya resueltas o ya intentadas con anterioridad se presentan deshabilitadas para evitar duplicados.
2. El participante pulsa **una** de las pistas para asociarla con el apellido que acaba de descubrir. La validación se basa en identificadores estables, no en comparar texto visible.
3. Si la pista es correcta: **+15 puntos**, se registra como `pista acertada`, se marca visualmente la relación resuelta y **pasa inmediatamente el turno** al siguiente participante.
4. Si la pista es incorrecta: **−5 puntos**, se registra la asociación como fallida para ese apellido y **pasa inmediatamente el turno** al siguiente participante. **No** incrementa el contador `X/30`.
5. Si se agotan los 30 segundos de la fase B sin pulsar una pista: se trata como **pista fallida, −5 puntos**, **sin** incrementar los errores de letra; termina el turno.
6. Los **+15 puntos de descubrir la palabra se conservan** aunque falle o se agote el plazo de su pista. Un apellido ya descubierto nunca vuelve a ofrecer puntos de descubrimiento y no se puede volver a asociar en un turno posterior.
7. Durante la fase A las pistas se muestran, pero **no pueden activarse**; durante la fase B la cuadrícula no acepta nuevos intentos. Una sola interacción válida debe procesarse por fase; bloquear dobles clics y toques repetidos mientras se actualiza el estado.

### 4.3 Puntuación, eliminación y finalización

| Situación | Puntos | Errores de letra (`X/30`) | Resultado inmediato |
|---|---:|---:|---|
| Encontrar una letra que revela un apellido oculto | **+15** | +0 | Activar fase B de 30 s |
| Elegir su pista correcta | **+15** | +0 | Pasar turno |
| Pulsar letra que no corresponde a palabra pendiente | **−10** | **+1** | Pasar turno |
| Expirar fase A sin encontrar palabra | **−10** | +0 | Pasar turno |
| Elegir pista incorrecta | **−5** | +0 | Pasar turno |
| Expirar fase B sin elegir pista | **−5** | +0 | Pasar turno |

- **No limitar artificialmente los puntos al mínimo 0**: son posibles puntuaciones negativas y deben verse correctamente en el marcador.
- Al llegar exactamente a **30 errores de letra**, el participante se marca **ELIMINADO** y ya no recibe turnos. Las pistas erróneas y los tiempos agotados nunca suman a esos 30 errores.
- El partido dura un máximo de **20 minutos reales (1200 segundos)** desde que se inicia. Mostrar cuenta regresiva `MM:SS`.
- La partida termina **de forma inmediata al concluir la fase de pista correspondiente al apellido número 20 descubierto por un jugador**; así no se pierde la oportunidad de asociar esa última pista. También termina cuando llega a cero el cronómetro global, o cuando queda solo un jugador no eliminado.
- Si el reloj global termina en medio de una fase, **el partido termina inmediatamente** sin aplicar además una penalización por vencimiento de esa fase. El final global tiene prioridad.
- El ganador es **quien tenga más puntos entre los participantes no eliminados al finalizar**. En caso de puntuaciones máximas iguales, mostrar **EMPATE** e identificar a los empatados, sin inventar un desempate. Si los tres quedan eliminados, mostrar partida sin ganador y la explicación correspondiente.
- Los participantes eliminados siguen apareciendo en la clasificación con puntuación y condición `ELIMINADO`, pero **no pueden ganar**.
- Si la partida termina por haber encontrado los 20 apellidos o porque queda un único participante, indicar explícitamente esa causa en el resultado.

### 4.4 Casos límite e invariantes

- Una celda puede coincidir con dos apellidos que se crucen: en fase A debe descubrirse **uno solo**, mediante un orden estable documentado (por ejemplo, primero el que aparezca antes en `placements` entre los aún pendientes). El otro seguirá pendiente.
- Una celda que forma parte de un apellido resuelto **y** de otro oculto es válida: seleccionar el oculto.
- Los clics justo al expirar una fase deben resolverse **según la hora límite**, no por el orden casual del `setInterval`: si la hora actual es mayor o igual al plazo, se procesa primero la expiración.
- Una vez finalizada la partida, ninguna interacción puede modificar puntuaciones o estado.
- Nunca permitir que un jugador eliminado vuelva a ser activo.
- El contador de encontrados nunca supera 20, el de asociaciones correctas nunca supera encontrados, el de errores nunca supera 30 y solo puede existir un jugador activo.
- Cada descubrimiento otorga puntos exactamente **una vez**; cada pista puede intentarse **una sola vez**; cada vencimiento de fase penaliza **una sola vez**.
- El botón `JUGAR DE NUEVO` debe limpiar estados, temporizadores y tableros y permitir crear una partida nueva sin recargar manualmente el navegador.

## 5. Pantalla inicial: fidelidad visual y contenidos

### 5.1 Composición de escritorio

Recrear la captura `indicaciones.jpg` como una landing de dos columnas sobre un **fondo verde botella casi negro**:

- **Izquierda (~42 %)**: columna de acceso, centrada verticalmente y con espacio generoso a los costados. Contenido alineado a la izquierda. Divisor vertical fino verde-gris que separa ambas columnas.
- **Derecha (~58 %)**: panel grande de instrucciones con bordes suavemente redondeados, fondo verde ligeramente más claro que el resto, borde sutil, padding generoso y altura acorde con las seis reglas.
- Mucho espacio negativo, apariencia de transmisión deportiva/juego de fútbol; la composición no debe parecer un formulario empresarial genérico.

**Columna izquierda, en este orden:**

1. Insignia/píldora horizontal con pequeño icono de balón y texto en mayúsculas **`SOPA DE LETRAS FUTBOLERA`**, fondo verde oliva oscuro, borde dorado tenue, tipografía condensada, negrita y mayor separación entre letras.
2. Título de gran impacto dividido visualmente en dos líneas: **`NOMBRES DE LOS`** / **`JUGADORES`**; color crema/blanco, tipografía alta y muy condensada, mayúsculas, peso alto.
3. Texto complementario: **`Completá los nombres de los 3 participantes para arrancar el partido.`**
4. Tres grupos de entrada con pequeña marca circular de color y etiqueta **`JUGADOR 1`**, **`JUGADOR 2`**, **`JUGADOR 3`**. Colores respectivamente **azul**, **rojo/coral**, **violeta**. Campos rectangulares amplios, esquinas redondeadas, fondo verde oscuro semitransparente y borde gris/oliva; borde y sombra dorados cuando tienen foco.
5. El primer campo puede mostrarse prellenado con **`Davo "El Profesor"`** como ejemplo de la captura; los otros dos con `Nombre del jugador 2...` y `Nombre del jugador 3...`. El usuario puede editar los tres.
6. Botón primario de ancho completo, fondo amarillo-naranja con gradiente ligero, texto oscuro y condensado en negrita: **`ARRANCAR EL PARTIDO ▶`**. Hover, focus, active y disabled visibles.

Validación: tres nombres no vacíos tras `trim`, mínimo 2 y máximo 30 caracteres, sin nombres repetidos ignorando mayúsculas/minúsculas y espacios extremos. Mostrar mensajes claros **junto al campo** y no arrancar hasta corregirlos. `Enter` puede iniciar solo si todos son válidos. Etiquetas visibles y `label` vinculadas a `input`.

### 5.2 Panel derecho: instrucciones textuales

Encabezado en amarillo crema: **`Cómo se juega:`**. Debajo, seis reglas con números dentro de pequeños rectángulos azules con esquinas mínimamente redondeadas, separados por amplio espacio vertical. Respetar los términos de juego y usar el siguiente texto (se permiten correcciones ortográficas leves sin cambiar el sentido):

1. **Cada jugador tiene su propia sopa de letras con 20 apellidos escondidos.**
2. **Van jugando por turnos, uno detrás del otro: tenés 30 segundos para tocar una letra que forme parte de un jugador y revelarlo. Al encontrarlo arrancan otros 30 segundos (el reloj sigue corriendo, no se detiene) para leer las pistas y elegir la correcta.**
3. **Tocá la pista que le corresponde para unirlo vos mismo. Si te equivocás de letra o de pista, o se te acaba el tiempo, el turno pasa directo al siguiente jugador. ¡Si acertás la unión, también sigue el que viene!**
4. **Todos arrancan en 0 puntos. Adivinar una palabra en la sopa suma 15, y unirla con su pista suma 15 más. Una letra equivocada, o dejar pasar el turno sin clickear nada, resta 10. Errar la pista después de haber encontrado la palabra resta 5. ¡Gana quien más puntos tenga al terminar!**
5. **Ojo: tocar una letra que no corresponde te acerca a la eliminación — si llegás a 30 de esos errores quedás ELIMINADO automáticamente. Errar la pista no suma a este contador (aunque sí te resta puntos).**
6. **El partido tiene un límite de 20 minutos en total: si nadie completó su sopa antes, corta ahí y gana quien más puntos tenga en ese momento.**

Priorizar legibilidad y ritmo visual; el texto de reglas no debe desbordar ni aparecer truncado.

## 6. Pantalla de juego: descripción pixel-orientada

La captura `sopadeletras_ejemplo.jpeg` muestra una interfaz **horizontal, densa, de pantalla casi completa**, con estética de césped de estadio y énfasis en las letras grandes. Crear el siguiente layout (sin fijar alturas que produzcan cortes cuando cambie la ventana):

### 6.1 Fondo, paleta y tipografía

**Paleta orientativa** (ajustar al observar las capturas):

| Token CSS | Valor sugerido | Uso |
|---|---|---|
| `--bg-deep` | `#061F15` | Fondo principal |
| `--bg-surface` | `#102D22` | Paneles y tarjetas |
| `--bg-card` | `#183A2B` | Inputs, marcador, tarjetas de pistas |
| `--pitch-green` | `#0E4A30` | Césped del tablero |
| `--gold` | `#F8C743` | Títulos, indicadores, bordes y cronómetro |
| `--orange` | `#FFAE32` | Gradiente del botón principal |
| `--text-main` | `#F4F6EC` | Textos y letras |
| `--text-muted` | `#A9BAAE` | Textos secundarios |
| `--blue-player` | `#20A7EE` | Jugador 1 |
| `--red-player` | `#FF525C` | Jugador 2 |
| `--purple-player` | `#B66CF0` | Jugador 3 |
| `--danger` | `#F46B65` | Errores, eliminación |

Cargar si es viable una fuente condensada robusta como **`Barlow Condensed`** para títulos, letras, marcadores y pistas, con fallback `Arial Narrow`, sans-serif. Usar una tipografía sans legible para inputs y textos extensos; minimizar fuentes y dependencias. Las letras de la sopa van en mayúsculas, **muy legibles**, con espaciado consistente y peso fuerte.

Añadir al fondo de juego **franjas diagonales de césped** muy sutiles (mediante `repeating-linear-gradient` y/o pseudoelementos), con verdes alternos y un ligero resplandor central, cuidando que las letras mantengan gran contraste. No usar fotografías pesadas, imágenes de stock, logos registrados ni escenas externas como sustitutos del diseño.

### 6.2 Barra superior: cronómetros e información del turno

Una banda oscura ocupando todo el ancho, con borde fino y radios discretos. Repartir en **tres bloques**:

- **Izquierda**: pequeño punto en el color del participante, etiqueta de dos niveles **`TURNO DE`** encima y nombre activo de gran contraste/azul. Ejemplo de referencia: `DAVO "EL PROFESOR"`.
- **Centro**: etiqueta **`FIN DE PARTIDO EN`**, debajo el cronómetro global `19:56` en dorado claro (empieza en `20:00`).
- **Derecha**: icono de cruz roja, contador **`X/30`** de letras falladas del participante activo, y temporizador grande en amarillo para la fase actual, p. ej. **`26`** (empieza en **`30`**).

Debajo de la barra, una línea horizontal muy fina de progreso dorado que represente el **tiempo global restante**; se reduce suavemente de izquierda a derecha. No usar un valor hardcodeado.

Mostrar además una indicación pequeña pero clara de la **fase actual** (`BUSCÁ UN APELLIDO` o `ELEGÍ SU PISTA`) y, en fase B, el apellido recién revelado. Evitar alterar significativamente la estructura de la captura.

### 6.3 Marcador de tres jugadores

Fila inmediatamente inferior con tres tarjetas de ancho parecido (cada una aproximadamente un tercio):

- Indicador circular con el color de cada jugador.
- Nombre completo, sin pérdida de identidad; truncar con `text-overflow` solo donde haga falta y proveer nombre completo en `title`/texto accesible.
- Ícono de corona dorada (`♛` mediante SVG/icono o alternativa vectorial) seguido de puntos y **`PTS`**.
- Progreso **`X/20`** de apellidos encontrados.
- Opcionalmente indicadores secundarios discretos de pistas acertadas y tiempo de turno, si no saturan la referencia.
- Participante activo con borde dorado y fondo destacado. Los otros, verdes translúcidos.
- Eliminado con opacidad reducida, etiqueta **`ELIMINADO`** y sin posibilidad de volver al turno.

Nunca mezclar la puntuación o los errores del jugador activo con el resto.

### 6.4 Cuadrícula de sopa de letras

La captura muestra una sopa **amplia, centrada y apaisada**, visualmente cercana a **13 filas × 27 columnas**. Usar por defecto **13 × 27** para acercarse a su densidad; debe haber **351 botones/celdas**, y las 20 palabras tienen que encajar realmente. Mantener filas y columnas constantes en una partida.

- Zona central ocupando la mayor parte de la altura disponible de la pantalla de juego.
- Celdas uniformes, sin huecos visibles entre letras, con apariencia de matriz sobre césped verde. Contorno sutil alrededor del conjunto; líneas internas ausentes o muy discretas.
- Letra centrada por celda, blanca/crema, mayúscula, en tipografía condensada con peso alto.
- Hover y focus sobre celda con fondo un poco más claro y borde/outline perceptible.
- Celdas de apellido encontrado: fondo de acierto tenue y letras resaltadas; el apellido recién descubierto debe destacar todavía más. Es útil añadir una animación breve de revelado respetando `prefers-reduced-motion`.
- Celdas pulsadas incorrectamente: feedback visual momentáneo rojizo y mensaje de −10, sin dejar marca que revele posiciones de futuras palabras.
- Mostrar tableros diferentes al cambiar de turno, conservando todas las celdas descubiertas **únicamente en su tablero respectivo**.
- No convertir toda la cuadrícula en una imagen o `<canvas>` inaccesible: construir una **CSS Grid de botones nativos** con etiquetas accesibles y eventos Vue.

### 6.5 Panel de pistas en la parte inferior

Panel oscuro ancho con título pequeño **`PISTAS`** y un pequeño icono de lista/nota. **20 tarjetas** compactas, en la captura organizadas como **2 filas de aproximadamente 10 columnas** a 1376 px.

- En pantallas anchas, usar un grid de 10 columnas si el texto conserva legibilidad; en resoluciones intermedias adaptar a 5, 4 o menos columnas y permitir que la página crezca o que el área de pistas tenga scroll propio, según sea más usable.
- Cada tarjeta tiene superficie verde oscura, borde sutil, radio pequeño, minúscula pastilla con número de pista y texto claro en 2–4 líneas. Evitar cortes por `overflow: hidden` que eliminen contenido esencial.
- No mostrar el apellido-respuesta dentro de una pista **antes de resolverla**, solo la descripción futbolera; no revelar en el HTML visible una clave textual de respuestas para el jugador.
- En fase A: tarjetas visibles y semánticamente deshabilitadas, sin acciones de selección.
- En fase B: tarjetas aún disponibles activadas, efectos hover/focus; la pista asociada al apellido recién hallado **no debe señalarse de antemano**.
- Pistas acertadas: estado `RESUELTA`, color/acento suave, deshabilitadas. Pistas ya asociadas a una palabra con intento fallido: marcar apropiadamente como `NO DISPONIBLE` para evitar reutilizarlas, según la estrategia de bloqueo detallada más abajo.
- Al hacer clic en una pista incorrecta, **no consumir de manera permanente la pista correcta de otra palabra**. Solo se agota el intento del **apellido actual**. La pista incorrecta escogida permanece disponible para una futura palabra a la que sí pertenezca, evitando tableros irresolubles. La pista correcta del apellido fallido deja de poder puntuar más adelante y puede mostrarse como bloqueada por ese apellido, sin delatar el vínculo en plena partida.

**Estilo de pistas:** humor y referencias futboleras, como en la captura (clubes, entrenadores, nacionalidades, sobrenombres, carreras, temporadas). Mantener español natural, conciso y coherente con la referencia.

### 6.6 Feedback y mensajes

Crear una región discreta `aria-live="polite"`/`role="status"` o mini aviso no intrusivo para comunicar:

- `¡Encontraste a WIJNALDUM! +15 puntos. Elegí su pista.`
- `¡Pista correcta! +15 puntos.`
- `Letra incorrecta. −10 puntos. Turno siguiente.`
- `Pista incorrecta. −5 puntos. Turno siguiente.`
- `Tiempo agotado. −10 puntos.` o `Tiempo agotado para la pista. −5 puntos.`
- `Jugador eliminado por 30 letras incorrectas.`

El aviso no debe bloquear la interacción más tiempo que el necesario para la transición ni pausar los cronómetros. No usar `alert()` del navegador para cada jugada.

## 7. Catálogo de futbolistas y pistas

Implementar los datos en un archivo tipado, por ejemplo `src/data/footballers.ts`, **sin peticiones HTTP durante el juego**. Usar **al menos 60 entradas reales** (20 para cada uno de los 3 participantes), con un apellido/palabra distinta en cada entrada de una misma partida y **exactamente una pista inequívoca asociada a cada entrada**.

Definir, como mínimo:

```ts
export interface Footballer {
  id: string;              // Estable, único. Ej.: 'georginio-wijnaldum'
  fullName: string;        // Nombre para documentación o resultado
  surname: string;         // Apellido mostrable, ej. 'Wijnaldum'
  puzzleWord: string;      // WIJNALDUM, normalizado para cuadrícula
  clue: string;            // Pista futbolera que no revela directamente el apellido
}
```

**Reglas de contenido y normalización:**

- Usar apellidos verdaderos y pistas futboleras plausibles, factualmente correctas y con redacción revisada. No generar las pistas con strings al azar, lorem ipsum, frases inconexas o respuestas que no existan.
- Preferir nombres reconocibles de fútbol mundial y latinoamericano, con variedad entre eras y clubes. Ejemplos de posibles referencias: Messi, Suárez, Modrić, Haaland, Neymar, Dybala, Di María, Wijnaldum, Iniesta, Mbappé, Lewandowski, Zidane, Riquelme, Benzema, etc.; comprobar que las pistas correspondan de verdad al futbolista representado.
- `puzzleWord = surname.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '')`. Las letras de tablero son A–Z, sin espacios, acentos ni signos. No exigir a los usuarios introducir palabras; solo tocar letras.
- Evitar apellidos repetidos después de normalizar: si dos jugadores tienen el mismo apellido, emplear otro futbolista para que `puzzleWord` y pista mantengan una relación unívoca.
- Elegir longitudes de palabra compatibles con 13 × 27; preferir 4–13 letras, y evitar elementos excesivamente largos.
- No incluir literalmente el apellido oculto en su pista ni en una etiqueta visible del panel de pistas.
- Construir las asignaciones a tableros mediante barajado con semilla: **60 entradas distintas → 3 listas de 20**. Cada lista tiene su propio orden de pistas, tablero, avances y asociaciones.
- Antes de comenzar, validar la integridad del catálogo: IDs únicos, 60 registros válidos, `puzzleWord` única y sin caracteres prohibidos, pista no vacía, 20 palabras seleccionadas por tablero. Lanzar error controlado si la integridad falla, nunca mostrar un tablero corrupto.

## 8. Generación real y verificable de la sopa de letras

Desarrollar en TypeScript puro (sin dependencia innecesaria) un generador `generateWordSearch(words, options)` parametrizable:

```ts
type Direction =
  | 'E' | 'W' | 'N' | 'S'
  | 'NE' | 'NW' | 'SE' | 'SW';

interface Position { row: number; col: number }

interface WordPlacement {
  footballerId: string;
  word: string;
  start: Position;
  direction: Direction;
  cells: Position[];  // Posiciones exactas que ocupa
}

interface WordSearchBoard {
  rows: number;              // 13
  cols: number;              // 27
  letters: string[][];       // Dimensiones 13 × 27
  placements: WordPlacement[]; // Exactamente 20
}
```

**Algoritmo requerido:**

1. Aceptar un generador de números aleatorios inyectable con semilla (`rng`) para reproducibilidad de tests.
2. Ordenar las 20 palabras por longitud descendente para facilitar su colocación; aleatorizar direcciones y posiciones candidatas.
3. Colocar palabras en horizontal, vertical y diagonal, permitiendo **las 8 direcciones**, siempre dentro de los límites del tablero.
4. Permitir que dos palabras se crucen **solo cuando comparten la misma letra**; jamás sobrescribir con otra letra una celda ya ocupada.
5. Reintentar posiciones, direcciones y, si hace falta, reconstruir el tablero con nuevas semillas hasta que **las 20 palabras estén colocadas**. Establecer un máximo acotado de intentos y un fallback fiable; prohibido entregar una sopa con menos de 20.
6. Rellenar al final los huecos restantes con letras A–Z seudoaleatorias de frecuencia razonable.
7. Guardar `placements` como fuente de verdad de qué celdas son válidas y cuáles forman cada palabra. **No basar la comprobación en buscar texto con regex en el grid** ni en recorrer caracteres en pantalla.
8. Comprobar mediante función de validación que cada secuencia de `cells` corresponde exactamente a su `word`, que no hay posiciones fuera de rango y que cada ID está una vez.
9. Evitar tableros triviales o repetitivos: mezclar direcciones (incluir al menos horizontales, verticales y diagonales si los intentos lo permiten), distribuir palabras entre zonas y no colocar deliberadamente las 20 en un solo borde.
10. Mantener los cruces y descubrimientos independientes entre jugadores.

**Regla específica de clic:** recibir `row` y `col` → localizar `placements` no descubiertos que contienen dicha posición → si existe alguno, escoger el primero según un orden estable y descubrirlo por completo. Una sola pulsación revela **una palabra**, aunque la letra esté en un cruce.

## 9. Temporización precisa, transiciones y estado

### 9.1 Relojes

Usar tiempos límite absolutos (milisegundos Unix, `Date.now()`) para garantizar una cuenta regresiva real incluso si la pestaña pierde foco o si el navegador pausa intervalos:

- `matchDeadlineMs = matchStartedAtMs + 20 * 60 * 1000`.
- `phaseDeadlineMs = phaseStartedAtMs + 30 * 1000`.
- El temporizador visible de fase es `Math.max(0, Math.ceil((phaseDeadlineMs - nowMs) / 1000))`.
- El temporizador visible global usa el mismo criterio, formateado como `MM:SS`.
- Se permite un intervalo de render a 100–250 ms, pero la fuente de verdad son las **fechas límite**, no un contador decrementado cada segundo.
- Sincronizar estado al recuperar visibilidad (`visibilitychange`) y antes de aceptar cualquier acción. Cancelar intervalos/escuchas al desmontar.
- La barra de progreso superior refleja `(matchDeadlineMs - nowMs) / 1200000` acotado a `[0,1]`.

### 9.2 Máquina de estados

Mantener una **máquina de estados explícita** (Pinia recomendado, o composable central si no es necesario instalar Pinia), sin dispersar reglas en distintos componentes:

```ts
type GameStatus = 'setup' | 'playing' | 'finished';
type TurnPhase = 'searching' | 'matching';
type MatchEndReason = 'all-found' | 'time-limit' | 'last-survivor' | 'all-eliminated';

interface PlayerState {
  id: string;
  name: string;
  color: 'blue' | 'red' | 'purple';
  score: number;
  letterErrors: number;
  eliminated: boolean;
  foundFootballerIds: string[];
  correctlyMatchedIds: string[];
  failedMatchedIds: string[];
  board: WordSearchBoard;
  footballers: Footballer[]; // Exactamente 20 para este jugador
}

interface MatchState {
  status: GameStatus;
  players: PlayerState[];
  activePlayerIndex: number;
  phase: TurnPhase;
  currentRevealedFootballerId: string | null;
  matchStartedAtMs: number | null;
  matchDeadlineMs: number | null;
  phaseDeadlineMs: number | null;
  endReason: MatchEndReason | null;
}
```

Puedes refinar el modelo para guardar feedback, semilla, registro de jugadas, `matchResult` o IDs de pistas ya consumidas; conserva la separación explícita entre **palabra encontrada** y **pista acertada**.

**Acciones de negocio recomendadas:** `startMatch(names, seed)`, `selectCell(row, col, nowMs)`, `selectClue(clueId, nowMs)`, `tick(nowMs)`, `advanceTurn(nowMs)`, `finishMatch(reason, nowMs)`, `resetMatch()`.

**Recomendación fuerte:** trasladar las reglas deterministas a funciones puras (motor/reducer) separadas de los componentes Vue; recibir `nowMs` y aleatoriedad como entradas en tests, no usar `setTimeout` oculto en el motor.

### 9.3 Orden de prioridades

En cada acción y en cada `tick`:

1. Si `status !== 'playing'`, no procesar acciones de juego.
2. Si `nowMs >= matchDeadlineMs`, finalizar por `time-limit` **antes** de penalizar una fase.
3. Si `nowMs >= phaseDeadlineMs`, expirar la fase exactamente **una vez** con su penalización y avanzar, salvo que el partido haya terminado.
4. Si aún hay tiempo, procesar acción del participante y fase activos.
5. Después de la acción, evaluar si llegó a 30 errores, si se completó el vigésimo descubrimiento al cerrar su fase B o si queda un único jugador habilitado; finalizar o buscar al siguiente jugador.

`advanceTurn` calcula el siguiente jugador no eliminado módulo 3, pone `phase='searching'`, limpia el apellido temporal e inicia **30 segundos nuevos**. Si no existe siguiente jugador apto, finalizar limpiamente.

### 9.4 Asociación de pistas sin callejones sin salida

Usar `clueId === footballerId` (o una relación explícita equivalente). Solo el apellido actual puede dar puntos de pista. Cuando la persona falla, registrar **ese apellido** como `failedMatchedIds` y no volver a ofrecerlo para puntuar; **no bloquear la pista equivocada seleccionada** si pertenece a otro apellido que aún puede encontrarse. Este detalle es obligatorio para evitar que un fallo de un turno impida resolver otra palabra posterior.

## 10. Estructura recomendada del proyecto

Adaptar a la estructura que ya exista en el repositorio. Si es un Vite/Vue vacío, usar una organización aproximada como esta (nombres orientativos, responsabilidades obligatorias):

```text
.
├── AGENTS.md
├── README.md
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   └── ...
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── assets/
│   │   └── ...
│   ├── components/
│   │   ├── setup/
│   │   │   ├── PlayerNameInput.vue
│   │   │   └── RulesPanel.vue
│   │   ├── game/
│   │   │   ├── MatchHeader.vue
│   │   │   ├── Scoreboard.vue
│   │   │   ├── WordSearchGrid.vue
│   │   │   ├── WordSearchCell.vue
│   │   │   ├── CluesPanel.vue
│   │   │   ├── ClueCard.vue
│   │   │   └── TurnFeedback.vue
│   │   └── results/
│   │       └── ResultsPanel.vue
│   ├── views/
│   │   ├── SetupView.vue
│   │   ├── GameView.vue
│   │   └── ResultsView.vue
│   ├── data/
│   │   └── footballers.ts
│   ├── game/
│   │   ├── types.ts
│   │   ├── normalize.ts
│   │   ├── random.ts
│   │   ├── wordSearch.ts
│   │   ├── scoring.ts
│   │   ├── matchEngine.ts
│   │   └── validation.ts
│   ├── stores/
│   │   └── matchStore.ts
│   ├── composables/
│   │   └── useGameClock.ts
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── base.css
│   │   └── layout.css
│   └── tests/
│       ├── wordSearch.test.ts
│       ├── matchEngine.test.ts
│       └── setupValidation.test.ts
└── ...
```

No crear componentes artificialmente pequeños si no aportan reutilización; la intención es separar **presentación, lógica de negocio y datos**. Elegir una sola fuente de verdad para el partido; evitar estados duplicados entre `App.vue` y componentes hijos. Si el repositorio ya usa router, reutilizarlo; de lo contrario, una sola SPA con tres vistas condicionadas por el estado del partido es suficiente y evita dependencias innecesarias.

**Dependencias:**

- Vue + Vite + TypeScript ya existentes.
- Pinia para un estado global claro **si aún no existe una alternativa equivalente** y su incorporación aporta valor.
- `vitest` + `@vue/test-utils` para unit/component tests; añadir `jsdom` solo si hace falta.
- Lucide o SVG propios pequeños para balón, corona, cronómetro, cruz, pistas y flecha; no obligar a instalar una librería solo por cinco iconos.
- Opcional: Playwright para uno o dos flujos end-to-end si ya está disponible o es fácil integrarlo; las pruebas unitarias del motor son obligatorias.

## 11. Diseño responsive y comportamiento por tamaño

### Escritorio grande (≥1200 px)

- La vista de preparación mantiene dos columnas; formulario a la izquierda y panel de instrucciones a la derecha.
- En partida: header de tres áreas, marcador en tres tarjetas, cuadrícula centrada y pistas preferiblemente en dos filas de 10 tarjetas.
- A 1366–1440 px de ancho, la zona principal debe ser visualmente cercana a la captura; evitar espacios blancos, márgenes exagerados y scroll horizontal de página.
- A 768–900 px de alto, **no cortar contenido importante**. Se admite scroll vertical normal cuando haga falta.

### Tableta (768–1199 px)

- Preparación: reducir márgenes; apilar las columnas si el texto queda demasiado estrecho.
- Partida: reducir con moderación tamaño de celdas y fuentes sin perder accesibilidad; pistas en 4–5 columnas; marcador más compacto.
- Si la sopa de 27 columnas no cabe con celdas táctiles legibles, colocarla en un contenedor con **desplazamiento horizontal propio** y affordance visible.

### Móvil (<768 px)

- Preparación en **una sola columna**: primero nombres y botón, después reglas completas.
- Barra superior compacta pero visible; cronómetro global y restante de turno con contraste alto.
- Marcador de jugadores apilado o con scroll horizontal controlado; información crítica siempre disponible.
- Tablero **no debe reducir letras a tamaños ilegibles**: usar un viewport desplazable horizontalmente, botones táctiles de al menos ~32–40 px donde sea posible, y borde/indicador de scroll. También permitir scroll vertical de la página.
- Pistas en una o dos columnas según ancho; textos íntegros, sin recortes; al pasar a fase B facilitar su visibilidad (por ejemplo, con `scrollIntoView` no agresivo y respetando movimiento reducido), sin pausar el reloj.
- Los controles accesibles no deben depender de hover ni de pointer fino.

Evitar elementos con posición fija que oculten pistas, botones o el final del tablero. Usar `minmax()`, `clamp()`, `aspect-ratio`, CSS Grid y Flexbox donde sea pertinente.

## 12. Accesibilidad y UX

- Usar `<button type="button">` para cada celda y pista; `<label>` con `for` en inputs; título principal `h1` en preparación, jerarquía de encabezados consistente.
- Asignar a cada celda un `aria-label` del estilo `Fila 4, columna 12, letra M`; añadir estado encontrado en la descripción accesible cuando corresponda. No anunciar datos ocultos del futuro.
- Deshabilitar controles inactivos con `disabled` real o mecanismo accesible equivalente.
- Navegación con teclado: Tab para foco; Enter/Espacio para activar; foco visible dorado/blanco de contraste alto. Opcionalmente navegación por flechas dentro del tablero si se implementa correctamente.
- No comunicar aciertos/errores solo con color: texto, iconos y regiones vivas.
- `aria-live="polite"` para feedback habitual, `aria-live="assertive"` solo para final de partida o eliminación relevante. No anunciar 351 botones en masa.
- Atender `prefers-reduced-motion: reduce`, evitar flashes y animaciones prolongadas.
- Asegurar contraste de texto, números y bordes; no bajar la opacidad hasta volver ilegibles los nombres de los eliminados.
- Confirmar el reinicio si hay partida en curso; al terminar, dar foco al encabezado de resultados. No crear modales inaccesibles.
- Título de documento apropiado: `Sopa de Letras Futbolera`; configurar viewport y metadatos en `index.html`.

## 13. Calidad del código y seguridad de implementación

- TypeScript en modo `strict`. Evitar `any`, `@ts-ignore` y conversiones de tipos arbitrarias; modelar explícitamente valores nulos y estados imposibles.
- Ninguna dependencia de `window`/`document` en funciones puras del motor; separar cálculo de tiempo de efectos del navegador.
- No utilizar `v-html` con contenido de jugadores ni pistas, ni insertar strings de usuario como HTML.
- Nombres de usuario visibles escapar automáticamente con interpolación Vue `{{ }}`.
- Reutilizar constantes `PLAYERS_COUNT = 3`, `WORDS_PER_PLAYER = 20`, `MATCH_DURATION_SECONDS = 1200`, `PHASE_DURATION_SECONDS = 30`, `MAX_LETTER_ERRORS = 30` y valores de puntuación; prohibidos números mágicos repetidos.
- No generar números pseudoaleatorios distintos en renderizados de componentes: generar tableros una vez al iniciar partida.
- Evitar renders costosos cada ~100 ms de los 351 botones: aislar el reloj en componente o computeds necesarios; `WordSearchGrid` no debe recrearse en cada tick.
- Evitar fugas de intervalos, doble penalización por render y watchers circulares.
- Mantener funciones cortas y nombres claros; documentar solo las decisiones no obvias (colisiones, cruce de palabras, prioridades del reloj).
- Si hay errores inesperados al generar un tablero, mostrar un mensaje recuperable o regenerar; no renderizar la partida en estado parcialmente iniciado.
- No añadir autenticación, apuestas, dinero real, chat en línea, modo multijugador remoto ni funciones no solicitadas.

## 14. Pruebas obligatorias y casos de aceptación

Crear pruebas automatizadas, con tiempos y semillas deterministas, **antes de considerar terminada la tarea**.

### 14.1 Generador de tablero

- Genera exactamente 13 filas por 27 columnas y todas las celdas contienen una sola letra A–Z.
- Coloca **exactamente 20 apellidos**, una sola vez por ID, sin posiciones fuera de rango.
- Reconstruye cada palabra a partir de sus coordenadas y verifica coincidencia exacta.
- Permite cruces válidos, impide cruces con letras diferentes y puede colocar palabras en direcciones diversas.
- La misma semilla y las mismas palabras producen el mismo tablero.
- Semillas diferentes producen tableros suficientemente distintos; ninguna semilla de prueba deja palabras fuera.
- Al hacer clic en un cruce con dos palabras pendientes se revela solo una; la otra sigue encontrable.

### 14.2 Máquina de juego y puntuaciones

- Inicia exactamente tres jugadores a cero y les asigna 20 palabras/tableros independientes.
- Descubrimiento correcto en fase A → +15, encontrados +1, fase B y plazo nuevo de 30 segundos.
- Pista correcta → +15 extra, asociaciones +1, siguiente jugador y fase A.
- Pista incorrecta → −5, no suma error de letra, siguiente jugador.
- Letra incorrecta → −10, errores +1, siguiente jugador.
- Fase A vencida → −10, errores de letra inalterados y siguiente jugador.
- Fase B vencida → −5, errores de letra inalterados y siguiente jugador.
- Descubrir la misma palabra por otra de sus letras no da puntos adicionales.
- Clics repetidos o fuera de fase no pueden duplicar puntuaciones.
- En el error número **30** se elimina al participante, sin turno posterior.
- Se saltan jugadores eliminados manteniendo el orden 1→2→3.
- Al llegar a 20 encontrados se cierra primero su fase B y después acaba el partido.
- Cuando el límite global vence, finaliza incluso con fase en curso, sin penalización adicional de fase.
- Si queda un solo jugador activo, acaba el partido y se declara resultado correcto.
- Detecta empate entre jugadores elegibles y el caso extremo sin ganador.
- Un fallo de pista no bloquea una pista válida de otro apellido todavía pendiente.
- `resetMatch` restaura el flujo y limpia timers/estado anterior.

### 14.3 Formulario y UI

- No permite iniciar con campos vacíos ni con nombres duplicados, e informa del error.
- Los tres nombres configurados aparecen en el marcador y el nombre del jugador activo aparece en la cabecera.
- La vista de juego muestra 20 pistas del tablero activo, y no las de otros tableros.
- Las pistas no son clicables en fase A y las celdas no lo son en fase B.
- Se ve el contador correcto `X/30`, el global `MM:SS` y el restante de fase, incluidos los valores iniciales `0/30`, `20:00` y `30`.
- Se muestra feedback de acciones y resultado final; volver a jugar funciona.
- No hay errores de consola ni advertencias de Vue durante el flujo básico.

### 14.4 Verificación manual visual y responsive

Verificar manualmente, como mínimo, con viewport equivalente a **1376 × 768**, **1440 × 900**, **1024 × 768** y **390 × 844**. Comprobar que se pueden leer las instrucciones completas, introducir nombres, encontrar letras, escoger pistas y acabar una partida sin solapamientos ni controles inutilizables. Comparar explícitamente composición, tonos verdes, tipografía condensada, bordes dorados y densidad de la cuadrícula con las capturas.

## 15. Criterios de aceptación no negociables (Definition of Done)

La implementación **solo está completa si**:

1. Arranca en Vite con Vue 3 + TypeScript y tiene build de producción sin errores.
2. Se ve una pantalla inicial fiel en estilo y estructura, con **seis instrucciones** y **tres nombres validados**.
3. Hay **tres jugadores y 20 apellidos de futbolistas reales por jugador**, todos situados en tableros que se generan realmente; ninguna palabra del set queda fuera.
4. Cada tablero se descubre tocando **una sola letra correcta**, no escribiendo un apellido ni seleccionándolo por arrastre.
5. Cada turno tiene dos fases sucesivas de **30 segundos** con un cronómetro global de **20 minutos que nunca se pausa**.
6. Aplica exactamente **+15/+15/−10/−5**, y errores de letra acumulables hasta **30**, con eliminación.
7. Cambia de jugador después de cada intento y respeta los eliminados.
8. La pantalla de juego contiene cabecera, cronómetros, barra de progreso, marcador de tres participantes, sopa de letras apaisada y **20 pistas interactivas** coherentes.
9. Da feedback inmediato y termina por tiempo, 20 palabras completadas o eliminación; muestra ganador/empate y permite reiniciar.
10. La aplicación se puede usar en escritorio y móvil sin que la cuadrícula se haga ilegible.
11. Tiene pruebas del generador y motor, sin errores de tipos ni tests fallidos.
12. El `README.md` incluye instalación, ejecución, build y tests con el **gestor de paquetes real del repositorio**.

## 16. Orden de implementación recomendado

Ejecuta esta secuencia de trabajo para reducir fallos:

**Etapa 1 — Diagnóstico:** revisar `package.json`, Vite, Vue, TypeScript, configuración, estilos y capturas. Elegir gestor de paquetes existente (`pnpm`, `npm` o `yarn`) según el lockfile; no mezclar lockfiles.

**Etapa 2 — Dominio:** crear tipos, constantes, catálogo de 60 futbolistas, normalización, generador con semilla y verificadores de tableros. Ejecutar pruebas del generador.

**Etapa 3 — Motor:** implementar estado de partida, selección de celdas, resolución de pistas, puntuaciones, eliminación, tiempos absolutos, paso de turnos y resultado final como lógica independiente de Vue. Añadir pruebas unitarias de cada escenario.

**Etapa 4 — UI inicial:** replicar pantalla de nombres y reglas; validar formulario; conectar inicio de partida a store/motor.

**Etapa 5 — UI del partido:** implementar header, marcador, grid de 13 × 27 celdas, 20 tarjetas de pistas y feedback. Unir eventos y estados a la lógica real.

**Etapa 6 — Resultados y responsive:** vista final, reinicio, estilos móviles, teclado, contraste, ajustes visuales de capturas.

**Etapa 7 — Validación final:** correr comando de typecheck (si existe, o añadirlo), tests y build. Abrir la web y comprobar manualmente el flujo. Actualizar README sin emojis innecesarios y terminar con reporte de lo implementado y cualquier limitación real.

### Entrega esperada de Codex

Al terminar, informa de forma concisa:

- Funcionalidades efectivamente implementadas.
- Estructura y archivos principales añadidos o modificados.
- Comandos para iniciar y probar la aplicación.
- Resultado real de typecheck, pruebas y build.
- Notas sobre cualquier decisión técnica que se apartó de una captura o de esta especificación, con justificación.

**Instrucción final:** prioriza que el juego sea **real, justo, determinista al probarse, visualmente fiel, divertido y estable**. No aceptes como resultado una simple reproducción estática de las capturas. Trabaja sobre el repositorio existente y entrega una SPA de Vue 3 + Vite + TypeScript completamente funcional.
