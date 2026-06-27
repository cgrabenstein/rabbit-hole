import { useState, useEffect, useCallback } from "react";
import type { Source } from "../db/types";
import { getAllSources } from "../db";

export function useSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllSources()
      .then((data) => {
        if (!cancelled) setSources(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rev]);

  const refresh = useCallback(() => {
    setRev((r) => r + 1);
  }, []);

  return { sources, loading, refresh };
}
