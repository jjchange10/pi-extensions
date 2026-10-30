/** 検索の道具が外の世界に触れる部分。テストでは偽物に差し替える */
export interface WebSearchDependencies {
  readonly fetch: typeof fetch;
  readonly apiKey: string;
}

export interface SearchResult {
  readonly title: string;
  readonly url: string;
  /** 検索サービスが抜き出した、ページの要点 */
  readonly snippet: string;
}

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const TIMEOUT_MS = 20_000;
/** 1回の検索で返す件数。多すぎると、会話の文脈を食いつぶすため */
export const MAX_RESULTS = 5;

/**
 * Tavily で Web を検索する。
 * Tavily を選んだのは、AI から使う前提の検索サービスで、無料で月1,000回使え、
 * クレジットカードの登録も要らないため。
 */
export async function searchWeb(
  query: string,
  dependencies: WebSearchDependencies,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const response = await dependencies.fetch(TAVILY_ENDPOINT, {
    method: "POST",
    signal: signal === undefined ? timeout : AbortSignal.any([signal, timeout]),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${dependencies.apiKey}`,
    },
    body: JSON.stringify({ query, max_results: MAX_RESULTS, search_depth: "basic" }),
  });
  if (!response.ok) {
    throw new Error(`検索できませんでした（HTTP ${response.status}）`);
  }
  return readResults(await response.json());
}

/**
 * 検索サービスの返事から、使う部分だけを取り出す。外から来たデータなので、形を確かめてから使う
 * （作業フォルダには zod などの依存がないので、自分で確かめる）。
 */
export function readResults(body: unknown): SearchResult[] {
  const results = isRecord(body) ? body["results"] : undefined;
  if (!Array.isArray(results)) {
    throw new Error("検索サービスの返事の形が想定と違います");
  }
  return results.flatMap((item) => {
    if (!isRecord(item)) return [];
    const { title, url, content } = item;
    if (typeof title !== "string" || typeof url !== "string") return [];
    return [{ title, url, snippet: typeof content === "string" ? content : "" }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
