export interface Errors {
  errors: { [key: string]: string | string[] };
}

/** Shape every rejected API call is normalized to by the http client. */
export interface ApiError extends Errors {
  status: number;
}
