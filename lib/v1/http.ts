import { NextResponse } from "next/server";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export type Pagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

/** Parse `page`/`pageSize` query params into safe, clamped values. */
export function parsePagination(sp: URLSearchParams): Pagination {
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const rawSize = Number.parseInt(sp.get("pageSize") ?? "", 10);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isNaN(rawSize) ? DEFAULT_PAGE_SIZE : rawSize),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Parse an optional boolean query param (`true`/`false`/`1`/`0`). */
export function parseBool(value: string | null): boolean | undefined {
  if (value == null) return undefined;
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}

/** Standard envelope for list endpoints. */
export function paginated<T>(
  data: T[],
  total: number,
  pagination: Pagination,
): NextResponse {
  return NextResponse.json({
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    },
  });
}
