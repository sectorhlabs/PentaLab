# PentaLab — Design System

Estética: **atelier de acuarela**. Papel cálido, pigmento plano y saturado,
trazo a mano. Derivado de la obra de Mekala, no de un generador.

## Color (OKLCH)

Estrategia: **Full palette** (justificada: app identity-driven de una pintora).
Acento primario para acciones; el resto, roles deliberados, nunca decoración suelta.

```
paper       oklch(0.95 0.018 80)    fondo lienzo cálido
paper-deep  oklch(0.925 0.024 76)   superficies elevadas
paper-line  oklch(0.86 0.022 74)    bordes sutiles
ink         oklch(0.27 0.015 60)    texto principal (sepia)
ink-soft    oklch(0.45 0.018 60)    texto secundario
ink-faint   oklch(0.62 0.015 65)    texto terciario

terracota   oklch(0.62 0.15 45)     ACENTO PRIMARIO: grabar, acciones
magenta     oklch(0.58 0.18 5)      acorde activo, energía
teal        oklch(0.58 0.09 195)    secundario, selección
cobalto     oklch(0.45 0.15 264)    el jarrón azul; datos/info
mostaza     oklch(0.78 0.13 80)     avisos suaves
oliva       oklch(0.62 0.10 125)    éxito
```

Nunca `#000`/`#fff`. Neutros tintados hacia el sepia.

## Typography

Mezcla justificada por identidad (no es SaaS):
- **Fraunces** (serif viva): marca, títulos, números grandes (acorde).
- **Hanken Grotesk** (sans humanista): UI, labels, body, listas, botones.
- **Space Mono**: datos (tempo, BPM, timestamps).

## Texture & Shape

- Fondo con grano de papel (SVG noise, opacidad baja).
- Manchas de acuarela SVG (`PaintBlob`) como decoración intencional.
- Bordes irregulares en cards/pastillas (`.sheet`, `.edge-painted`, `.pigment`).
- Botón de grabar = círculo de pintura que late (`animate-ink-pulse`).

## Motion

150–250 ms, ease-out exponencial. Transmite estado, nunca decoración.

## Bans (además de los compartidos)
Glassmorphism, gradient text, side-stripe, hero-metric, cards idénticas,
emojis-ilustración, dark-mode tech. Consistencia de componentes en todas las pantallas.
