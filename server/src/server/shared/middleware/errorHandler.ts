
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors.ts';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message, message: err.message });
  }
  res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Internal server error' });
};
