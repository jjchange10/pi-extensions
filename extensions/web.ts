/**
 * Web の道具: ページを読む（web_fetch）と、検索する（web_search）。
 *
 * pi には最初から Web の道具がないので、調べものや自主探索のために足す。
 * 参考にしたもの: Claude Code の WebFetch / WebSearch（考え方のみ。コードは独自）
 */
import { lookup } from "node:dns/promises";

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

import { fetchPage } from "./lib/webFetch.ts";
import { searchWeb } from "./lib/webSearch.ts";

export default function web(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "web_fetch",
    label: "Web ページを読む",
    description:
      "URL の Web ページを取ってきて、本文を文章にして返す。長いページは途中で切る。手元や社内のアドレスには取りに行かない。",
    promptSnippet: "Read a web page as plain text",
    parameters: Type.Object({
      url: Type.String({ description: "読む URL（http または https）" }),
    }),
    async execute(_toolCallId, params, signal) {
      const page = await fetchPage(params.url, { fetch, lookup: lookupAll }, signal ?? undefined);
      const note = page.truncated ? "\n\n（長いので、ここで切りました）" : "";
      return {
        content: [{ type: "text", text: `${page.url}\n\n${page.text}${note}` }],
        details: { url: page.url, truncated: page.truncated },
      };
    },
  });

  // 検索はキーがあるときだけ使えるようにする（ないまま出すと、毎回失敗する道具になるため）
  const apiKey = process.env["TAVILY_API_KEY"];
  if (apiKey === undefined || apiKey === "") {
    return;
  }
  pi.registerTool({
    name: "web_search",
    label: "Web を検索する",
    description:
      "Web を検索して、上位の結果（題名・URL・要点）を返す。詳しく読むときは web_fetch を使う。",
    promptSnippet: "Search the web",
    parameters: Type.Object({
      query: Type.String({ description: "検索する言葉" }),
    }),
    async execute(_toolCallId, params, signal) {
      const results = await searchWeb(params.query, { fetch, apiKey }, signal ?? undefined);
      const text =
        results.length === 0
          ? "見つかりませんでした"
          : results
              .map((result) => `- ${result.title}\n  ${result.url}\n  ${result.snippet}`)
              .join("\n");
      return { content: [{ type: "text", text }], details: { count: results.length } };
    },
  });
}

/** ホスト名を、すべての IP アドレスにする（1つでも手元のアドレスが混ざっていたら断るため） */
async function lookupAll(hostname: string): Promise<string[]> {
  const addresses = await lookup(hostname, { all: true });
  return addresses.map((entry) => entry.address);
}
