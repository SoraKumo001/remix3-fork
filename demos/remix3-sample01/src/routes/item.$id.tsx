import { type Handle, on } from '@remix-run/ui'
import { Link, useParams } from '../provider/RouterProvider'

interface Story {
  id: number
  title: string
  url?: string
  by: string
  score: number
  time: number
  text?: string
  descendants?: number
  kids?: number[]
}

interface HNComment {
  id: number
  by: string
  time: number
  text: string
  parent: number
  type: 'comment'
  deleted?: boolean
  dead?: boolean
}

interface ItemDetail {
  story: Story
  comments: HNComment[]
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

export default async function ItemDetailRoute(handle: Handle) {
  const { id } = useParams(handle)

  const detail = await handle.async<ItemDetail>(
    async () => {
      const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      if (!storyRes.ok) throw new Error('Failed to fetch story details')
      const story = (await storyRes.json()) as Story

      const kids = story.kids || []
      const commentPromises = kids.slice(0, 15).map(async (kidId) => {
        const commentRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${kidId}.json`)
        if (!commentRes.ok) return null
        return commentRes.json() as Promise<HNComment>
      })

      const commentsRaw = await Promise.all(commentPromises)
      const comments = commentsRaw.filter(
        (c): c is HNComment => c !== null && c.type === 'comment' && !c.deleted && !c.dead,
      )

      return { story, comments }
    },
    {
      key: `hn:item:${id}`,
      cache: 'page',
    },
  )

  return () => {
    const value = detail.value

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 px-3.5 py-1.5 text-sm font-medium text-slate-200 transition-all active:scale-[0.98]"
          >
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            トップに戻る
          </Link>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 px-3.5 py-1.5 text-sm font-medium text-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
            disabled={detail.pending}
            mix={on('click', async () => {
              const refresh = detail.refresh()
              await handle.update()
              await refresh
              await handle.update()
            })}
          >
            {detail.pending ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                更新中...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992V4.356"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.015 9.348A8.25 8.25 0 006.75 5.64L3.75 8.64"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.977 14.652H2.985v4.992"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.985 14.652A8.25 8.25 0 0017.25 18.36l3-3"
                  />
                </svg>
                更新する
              </>
            )}
          </button>
        </div>

        {/* Story details */}
        {detail.pending && !value ? (
          <div className="animate-pulse space-y-6">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 space-y-4">
              <div className="h-6 bg-slate-800 rounded w-5/6" />
              <div className="h-4 bg-slate-800 rounded w-1/4" />
            </div>
            <div className="space-y-4 mt-8">
              <div className="h-4 bg-slate-800 rounded w-16" />
              <div className="h-20 bg-slate-900/40 border border-slate-800/80 rounded-xl p-5" />
              <div className="h-20 bg-slate-900/40 border border-slate-800/80 rounded-xl p-5" />
            </div>
          </div>
        ) : (
          value && (
            <div>
              {/* Article Card */}
              <article className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 md:p-8 mb-8 backdrop-blur-md">
                <h1 className="text-xl md:text-2xl font-bold text-slate-100 leading-snug">
                  {value.story.url ? (
                    <a
                      href={value.story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-amber-400 flex items-center gap-1.5 flex-wrap inline-flex"
                    >
                      {value.story.title}
                      <svg
                        className="w-4 h-4 text-slate-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  ) : (
                    value.story.title
                  )}
                </h1>

                {value.story.url && (
                  <div className="mt-1.5 text-xs text-slate-400 truncate">
                    <span className="font-mono">{value.story.url}</span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400 border-t border-slate-800/60 pt-4">
                  <span className="font-semibold text-amber-500">{value.story.score} points</span>
                  <span>by</span>
                  <span className="font-semibold text-slate-200">{value.story.by}</span>
                  <span>•</span>
                  <span>{formatTime(value.story.time)}</span>
                  <span>•</span>
                  <span>{value.story.descendants || 0} コメント</span>
                </div>

                {value.story.text && (
                  <div
                    className="mt-6 text-sm text-slate-300 leading-relaxed border-t border-slate-800/65 pt-5 comment-text"
                    innerHTML={value.story.text}
                  />
                )}
              </article>

              {/* Comments Section */}
              <section className="space-y-6">
                <h2 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-amber-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                    />
                  </svg>
                  コメント ({value.comments.length})
                </h2>

                {value.comments.length === 0 ? (
                  <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-8 text-center text-slate-500 text-sm">
                    コメントはありません。
                  </div>
                ) : (
                  <div className="space-y-4">
                    {value.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-slate-900/20 border border-slate-900/80 hover:border-slate-800/60 rounded-xl p-5 transition-all duration-150"
                      >
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                          <span className="font-semibold text-slate-300">{comment.by}</span>
                          <span>•</span>
                          <span>{formatTime(comment.time)}</span>
                        </div>
                        <div
                          className="text-sm text-slate-300 leading-relaxed comment-text"
                          innerHTML={comment.text}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )
        )}
      </div>
    )
  }
}
