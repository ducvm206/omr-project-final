// src/types/Common.ts

/**
 * Generic search form used by list/search endpoints.
 * Maps to com.ducvm.omrserver.dataset.SearchForm.
 *
 * The backend reads named keys from `searchParams`, e.g.:
 *   { searchParams: { id: "S001", name: "Alice" } }
 *   { searchParams: { name: "Math", academicYear: "2025" } }
 * Any omitted key is treated as "no filter".
 */
export interface SearchForm {
    /** Map of search field name -> value. */
    searchParams: Record<string, string>;
}