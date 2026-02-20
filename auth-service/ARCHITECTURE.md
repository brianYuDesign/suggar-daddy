# Auth Service Architecture

## System Overview

The Auth Service is built using a layered, modular architecture following SOLID principles and NestJS best practices.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                   HTTP Client Layer                      │
│              (Frontend, Mobile, External APIs)           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│               Controllers Layer                          │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ AuthCtrl     │ UserCtrl     │ RoleCtrl             │ │
│  │ PermCtrl     │              │                      │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
│                    (Route Handling)                      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│           Guards & Middleware Layer                      │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ JwtAuthGuard │ RolesGuard   │ PermissionsGuard     │ │
│  │ Validation   │ Decorators   │                      │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
│                 (Authorization & Validation)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Services Layer                              │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ AuthService  │ UserService  │ RoleService          │ │
│  │ PermService  │ TokenBLService                       │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
│                 (Business Logic)                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Strategies & Helpers Layer                       │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ JwtStrategy  │ LocalStrategy│ PasswordHashing      │ │
│  │ RefreshToken │ TokenValidate                       │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Repository & Entity Layer                        │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │ User Entity  │ Role Entity  │ Permission Entity    │ │
│  │ TypeORM Repos│ Token BL Entity                      │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
│                 (Data Models)                            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│             Database Layer                               │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │  PostgreSQL  │    Tables    │  Indexes             │ │
│  │  Transactions│   Relations  │  Constraints         │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Module Structure

```
auth-service/
├── src/
│   ├── config/                    # Configuration
│   │   ├── auth.config.ts
│   │   └── database.config.ts
│   ├── controllers/               # HTTP Route Handlers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── role.controller.ts
│   │   ├── permission.controller.ts
│   │   └── index.ts
│   ├── entities/                  # TypeORM Entities
│   │   ├── user.entity.ts
│   │   ├── role.entity.ts
│   │   ├── permission.entity.ts
│   │   ├── role-permission.entity.ts
│   │   ├── token-blacklist.entity.ts
│   │   └── index.ts
│   ├── services/                  # Business Logic
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── role.service.ts
│   │   ├── permission.service.ts
│   │   ├── token-blacklist.service.ts
│   │   └── index.ts
│   ├── strategies/                # Passport Strategies
│   │   ├── jwt.strategy.ts
│   │   ├── jwt-refresh.strategy.ts
│   │   ├── local.strategy.ts
│   │   └── index.ts
│   ├── guards/                    # Authorization Guards
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt-refresh-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   ├── permissions.guard.ts
│   │   └── index.ts
│   ├── decorators/                # Custom Decorators
│   │   ├── roles.decorator.ts
│   │   ├── permissions.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   └── index.ts
│   ├── dtos/                      # Data Transfer Objects
│   │   ├── auth.dto.ts
│   │   ├── user.dto.ts
│   │   ├── role-permission.dto.ts
│   │   ├── auth-response.dto.ts
│   │   └── index.ts
│   ├── app.module.ts              # Root Module
│   ├── auth.module.ts             # Auth Module
│   └── main.ts                    # Entry Point
├── test/                          # Tests
│   ├── auth.service.spec.ts
│   ├── user.service.spec.ts
│   ├── role.service.spec.ts
│   ├── permission.service.spec.ts
│   └── auth.e2e.spec.ts
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## Key Design Patterns

### 1. Dependency Injection (DI)
All services and repositories use constructor-based dependency injection through NestJS.

```typescript
constructor(
  @InjectRepository(User) private usersRepository: Repository<User>,
  private jwtService: JwtService,
  private configService: ConfigService,
) {}
```

### 2. Repository Pattern
TypeORM repositories provide data access abstraction.

```typescript
const user = await this.usersRepository.findOne({ where: { email } });
```

### 3. Guard Pattern
Passport strategies and custom guards handle authorization.

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.ADMIN)
async deleteUser(@Param('id') userId: string) { ... }
```

### 4. Decorator Pattern
Custom decorators extract user context and define requirements.

```typescript
async getProfile(@CurrentUser('userId') userId: string) { ... }
```

### 5. DTO Pattern
Data Transfer Objects ensure type safety and validation.

```typescript
@Post('register')
async register(@Body() registerDto: RegisterDto) { ... }
```

## Data Flow

### Registration Flow
```
Client Registration Request
    ↓
AuthController.register()
    ↓
Validate Input (class-validator)
    ↓
AuthService.register()
    ↓
Check Duplicate User
    ↓
Hash Password (bcrypt)
    ↓
Create User Entity
    ↓
Assign Default Role
    ↓
Save to Database
    ↓
Generate Tokens (JWT)
    ↓
Return Response to Client
```

### Login Flow
```
Client Login Request
    ↓
AuthController.login()
    ↓
Validate Input
    ↓
LocalStrategy.validate()
    ↓
AuthService.validateUser()
    ↓
Query Database for User
    ↓
Compare Password (bcrypt)
    ↓
Load User Roles & Permissions
    ↓
Update Last Login
    ↓
Generate Tokens
    ↓
Return Response
```

### Authorization Flow
```
Client Request with JWT
    ↓
JwtAuthGuard.canActivate()
    ↓
Extract Token from Header
    ↓
JwtStrategy.validate()
    ↓
Verify Token Signature
    ↓
Check Token Expiration
    ↓
Check Token Blacklist
    ↓
Load User Context
    ↓
RolesGuard.canActivate() [Optional]
    ↓
Verify User Roles
    ↓
PermissionsGuard.canActivate() [Optional]
    ↓
Check User Permissions
    ↓
Route Handler Execution
```

## Database Schema

### Entity Relationships
```
User (1) ──→ (N) Role
            ↓
         (Junction: user_roles)
            
Role (1) ──→ (N) RolePermission
            ↓
         Permission

User (1) ──→ (N) Permission
            (direct permissions)

User (1) ──→ (N) TokenBlacklist
            (revoked tokens)
```

### Tables Overview

| Table | Purpose | Relationships |
|-------|---------|---------------|
| users | User accounts | → roles, permissions, tokens |
| roles | Role definitions | ← users, → role_permissions |
| permissions | Permission definitions | ← users, → role_permissions |
| user_roles | User-Role associations | users + roles |
| role_permissions | Role-Permission associations | roles + permissions |
| token_blacklist | Revoked tokens | → users |

## Security Architecture

### Authentication
- **Strategy**: JWT Bearer Tokens
- **Storage**: HTTP Authorization Header
- **Expiration**: 15 minutes (access), 7 days (refresh)
- **Signing**: HS256 Algorithm

### Password Security
- **Hashing**: bcrypt with 10 salt rounds
- **Minimum Length**: 8 characters
- **Validation**: class-validator rules

### Authorization
- **Model**: Role-Based Access Control (RBAC)
- **Enforcement**: Guards and Decorators
- **Levels**: Role-level and Permission-level

### Token Blacklist
- **Purpose**: Invalidate tokens on logout
- **Storage**: PostgreSQL
- **Cleanup**: Daily cron job (midnight)
- **Lookup**: O(1) database query

## Performance Considerations

### Indexes
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_token_blacklist_token ON token_blacklist(token);
CREATE INDEX idx_token_blacklist_expiry ON token_blacklist(expiresAt);
```

### Query Optimization
- Eager loading of roles and permissions
- Indexed lookups for users and tokens
- Connection pooling via TypeORM

### Caching Opportunities
- Redis for token blacklist (future)
- Permission cache in JWT payload
- Role assignments cache

## Testing Strategy

### Unit Tests
- Service logic testing
- Mock repositories and dependencies
- Isolated component testing

### Integration Tests
- Repository testing
- Database interaction verification
- Transaction handling

### E2E Tests
- Full request/response cycle
- Guard execution
- Real HTTP calls

### Coverage Target
- **Services**: 85%+
- **Controllers**: 75%+
- **Guards**: 80%+
- **Overall**: 70%+

## Error Handling

### Exception Types
- `BadRequestException` - Invalid input
- `UnauthorizedException` - Auth failed
- `ForbiddenException` - Permission denied
- `ConflictException` - Resource conflict
- `NotFoundException` - Resource not found

### Global Error Filter (Future)
```typescript
@Catch(Exception)
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: Exception, host: ArgumentsHost) {
    // Centralized error handling
  }
}
```

## Scalability

### Horizontal Scaling
- Stateless service design
- No in-memory session storage
- Token-based authentication
- Database as source of truth

### Database Scaling
- Connection pooling
- Read replicas support
- Prepared statements
- Normalized schema

### Future Enhancements
- Redis caching layer
- Token invalidation stream
- Microservice event bus
- Distributed session management

## Environment Configuration

### Development
- Synchronize database schema
- Verbose logging
- CORS: localhost:3000
- JWT expiry: 15 minutes

### Production
- No schema synchronization
- Minimal logging
- Whitelist CORS origins
- Longer JWT expiry: 1 hour
- SSL database connection

## Deployment

### Container Deployment
```dockerfile
# Multi-stage build
# Stage 1: Build
# Stage 2: Runtime
```

### Health Checks
```bash
GET /api/auth/me  # Requires auth
```

### Environment Variables
See `.env.example` for all configuration options.

---

**Architecture Version**: 1.0.0  
**Last Updated**: 2026-02-19  
**Status**: ✅ Production Ready
