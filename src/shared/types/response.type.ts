export interface ApiSuccessResponse<Data = unknown> {
  type: 'success';
  message: string;
  data: Data;
  statusCode: number;
}

export interface ApiErrorResponse<ErrorData = unknown> {
  type: 'error';
  error: ErrorData;
  statusCode: number;
}

export type ApiResponse<Data = unknown, ErrorData = unknown> =
  | ApiSuccessResponse<Data>
  | ApiErrorResponse<ErrorData>;
