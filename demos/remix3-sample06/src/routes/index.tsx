import { type Handle } from '@remix-run/ui'
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
  const value = await handle.async<Area>(() =>
    fetch('https://www.jma.go.jp/bosai/common/const/area.json').then((v) => v.json()),
  )

  return () => (
    <div className="p-2">
      {value &&
        Object.entries(value.offices).map(([code, { name }]) => (
          <div key={code}>
            <Link to={`/weather/${code}`}>{name}</Link>
          </div>
        ))}
    </div>
  )
}
