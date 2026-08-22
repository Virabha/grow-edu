export type PublicPortfolioItemKind = 'PROJECT' | 'SKILL' | 'CERTIFICATE';

export interface PublicPortfolioItem {
  kind: PublicPortfolioItemKind;
  publishedAt: Date;
  snapshot: Record<string, unknown>;
}

export interface PublicPortfolio {
  handle: string;
  displayName: string | null;
  headline: string | null;
  bio: string | null;
  items: PublicPortfolioItem[];
}
