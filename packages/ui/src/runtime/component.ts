import type { ElementProps, ElementType, RemixNode, Renderable } from './jsx.ts'
import { TypedEventTarget } from './typed-event-target.ts'
import { createComponentErrorEvent } from './error-event.ts'

/**
 * Task queued to run after a component update completes.
 */
export type Task = (signal: AbortSignal) => void

/**
 * Controls how an async resource is reused after it resolves.
 */
export type AsyncCacheMode = 'hydrate' | 'page' | 'none'

/**
 * Options for {@link Handle.async}.
 */
export interface AsyncOptions {
  /**
   * Stable cache key used to share the resource across component instances.
   */
  key?: string
  /**
   * Cache mode for the resolved value. Defaults to `page`.
   */
  cache?: AsyncCacheMode
  /**
   * Milliseconds before a `page` cache entry expires.
   */
  ttl?: number
}

/**
 * Resolved handle for asynchronous component data.
 */
export interface AsyncResource<T> {
  /**
   * Cache key used by this resource. Auto-generated when no key is provided.
   */
  readonly key: string
  /**
   * Current lifecycle status for the resource value.
   */
  readonly status: 'idle' | 'pending' | 'resolved' | 'rejected'
  /**
   * Whether the resource is currently refreshing.
   */
  readonly pending: boolean
  /**
   * Last resolved value, or `undefined` before resolution or after clearing.
   */
  readonly value: T | undefined
  /**
   * Last refresh error, or `undefined` when the resource has not failed.
   */
  readonly error: unknown
  /**
   * Re-runs the resource action and updates the cached value.
   *
   * @returns The refreshed value.
   */
  refresh(): Promise<T>
  /**
   * Removes this resource from cache and clears its current value.
   */
  clear(): void
}

export interface AsyncCacheEntry<T = unknown> {
  status: 'idle' | 'pending' | 'resolved' | 'rejected'
  value: T | undefined
  error: unknown
  expiresAt?: number
  promise?: Promise<T>
}

/**
 * Runtime handle passed to component setup functions.
 */
export interface Handle<Props = Record<string, never>, ContextValue = NoContext> {
  /**
   * Stable identifier per component instance. Useful for HTML APIs like
   * htmlFor, aria-owns, etc. so consumers don't have to supply an id.
   */
  id: string

  /**
   * Stable props object for the component instance. The object identity does not
   * change across updates, but its values are updated before each render.
   */
  props: Props

  /**
   * Set and get values in an element tree for indirect ancestor/descendant
   * communication.
   */
  context: Context<ContextValue>

  /**
   * Schedules an update for the component to render again. Returns a promise
   * that resolves with an AbortSignal after the update completes. The signal
   * is aborted when the component re-renders or is removed.
   *
   * @returns A promise that resolves with an AbortSignal after the update
   */
  update(): Promise<AbortSignal>

  /**
   * Schedules a task to run after the next update.
   *
   * @param task
   */
  queueTask(task: Task): void

  /**
   * The component's closest frame
   */
  frame: FrameHandle

  /**
   * Access named frames in the current runtime tree.
   */
  frames: {
    /**
     * The root frame for the current runtime tree.
     */
    readonly top: FrameHandle
    get(name: string): FrameHandle | undefined
  }
  /**
   * A signal indicating the connected status of the component. When the
   * component is disconnected from the tree the signal will be aborted.
   * Useful for setup scope cleanup.
   *
   * @example Clear a timer
   * ```ts
   * function Clock(handle: Handle) {
   *   let interval = setInterval(() => {
   *     if (handle.signal.aborted) {
   *       clearInterval(interval)
   *       return
   *     }
   *     handle.update()
   *   }, 1000)
   *   return () => <span>{new Date().toString()}</span>
   * }
   * ```
   *
   * Because signals are event targets, you can also add an event instead.
   * ```ts
   * function Clock(handle: Handle) {
   *   let interval = setInterval(handle.update)
   *   handle.signal.addEventListener("abort", () => clearInterval(interval))
   *   return () => <span>{new Date().toString()}</span>
   * }
   * ```
   *
   * You don't need to check both this.signal and a render/event signal as
   * render/event signals are aborted when the component disconnects.
   */
  signal: AbortSignal

  /**
   * Helper to perform asynchronous tasks (e.g. data fetching) during setup.
   * On the server, awaiting the returned resource executes the action and serializes the resolved
   * value. In the browser, the resource is returned before the action resolves so components can
   * render pending UI. During hydration, serialized values initialize the resource instead of
   * re-running the action.
   *
   * @param action Asynchronous work that resolves the resource value.
   * @param options Cache key and reuse behavior for the resource.
   * @returns A resource object with value, status, refresh, and clear controls.
   */
  async<T>(action: () => Promise<T>, options?: AsyncOptions): AsyncResource<T>
}

/**
 * Default Handle context so types must be declared explicitly.
 */
export type NoContext = Record<string, never>

/**
 * Component factory shape used by the Remix component runtime.
 */
export type Component<Props = ElementProps, ContextValue = NoContext> = (
  handle: Handle<Props, ContextValue>,
) => RenderFn | Promise<RenderFn>

/**
 * Infers the context provided by a component or handle-compatible function.
 */
export type ContextFrom<ComponentType> =
  ComponentType extends Component<any, infer Provided>
    ? Provided
    : ComponentType extends (handle: Handle<any, infer Provided>, ...args: any[]) => any
      ? Provided
      : never

/**
 * Context storage API exposed on component handles.
 *
 * Context values are keyed by provider component identity. `get(Component)`
 * reads the nearest ancestor instance whose component function is exactly
 * `Component`, so nested instances of the same provider shadow outer instances
 * while different component types remain independent.
 */
export interface Context<C> {
  /** Replaces the current context value for this component instance. */
  set(values: C): void
  /** Reads the context value from the nearest ancestor instance of the given component type. */
  get<ComponentType>(component: ComponentType): ContextFrom<ComponentType>
  /** Reads an unknown context value for an untyped lookup. */
  get(component: ElementType | symbol): unknown | undefined
}

/**
 * Content that can be rendered into a frame.
 */
export type FrameContent = ReadableStream<Uint8Array> | string | RemixNode

/**
 * Events emitted by frame handles during reloads.
 */
export type FrameHandleEventMap = {
  reloadStart: Event
  reloadComplete: Event
}

/**
 * Public API for interacting with a frame instance.
 */
export type FrameHandle = TypedEventTarget<FrameHandleEventMap> & {
  src: string
  reload(): Promise<AbortSignal>
  replace(content: FrameContent): Promise<void>
  // Internal runtime context used by client-rendered Frame reconciliation.
  $runtime?: unknown
}

/**
 * Props accepted by the built-in {@link Frame} component.
 */
export interface FrameProps {
  /** Optional frame name used for targeted navigation and lookups. */
  name?: string
  /** Source URL used when the frame loads or reloads its content. */
  src: string
  /** Fallback content to render while the frame is pending. */
  fallback?: Renderable
  /** Event handlers invoked for events dispatched from the frame element. */
  on?: Record<string, (event: Event, signal: AbortSignal) => void | Promise<void>>
}

/**
 * Component factory function that receives a handle and returns a render function.
 */
export type ComponentFn<Props = Record<string, never>, ContextValue = NoContext> = (
  handle: Handle<Props, ContextValue>,
) => RenderFn | Promise<RenderFn>

/**
 * Zero-argument render function returned by a component factory.
 */
export type RenderFn = () => RemixNode

export type { RemixNode } from './jsx.ts'

// Handle is already exported as an interface above, no need to re-export

/**
 * Props accepted by the built-in {@link Fragment} component.
 */
export interface FragmentProps {
  /** Child nodes to render without adding an extra host element. */
  children?: RemixNode
}

/**
 * Mapping of built-in component names to their prop shapes.
 */
export interface BuiltinElements {
  /** Props accepted by the built-in fragment component. */
  Fragment: FragmentProps
  /** Props accepted by the built-in frame component. */
  Frame: FrameProps
}

/**
 * Key type used to stabilize host elements and components during reconciliation.
 */
export type Key = string | number | bigint

type ComponentConfig = {
  id: string
  type: Function
  frame: FrameHandle
  getContext: (type: Component) => unknown
  getFrameByName: (name: string) => FrameHandle | undefined
  getTopFrame?: () => FrameHandle | undefined
  signal?: AbortSignal
}

/**
 * Runtime handle returned by {@link createComponent}.
 */
export interface ComponentHandle<C = NoContext> {
  id: string
  frame: FrameHandle
  render(nextProps: ElementProps): [RemixNode, Array<() => void>]
  remove(): Array<() => void>
  setScheduleUpdate(nextScheduleUpdate: () => void): void
  getContextValue(): C | undefined
  isRemoved(): boolean
  initPromise?: Promise<RenderFn>
  getHydrationCursor?(): Node | null | undefined
  clearHydrationCursor?(): void
  setHydrationCursor?(cursor: Node | null | undefined): void
}

/**
 * Creates the internal runtime wrapper for a component instance.
 *
 * @param config Component runtime configuration.
 * @returns Component runtime helpers used by the reconciler.
 */
export function createComponent<C = NoContext>(config: ComponentConfig): ComponentHandle<C> {
  return new ComponentRuntime<C>(config)
}

class ComponentRuntime<C = NoContext> implements ComponentHandle<C> {
  id: string
  frame: FrameHandle
  initPromise?: Promise<RenderFn>

  #config: ComponentConfig
  #connectedController: AbortController | undefined
  #contextValue: C | undefined
  #handle: Handle<ElementProps, C>
  #props = {} as ElementProps
  #renderController: AbortController | undefined
  #renderFn: RenderFn | undefined
  #removed = false
  #scheduleUpdate: () => void = () => {
    throw new Error('scheduleUpdate not implemented')
  }
  #tasks: Task[] = []
  #asyncCounter = 0
  #hydrationCursor: Node | null | undefined = undefined

  constructor(config: ComponentConfig) {
    this.#config = config
    this.frame = config.frame
    this.id = config.id
    this.#handle = this.#createHandle()
  }

  getHydrationCursor = (): Node | null | undefined => this.#hydrationCursor
  clearHydrationCursor = (): void => {
    this.#hydrationCursor = undefined
  }
  setHydrationCursor = (cursor: Node | null | undefined): void => {
    this.#hydrationCursor = cursor
  }

  render = (nextProps: ElementProps): [RemixNode, Array<() => void>] => {
    if (this.#removed) {
      console.warn('render called after component was removed, potential application memory leak')
      return [null, []]
    }

    this.#abortRenderSignal()
    syncProps(this.#props, nextProps)

    let renderFn = this.#renderFn

    if (renderFn === undefined) {
      if (this.initPromise) {
        return [null, this.#dequeueTasks()]
      }

      let result = this.#config.type(this.#handle)

      if (result instanceof Promise) {
        this.initPromise = result
        result
          .then((resolvedRenderFn) => {
            if (typeof resolvedRenderFn !== 'function') {
              let name = this.#config.type.name || 'Anonymous'
              throw new Error(
                `${name} must return a render function, received ${typeof resolvedRenderFn}`,
              )
            }
            if (this.#removed) return
            this.#renderFn = resolvedRenderFn
            this.#scheduleUpdate()
          })
          .catch((error) => {
            if (this.#removed) return
            let runtime = this.frame.$runtime as { errorTarget?: EventTarget } | undefined
            let errorTarget = runtime?.errorTarget ?? this.frame
            errorTarget.dispatchEvent(createComponentErrorEvent(error))
          })

        return [null, this.#dequeueTasks()]
      }

      if (typeof result !== 'function') {
        let name = this.#config.type.name || 'Anonymous'
        throw new Error(`${name} must return a render function, received ${typeof result}`)
      }

      renderFn = result as RenderFn
      this.#renderFn = renderFn
    }

    return [renderFn(), this.#dequeueTasks()]
  }

  remove = (): Array<() => void> => {
    if (this.#removed) return []
    this.#removed = true
    this.#connectedController?.abort()
    this.#abortRenderSignal()
    return this.#dequeueTasks(AbortSignal.abort())
  }

  setScheduleUpdate = (nextScheduleUpdate: () => void): void => {
    this.#scheduleUpdate = nextScheduleUpdate
  }

  getContextValue = (): C | undefined => this.#contextValue

  isRemoved = (): boolean => this.#removed

  async = <T>(action: () => Promise<T>, options: AsyncOptions = {}): AsyncResource<T> => {
    let index = this.#asyncCounter++
    let key = options.key ? `async:${options.key}` : `${this.#config.id}:async:${index}`
    let cache = options.cache ?? 'page'
    let runtime = this.frame.$runtime as
      | {
          data?: { a?: Record<string, unknown> }
          asyncCache?: Map<string, AsyncCacheEntry>
          scheduler?: unknown
          errorTarget?: EventTarget
        }
      | undefined
    let isLiveRuntime = runtime?.scheduler !== undefined
    let hydrationStore = runtime?.data?.a
    let pageCache = runtime?.asyncCache
    let entry =
      cache === 'page' ? (pageCache?.get(key) as AsyncCacheEntry<T> | undefined) : undefined

    if (entry && !isAsyncCacheEntryExpired(entry)) {
      return createAsyncResource(key, entry, action, cache, options, hydrationStore, pageCache, {
        await: isLiveRuntime ? 'immediate' : 'block',
      })
    }

    if (entry && isAsyncCacheEntryExpired(entry)) {
      pageCache?.delete(key)
      entry = undefined
    }

    if (cache !== 'none' && hydrationStore && key in hydrationStore) {
      entry = createResolvedAsyncCacheEntry(hydrationStore[key] as T, options.ttl)
      if (cache === 'page') {
        pageCache?.set(key, entry)
      }
      return createAsyncResource(key, entry, action, cache, options, hydrationStore, pageCache, {
        await: isLiveRuntime ? 'immediate' : 'block',
      })
    }

    entry = {
      status: 'pending',
      value: undefined,
      error: undefined,
    }
    if (cache === 'page') {
      pageCache?.set(key, entry)
    }

    let resource = createAsyncResource(
      key,
      entry,
      action,
      cache,
      options,
      hydrationStore,
      pageCache,
      { await: isLiveRuntime ? 'immediate' : 'block' },
    )
    if (!isLiveRuntime) {
      return resource
    }

    void resource
      .refresh()
      .then(() => {
        if (!this.#removed) this.#scheduleUpdate()
      })
      .catch((error) => {
        if (this.#removed) return
        this.#scheduleUpdate()
        let errorTarget = runtime?.errorTarget ?? this.frame
        errorTarget.dispatchEvent(createComponentErrorEvent(error))
      })
    return resource
  }

  #createHandle(): Handle<ElementProps, C> {
    let component = this
    let context: Context<C> = {
      set: (value: C) => {
        this.#contextValue = value
      },
      get: (type: ElementType | symbol) => this.#config.getContext(type as Component),
    }

    return {
      id: this.#config.id,
      props: this.#props,
      update: () =>
        new Promise((resolve) => {
          if (component.#removed) {
            resolve(AbortSignal.abort())
            return
          }

          this.#tasks.push((signal) => resolve(signal))
          this.#scheduleUpdate()
        }),
      queueTask: (task: Task) => {
        this.#tasks.push(task)
      },
      frame: this.#config.frame,
      frames: {
        get top() {
          return component.#config.getTopFrame?.() ?? component.#config.frame
        },
        get(name: string) {
          return component.#config.getFrameByName(name)
        },
      },
      context,
      get signal() {
        return component.#config.signal ?? component.#connectedSignal()
      },
      async: <T>(action: () => Promise<T>, options?: AsyncOptions) => this.async(action, options),
    }
  }

  #connectedSignal(): AbortSignal {
    this.#connectedController ??= new AbortController()
    return this.#connectedController.signal
  }

  #abortRenderSignal(): void {
    this.#renderController?.abort()
    this.#renderController = undefined
  }

  #dequeueTasks(signal?: AbortSignal): Array<() => void> {
    let needsSignal = signal === undefined && this.#tasks.some((task) => task.length >= 1)

    if (needsSignal) {
      this.#renderController ??= new AbortController()
    }

    signal ??= this.#renderController?.signal
    let tasks = this.#tasks.splice(0, this.#tasks.length)
    return tasks.map((task) => () => task(signal!))
  }
}

function createAsyncResource<T>(
  key: string,
  entry: AsyncCacheEntry<T>,
  action: () => Promise<T>,
  cache: AsyncCacheMode,
  options: AsyncOptions,
  hydrationStore: Record<string, unknown> | undefined,
  pageCache: Map<string, AsyncCacheEntry> | undefined,
  behavior: { await: 'block' | 'immediate' },
): AsyncResource<T> {
  async function refresh(): Promise<T> {
    if (entry.status === 'pending' && entry.promise) {
      return entry.promise
    }

    entry.status = 'pending'
    entry.error = undefined
    let promise = action()
    entry.promise = promise

    try {
      let value = await promise
      entry.status = 'resolved'
      entry.value = value
      entry.error = undefined
      entry.expiresAt = getAsyncCacheExpiresAt(options.ttl)
      entry.promise = undefined
      if (cache !== 'none' && hydrationStore) {
        hydrationStore[key] = value
      }
      if (cache === 'page') {
        pageCache?.set(key, entry)
      }
      return value
    } catch (error) {
      entry.status = 'rejected'
      entry.error = error
      entry.promise = undefined
      throw error
    }
  }

  let view = {
    key,
    get status() {
      return entry.status
    },
    get pending() {
      return entry.status === 'pending'
    },
    get value() {
      return entry.value
    },
    get error() {
      return entry.error
    },
    refresh,
    clear() {
      pageCache?.delete(key)
      if (hydrationStore) {
        delete hydrationStore[key]
      }
      entry.status = 'idle'
      entry.value = undefined
      entry.error = undefined
      entry.expiresAt = undefined
      entry.promise = undefined
    },
  }

  let resource = {
    ...view,
    then<TResult1 = typeof view, TResult2 = never>(
      onfulfilled?: ((value: typeof view) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2> {
      let ready =
        behavior.await === 'immediate' || entry.status === 'resolved'
          ? Promise.resolve(view)
          : entry.status === 'rejected'
            ? Promise.reject(entry.error)
            : refresh().then(() => view)

      return ready.then(onfulfilled, onrejected)
    },
  }

  return resource
}

function createResolvedAsyncCacheEntry<T>(value: T, ttl: number | undefined): AsyncCacheEntry<T> {
  return {
    status: 'resolved',
    value,
    error: undefined,
    expiresAt: getAsyncCacheExpiresAt(ttl),
  }
}

function getAsyncCacheExpiresAt(ttl: number | undefined): number | undefined {
  return ttl === undefined ? undefined : Date.now() + ttl
}

function isAsyncCacheEntryExpired(entry: AsyncCacheEntry): boolean {
  return entry.expiresAt !== undefined && Date.now() >= entry.expiresAt
}

function syncProps(target: ElementProps, next: ElementProps): void {
  for (let key in target) {
    if (!(key in next)) {
      delete target[key]
    }
  }

  for (let key in next) {
    target[key] = next[key]
  }
}

/**
 * Built-in component used to render nested frame content.
 *
 * @param handle Component handle for the frame instance.
 * @returns A placeholder render function handled by the reconciler.
 */
export function Frame(handle: Handle<FrameProps, FrameHandle>): RenderFn {
  void handle
  return () => null // reconciler renders
}

/**
 * Built-in component used to group children without adding a host element.
 *
 * @param handle Component handle for the fragment instance.
 * @returns A placeholder render function handled by the reconciler.
 */
export function Fragment(handle: Handle<FragmentProps>): RenderFn {
  void handle
  return () => null // reconciler renders
}

/**
 * Creates a frame handle with default no-op implementations for testing and internal wiring.
 *
 * @param def Partial frame-handle implementation to merge with the defaults.
 * @returns A frame handle object.
 */
export function createFrameHandle(
  def?: Partial<{
    src: string
    replace: FrameHandle['replace']
    reload: FrameHandle['reload']
    $runtime: FrameHandle['$runtime']
  }>,
): FrameHandle {
  return Object.assign(
    new TypedEventTarget<FrameHandleEventMap>(),
    {
      src: '/',
      replace: notImplemented('replace not implemented'),
      reload: notImplemented('reload not implemented'),
    },
    def,
  )
}

function notImplemented(msg: string) {
  return (): never => {
    throw new Error(msg)
  }
}
