# Remix 3 Sample 01

Hacker News API を使った Remix 3 / `@remix-run/ui` のページ遷移デモです。トップページの記事カードをクリックすると `/item/:id` のコメントページへ遷移し、データ読み込み中は `handle.async` の pending resource を使って skeleton UI を表示します。

[Live Demo](https://remix3-fork-sample01.mofon001.workers.dev/)

## 目的

- `@remix-run/ui` の async component と `handle.async` を使ったデータ取得を確認する
- サーバー初期表示で取得したデータを HTML に埋め込み、Hydration では再 fetch しない
- ブラウザ上のページ遷移では、データ取得の完了を待たずに pending UI を先に描画する
- `cache: 'page'` で、ページがリロードされるまでデータをメモリ上に保持する
- `refresh()` で、明示的に最新データを再取得する

## 画面

- `/`: Hacker News の top stories を表示します。カード全体が `/item/:id` へのリンクになっていて、外部 URL のドメインは記事情報として表示します。
- `/item/:id`: 記事詳細とコメント一覧を表示します。更新ボタンを押すと詳細 resource を再取得します。

## handle.async の使い方

```tsx
export default async function Index(handle: Handle) {
  const stories = await handle.async<Story[]>(
    async () => {
      const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
      const ids: number[] = await res.json()

      return Promise.all(
        ids.slice(0, 30).map(async (id) => {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
          return itemRes.json() as Promise<Story>
        }),
      )
    },
    {
      key: 'hn:topstories',
      cache: 'page',
    },
  )

  return () => {
    const value = stories.value

    return stories.pending && !value ? <StoriesSkeleton /> : <StoriesList stories={value ?? []} />
  }
}
```

`handle.async` は取得した値そのものではなく、`value`、`pending`、`error`、`refresh()`、`clear()` を持つ resource オブジェクトを返します。このサンプルでは `await handle.async(...)` と書いていますが、ブラウザ上のクライアント遷移ではデータ完了を待たずに pending 状態の resource が返ります。

## SSR、Hydration、クライアント遷移

サーバー側の初期表示では、`await handle.async(...)` がデータ取得完了まで待機し、取得した値を `__REMIX_DATA__` にシリアライズして HTML に埋め込みます。ブラウザの Hydration ではこのデータを復元するため、同じ action は再実行されません。

クライアント上でトップページからコメントページへ遷移した場合は、`handle.async` が pending 状態の resource をすぐに返します。これにより、画面全体が空になるのではなく、データ読み込み中の skeleton を表示できます。取得が完了すると resource の `value` が更新され、`handle.update()` によって画面が再描画されます。

## ページ内キャッシュと更新

`cache: 'page'` を指定した resource は、コンポーネントがアンマウントされてもページがリロードされるまで保持されます。このサンプルでは一覧に `hn:topstories`、詳細に `hn:item:${id}` のキーを付けています。

更新ボタンでは `refresh()` を呼び、キャッシュを使わずに action を再実行します。再取得中も直前の `value` は保持されるため、コメント一覧の内容は pending 中に消えません。

## 実装メモ

- トップページの記事カードは `Link` で `/item/:id` に遷移します。ページ遷移の確認デモなので、一覧上のタイトルは外部サイトへ直接遷移しません。
- コメント本文は Hacker News API から HTML として返るため、`innerHTML={comment.text}` で描画します。
- Tailwind CSS は `src/index.css?inline` から読み込みます。`@remix-run/ui/server` は `style` 要素内の raw text を保持するため、Tailwind v4 の `:where(& > ...)` のようなセレクタもそのまま動作します。

## Commands

```sh
pnpm --filter remix3-fork-sample01 run dev
pnpm --filter remix3-fork-sample01 run build
```

## Related Files

- `src/routes/index.tsx`
- `src/routes/item.$id.tsx`
- `src/provider/RouterProvider.tsx`
