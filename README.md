# pi-extensions

自分用の [pi](https://github.com/badlogic/pi-mono)（pi coding agent）の拡張機能です。pi は最低限の道具しか持たないので、足りない道具をここで足します。
手元で pi を使うときにも、[hayato](https://github.com/jjchange10/hayato) が pi を頭脳にして動くときにも、同じ道具を使います。

道具は主に hayato が提案して作り、人がレビューしてマージします。
ほかの人が作った拡張機能はインストールせず、アイデアとして参考にするだけにして、コードは一から書いています（中身をすべて把握し、自分の環境に合わせるため）。

## 道具の一覧

| ファイル            | 道具                       | 何をするか                                                                      | 参考にしたもの                                    |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `extensions/web.ts` | `web_fetch` / `web_search` | Web ページを本文の文章にして読む / Web を検索する（Tavily、キーがあるときだけ） | Claude Code の WebFetch / WebSearch（考え方のみ） |

## 使い方

**手元の pi で使う**

```sh
pi -e ~/pi-extensions/extensions/web.ts
```

いつも使うなら、`~/.pi/agent/settings.json` の `extensions` に `extensions/` の中のファイルを書きます。Web 検索を使うときは、環境変数 `TAVILY_API_KEY` に [Tavily](https://tavily.com/) の API キー（無料で月1,000回）を入れます。

**hayato で使う**

hayato の compose が、隣に clone したこのリポジトリの `extensions/` を読み取り専用でコンテナに渡します。hayato は中の `.ts` をすべて読み込み、最後に安全装置を読み込みます。

```
hayato ── pi -p --no-extensions
             --extension <このリポジトリ>/extensions/*.ts   ← 名前の順
             --extension .pi/extensions/hayato-guard.ts     ← 安全装置は必ず最後
```

新しい道具が hayato で使えるようになるまでに、人の確認が2回入ります（PR のマージと、hayato を動かしている PC での `git pull`）。
安全装置は hayato 本体のリポジトリにあり、ここには置きません（道具を作る hayato の手の届かないところに置くため）。

## 安全のルール

拡張機能は、pi の中で制限なしに動きます。安全装置を迂回できる道具を作らないよう、次の書き方は禁止しています。`pnpm test` が機械的に調べます（`safety/forbiddenPatterns.ts`）。

- コマンドの実行（`child_process`、`pi.exec` など）
- ファイルの書き換え（`writeFile`、`rm` など）
- 道具の呼び出しや会話への割り込み（`tool_call` などのイベント）
- pi が最初から持つ道具（`bash`、`edit` など）の上書き
- 実行時に組み立てたコードの実行（`eval`、`new Function`、`import()`）

機械で見つけられない抜け道もあるので、最後は人のレビューで確かめます。

## 開発

```sh
corepack enable
pnpm install
pnpm check   # 型チェック・フォーマット・テスト（安全のルールを含む）
```

開発のルールは [CLAUDE.md](CLAUDE.md) にまとめています。

## ライセンス

MIT（[LICENSE](LICENSE)）
