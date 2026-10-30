/**
 * 道具箱の拡張機能で、使ってはいけない書き方。
 *
 * pi を自動で動かすときは、安全装置（hayato なら hayato-guard.ts）が bash・edit・write の呼び出しを見張る。
 * 拡張機能はそれと同じ力を、安全装置を通らずに持てるので、ここで機械的に止める。
 * 機械で見つけられない抜け道もあるので、最後は人のレビューで確かめる。
 */
export interface ForbiddenPattern {
  readonly pattern: RegExp;
  /** なぜ使ってはいけないか（見つかったときに、そのまま表示する） */
  readonly reason: string;
}

export const FORBIDDEN_PATTERNS: readonly ForbiddenPattern[] = [
  {
    // 正規表現の .exec(...) は文字列を調べるだけなので除き、pi.exec と、単独で呼ぶ exec を見つける
    pattern: /child_process|\bpi\.exec\b|(^|[^.\w])exec(File)?(Sync)?\s*\(|\bspawn(Sync)?\s*\(/,
    reason: "コマンドを実行すると、安全装置の禁止ルールを通らずに git push などができてしまう",
  },
  {
    pattern:
      /\b(writeFile|appendFile|createWriteStream|rm|rmdir|unlink|rename|copyFile|cp|mkdir|symlink|link|chmod|chown|truncate|utimes)(Sync)?\s*\(/,
    reason: "ファイルを書き換えると、安全装置が守っている場所（権限設定など）も変えられてしまう",
  },
  {
    pattern: /withFileMutationQueue/,
    reason:
      "ファイルを書き換える道具は作らない（書き換えは pi の edit・write に任せ、安全装置を通す）",
  },
  {
    pattern: /["'](tool_call|tool_result|user_bash|before_provider_request|context)["']/,
    reason: "道具の呼び出しや会話に割り込むと、安全装置が確かめたあとの中身を書き換えられてしまう",
  },
  {
    pattern: /name:\s*["'](bash|read|edit|write|grep|find|ls)["']/,
    reason: "pi が最初から持つ道具を上書きすると、安全装置の見張りから外れてしまう",
  },
  {
    pattern: /setActiveTools|registerProvider|\.on\(\s*["']session_/,
    reason:
      "道具の入れ替えや、モデル・セッションの差し替えは、pi を動かす側（hayato など）の仕組みと食い違う",
  },
  {
    pattern: /\beval\s*\(|new\s+Function\s*\(|\bimport\s*\(/,
    reason: "実行時に組み立てたコードを動かすと、中身をレビューで確かめられない",
  },
];

export interface Violation {
  readonly file: string;
  readonly line: number;
  readonly text: string;
  readonly reason: string;
}

/** 1つのファイルの中身から、使ってはいけない書き方を探す。コメントの中は調べない */
export function findViolations(file: string, source: string): Violation[] {
  return withoutComments(source)
    .split("\n")
    .flatMap((text, index) =>
      FORBIDDEN_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ reason }) => ({
        file,
        line: index + 1,
        text: text.trim(),
        reason,
      })),
    );
}

/** コメントを空白に置き換える（行番号がずれないよう、改行は残す） */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}
