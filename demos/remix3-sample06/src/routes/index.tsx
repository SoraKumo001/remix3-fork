import { type Handle, on } from '@remix-run/ui'
import { Link } from '../provider/RouterProvider'

interface Center {
  name: string
  enName: string
  officeName?: string
  children?: string[]
  parent?: string
  kana?: string
}
interface Centers {
  [key: string]: Center
}
interface Area {
  centers: Centers
  offices: Centers
  class10s: Centers
  class15s: Centers
  class20s: Centers
}

export default async function Index(handle: Handle) {
  const area = await handle.async<Area>(
    () => fetch('https://www.jma.go.jp/bosai/common/const/area.json').then((v) => v.json()),
    {
      key: 'jma:area',
      cache: 'page',
    },
  )

  return () => {
    const value = area.value

    return (
      <div className="p-2">
        <button
          type="button"
          className="mb-4 rounded bg-blue-600 px-3 py-1 text-white"
          disabled={area.pending}
          mix={on('click', async () => {
            const refresh = area.refresh()
            await handle.update()
            await refresh
            await handle.update()
          })}
        >
          {area.pending ? '更新中...' : '更新'}
        </button>
        {value &&
          Object.entries(value.offices).map(([code, { name }]) => (
            <div key={code}>
              <Link to={`/weather/${code}`}>{name}</Link>
            </div>
          ))}
      </div>
    )
  }
}
