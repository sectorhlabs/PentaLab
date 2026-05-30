# PentaLab — Design System

Estética: **atelier de acuarela**. Papel cálido, pigmento plano y saturado,
trazo a mano. Derivado de la obra de Mekala, no de un generador.

## Color (OKLCH)

Estrategia: **Full palette** (justificada: app identity-driven de una pintora).
Acento primario para acciones; el resto, roles deliberados, nunca decoración suelta.

```
--paper:      oklch(0.95 0.018 80)    /* fondo lienzo cálido */
--paper-deep: oklch(0.92 0.022 78)    /* superficies elevadas (un punto más cálido) */
--ink:        oklch(0.27 0.015 60)    /* texto principal, sepia muy oscuro */
--ink-soft:   oklch(0.45 0.018 60)    /* texto secundario */
--ink-faint:  oklch(0.62 0.015 65)    /* texto terciario / muted */

--terracota:  oklch(0.62 0.15 45)     /* ACENTO PRIMARIO: grabar, acciones */
--magenta:    oklch(0.58 0.18 5)      /* acorde activo, energía */
--teal:       oklch(0.58 0.09 195)    /* secundario, selección */
--cobalto:    oklch(0.45 0.15 264)    /* el jarrón azul; datos/info */
--mostaza:    oklch(0.78 0.13 80)     /* avisos suaves, destacados */
--oliva:      oklch(0.62 0.10 125)    /* éxito, naturaleza */
```

Nunca `#000`/`#fff`. Neutros tintados hacia el sepia. Estados: hover (brillo
+4%), focus (anillo terracota), active (scale .97), disabled (opacidad .45).

## Typography

Mezcla justificada por identidad (no es SaaS):
- **Fraunces** (serif viva, opsz/soft): marca, títulos de pantalla, números grandes (acorde).
- **Hanken Grotesk** (sans humanista): UI, labels, body, listas, botones. Carga el grueso.
- **Space Mono**: datos (tempo, BPM, timestamps). Carácter artesanal.

Escala fija (rem), ratio ~1.2. Títulos en Fraunces; nunca display en labels/botones.

## Texture & Shape

- Fondo con **grano de papel** sutil (SVG noise, opacidad baja).
- **Manchas de acuarela** SVG como decoración intencional detrás de secciones clave.
- Bordes ligeramente **irregulares** en cards/pastillas (radius asimétrico), como recortes pintados. Nunca el radius perfecto uniforme.
- Acordes = **pastillas de pigmento**. Botón de grabar = **círculo de pintura** que late.

## Motion

150–250 ms, ease-out exponencial. Transmite estado (grabando, analizando,
acorde activo), nunca decoración. El "late" de grabar evoca una gota de tinta.

## Bans (además de los compartidos)
Nada de glassmorphism, gradient text, side-stripe, hero-metric, cards idénticas,
emojis-ilustración, dark-mode tech. Consistencia de componentes en todas las pantallas.
