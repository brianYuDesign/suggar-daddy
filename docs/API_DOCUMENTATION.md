# API Documentation Guide

## Overview

All microservices in the Suggar Daddy platform include **Swagger/OpenAPI** documentation for easy API exploration and testing.

## Accessing API Documentation

Each service exposes Swagger UI at `/api/docs`:

### Service Endpoints

| Service | Base URL | Swagger Docs | Port |
|---------|----------|--------------|------|
| **Subscription Service** | http://localhost:3005/api | http://localhost:3005/api/docs | 3005 |
| **Content Service** | http://localhost:3006/api | http://localhost:3006/api/docs | 3006 |
| **Payment Service** | http://localhost:3007/api | http://localhost:3007/api/docs | 3007 |
| **Media Service** | http://localhost:3008/api | http://localhost:3008/api/docs | 3008 |

## Starting Services

```bash
# Start all services
npm run dev

# Or start individual services
nx serve subscription-service
nx serve content-service
nx serve payment-service
nx serve media-service
```

## Using Swagger UI

### 1. Open Swagger Documentation

Navigate to the service's Swagger URL in your browser:
```
http://localhost:3005/api/docs  # Subscription Service
```

### 2. Authenticate (for protected endpoints)

1. Click the **"Authorize"** button (lock icon) at the top right
2. Enter your JWT token in the format: `Bearer <your-token>`
3. Click **"Authorize"**
4. All subsequent requests will include the authentication header

### 3. Test API Endpoints

1. Expand an endpoint by clicking on it
2. Click **"Try it out"**
3. Fill in the required parameters
4. Click **"Execute"**
5. View the response below

## API Examples

### Subscription Service API

#### Create Subscription
```http
POST /api/subscriptions
Content-Type: application/json
Authorization: Bearer <token>

{
  "subscriberId": "user-123",
  "creatorId": "creator-456",
  "tierId": "tier-789",
  "startDate": "2024-01-01T00:00:00Z",
  "status": "active"
}
```

#### Get All Subscriptions
```http
GET /api/subscriptions
Authorization: Bearer <token>
```

#### Get Subscription by ID
```http
GET /api/subscriptions/:id
Authorization: Bearer <token>
```

#### Update Subscription
```http
PATCH /api/subscriptions/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "cancelled"
}
```

#### Delete Subscription
```http
DELETE /api/subscriptions/:id
Authorization: Bearer <token>
```

### Content Service API

#### Create Post
```http
POST /api/posts
Content-Type: application/json
Authorization: Bearer <token>

{
  "creatorId": "creator-123",
  "title": "My First Post",
  "content": "This is the post content",
  "mediaUrls": ["https://..."],
  "visibility": "public",
  "isPaid": false
}
```

#### Create Comment
```http
POST /api/comments
Content-Type: application/json
Authorization: Bearer <token>

{
  "postId": "post-123",
  "userId": "user-456",
  "content": "Great post!"
}
```

### Payment Service API

#### Create Transaction
```http
POST /api/transactions
Content-Type: application/json
Authorization: Bearer <token>

{
  "userId": "user-123",
  "amount": 99.99,
  "currency": "USD",
  "type": "subscription",
  "status": "pending",
  "paymentMethod": "credit_card",
  "metadata": {
    "subscriptionId": "sub-456"
  }
}
```

#### Send Tip
```http
POST /api/tips
Content-Type: application/json
Authorization: Bearer <token>

{
  "senderId": "user-123",
  "recipientId": "creator-456",
  "amount": 10.00,
  "message": "Love your content!"
}
```

### Media Service API

#### Upload Single File
```http
POST /api/upload/single
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary>
userId: "user-123"
folder: "posts"
```

#### Upload Multiple Files
```http
POST /api/upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

files: <binary[]>
userId: "user-123"
folder: "posts"
```

#### Delete Media
```http
DELETE /api/upload/:id
Authorization: Bearer <token>
```

## DTO Validation

All endpoints use **class-validator** for automatic request validation:

```typescript
// Example: CreateSubscriptionDto
export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @IsNotEmpty()
  creatorId: string;

  @IsString()
  @IsNotEmpty()
  tierId: string;

  @IsDateString()
  startDate: string;

  @IsEnum(['active', 'cancelled', 'expired'])
  @IsOptional()
  status?: string;
}
```

**Validation Errors** return `400 Bad Request`:
```json
{
  "statusCode": 400,
  "message": [
    "subscriberId should not be empty",
    "subscriberId must be a string"
  ],
  "error": "Bad Request"
}
```

## Response Formats

### Success Response
```json
{
  "id": "uuid",
  "subscriberId": "user-123",
  "creatorId": "creator-456",
  "tierId": "tier-789",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses

#### 400 Bad Request (Validation Error)
```json
{
  "statusCode": 400,
  "message": ["Field validation error"],
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

#### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

## Authentication

All protected endpoints require JWT authentication:

```http
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

1. **Login/Register** through your authentication service
2. Receive JWT token in response
3. Use token in Swagger UI or API requests

### Token Format

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Customizing Swagger

### Adding API Decorators

Enhance your controllers with Swagger decorators:

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateSubscriptionDto) {
    // ...
  }
}
```

### DTO Documentation

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'The ID of the subscriber',
    example: 'user-123',
  })
  @IsString()
  subscriberId: string;

  @ApiProperty({
    description: 'The ID of the creator',
    example: 'creator-456',
  })
  @IsString()
  creatorId: string;
}
```

## Testing with cURL

### Create Subscription
```bash
curl -X POST http://localhost:3005/api/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "subscriberId": "user-123",
    "creatorId": "creator-456",
    "tierId": "tier-789",
    "startDate": "2024-01-01T00:00:00Z",
    "status": "active"
  }'
```

### Get All Subscriptions
```bash
curl -X GET http://localhost:3005/api/subscriptions \
  -H "Authorization: Bearer <token>"
```

### Upload File
```bash
curl -X POST http://localhost:3008/api/upload/single \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/image.jpg" \
  -F "userId=user-123" \
  -F "folder=posts"
```

## Testing with Postman

### Import OpenAPI Specification

1. Open Postman
2. Click **Import**
3. Select **Link** tab
4. Enter: `http://localhost:3005/api/docs-json`
5. Click **Import**

All endpoints will be automatically imported with examples!

## Best Practices

1. **Document all endpoints** with `@ApiOperation()`
2. **Add response examples** with `@ApiResponse()`
3. **Use DTOs** for request/response validation
4. **Group endpoints** with `@ApiTags()`
5. **Secure endpoints** with `@ApiBearerAuth()`
6. **Version your API** when making breaking changes

## Production Considerations

### Disable Swagger in Production

```typescript
// main.ts
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app, {
    title: 'My Service API',
    description: 'API documentation',
    version: '1.0',
  });
}
```

### Secure Swagger UI

Add basic authentication:

```typescript
import * as basicAuth from 'express-basic-auth';

app.use(
  '/api/docs',
  basicAuth({
    users: { 'admin': 'secret-password' },
    challenge: true,
  }),
);
```

## Resources

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Class Validator](https://github.com/typestack/class-validator)

## Troubleshooting

### Swagger Not Loading
- Ensure service is running: `nx serve <service-name>`
- Check console for errors
- Verify `@nestjs/swagger` is installed

### Authentication Not Working
- Verify JWT token is valid and not expired
- Check token format: `Bearer <token>`
- Ensure `@ApiBearerAuth()` decorator is present

### Missing Endpoints
- Ensure controllers are registered in modules
- Check that decorators are properly imported
- Restart the service after changes