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
  detail?: string | ApiValidationErrorDetail[];
  message?: string;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: string;
}
