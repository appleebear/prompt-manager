'use client';

import { FormEvent, useEffect, useState } from 'react';
import { toDisplayPromptText } from '../../src/prompt-text';

type ListingStats = {
  likeCount: number;
  bookmarkCount: number;
  forkCount: number;
};

type Listing = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'unlisted';
  stats: ListingStats;
};

type ListingDetail = {
  listing: Omit<Listing, 'stats'>;
  stats: ListingStats;
  promptVersion: {
    id: string;
    versionNumber: number;
    createdBy: string;
    createdAt: string;
    blocks: Array<{ role: 'system' | 'user' | 'assistant'; content: string; orderIndex: number }>;
  };
  promptText: string;
};

async function readJsonSafe<T>(response: Response): Promise<Partial<T>> {
  const raw = await response.text();
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return {};
  }
}

export function PublicApp() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [reactions, setReactions] = useState<{ liked: Listing[]; bookmarked: Listing[] }>({
    liked: [],
    bookmarked: [],
  });
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadListings('');
    void loadReactions();
  }, []);

  useEffect(() => {
    if (!selectedListingId) {
      setDetail(null);
      return;
    }

    void loadListingDetail(selectedListingId);
  }, [selectedListingId]);

  async function loadListings(nextQuery: string) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) {
        params.set('q', nextQuery.trim());
      }

      const response = await fetch(`/api/listings?${params.toString()}`, { cache: 'no-store' });
      const json = (await readJsonSafe<{ listings?: Listing[]; error?: string }>(response)) as {
        listings?: Listing[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? 'listing을 불러오지 못했습니다.');
      }

      const nextListings = json.listings ?? [];
      setListings(nextListings);

      if (nextListings.length === 0) {
        setSelectedListingId(null);
        setDetail(null);
        return;
      }

      const selectedExists = selectedListingId ? nextListings.some((listing) => listing.id === selectedListingId) : false;
      if (!selectedExists) {
        setSelectedListingId(nextListings[0]?.id ?? null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function loadListingDetail(listingId: string) {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}`, { cache: 'no-store' });
      const json = (await readJsonSafe<ListingDetail & { error?: string }>(response)) as ListingDetail & {
        error?: string;
      };

      if (!response.ok || !json.listing || !json.promptVersion) {
        throw new Error(json.error ?? 'listing 상세를 불러오지 못했습니다.');
      }

      setDetail(json);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '알 수 없는 오류가 발생했습니다.');
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadReactions() {
    setLoadingReactions(true);

    try {
      const response = await fetch('/api/listings/reactions', { cache: 'no-store' });
      const json = (await readJsonSafe<{ liked?: Listing[]; bookmarked?: Listing[]; error?: string }>(response)) as {
        liked?: Listing[];
        bookmarked?: Listing[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? '내 반응 목록을 불러오지 못했습니다.');
      }

      setReactions({
        liked: json.liked ?? [],
        bookmarked: json.bookmarked ?? [],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoadingReactions(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadListings(query);
  }

  async function reactToListing(listingId: string, action: 'like' | 'bookmark') {
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });

      const json = (await readJsonSafe<{
        stats?: ListingStats;
        error?: string;
      }>(response)) as {
        stats?: ListingStats;
        error?: string;
      };

      if (!response.ok || !json.stats) {
        throw new Error(json.error ?? `${action} 요청에 실패했습니다.`);
      }

      setListings((prev) =>
        prev.map((listing) => (listing.id === listingId ? { ...listing, stats: json.stats ?? listing.stats } : listing)),
      );

      setDetail((prev) =>
        prev && prev.listing.id === listingId
          ? {
              ...prev,
              stats: json.stats ?? prev.stats,
            }
          : prev,
      );

      await loadReactions();
    } catch (reactError) {
      setError(reactError instanceof Error ? reactError.message : '알 수 없는 오류가 발생했습니다.');
    }
  }

  async function handleCopyPrompt() {
    if (!detail?.promptText) {
      return;
    }

    setCopying(true);
    setError(null);
    setNotice(null);

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(detail.promptText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = detail.promptText;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setNotice(`"${detail.listing.title}" 프롬프트를 클립보드에 복사했습니다.`);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : '클립보드 복사에 실패했습니다.');
    } finally {
      setCopying(false);
    }
  }

  return (
    <section className="public-shell">
      <div className="workspace-header">
        <div>
          <p className="eyebrow">Public Platform</p>
          <h1 className="section-title">Explore Listings</h1>
        </div>
        <p className="muted">카드를 눌러 상세 프롬프트를 확인하고 바로 복사할 수 있습니다.</p>
      </div>

      <form className="inline-form" onSubmit={handleSearch}>
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search public prompts"
          aria-label="Search public prompts"
        />
        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? '검색 중...' : '검색'}
        </button>
      </form>

      <div className="status-stack" role="status" aria-live="polite">
        {error ? <p className="status status-error">{error}</p> : null}
        {notice ? <p className="status status-ok">{notice}</p> : null}
      </div>

      <div className="reaction-library" aria-busy={loadingReactions}>
        <section className="panel reaction-panel">
          <h2 className="section-title">내가 Like한 프롬프트</h2>
          {loadingReactions ? <p className="empty">좋아요 목록을 불러오는 중...</p> : null}
          {!loadingReactions && reactions.liked.length === 0 ? (
            <p className="empty">좋아요한 프롬프트가 없습니다.</p>
          ) : null}
          {!loadingReactions && reactions.liked.length > 0 ? (
            <ul className="reaction-list">
              {reactions.liked.map((listing) => (
                <li key={`liked-${listing.id}`}>
                  <button type="button" className="reaction-item" onClick={() => setSelectedListingId(listing.id)}>
                    <strong>{listing.title}</strong>
                    <span className="muted">
                      Like {listing.stats.likeCount} · Bookmark {listing.stats.bookmarkCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="panel reaction-panel">
          <h2 className="section-title">내가 Bookmark한 프롬프트</h2>
          {loadingReactions ? <p className="empty">북마크 목록을 불러오는 중...</p> : null}
          {!loadingReactions && reactions.bookmarked.length === 0 ? (
            <p className="empty">북마크한 프롬프트가 없습니다.</p>
          ) : null}
          {!loadingReactions && reactions.bookmarked.length > 0 ? (
            <ul className="reaction-list">
              {reactions.bookmarked.map((listing) => (
                <li key={`bookmarked-${listing.id}`}>
                  <button type="button" className="reaction-item" onClick={() => setSelectedListingId(listing.id)}>
                    <strong>{listing.title}</strong>
                    <span className="muted">
                      Like {listing.stats.likeCount} · Bookmark {listing.stats.bookmarkCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      {!loading && listings.length === 0 ? <p className="empty">표시할 공개 listing이 없습니다.</p> : null}

      <div className="public-layout">
        <div className="listing-grid" aria-busy={loading}>
          {listings.map((listing) => {
            const selected = listing.id === selectedListingId;
            return (
              <article key={listing.id} className={`listing-card ${selected ? 'listing-card-active' : ''}`}>
                <button type="button" className="listing-select" onClick={() => setSelectedListingId(listing.id)}>
                  <p className="eyebrow">{listing.category}</p>
                  <h2>{listing.title}</h2>
                  <p className="muted">{listing.summary || '요약 없음'}</p>
                </button>

                <div className="tag-row">
                  {listing.tags.map((tag) => (
                    <span key={`${listing.id}-${tag}`} className="tag">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="reaction-row">
                  <button type="button" className="button button-ghost" onClick={() => reactToListing(listing.id, 'like')}>
                    Like {listing.stats.likeCount}
                  </button>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => reactToListing(listing.id, 'bookmark')}
                  >
                    Bookmark {listing.stats.bookmarkCount}
                  </button>
                  <span className="muted">Forks {listing.stats.forkCount}</span>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="panel panel-wide public-detail-panel">
          {!selectedListingId && !loading ? <p className="empty">왼쪽에서 listing을 선택하세요.</p> : null}
          {loadingDetail ? <p className="empty">상세 프롬프트를 불러오는 중...</p> : null}

          {detail ? (
            <>
              <div className="detail-header">
                <div>
                  <p className="eyebrow">{detail.listing.category}</p>
                  <h2 className="section-title">{detail.listing.title}</h2>
                  <p className="muted">{detail.listing.summary || '요약 없음'}</p>
                  <p className="muted">
                    v{detail.promptVersion.versionNumber} · {new Date(detail.promptVersion.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void handleCopyPrompt()}
                  disabled={copying}
                  aria-label="선택한 프롬프트 복사"
                >
                  <span className="icon-wrap" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" focusable="false">
                      <path
                        d="M9 9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </span>
                  <span>{copying ? '복사 중...' : '복사'}</span>
                </button>
              </div>

              <div className="version-stack">
                <pre className="codeblock">{toDisplayPromptText(detail.promptVersion.blocks)}</pre>
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
