import { describe, expect, it } from "vitest";

import { htmlToText } from "../extensions/lib/htmlToText.ts";

describe("htmlToText", () => {
  it("スクリプトや装飾を捨て、本文だけを、段落ごとに改行して返す", () => {
    const html = `<html><head><title>t</title><style>p{}</style></head><body>
      <nav>メニュー</nav><h1>見出し</h1><p>本文の<b>1段落目</b></p>
      <script>alert(1)</script><ul><li>項目A</li><li>項目B</li></ul></body></html>`;

    expect(htmlToText(html)).toBe("見出し\n本文の 1段落目\n- 項目A\n- 項目B");
  });

  it("&amp; や &#x3042; のような書き方を、元の文字に戻す", () => {
    expect(htmlToText("<p>A &amp; B &lt;tag&gt; &#x3042;&#12356;</p>")).toBe("A & B <tag> あい");
  });
});
