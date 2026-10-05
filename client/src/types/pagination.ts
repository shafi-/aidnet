/** Cursor type — matches the UUID/string returned by the API */
export type PaginationCursor = string | null

/** Params sent to paginated RPCs (p_limit / p_cursor) */
export interface PaginationParams {
  limit?: number
  cursor?: PaginationCursor
}
