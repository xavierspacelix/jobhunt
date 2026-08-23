export type SearchDoneEvent = {
  type: "done";
  collected: number;
  details: number;
  inspected: number;
  results: number;
  filtered?: number;
  blocked?: number;
  aiFailures?: number;
  searchFailures?: number;
  searchPages: number;
  invalid?: number;
  message: string;
};

export function searchRunHasFailed(event: SearchDoneEvent): boolean {
  const allAiFailed =
    event.inspected > 0 && event.aiFailures === event.inspected;
  const allDetailsFailed =
    event.details > 0 && event.blocked === event.details;
  const allSearchPagesFailed =
    event.searchPages > 0 && event.searchFailures === event.searchPages;
  const allQualifiedInvalid = event.results === 0 && (event.invalid ?? 0) > 0;
  return (
    allAiFailed ||
    allDetailsFailed ||
    allSearchPagesFailed ||
    allQualifiedInvalid
  );
}

export function searchRunHasWarnings(event: SearchDoneEvent): boolean {
  return (
    searchRunHasFailed(event) ||
    (event.aiFailures ?? 0) > 0 ||
    (event.blocked ?? 0) > 0 ||
    (event.searchFailures ?? 0) > 0 ||
    (event.invalid ?? 0) > 0
  );
}
