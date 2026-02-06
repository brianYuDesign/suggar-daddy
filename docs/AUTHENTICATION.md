# JWT Authentication & Authorization Guide

## Overview

This guide explains how to use JWT authentication and role-based access control (RBAC) in the Suggar Daddy backend.

## Architecture

- **JWT Strategy**: Validates JWT tokens from Authorization header
- **Auth Guards**: Protects routes requiring authentication
- **Roles Guard**: Implements role-based access control
- **Custom Decorators**: Simplifies auth logic in controllers

## User Roles

```typescript
enum UserRole {
  ADMIN = 'admin',
  CREATOR = 'creator',
  SUBSCRIBER = 'subscriber',
}
```

## Authentication Flow

### 1. Register/Login

```bash
# Register
POST http://localhost:3001/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "subscriber"
  }
}
```

### 2. Use Access Token

```bash
GET http://localhost:3005/subscriptions/my-subscription
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Using Auth in Controllers

### 1. Public Routes (No Authentication Required)

```typescript
import { Public } from '@suggar-daddy/common';

@Public()
@Get('public-data')
async getPublicData() {
  return { message: 'Anyone can access this' };
}
```

### 2. Protected Routes (Authentication Required)

```typescript
// By default, all routes require authentication
@Get('protected-data')
async getProtectedData(@CurrentUser() user: CurrentUserData) {
  return {
    message: 'Only authenticated users can access',
    userId: user.userId,
  };
}
```

### 3. Role-Based Routes

```typescript
import { Roles, UserRole } from '@suggar-daddy/common';

// Creator only
@Post('create-content')
@Roles(UserRole.CREATOR)
async createContent(@CurrentUser() user: CurrentUserData) {
  return { creatorId: user.userId };
}

// Admin only
@Get('admin/stats')
@Roles(UserRole.ADMIN)
async getAdminStats() {
  return { stats: 'admin data' };
}

// Multiple roles allowed
@Get('premium-content')
@Roles(UserRole.CREATOR, UserRole.ADMIN)
async getPremiumContent() {
  return { content: 'premium' };
}
```

### 4. Getting Current User Data

```typescript
import { CurrentUser, CurrentUserData } from '@suggar-daddy/common';

// Get entire user object
@Get('profile')
async getProfile(@CurrentUser() user: CurrentUserData) {
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
  };
}

// Get specific field only
@Post('posts')
async createPost(@CurrentUser('userId') userId: string) {
  return { authorId: userId };
}
```

## Custom Decorators

### @Public()
Makes an endpoint accessible without authentication.

```typescript
@Public()
@Get('health')
async healthCheck() {
  return { status: 'ok' };
}
```

### @Roles(...roles)
Restricts access to specific user roles.

```typescript
@Roles(UserRole.ADMIN)
@Delete('users/:id')
async deleteUser(@Param('id') id: string) {
  // Only admins can delete users
}
```

### @CurrentUser()
Injects the authenticated user into the controller method.

```typescript
@Get('me')
async getCurrentUser(@CurrentUser() user: CurrentUserData) {
  return user;
}
```

## Password Hashing

Passwords are hashed using bcrypt with 10 salt rounds:

```typescript
import * as bcrypt from 'bcrypt';

// Hash password
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

## JWT Configuration

Configure JWT in `.env`:

```env
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Use strong JWT_SECRET** (at least 32 characters)
3. **Set appropriate token expiration** (7d default)
4. **Never store passwords in plain text**
5. **Validate input data** using class-validator
6. **Implement rate limiting** for auth endpoints
7. **Use refresh tokens** for long-lived sessions (future enhancement)

## Testing Auth Endpoints

### Using cURL

```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","displayName":"Test User"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Use token
curl http://localhost:3005/subscriptions/my-subscription \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Swagger UI

1. Navigate to http://localhost:3001/api/docs
2. Click "Authorize" button
3. Enter: `Bearer YOUR_TOKEN_HERE`
4. Click "Authorize"
5. All protected endpoints will now include the token

## Error Handling

Common authentication errors:

- **401 Unauthorized**: Invalid or missing token
- **403 Forbidden**: User lacks required role
- **400 Bad Request**: Invalid credentials

## Integration with Other Services

To use authentication in other microservices:

1. Import auth guards and decorators:
```typescript
import { JwtAuthGuard, RolesGuard, Public, Roles, CurrentUser } from '@suggar-daddy/common';
```

2. Add global guards in app.module.ts:
```typescript
import { APP_GUARD } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
```

3. Use decorators in controllers as shown above

## Next Steps

- Add refresh token mechanism
- Implement email verification
- Add password reset functionality
- Implement social OAuth (Google, Facebook)
- Add two-factor authentication (2FA)
- Implement rate limiting for login attempts
