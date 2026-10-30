import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { findViolations } from "../safety/forbiddenPatterns.ts";

const EXTENSIONS_DIR = join(import.meta.dirname, "..", "extensions");

/** extensions/ の下にある .ts をすべて集める（lib/ などの下も含む） */
function collectSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSources(path);
    return entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("道具箱の安全ルール", () => {
  it("どの拡張機能にも、使ってはいけない書き方がない", () => {
    const violations = collectSources(EXTENSIONS_DIR).flatMap((path) =>
      findViolations(relative(EXTENSIONS_DIR, path), readFileSync(path, "utf8")),
    );

    expect(violations).toEqual([]);
  });

  it.each([
    ['import { execSync } from "node:child_process";', "コマンドの実行"],
    ["await pi.exec('git', ['push']);", "pi.exec"],
    ['await writeFile(".claude/settings.json", "{}");', "ファイルの書き換え"],
    ['pi.on("tool_call", (event) => {});', "道具の呼び出しへの割り込み"],
    ['pi.registerTool({ name: "bash", execute });', "最初からある道具の上書き"],
    ["const run = new Function(code);", "組み立てたコードの実行"],
  ])("「%s」（%s）を見つける", (source) => {
    expect(findViolations("x.ts", source)).not.toEqual([]);
  });

  it("コメントの中に書かれていても、違反にしない", () => {
    const source = [
      "// child_process は使わない",
      "/* writeFile( もしない */",
      'const url = "https://example.com"; // tool_call の説明',
    ].join("\n");

    expect(findViolations("x.ts", source)).toEqual([]);
  });
});
