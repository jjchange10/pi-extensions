import { htmlToText } from "./htmlToText.ts";
import { isPublicAddress } from "./publicAddress.ts";

/** 取ってくる道具が外の世界に触れる部分。テストでは偽物に差し替える */
export interface WebFetchDependencies {
  readonly fetch: typeof fetch;
  /** ホスト名を、IP アドレスの一覧にする */
  readonly lookup: (hostname: string) => Promise<readonly string[]>;
}

export interface FetchedPage {
  /** リダイレクトをたどった先の URL */
  readonly url: string;
  readonly text: string;
  /** 長すぎて途中で切ったら true */
  readonly truncated: boolean;
}

/** モデルに渡す文字数の上限。長すぎると、会話の文脈を食いつぶすため */
export const MAX_CHARACTERS = 20_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 20_000;
/** 文章として読める種類。画像や PDF などは読めないので断る */
const READABLE_TYPES = ["text/", "application/json", "application/xml", "application/xhtml+xml"];

/**
 * Web ページを取ってきて、本文を文章として返す。
 *
 * リダイレクトは自分でたどり、行き先ごとに公開アドレスかを確かめる
 * （公開のページから手元のアドレスへ飛ばされるのを防ぐため）。
 */
export async function fetchPage(
  rawUrl: string,
  dependencies: WebFetchDependencies,
  signal?: AbortSignal,
): Promise<FetchedPage> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combinedSignal = signal === undefined ? timeout : AbortSignal.any([signal, timeout]);

  let url = await checkUrl(rawUrl, dependencies);
  for (let redirects = 0; ; redirects++) {
    const response = await dependencies.fetch(url, {
      redirect: "manual",
      signal: combinedSignal,
      headers: { "user-agent": "pi-extensions/web (+https://github.com/jjchange10/pi-extensions)" },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location !== null) {
      if (redirects >= MAX_REDIRECTS) {
        throw new Error(`リダイレクトが多すぎます（${MAX_REDIRECTS} 回まで）`);
      }
      url = await checkUrl(new URL(location, url).href, dependencies);
      continue;
    }
    if (!response.ok) {
      throw new Error(`ページを取れませんでした（HTTP ${response.status}）`);
    }
    return readBody(url, response);
  }
}

/** URL の形と行き先を確かめ、問題なければ正規化した URL を返す */
async function checkUrl(rawUrl: string, dependencies: WebFetchDependencies): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`URL の形になっていません: ${rawUrl}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`http と https 以外は取りに行きません: ${url.protocol}`);
  }
  // [::1] のように角かっこで囲まれた IPv6 は、かっこを外して調べる
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await dependencies.lookup(hostname);
  if (addresses.length === 0 || !addresses.every(isPublicAddress)) {
    throw new Error(`公開されていないアドレスには取りに行きません: ${url.hostname}`);
  }
  return url.href;
}

async function readBody(url: string, response: Response): Promise<FetchedPage> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "text/plain";
  if (!READABLE_TYPES.some((type) => contentType.startsWith(type))) {
    throw new Error(`文章として読めない種類です: ${contentType}`);
  }
  const body = await response.text();
  const isHtml = contentType.includes("html") || /^\s*<(!doctype|html)/i.test(body);
  const text = isHtml ? htmlToText(body) : body;
  return {
    url,
    text: text.slice(0, MAX_CHARACTERS),
    truncated: text.length > MAX_CHARACTERS,
  };
}
