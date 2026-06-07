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
      <html lang="ja" className="h-full">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="description" content="A modern Hacker News client built with Remix 3" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
          <style type="text/css">{css}</style>
          <script
            type="module"
            src={/\.(tsx|ts)$/.test(import.meta.url) ? '/src/client.tsx' : '/client.js'}
          />
          <title>Hacker News - Remix 3 Client</title>
        </head>
        <body className="bg-slate-950 text-slate-100 min-h-full font-sans antialiased">
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
