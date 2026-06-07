import { type Handle, on } from '@remix-run/ui'
import { Link } from '../provider/RouterProvider'

interface Story {
  id: number
  title: string
  url?: string
  by: string
  score: number
  time: number
  descendants?: number
}

function formatTime(unixTime: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixTime)
  if (diff < 60) return `${diff}秒前`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

export default async function Index(handle: Handle) {
  const stories = await handle.async<Story[]>(
    async () => {
      const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
      if (!res.ok) throw new Error('Failed to fetch top stories')
      const ids: number[] = await res.json()
      const topIds = ids.slice(0, 30)
      
      const storyPromises = topIds.map(async (id) => {
        const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        if (!itemRes.ok) return null
        return itemRes.json() as Promise<Story>
      })
      
      const results = await Promise.all(storyPromises)
      return results.filter((story): story is Story => story !== null)
    },
    {
      key: 'hn:topstories',
      cache: 'page',
    },
  )

  return () => {
    const value = stories.value

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6 mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              Hacker News
            </h1>
            <p className="text-slate-400 text-sm mt-1">Remix 3 で実装したモダンHNクライアント</p>
          </div>
          <button
            type="button"
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-950/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
            disabled={stories.pending}
            mix={on('click', async () => {
              const refresh = stories.refresh()
              await handle.update()
              await refresh
              await handle.update()
            })}
          >
            {stories.pending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                更新中...
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
                </svg>
                更新する
              </>
            )}
          </button>
        </header>

        {/* Stories List / Skeleton */}
        {stories.pending && !value ? (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 h-24 flex flex-col justify-between">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {value && value.map((story, index) => {
              const domain = story.url ? new URL(story.url).hostname : null
              return (
                <article
                  key={story.id}
                  className="group relative flex gap-4 bg-slate-900/30 border border-slate-900 hover:border-slate-800/80 hover:bg-slate-900/60 rounded-xl p-4 transition-all duration-200"
                >
                  <div className="flex items-center justify-center text-slate-500 font-bold text-lg w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-800/60 shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold leading-tight text-slate-100 group-hover:text-amber-400 transition-colors">
                      {story.url ? (
                        <a href={story.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 flex items-center gap-1 inline-flex flex-wrap">
                          {story.title}
                          <span className="text-xs text-slate-500 font-normal hover:underline ml-1">
                            ({domain})
                          </span>
                        </a>
                      ) : (
                        <Link to={`/item/${story.id}`} className="hover:text-amber-400">
                          {story.title}
                        </Link>
                      )}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span className="font-medium text-slate-300">{story.score} points</span>
                      <span>by</span>
                      <span className="font-medium text-slate-300">{story.by}</span>
                      <span>•</span>
                      <span>{formatTime(story.time)}</span>
                      <span>•</span>
                      <Link to={`/item/${story.id}`} className="hover:text-amber-400 text-amber-500/80 font-medium inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {story.descendants || 0} コメント
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    )
  }
}
