# Components

All components follow a consistent two-phase structure.

## Component Structure

1. **Setup Phase** - Runs once when the component is first created
2. **Render Phase** - Runs on initial render and every update afterward

```tsx
function MyComponent(handle: Handle<Props>) {
  // Setup phase: runs once
  let state = initializeState(handle.props)

  // Return render function: runs on every update
  return () => {
    return <div>{/* render content */}</div>
  }
}
```

## Runtime Behavior

When a component is rendered:

1. **First Render**:

   - The component function is called with `handle`
   - If the component function is asynchronous and returns a `Promise`, the runtime awaits its resolution to obtain the `RenderFn` (rendering `null` as a placeholder in the meantime)
   - The returned render function is stored
   - The render function is called after `handle.props` is populated
   - Any tasks queued via `handle.queueTask()` are executed after rendering

2. **Subsequent Updates**:

   - Only the render function is called
   - Setup phase is skipped, and the closure persists for the lifetime of the component instance
   - `handle.props` is updated before the render function is called
   - Tasks queued during the update are executed after rendering

3. **Component Removal**:
   - `handle.signal` is aborted
   - All event listeners registered via `addEventListeners()` are automatically cleaned up
   - Any queued tasks are executed with an aborted signal

## Props On The Handle

Props are available on `handle.props`. The object is stable, and its values are updated before each render:

```tsx
function Counter(handle: Handle<{ initialCount: number; label: string }>) {
  let count = handle.props.initialCount

  return () => {
    return (
      <div>
        {handle.props.label}: {count}
      </div>
    )
  }
}

// Usage
let element = <Counter initialCount={10} label="Count" />
```

## Basic Rendering

The simplest component just returns JSX:

```tsx
function Greeting(handle: Handle<{ name: string }>) {
  return () => <div>Hello, {handle.props.name}!</div>
}

let el = <Greeting name="World" />
```

## Prop Passing

Props flow from parent to child through JSX attributes:

```tsx
function Parent() {
  return () => <Child message="Hello from parent" count={42} />
}

function Child(handle: Handle<{ message: string; count: number }>) {
  return () => (
    <div>
      <p>{handle.props.message}</p>
      <p>Count: {handle.props.count}</p>
    </div>
  )
}
```

## Stateful Updates

State is managed with plain JavaScript variables. Call `handle.update()` to trigger a re-render:

```tsx
function Counter(handle: Handle) {
  let count = 0

  return () => (
    <div>
      <span>Count: {count}</span>
      <button
        mix={[
          on('click', () => {
            count++
            handle.update()
          }),
        ]}
      >
        Increment
      </button>
    </div>
  )
}
```

## Async Setup

Components can perform asynchronous setup by returning a `Promise` that resolves to a `RenderFn`. This is particularly useful for loading initial data before rendering the component content.

To support server-side rendering and client-side hydration efficiently, use the `handle.async` helper inside your async setup. It returns a resource object that exposes the value and refresh controls:

```tsx
import { on, type Handle } from 'remix/ui'

async function WeatherWidget(handle: Handle<{ city: string }>) {
  let weather = await handle.async(
    async () => {
      let res = await fetch(`/api/weather?city=${handle.props.city}`)
      return res.json()
    },
    {
      key: `weather:${handle.props.city}`,
      cache: 'page',
    },
  )

  return () => (
    <div>
      <h3>Weather in {handle.props.city}</h3>
      {weather.value && (
        <p>
          {weather.value.temperature}°C - {weather.value.condition}
        </p>
      )}
      <button
        type="button"
        mix={on('click', async () => {
          await weather.refresh()
          await handle.update()
        })}
      >
        Refresh
      </button>
    </div>
  )
}
```

By returning a `Promise<RenderFn>`, the component stays suspended (rendering `null` or a fallback) until the setup completes. During hydration, using `handle.async` prevents duplicate network requests by reusing the server-resolved data. With `cache: 'page'`, keyed resources stay in memory until the page reloads.

## See Also

- [Handle API](./handle.md) - Complete handle API reference
- [Patterns](./patterns.md) - State management best practices
