import { describe, expect, it } from "vitest";

import { readResults, searchWeb } from "../extensions/lib/webSearch.ts";

describe("searchWeb", () => {
  it("Tavily にキーを付けて問い合わせ、題名・URL・要点を返す", async () => {
    const requests: { url: string; init: RequestInit | undefined }[] = [];
    const fakeFetch: typeof fetch = (input, init) => {
      requests.push({ url: String(input), init });
      return Promise.resolve(
        Response.json({
          results: [{ title: "pi", url: "https://pi.dev", content: "要点", score: 0.9 }],
        }),
      );
    };

    const results = await searchWeb("pi coding agent", { fetch: fakeFetch, apiKey: "tvly-x" });

    expect(results).toEqual([{ title: "pi", url: "https://pi.dev", snippet: "要点" }]);
    expect(requests[0]?.url).toBe("https://api.tavily.com/search");
    expect(new Headers(requests[0]?.init?.headers).get("authorization")).toBe("Bearer tvly-x");
  });

  it("検索サービスが失敗したら、エラーにする", async () => {
    const fakeFetch: typeof fetch = () => Promise.resolve(new Response("", { status: 429 }));

    await expect(searchWeb("x", { fetch: fakeFetch, apiKey: "k" })).rejects.toThrow(/HTTP 429/);
  });
});

describe("readResults", () => {
  it("形の合わない結果は捨て、返事そのものの形が違えばエラーにする", () => {
    expect(
      readResults({ results: [{ title: "ok", url: "https://a" }, { title: 1 }, null] }),
    ).toEqual([{ title: "ok", url: "https://a", snippet: "" }]);
    expect(() => readResults({ error: "bad key" })).toThrow(/形が想定と違います/);
  });
});
