export interface FetchTitleResult {
  title: string;
}

export async function fetchTitle(url: string): Promise<FetchTitleResult> {
  const params = new URLSearchParams({ url });
  const response = await fetch(`/api/fetch-title?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Server returned ${response.status}`
    );
  }

  return response.json() as Promise<FetchTitleResult>;
}
