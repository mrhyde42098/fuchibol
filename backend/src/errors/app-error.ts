export type ErrorCode =
  | 'CHANNEL_NOT_FOUND'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'UPSTREAM_FORBIDDEN'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'STREAM_UNAVAILABLE'
  | 'SCRAPER_FAILED'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      status: this.status,
    };
  }
}
