# CapCut Club — Edición 2026

Landing de venta del CapCut Club. Sitio estático, sin build: se sirve tal cual.

- **Producción:** https://capcutclub.planediciontotal.com
- **Vista previa:** https://davidprietooficial-ux.github.io/capcut-club-preview/

## Estructura

```
index.html      todo el marcado
estilos.css     toda la hoja de estilo
app.js          barra fija, cupos, reproductor de testimonios, aparición
activos/        fuentes, imágenes y videos
robots.txt      bloqueado mientras esté en revisión
```

## Cómo se cambia el color

Toda la identidad de color vive en el bloque `ACENTO` de `:root`, al principio
de `estilos.css`. No hay ni un solo color de acento literal fuera de ahí. Para
cambiar de paleta se tocan esas siete variables y nada más.

Hoy: el azul del key visual «CAPCUT CLUB by @juan.edita».

## Responsive

Tres etapas, como el contrato: móvil (base), `768px` y `1024px`. No hay más
puntos de corte.

| | móvil | tableta | escritorio |
|---|---|---|---|
| Módulos de iniciación | 2 col | 2 col | 4 col |
| Módulos CapCut Club | 2 col | 2 col | 2 col |
| Preguntas frecuentes | 1 col | 2 col | 3 col |
| Testimonios | carrusel | 2 col | 4 col |

## Pendiente

- Video de presentación (bloque marcador de posición en la sección 03).
- Clips reales de «antes y después».
- Páginas legales: los tres enlaces del pie apuntan a `#`.
- Quitar `noindex` de `index.html` y el `Disallow` de `robots.txt` al aprobar.
