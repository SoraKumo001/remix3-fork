import { renderToStream } from '@remix-run/ui/server'

import css from './index.css?inline'
import { App } from './App'
import { RouterProvider } from './provider/RouterProvider'

const handler = (url: string) => {
  const routerContext = {
    serverUrl: url,
    navigate: () => {},
  }

  return new Response(
    renderToStream(
      <html lang="ja">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style type="text/css">{css}</style>
          <script
            type="module"
            src={/\.(tsx|ts)$/.test(import.meta.url) ? '/src/client.tsx' : '/client.js'}
          />
          <title>Remix3 Test</title>
        </head>
        <body>
          <RouterProvider value={routerContext}>
            <App />
          </RouterProvider>
        </body>
      </html>,
    ),
    {
      headers: {
        'Content-Type': 'text/html',
      },
    },
  )
}

export default handler
