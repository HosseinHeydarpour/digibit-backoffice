/**
 * The error envelope from ARCHITECTURE.md §4:
 *   { "error": { "code": "VALIDATION", "message": "…", "fields": { "name": ["الزامی"] } } }
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

/**
 * What every failed request surfaces as, after the error interceptor (BO-C04)
 * has done its normalisation. Components only ever see this type.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    override readonly message: string,
    readonly status: number,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the server rejected the payload rather than the request. */
  get isValidation(): boolean {
    return this.code === 'VALIDATION' || !!this.fields;
  }

  /** First message for a given field, or undefined. Handy for form mapping. */
  fieldError(field: string): string | undefined {
    return this.fields?.[field]?.[0];
  }
}
