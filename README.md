# hayato-pi-extensions

hayato の道具箱です。[pi](https://github.com/badlogic/pi-mono) を頭脳にして動くときに使う拡張機能（道具）を置いています。

ここにある拡張機能は、すべて hayato が提案し、人がレビューしてマージしたものです。
ほかの人が作った拡張機能はインストールせず、アイデアとして参考にするだけにして、コードは一から書いています（中身をすべて把握し、hayato の環境に合わせるため）。

## 道具の一覧

| ファイル            | 道具                       | 何をするか                                                                      | 参考にしたもの                                    |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `extensions/web.ts` | `web_fetch` / `web_search` | Web ページを本文の文章にして読む / Web を検索する（Tavily、キーがあるときだけ） | Claude Code の WebFetch / WebSearch（考え方のみ） |

## 使われ方

```
hayato（本体）── pi -p --no-extensions
                    --extension <道具箱>/extensions/*.ts   ← ここにあるもの（名前の順）
                    --extension .pi/extensions/hayato-guard.ts   ← 安全装置は必ず最後
```

- hayato 本体の compose が、このリポジトリの `extensions/` を読み取り専用でコンテナに渡します
- 新しい道具が使えるようになるまでに、人の確認が2回入ります（PR のマージと、hayato を動かしている PC での `git pull`）
- 安全装置（禁止しているコマンドやファイルの書き換えを止める）は、hayato 本体のリポジトリにあり、ここには置きません

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
