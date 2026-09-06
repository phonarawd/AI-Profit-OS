/**
 * 퍼뜩 대화 이력 HTTP. JWT/쿠키만. body.userId 없음.
 */

export type PeotteokCitation = {
  kind: "opportunity" | "ledger";
  id?: string;
  deepLink?: string | null;
  asOf: string;
};

export type PeotteokConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type PeotteokHistoryMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  lane: string | null;
  deepLink: string | null;
  citations: PeotteokCitation[];
  createdAt: string;
};

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function authHeaders(
  getAccessToken: () => string | null | Promise<string | null>,
): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function listPeotteokConversations(opts: {
  apiBase?: string;
  getAccessToken: () => string | null | Promise<string | null>;
}): Promise<PeotteokConversationSummary[]> {
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", "/api/v1/me/peotteok/conversations"),
    {
      headers: await authHeaders(opts.getAccessToken),
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error(`peotteok_history_${res.status}`);
  const body = (await res.json()) as { conversations?: PeotteokConversationSummary[] };
  return Array.isArray(body.conversations) ? body.conversations : [];
}

export async function getPeotteokConversation(opts: {
  apiBase?: string;
  conversationId: string;
  getAccessToken: () => string | null | Promise<string | null>;
}): Promise<{
  conversation: PeotteokConversationSummary;
  messages: PeotteokHistoryMessage[];
}> {
  const id = encodeURIComponent(opts.conversationId);
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", `/api/v1/me/peotteok/conversations/${id}`),
    {
      headers: await authHeaders(opts.getAccessToken),
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error(`peotteok_history_${res.status}`);
  return (await res.json()) as {
    conversation: PeotteokConversationSummary;
    messages: PeotteokHistoryMessage[];
  };
}

export async function renamePeotteokConversation(opts: {
  apiBase?: string;
  conversationId: string;
  title: string;
  getAccessToken: () => string | null | Promise<string | null>;
}): Promise<{ id: string; title: string }> {
  const id = encodeURIComponent(opts.conversationId);
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", `/api/v1/me/peotteok/conversations/${id}`),
    {
      method: "PATCH",
      headers: {
        ...(await authHeaders(opts.getAccessToken)),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ title: opts.title }),
    },
  );
  if (!res.ok) throw new Error(`peotteok_history_${res.status}`);
  return (await res.json()) as { id: string; title: string };
}

export async function deletePeotteokConversation(opts: {
  apiBase?: string;
  conversationId: string;
  getAccessToken: () => string | null | Promise<string | null>;
}): Promise<void> {
  const id = encodeURIComponent(opts.conversationId);
  const res = await fetch(
    apiUrl(opts.apiBase ?? "", `/api/v1/me/peotteok/conversations/${id}`),
    {
      method: "DELETE",
      headers: await authHeaders(opts.getAccessToken),
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error(`peotteok_history_${res.status}`);
}
