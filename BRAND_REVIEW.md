# Identidad visual — Blinka × Flora

**Referencias:** https://blinka.co/ y https://www.getlayers.ai/templates?layer=flora (17/oct/2026).

## Dirección de arte

Esta versión traduce el formato cinematográfico y narrativa por desplazamiento de Flora a una experiencia financiera original. La figura metálica de los recursos entregados (`public/metal-human.jpg` y `.mp4`) es el elemento artístico protagonista. La tipografía corporativa **Inter** está configurada en `app/layout.tsx`; el sistema emplea serif editorial únicamente en acentos de títulos para crear contraste de dirección artística.

El resultado mantiene accesos operativos directos y controles visibles porque **un dashboard debe poder usarse sin recorrer una narrativa**.

## Tokens de color

Definidos en `src/styles/foundation.css`, no dispersos en archivos de componente.

| Token | HEX | Uso |
|---|---|---|
| `--void` | `#060808` | Fondo cinematográfico |
| `--surface` | `#0d1110` | Superficie |
| `--panel` | `#121816` | Panel |
| `--accent` | `#d6fa98` | Acento Blinka-inspired / CTA |
| `--white` | `#f3f6ef` | Títulos |
| `--muted` | `#a6b3aa` | Texto secundario |
| `--green` | `#94dda2` | Estado positivo |
| `--red` | `#e59b95` | Bloqueos |
| `--amber` | `#f4cd8d` | Revisión humana |

**Importante:** los códigos anteriores son decisiones de diseño inspiradas en la identidad pública; los HEX y el isotipo **no han sido contrastados** con activos CSS oficiales de Blinka. Este prototipo no es una réplica exacta de la marca ni del template premium. Para uso oficial, Blinka debe aprobar identidad, logo, accesibilidad y contraste.

## Rendimiento y accesibilidad

- Poster JPG de fallback antes de que el video esté listo.
- Video MP4 comprimido, sin audio, con reproducción condicionada a visibilidad.
- Preferencia `prefers-reduced-motion` respetada.
- Navegación por botones y accesos directos sin exigir scroll de seis escenas.
- Panel de auditoría con diálogo modal y cierre Escape.

## Seguridad de producto

Un dashboard financiero no puede afirmar que ejecuta transferencias cuando el reto termina en decisión. Todas las etiquetas de sandbox y simulación se mantienen en la vista y en su registro descargable.
