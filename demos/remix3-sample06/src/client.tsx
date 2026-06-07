import { createRoot } from '@remix-run/ui'
import { App } from './App'
import { RouterProvider } from './provider/RouterProvider'

const Render = (
  <RouterProvider>
    <App />
  </RouterProvider>
)

if (document.body) {
  createRoot(document.body).render(Render)
} else {
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      createRoot(document.body).render(Render)
    },
    { once: true },
  )
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {})
}
