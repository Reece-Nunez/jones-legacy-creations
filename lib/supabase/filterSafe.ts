// PostgREST .or() filter values are NOT parameterized — characters like
// commas, parentheses, and double-quotes are syntactically meaningful and
// let an attacker inject extra filters. Strip them defensively before
// interpolating user input into an .or(...) / .ilike(...) value.

export function safeIlikeValue(input: string): string {
  return input.replace(/[,()"\\]/g, "");
}
