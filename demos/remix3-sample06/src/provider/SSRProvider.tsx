import { type Handle, type RemixNode } from '@remix-run/ui'

const isServer = typeof window === 'undefined'
const SSR_DATA_NAME = '__REMIX3_SSR__'

type SSRResult<T = unknown> = {
  state: 'idle' | 'loading' | 'finished'
  value?: T
}

type SSRState<T = unknown> = SSRResult<T> & {
  children: RemixNode
  promise: Promise<T>
}

export type SSRProps = {
  states: Record<string, SSRState>
}

export function SSRDataScript(handle: Handle) {
  const context = handle.context.get(SSRProvider)
  if (!context || !isServer) {
    return () => null
  }

  const promise = (async () => {
    let length = 0
    while (length !== Object.values(context.states).length) {
      await Promise.all(Object.values(context.states).map((v) => v.promise))
      length = Object.values(context.states).length
    }
  })()

  return promise.then(() => {
    return () => {
      const values: Record<string, unknown> = {}
      for (const [key, state] of Object.entries(context.states)) {
        values[key] = state.value
      }
      const serializedData = JSON.stringify(values).replace(/</g, '\\u003c')
      return <script type="application/json" id={SSR_DATA_NAME} innerHTML={serializedData} />
    }
  })
}

export function SSRProvider(handle: Handle<{ storage?: SSRProps; children: RemixNode }, SSRProps>) {
  return () => {
    const { storage, children } = handle.props
    if (isServer) {
      handle.context.set(
        storage ?? {
          states: {},
        },
      )
    } else {
      const node = document.getElementById(SSR_DATA_NAME)
      const states = JSON.parse(node?.innerText ?? '{}') as Record<string, unknown>
      handle.context.set(
        storage ?? {
          states: Object.fromEntries(
            Object.entries(states).map(([key, v]) => [
              key,
              {
                state: 'finished',
                promise: Promise.resolve(v),
                value: v,
                children: undefined,
              },
            ]),
          ),
        },
      )
    }
    return (
      <>
        {children}
        {isServer && <SSRDataScript />}
      </>
    )
  }
}

export function SSRData(
  handle: Handle<
    { value: unknown; state: 'idle' | 'loading' | 'finished'; children: RemixNode },
    SSRResult
  >,
) {
  return () => {
    const { value, state, children } = handle.props
    handle.context.set({ value, state })
    return children
  }
}

export function SSRFetch<T>(
  handle: Handle<{
    name: string
    action: () => Promise<T>
    children: RemixNode
  }>,
) {
  const { name, action, children } = handle.props
  const context = handle.context.get(SSRProvider)
  if (!context) {
    return () => children
  }

  const frameName = `ssr:${name}`
  if (!context.states[frameName]) {
    const promise = action()
    const state: SSRState<T> = {
      promise,
      state: 'loading',
      value: undefined,
      children,
    }
    context.states[frameName] = state
    promise.then((v) => {
      context.states[frameName].state = 'finished'
      context.states[frameName].value = v
      if (!isServer) handle.update()
    })
  }

  const state = context.states[frameName]

  const renderFn = () => (
    <SSRData value={state.value} state={state.state}>
      {children}
    </SSRData>
  )

  if (isServer) {
    return state.promise.then(() => renderFn)
  } else {
    if (state.state === 'finished') {
      return renderFn
    }
    return state.promise.then(() => renderFn)
  }
}

export const useSSR = <T,>(inst: Handle) => {
  return inst.context.get(SSRData) as SSRResult<T>
}
