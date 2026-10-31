import { isIP } from "node:net";

import { describe, expect, it } from "vitest";

import {
  MAX_CHARACTERS,
  fetchPage,
  type WebFetchDependencies,
} from "../extensions/lib/webFetch.ts";

/** URL ごとに決まった返事をする、偽の fetch と DNS */
function fakeWeb(
  pages: Record<string, Response>,
  addresses: Record<string, string[]> = {},
): WebFetchDependencies & { requested: string[] } {
  const requested: string[] = [];
  return {
    requested,
    fetch: (input) => {
      const url = String(input);
      requested.push(url);
      const page = pages[url];
      return Promise.resolve(page ?? new Response("not found", { status: 404 }));
    },
    // 本物の DNS と同じく、IP アドレスがそのまま書かれていれば、それを返す
    lookup: (hostname) =>
      Promise.resolve(isIP(hostname) ? [hostname] : (addresses[hostname] ?? ["93.184.216.34"])),
  };
}

const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });

describe("fetchPage", () => {
  it("HTML のページを取ってきて、本文を文章にして返す", async () => {
    const web = fakeWeb({ "https://example.com/": html("<h1>こんにちは</h1><p>本文</p>") });

    const page = await fetchPage("https://example.com/", web);

    expect(page).toEqual({
      url: "https://example.com/",
      text: "こんにちは\n本文",
      truncated: false,
    });
  });

  it("長すぎるページは上限で切り、切ったことを返す", async () => {
    const long = "あ".repeat(MAX_CHARACTERS + 10);
    const web = fakeWeb({
      "https://example.com/long": new Response(long, { headers: { "content-type": "text/plain" } }),
    });

    const page = await fetchPage("https://example.com/long", web);

    expect(page.text).toHaveLength(MAX_CHARACTERS);
    expect(page.truncated).toBe(true);
  });

  it("手元や社内のアドレスには取りに行かない", async () => {
    const web = fakeWeb({}, { "internal.example": ["10.0.0.5"] });

    await expect(fetchPage("http://127.0.0.1:8787/messages", web)).rejects.toThrow(
      /公開されていない/,
    );
    await expect(fetchPage("http://[::ffff:7f00:1]/", web)).rejects.toThrow(/公開されていない/);
    await expect(fetchPage("http://internal.example/", web)).rejects.toThrow(/公開されていない/);
    expect(web.requested).toEqual([]);
  });

  it("リダイレクトで手元のアドレスへ飛ばされたら、そこで断る", async () => {
    const web = fakeWeb({
      "https://example.com/go": new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      }),
    });

    await expect(fetchPage("https://example.com/go", web)).rejects.toThrow(/公開されていない/);
    expect(web.requested).toEqual(["https://example.com/go"]);
  });

  it("公開アドレスへのリダイレクトはたどる", async () => {
    const web = fakeWeb({
      "https://example.com/old": new Response(null, { status: 301, headers: { location: "/new" } }),
      "https://example.com/new": html("<p>移転先</p>"),
    });

    const page = await fetchPage("https://example.com/old", web);

    expect(page).toMatchObject({ url: "https://example.com/new", text: "移転先" });
  });

  it("http・https 以外や、文章として読めない種類は断る", async () => {
    const web = fakeWeb({
      "https://example.com/a.png": new Response("x", { headers: { "content-type": "image/png" } }),
    });

    await expect(fetchPage("file:///etc/passwd", web)).rejects.toThrow(/http と https 以外/);
    await expect(fetchPage("https://example.com/a.png", web)).rejects.toThrow(/読めない種類/);
  });
});
