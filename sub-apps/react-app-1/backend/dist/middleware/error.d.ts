import { Request, Response, NextFunction } from 'express';
export interface ApiError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare class ValidationError extends Error implements ApiError {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
export declare class NotFoundError extends Error implements ApiError {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
export declare class UnauthorizedError extends Error implements ApiError {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string);
}
export declare const errorHandler: (err: ApiError, req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error.d.ts.map