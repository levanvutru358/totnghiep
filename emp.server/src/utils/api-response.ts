import { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  statusCode: number;
  message: string;
  errorCode?: string;
  errors?: Array<{ field?: string; message: string }>;
  details?: Record<string, unknown>;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T,
  meta?: Record<string, unknown>,
) => {
  const body: ApiSuccess<T> = {
    success: true,
    statusCode,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errorCode?: string,
  errors?: Array<{ field?: string; message: string }>,
  details?: Record<string, unknown>,
) => {
  const body: ApiFailure = {
    success: false,
    statusCode,
    message,
    ...(errorCode ? { errorCode } : {}),
    ...(errors ? { errors } : {}),
    ...(details ? { details } : {}),
  };
  return res.status(statusCode).json(body);
};
