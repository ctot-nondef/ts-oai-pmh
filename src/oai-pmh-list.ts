import type { TOAIListResponseData } from "./TOAIResponse.type.js";

export async function* iterateOaiList<TItem>(
  params: Record<string, string | undefined>,
  loadPage: (params: Record<string, string | undefined>) => Promise<TOAIListResponseData<TItem>>,
): AsyncGenerator<TItem> {
  let currentParams = params;

  for (;;) {
    const page = await loadPage(currentParams);
    for (const item of page.items) {
      yield item;
    }

    const nextToken = page.resumptionToken?.value;
    if (!nextToken) return;

    currentParams = { resumptionToken: nextToken };
  }
}
