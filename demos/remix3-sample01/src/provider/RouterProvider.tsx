import { type Handle, on, type RemixNode } from '@remix-run/ui'
import { RoutePattern, type RouteMatch } from '@remix-run/route-pattern'
import { route } from 'virtual:routes'

const isServer = typeof window === 'undefined'

interface RouterContext {
  serverUrl: string
  navigate: (url: string) => void
  params?: RouteMatch<string>
}

export function RouterProvider(
  handle: Handle<{ url?: string; value?: RouterContext; children: RemixNode }, RouterContext>,
) {
  const context: RouterContext = {
    serverUrl: '',
    navigate: (url: string) => {
      history.pushState({}, '', url)
      handle.update()
    },
  }
  handle.context.set(context)

  const handlePopState = () => {
    handle.update()
  }
  if (!isServer) {
    addEventListener('popstate', handlePopState)
    handle.signal.addEventListener('abort', () => {
      removeEventListener('popstate', handlePopState)
    })
  }
  return () => {
    const { url, value, children } = handle.props
    if (value) {
      handle.context.set(value)
      return <>{children}</>
    }
    if (isServer && url) {
      context.serverUrl = url
    }
    return <>{children}</>
  }
}

export const useLocation = (inst: Handle<unknown, unknown>) => {
  if (isServer) {
    const url = new URL(inst.context.get(RouterProvider).serverUrl)
    return url.pathname
  }
  return location.pathname
}

export const useFullLocation = (inst: Handle<unknown, unknown>) => {
  if (isServer) {
    const url = new URL(inst.context.get(RouterProvider).serverUrl)
    return url.href
  }
  return location.href
}

export const useNavigate = (inst: Handle<unknown, unknown>) => {
  return inst.context.get(RouterProvider).navigate
}

export const useParams = <T extends Record<string, unknown>>(inst: Handle<unknown, unknown>) => {
  const p = inst.context.get(RouterProvider).params
  if (!p) throw 'error params'
  return p.params as T
}

type LinkProps = {
  to: string
  children?: RemixNode
  className?: string
}

export function Link(handle: Handle<LinkProps>) {
  const navigate = useNavigate(handle)
  return () => {
    const { to, children, className } = handle.props

    return (
      <a
        href={to}
        className={className}
        mix={[
          on('click', (e) => {
            e.preventDefault()
            navigate(to)
          }),
        ]}
      >
        {children}
      </a>
    )
  }
}

export type RouteType = Record<
  string,
  (handle: Handle<unknown, unknown>) => () => RemixNode
>

export const useRouter = (inst: Handle<unknown, unknown>, route: RouteType) => {
  const location = useFullLocation(inst)

  for (const [pattern, content] of Object.entries(route)) {
    const p = new RoutePattern(pattern)
    const match = p.match(location)
    if (match) {
      inst.context.get(RouterProvider).params = match
      return content
    }
  }
  return () => () => <></>
}

export function Outlet(handle: Handle) {
  return () => {
    const Route = useRouter(handle, route)
    return <Route />
  }
}
