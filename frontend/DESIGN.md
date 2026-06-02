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
ink-faint   oklch(0.51 0.015 65)    texto terciario (AA sobre paper/paper-deep)

terracota   oklch(0.54 0.15 45)     ACENTO PRIMARIO: grabar, acciones
magenta     oklch(0.58 0.18 5)      acorde activo, energía
teal        oklch(0.50 0.09 195)    secundario, selección
cobalto     oklch(0.45 0.15 264)    el jarrón azul; datos/info
mostaza     oklch(0.78 0.13 80)     avisos suaves
oliva       oklch(0.52 0.10 125)    éxito
```

Nunca `#000`/`#fff`. Neutros tintados hacia el sepia. Los pigmentos de texto/acción
pasan WCAG AA (4.5:1) sobre papel; afinados con medición OKLCH→sRGB.

## Typography

Mezcla justificada por identidad (no es SaaS):
- **Fraunces** (serif viva, variable `opsz` + `font-optical-sizing: auto`): marca,
  títulos, números grandes (acorde). Peso **700** en display/h1, **600** en h2/title.
- **Hanken Grotesk** (sans humanista): UI, labels, body, listas, botones.
  Pesos: 400 body, 500 labels, 600 énfasis.
- **Space Mono**: datos (tempo, BPM, timestamps), siempre `tabular-nums`.

### Escala (fija, rem) — vars `--text-*` en `:root`, espejo en `tailwind.fontSize`

```
caption 13px · meta 14px · body 16px · title 18px · h2 22px · h1 30px · display 80px
```

Body nunca por debajo de 16px. Inputs ≥16px (evita el zoom de iOS al enfocar).

### Roles semánticos (`@layer components`, no utilidades sueltas)

`.t-display` `.t-h1` (Fraunces 700, optical) · `.t-h2` `.t-title` (Fraunces 600) ·
`.t-body` (16/1.6) · `.t-meta` · `.t-label` (500) · `.t-caption` · `.t-eyebrow`
(versalitas 0.12em) · `.t-data` (mono tabular). Combinan tamaño + peso + interlineado
+ tracking; la jerarquía sale del rol, nunca de `text-*` arbitrario.

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
