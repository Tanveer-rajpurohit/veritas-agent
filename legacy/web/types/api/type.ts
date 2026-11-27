export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface ApiErrorPayload {
  error?: {
    code: string;
    message: string;
    request_id?: string | null;
    details?: unknown;
  };
  detail?: string | ApiValidationErrorDetail[];
  message?: string;
}
