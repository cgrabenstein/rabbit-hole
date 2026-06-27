export interface ReadResult {
  content: string;
  title: string;
  author: string | null;
  publicationDate: string | null;
  domain: string;
}

export async function fetchArticle(url: string): Promise<ReadResult> {
  const params = new URLSearchParams({ url });
  const response = await fetch(`/api/read?${params}`, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    // 422 means readability couldn't parse — not a crash, just not extractable
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Server returned ${response.status}`
    );
  }

  return response.json() as Promise<ReadResult>;
}
