import { useEffect, useState } from 'react'

/**
 * Alto en px del área realmente visible. En móvil, las barras dinámicas del
 * navegador hacen que `100vh`/`100dvh` no sean fiables para overlays con
 * `position: fixed` (la barra inferior queda tapada o fuera de pantalla).
 * `visualViewport` da la altura visible exacta y se actualiza al mostrarse u
 * ocultarse las barras y el teclado.
 */
export function useViewportHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window === 'undefined' ? 0 : window.visualViewport?.height ?? window.innerHeight
  )

  useEffect(() => {
    const update = () => setHeight(window.visualViewport?.height ?? window.innerHeight)
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  return height
}
