import { type Handle } from '@remix-run/ui'
import { Link, useParams } from '../provider/RouterProvider'

interface Weather {
  publishingOffice: string
  reportDatetime: Date
  targetArea: string
  headlineText: string
  text: string
}

export default async function WeatherDetail(handle: Handle) {
  const { id } = useParams(handle)
  const value = await handle.async<Weather>(() =>
    fetch(`https://www.jma.go.jp/bosai/forecast/data/overview_forecast/${id}.json`).then((v) =>
      v.json(),
    ),
  )

  return () => {
    return (
      <div className="p-2">
        <div className="mb-4">
          <Link to="/" className="text-blue-500 hover:underline">
            戻る
          </Link>
        </div>
        {value && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold mb-2">{value.targetArea}</h1>
            <div className="text-sm text-gray-500 mb-4">
              {new Date(value.reportDatetime).toLocaleString()}
            </div>
            <div className="font-semibold mb-2">{value.headlineText}</div>
            <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded">{value.text}</pre>
          </div>
        )}
      </div>
    )
  }
}
