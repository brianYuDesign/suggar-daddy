export * from "./config";
export * from "./kafka";
export * from "./upload";
export * from "./auth";
export * from "./stripe";
export * from "./swagger";
export * from "./sharding";
export * from "./filters";
export * from "./s3";
export * from "./cloudfront";
export * from "./email";

// Exception handling exports
export * from "./lib/error-codes.enum";
export * from "./lib/business-exception";
export * from "./lib/http-exception.filter";
export * from "./lib/exceptions.module";

// Request tracking and interceptors
export * from "./lib/request-tracking.interceptor";

// Distributed tracing
export * from "./lib/tracing";

// Error testing (development only)
export * from "./lib/error-testing.controller";

// Data consistency exports
export * from "./lib/data-consistency.service";
export * from "./lib/data-consistency-scheduler.service";
export * from "./lib/data-consistency.controller";
export * from "./lib/data-consistency.module";

// OAuth: now available from @suggar-daddy/auth (OAuthModule, GoogleStrategy, AppleStrategy, OAuthService)
