class ApiError extends Error {
    constructor(
        statusCode, 
        message = "Something went wrong",
        errors = [],
        statck = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false; // false is wajah sey lia h default q k api"error" h na :)
        this.errors = errors;

        if (statck) {
            this.statck = statck
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}