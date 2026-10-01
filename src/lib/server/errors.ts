export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export const Unauthorized = () => new HttpError(401, "Your session has expired. Please sign in again.", "unauthorized");
export const Forbidden = () => new HttpError(403, "You don't have permission to do that.", "forbidden");
export const NotFound = (what = "Item") => new HttpError(404, `${what} not found.`, "not_found");
export const TooMany = (retryAfter: number) =>
  new HttpError(429, `Too many attempts. Please try again in ${Math.ceil(retryAfter / 60)} minute(s).`, "rate_limited");
