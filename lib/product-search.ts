const SEARCH_TAG_SPLIT_PATTERN = /[\n,]+/;

function normalizeSearchTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ");
}

export function splitSearchTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(SEARCH_TAG_SPLIT_PATTERN)
        .map(normalizeSearchTag)
        .filter(Boolean),
    ),
  );
}

export function joinSearchTags(tags: string[]): string {
  return tags.map(normalizeSearchTag).filter(Boolean).join(", ");
}

export function buildSearchTagFilter(keyword: string): string | null {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return null;
  }

  return `search_tags.ilike.%${trimmed}%`;
}
