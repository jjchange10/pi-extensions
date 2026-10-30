/**
 * HTML を、モデルが読みやすい素の文章にする。
 *
 * 見た目を再現するためではなく、本文を読むためのもの。スクリプトや装飾は捨て、
 * 段落や見出しの区切りだけを改行として残す。
 */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      // 本文ではない部分は、中身ごと捨てる
      .replace(/<(script|style|noscript|svg|head|nav|footer)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // 区切りになるタグは改行にする
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/pre|\/blockquote)\b[^>]*>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** HTML の書き方で書かれた文字（&amp; や &#12354; など）を、元の文字に戻す */
function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return safeFromCodePoint(Number.parseInt(code.slice(2), 16)) ?? whole;
    }
    if (code.startsWith("#")) {
      return safeFromCodePoint(Number.parseInt(code.slice(1), 10)) ?? whole;
    }
    return named[code.toLowerCase()] ?? whole;
  });
}

function safeFromCodePoint(codePoint: number): string | undefined {
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return undefined;
  }
}
