export enum HttpStatusCode {
    OK = 200,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    INTERNAL_SERVER = 500
}

export default class BaseError extends Error {
    public readonly name: string;
    public readonly statusCode: HttpStatusCode;
    public readonly isOperational: boolean;

    constructor(name: string, httpCode: HttpStatusCode, description: string, isOperational: boolean) {
        super(`[${httpCode}] description`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.cause = description;
        this.name = name;
        this.statusCode = httpCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this);
    }
}
