import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message =
    statusCode === 500
      ? '服务器内部错误，请稍后重试'
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
    },
  });
}
