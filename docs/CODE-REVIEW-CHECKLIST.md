# 代碼審查清單（Code Review Checklist）

**版本**：1.0  
**最後更新**：2026-02-13  
**維護者**：Tech Lead Team

---

## 📋 目錄

1. [審查原則](#審查原則)
2. [後端代碼審查](#後端代碼審查)
3. [前端代碼審查](#前端代碼審查)
4. [API 設計審查](#api-設計審查)
5. [安全性審查](#安全性審查)
6. [效能審查](#效能審查)
7. [測試審查](#測試審查)
8. [文檔審查](#文檔審查)
9. [審查流程](#審查流程)

---

## 審查原則

### Code Review 目標

1. **提升代碼品質**：發現 Bug、改善設計
2. **知識分享**：團隊成員相互學習
3. **保持一致性**：遵循團隊編碼規範
4. **降低風險**：及早發現潛在問題

### 審查態度

✅ **應該做的**：
- 保持友善和建設性的態度
- 專注於代碼，而非寫代碼的人
- 提供具體的改進建議
- 承認好的代碼和設計
- 問問題而非下命令

❌ **不應該做的**：
- 過度關注代碼風格（應由工具處理）
- 要求完美主義
- 進行人身攻擊
- 過度挑剔瑣碎問題
- 忽略正面反饋

### 審查時機

- **小型 PR**：2 小時內完成審查
- **中型 PR**：24 小時內完成審查
- **大型 PR**：48 小時內完成初步審查，並建議拆分

### 審查標準

| 嚴重程度 | 說明 | 行動 |
|---------|------|------|
| 🔴 **Blocker** | 嚴重問題，必須修復 | 拒絕合併 |
| 🟡 **Major** | 重要問題，應該修復 | 建議修復後合併 |
| 🟢 **Minor** | 輕微問題，可以改進 | 可選修復 |
| 💡 **Suggestion** | 建議，非必要 | 作者自行決定 |

---

## 後端代碼審查

### 1. NestJS 架構審查

#### Controller 層

```typescript
// ❌ 不良實踐
@Controller('users')
export class UserController {
  @Get(':id')
  async getUser(@Param('id') id: string) {
    // 直接在 Controller 中寫業務邏輯
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    return user;
  }
}

// ✅ 良好實踐
@Controller('users')
@ApiTags('Users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: '獲取用戶資料' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: '用戶不存在' })
  async getUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    // Controller 僅負責路由和參數驗證
    return this.userService.findOne(id);
  }
}
```

**審查要點**：
- [ ] Controller 僅負責路由、參數驗證、HTTP 響應
- [ ] 業務邏輯在 Service 層
- [ ] 使用 Pipe 進行參數驗證（如 `ParseUUIDPipe`）
- [ ] 有完整的 Swagger 文檔（`@ApiOperation`、`@ApiResponse`）
- [ ] 返回類型是 DTO，而非 Entity
- [ ] 錯誤處理委託給 Service 層

---

#### Service 層

```typescript
// ❌ 不良實踐
export class UserService {
  async findOne(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }
  
  async updateProfile(id: string, data: any) {
    await this.userRepository.update(id, data);
  }
}

// ✅ 良好實踐
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly logger: Logger,
  ) {}

  async findOne(id: string): Promise<UserResponseDto> {
    // 1. 先從 Redis 讀取
    const cached = await this.redisService.get(`user:${id}`);
    if (cached) {
      this.logger.log(`Cache hit for user ${id}`);
      return JSON.parse(cached);
    }

    // 2. 從資料庫讀取
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 3. 寫入 Redis
    await this.redisService.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);

    // 4. 返回 DTO
    return this.toDto(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    // 1. 驗證用戶存在
    const user = await this.findOne(id);

    // 2. 發送 Kafka 事件（異步寫入）
    await this.kafkaProducerService.send('user.updated', {
      userId: id,
      ...dto,
      updatedAt: new Date(),
    });

    // 3. 更新 Redis 快取
    const updated = { ...user, ...dto };
    await this.redisService.set(`user:${id}`, JSON.stringify(updated), 'EX', 3600);

    // 4. 返回更新後的數據
    return this.toDto(updated);
  }

  private toDto(user: User): UserResponseDto {
    const { password, ...rest } = user;
    return rest as UserResponseDto;
  }
}
```

**審查要點**：
- [ ] 依賴注入使用 Constructor Injection
- [ ] 遵循讀寫分離模式（Redis 讀 + Kafka 寫）
- [ ] 使用 DTO 而非直接返回 Entity
- [ ] 錯誤處理明確（使用 NestJS 內建異常）
- [ ] 有適當的日誌記錄
- [ ] 敏感資訊（如密碼）不會返回
- [ ] 快取策略合理（TTL 設置）
- [ ] 事務處理正確（如需）

---

#### Repository 層（TypeORM）

```typescript
// ❌ 不良實踐
const users = await this.userRepository.query(
  `SELECT * FROM users WHERE email = '${email}'`
);

// ✅ 良好實踐
const user = await this.userRepository.findOne({
  where: { email },
  select: ['id', 'email', 'username', 'role'],
});
```

**審查要點**：
- [ ] 避免原始 SQL 查詢（使用 QueryBuilder 或 Repository API）
- [ ] 防止 SQL 注入（使用參數化查詢）
- [ ] 避免 N+1 查詢問題（使用 `relations` 或 `leftJoinAndSelect`）
- [ ] 僅查詢需要的欄位（使用 `select`）
- [ ] 分頁查詢使用 `take` 和 `skip`
- [ ] 複雜查詢使用 QueryBuilder

---

### 2. 事件驅動架構審查

#### Kafka Producer

```typescript
// ✅ 良好實踐
@Injectable()
export class PostService {
  async create(dto: CreatePostDto, creatorId: string): Promise<PostResponseDto> {
    const postId = uuidv4();
    
    // 發送 Kafka 事件
    await this.kafkaProducerService.send('post.created', {
      postId,
      creatorId,
      ...dto,
      createdAt: new Date().toISOString(),
    });

    // 寫入 Redis 快取
    const post = { postId, creatorId, ...dto, createdAt: new Date() };
    await this.redisService.set(
      `post:${postId}`,
      JSON.stringify(post),
      'EX',
      3600
    );

    return post as PostResponseDto;
  }
}
```

**審查要點**：
- [ ] 事件格式一致（包含必要欄位：id、timestamp）
- [ ] 事件命名清晰（如 `post.created`、`user.updated`）
- [ ] 錯誤處理（Kafka 發送失敗的處理）
- [ ] 冪等性考慮（重複事件處理）
- [ ] 事件順序性（如需）

---

#### Kafka Consumer

```typescript
// ✅ 良好實踐
@Injectable()
export class DbWriterService {
  @KafkaConsumer('post.created')
  async handlePostCreated(@Payload() message: any) {
    try {
      // 1. 驗證必填欄位
      const { postId, creatorId, content, contentType } = message;
      if (!postId || !creatorId || !content) {
        this.logger.error('Missing required fields in post.created event', message);
        return; // 丟棄無效事件
      }

      // 2. 冪等性檢查
      const exists = await this.postRepository.findOne({ where: { id: postId } });
      if (exists) {
        this.logger.warn(`Post ${postId} already exists, skipping`);
        return;
      }

      // 3. 寫入資料庫
      await this.postRepository.insert({
        id: postId,
        creatorId,
        content,
        contentType,
        createdAt: new Date(message.createdAt),
      });

      this.logger.log(`Post ${postId} created successfully`);
    } catch (error) {
      this.logger.error('Failed to handle post.created event', error);
      // 發送到 DLQ（死信佇列）
      await this.kafkaProducerService.send('dlq.post.created', message);
      throw error; // 重新拋出以觸發重試
    }
  }
}
```

**審查要點**：
- [ ] 驗證事件格式（必填欄位）
- [ ] 冪等性處理（避免重複寫入）
- [ ] 錯誤處理（Try-Catch + DLQ）
- [ ] 日誌記錄（成功/失敗）
- [ ] 事務處理（如需）
- [ ] 性能考慮（批次處理）

---

### 3. 認證與授權審查

```typescript
// ✅ 良好實踐
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  @Post()
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async create(
    @Body() dto: CreatePostDto,
    @CurrentUser('userId') userId: string,
  ): Promise<PostResponseDto> {
    // userId 來自 JWT，不信任客戶端傳入
    return this.postService.create(dto, userId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser('userId') userId: string,
  ): Promise<PostResponseDto> {
    // 驗證所有權
    const post = await this.postService.findOne(id);
    if (post.creatorId !== userId && !this.isAdmin(userId)) {
      throw new ForbiddenException('You can only update your own posts');
    }

    return this.postService.update(id, dto);
  }

  @Get(':id')
  @Public() // 公開端點
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PostResponseDto> {
    return this.postService.findOne(id);
  }
}
```

**審查要點**：
- [ ] 敏感端點使用 `@UseGuards(JwtAuthGuard)`
- [ ] 角色權限使用 `@Roles()` + `RolesGuard`
- [ ] 公開端點明確標註 `@Public()`
- [ ] 用戶 ID 從 JWT 取得，不信任客戶端
- [ ] 資源所有權驗證（更新/刪除操作）
- [ ] 避免權限提升漏洞

---

### 4. 數據驗證審查

```typescript
// ✅ 良好實踐
import { IsEmail, IsString, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com', description: '用戶 Email' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 50 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.SUBSCRIBER })
  @IsEnum(UserRole, { message: 'Invalid user role' })
  role: UserRole;
}
```

**審查要點**：
- [ ] 所有 DTO 使用 `class-validator` 裝飾器
- [ ] 驗證規則明確（類型、長度、格式）
- [ ] 錯誤訊息清晰
- [ ] Swagger 文檔完整（`@ApiProperty`）
- [ ] 敏感欄位（如密碼）不在響應 DTO 中

---

### 5. 錯誤處理審查

```typescript
// ✅ 良好實踐
import { NotFoundException, BadRequestException } from '@nestjs/common';

export class UserService {
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.toDto(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    // 驗證 Email 唯一性
    if (dto.email) {
      const existing = await this.userRepository.findOne({ 
        where: { email: dto.email } 
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already in use');
      }
    }

    // ... 更新邏輯
  }
}
```

**審查要點**：
- [ ] 使用 NestJS 內建異常類別（`NotFoundException`、`BadRequestException` 等）
- [ ] 錯誤訊息清晰且對用戶友好
- [ ] 不洩漏敏感資訊（如資料庫錯誤）
- [ ] 記錄詳細錯誤日誌（用於調試）
- [ ] 避免洩漏堆疊追蹤到客戶端

---

## 前端代碼審查

### 1. Next.js 架構審查

#### Server Components vs Client Components

```typescript
// ✅ 良好實踐 - Server Component（預設）
// app/posts/page.tsx
import { PostList } from '@/components/post-list';
import { fetchPosts } from '@/lib/api';

export default async function PostsPage() {
  // 在服務端獲取數據
  const posts = await fetchPosts();

  return (
    <div>
      <h1>Posts</h1>
      <PostList posts={posts} />
    </div>
  );
}

// ✅ 良好實踐 - Client Component（僅在需要時）
// components/like-button.tsx
'use client';

import { useState } from 'react';

export function LikeButton({ postId }: { postId: string }) {
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    setLiked(true);
  };

  return (
    <button onClick={handleLike}>
      {liked ? '❤️' : '🤍'}
    </button>
  );
}
```

**審查要點**：
- [ ] 預設使用 Server Components
- [ ] 僅在需要互動性時使用 Client Components（`'use client'`）
- [ ] 避免不必要的客戶端 JavaScript
- [ ] 數據獲取在服務端完成（SEO 友好）

---

#### API 路由

```typescript
// ✅ 良好實踐
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. 認證檢查
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 獲取查詢參數
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 3. 調用後端 API
    const response = await fetch(
      `${process.env.API_URL}/api/posts?page=${page}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // 驗證請求體
  if (!body.content || !body.contentType) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // 調用後端 API
  const response = await fetch(`${process.env.API_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

**審查要點**：
- [ ] 認證和授權檢查
- [ ] 輸入驗證
- [ ] 錯誤處理（Try-Catch）
- [ ] 適當的 HTTP 狀態碼
- [ ] 不洩漏敏感資訊
- [ ] 使用環境變數（`process.env`）

---

### 2. React 元件審查

```typescript
// ❌ 不良實踐
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  // 問題：每次渲染都會執行
  fetch(`/api/users/${userId}`).then(res => res.json()).then(setUser);

  return <div>{user?.name}</div>;
}

// ✅ 良好實踐
import { useEffect, useState } from 'react';
import { User } from '@/types';

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        
        if (isMounted) {
          setUser(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

**審查要點**：
- [ ] TypeScript 類型定義完整
- [ ] Props 使用 Interface 定義
- [ ] useState 有類型註解
- [ ] useEffect 有依賴陣列
- [ ] 有 Cleanup function（避免記憶體洩漏）
- [ ] 處理 Loading、Error、Empty 狀態
- [ ] 避免不必要的重新渲染

---

### 3. 效能優化審查

```typescript
// ✅ 良好實踐 - 使用 memo 避免不必要的重新渲染
import { memo } from 'react';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
}

export const PostCard = memo(function PostCard({ post, onLike }: PostCardProps) {
  return (
    <div>
      <h3>{post.title}</h3>
      <p>{post.content}</p>
      <button onClick={() => onLike(post.id)}>Like</button>
    </div>
  );
});

// ✅ 良好實踐 - 使用 useCallback 避免函數重新創建
import { useCallback } from 'react';

export function PostList({ posts }: { posts: Post[] }) {
  const handleLike = useCallback(async (postId: string) => {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
  }, []);

  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} onLike={handleLike} />
      ))}
    </div>
  );
}
```

**審查要點**：
- [ ] 使用 `memo` 包裝純函數元件
- [ ] 使用 `useCallback` 包裝回調函數
- [ ] 使用 `useMemo` 快取計算結果
- [ ] 列表渲染使用唯一 `key`
- [ ] 避免在渲染中執行昂貴的計算
- [ ] 圖片使用 Next.js Image 元件優化

---

## API 設計審查

### 1. RESTful API 設計

```
✅ 良好實踐：

GET    /api/posts              # 獲取貼文列表
GET    /api/posts/:id          # 獲取單一貼文
POST   /api/posts              # 創建貼文
PUT    /api/posts/:id          # 更新貼文
DELETE /api/posts/:id          # 刪除貼文

GET    /api/posts/:id/comments # 獲取貼文留言
POST   /api/posts/:id/comments # 新增留言

❌ 不良實踐：

GET    /api/getPost?id=123     # 不使用動詞
POST   /api/posts/delete/:id   # DELETE 操作使用 POST
GET    /api/post/:id/comment   # 單複數不一致
```

**審查要點**：
- [ ] 使用正確的 HTTP 方法（GET、POST、PUT、DELETE）
- [ ] URL 使用名詞，不使用動詞
- [ ] 複數形式（`/posts` 而非 `/post`）
- [ ] 巢狀資源清晰（如 `/posts/:id/comments`）
- [ ] 版本控制（如 `/api/v1/posts`，如需）

---

### 2. 請求與響應格式

```typescript
// ✅ 良好實踐 - 統一的響應格式

// 成功響應
{
  "success": true,
  "data": {
    "id": "123",
    "title": "Hello World",
    "content": "..."
  }
}

// 錯誤響應
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 123 not found",
    "correlationId": "abc-def-ghi"
  }
}

// 分頁響應
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**審查要點**：
- [ ] 響應格式一致
- [ ] 錯誤響應包含錯誤碼和訊息
- [ ] 分頁資訊完整
- [ ] 使用駝峰命名（camelCase）
- [ ] 時間格式使用 ISO 8601（`2026-02-13T10:00:00Z`）

---

### 3. 查詢參數審查

```
✅ 良好實踐：

GET /api/posts?page=1&limit=10&sort=createdAt:desc&filter=published

查詢參數：
- page: 頁碼（預設 1）
- limit: 每頁數量（預設 10，最大 100）
- sort: 排序欄位和方向（createdAt:desc）
- filter: 篩選條件（published、draft）
```

**審查要點**：
- [ ] 分頁參數：`page`、`limit`
- [ ] 排序參數：`sort`（欄位:方向）
- [ ] 篩選參數：`filter`（明確的篩選條件）
- [ ] 查詢參數有預設值
- [ ] 限制 `limit` 最大值（防止濫用）

---

## 安全性審查

### 1. 認證安全

```typescript
// ✅ 良好實踐
@Injectable()
export class AuthService {
  async hashPassword(password: string): Promise<string> {
    // 使用 bcrypt，成本因子至少 10
    return bcrypt.hash(password, 12);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign(
      { userId, type: 'access' },
      { expiresIn: '15m' } // 短期 Token
    );

    const refreshToken = this.jwtService.sign(
      { userId, type: 'refresh' },
      { expiresIn: '7d' } // 長期 Token
    );

    // 儲存 Refresh Token 到 Redis（可撤銷）
    await this.redisService.set(
      `refresh_token:${userId}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60
    );

    return { accessToken, refreshToken };
  }
}
```

**審查要點**：
- [ ] 密碼使用 bcrypt 或 argon2 加密
- [ ] 成本因子至少 10（bcrypt）
- [ ] JWT Token 有過期時間（Access Token 短期，Refresh Token 長期）
- [ ] Refresh Token 可撤銷（存儲在 Redis）
- [ ] 密碼強度驗證（至少 8 字元）

---

### 2. 輸入驗證

```typescript
// ✅ 良好實踐
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @Transform(({ value }) => value.trim())
  username: string;
}
```

**審查要點**：
- [ ] 所有輸入都經過驗證
- [ ] 使用白名單驗證（允許的值）而非黑名單
- [ ] 清理輸入（Trim、轉小寫）
- [ ] 驗證資料類型、長度、格式
- [ ] 防止 SQL 注入（使用 ORM 參數化查詢）
- [ ] 防止 XSS（React 自動轉義）

---

### 3. 權限控制

```typescript
// ✅ 良好實踐
@Injectable()
export class PostService {
  async update(postId: string, dto: UpdatePostDto, userId: string): Promise<PostResponseDto> {
    // 1. 獲取貼文
    const post = await this.findOne(postId);

    // 2. 檢查所有權
    if (post.creatorId !== userId) {
      // 檢查是否為管理員
      const user = await this.userService.findOne(userId);
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only update your own posts');
      }
    }

    // 3. 執行更新
    await this.kafkaProducerService.send('post.updated', {
      postId,
      ...dto,
      updatedAt: new Date(),
    });

    return this.findOne(postId);
  }

  async delete(postId: string, userId: string): Promise<void> {
    const post = await this.findOne(postId);

    // 只有創作者和管理員可以刪除
    if (post.creatorId !== userId) {
      const user = await this.userService.findOne(userId);
      if (user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only delete your own posts');
      }
    }

    await this.kafkaProducerService.send('post.deleted', {
      postId,
      deletedAt: new Date(),
    });
  }
}
```

**審查要點**：
- [ ] 所有修改/刪除操作驗證所有權
- [ ] 管理員權限明確定義
- [ ] 避免水平權限提升（用戶 A 修改用戶 B 的數據）
- [ ] 避免垂直權限提升（普通用戶取得管理員權限）
- [ ] 敏感操作需要額外驗證（如刪除帳號）

---

### 4. 敏感資訊保護

```typescript
// ❌ 不良實踐
export class UserEntity {
  id: string;
  email: string;
  password: string; // 密碼直接暴露
  
  toJSON() {
    return this; // 返回所有欄位
  }
}

// ✅ 良好實踐
export class UserEntity {
  id: string;
  email: string;
  
  @Exclude() // 排除密碼
  password: string;
  
  @Exclude() // 排除敏感資訊
  stripeCustomerId: string;
  
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}

// 或在 Service 層處理
export class UserService {
  private toDto(user: User): UserResponseDto {
    const { password, stripeCustomerId, ...rest } = user;
    return rest as UserResponseDto;
  }
}
```

**審查要點**：
- [ ] 密碼不在 API 響應中
- [ ] 敏感資訊（如 Token、密鑰）不記錄在日誌中
- [ ] API 響應僅包含必要資訊
- [ ] 使用 DTO 而非直接返回 Entity
- [ ] 環境變數不提交到版本控制

---

## 效能審查

### 1. 資料庫查詢優化

```typescript
// ❌ 不良實踐 - N+1 查詢問題
async getPosts(): Promise<Post[]> {
  const posts = await this.postRepository.find();
  
  for (const post of posts) {
    // 每個貼文都查詢一次創作者，導致 N+1 問題
    post.creator = await this.userRepository.findOne({ 
      where: { id: post.creatorId } 
    });
  }
  
  return posts;
}

// ✅ 良好實踐 - 使用 JOIN 一次查詢
async getPosts(): Promise<Post[]> {
  return this.postRepository.find({
    relations: ['creator'], // 一次查詢包含創作者
  });
}

// 或使用 QueryBuilder
async getPosts(): Promise<Post[]> {
  return this.postRepository
    .createQueryBuilder('post')
    .leftJoinAndSelect('post.creator', 'creator')
    .select([
      'post.id',
      'post.title',
      'post.content',
      'creator.id',
      'creator.username',
    ])
    .getMany();
}
```

**審查要點**：
- [ ] 避免 N+1 查詢問題
- [ ] 使用 JOIN 而非多次查詢
- [ ] 僅查詢需要的欄位（`select`）
- [ ] 分頁查詢（`take`、`skip`）
- [ ] 複雜查詢使用 QueryBuilder
- [ ] 添加適當的索引

---

### 2. 快取策略

```typescript
// ✅ 良好實踐
@Injectable()
export class PostService {
  async findOne(id: string): Promise<PostResponseDto> {
    const cacheKey = `post:${id}`;
    
    // 1. 先從 Redis 讀取
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. 從資料庫讀取
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    // 3. 寫入 Redis（TTL 1 小時）
    await this.redisService.set(cacheKey, JSON.stringify(post), 'EX', 3600);

    return post;
  }

  async update(id: string, dto: UpdatePostDto): Promise<PostResponseDto> {
    // 發送 Kafka 事件
    await this.kafkaProducerService.send('post.updated', { id, ...dto });

    // 更新 Redis 快取
    const updated = { ...await this.findOne(id), ...dto };
    await this.redisService.set(`post:${id}`, JSON.stringify(updated), 'EX', 3600);

    return updated;
  }

  async delete(id: string): Promise<void> {
    // 發送 Kafka 事件
    await this.kafkaProducerService.send('post.deleted', { id });

    // 刪除 Redis 快取
    await this.redisService.del(`post:${id}`);
  }
}
```

**審查要點**：
- [ ] 讀取先查 Redis，未命中再查資料庫
- [ ] 快取有過期時間（TTL）
- [ ] 更新/刪除時同步更新快取
- [ ] 快取 Key 命名一致（如 `post:${id}`）
- [ ] 考慮快取失效策略（如 LRU）

---

### 3. 分頁處理

```typescript
// ✅ 良好實踐
@Get()
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
async findAll(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
): Promise<PaginatedResponse<PostResponseDto>> {
  // 限制最大 limit
  limit = Math.min(limit, 100);

  const [data, total] = await this.postRepository.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

**審查要點**：
- [ ] 所有列表端點支持分頁
- [ ] 預設 `limit`（如 10）
- [ ] 限制最大 `limit`（如 100）
- [ ] 返回分頁資訊（`total`、`totalPages`）
- [ ] 使用 `findAndCount` 而非兩次查詢

---

## 測試審查

### 1. 單元測試

```typescript
// ✅ 良好實踐
describe('UserService', () => {
  let service: UserService;
  let userRepository: MockType<Repository<User>>;
  let redisService: MockType<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: RedisService,
          useValue: createMockRedisService(),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
    redisService = module.get(RedisService);
  });

  describe('findOne', () => {
    it('should return user from cache if exists', async () => {
      const userId = 'user-123';
      const cachedUser = { id: userId, email: 'test@example.com' };

      redisService.get.mockResolvedValue(JSON.stringify(cachedUser));

      const result = await service.findOne(userId);

      expect(result).toEqual(cachedUser);
      expect(redisService.get).toHaveBeenCalledWith(`user:${userId}`);
      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss', async () => {
      const userId = 'user-123';
      const user = { id: userId, email: 'test@example.com' };

      redisService.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne(userId);

      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      redisService.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

**審查要點**：
- [ ] 使用 AAA 模式（Arrange, Act, Assert）
- [ ] Mock 外部依賴（Repository、Redis、Kafka）
- [ ] 測試成功案例和失敗案例
- [ ] 測試邊界條件
- [ ] 斷言清晰明確
- [ ] 測試命名清晰（`should ...`）

---

### 2. E2E 測試

```typescript
// ✅ 良好實踐
describe('PostController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(createMockRedisService())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 獲取測試用 Token
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    accessToken = response.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/posts', () => {
    it('should create a post with valid data', () => {
      return request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Post',
          content: 'Test content',
          contentType: 'FREE',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Test Post');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/posts')
        .send({
          title: 'Test Post',
          content: 'Test content',
        })
        .expect(401);
    });

    it('should return 400 with invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '', // 空標題
        })
        .expect(400);
    });
  });
});
```

**審查要點**：
- [ ] 測試完整的 HTTP 流程
- [ ] 測試認證和授權
- [ ] 測試成功案例和失敗案例
- [ ] 測試錯誤狀態碼（400、401、403、404、500）
- [ ] 使用 `supertest` 進行 HTTP 測試
- [ ] Mock 外部依賴（如 Redis）

---

## 文檔審查

### 1. Swagger 文檔

```typescript
// ✅ 良好實踐
@Controller('posts')
@ApiTags('Posts')
export class PostController {
  @Post()
  @ApiOperation({ summary: '創建貼文' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({ status: 201, type: PostResponseDto, description: '成功創建貼文' })
  @ApiResponse({ status: 400, description: '請求格式錯誤' })
  @ApiResponse({ status: 401, description: '未認證' })
  @ApiResponse({ status: 403, description: '權限不足' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreatePostDto,
    @CurrentUser('userId') userId: string,
  ): Promise<PostResponseDto> {
    return this.postService.create(dto, userId);
  }
}
```

**審查要點**：
- [ ] 所有 Controller 有 `@ApiTags()`
- [ ] 所有端點有 `@ApiOperation({ summary })`
- [ ] 所有請求體有 `@ApiBody()`
- [ ] 所有響應有 `@ApiResponse()`（成功和失敗）
- [ ] 認證端點有 `@ApiBearerAuth()`
- [ ] DTO 有 `@ApiProperty()`

---

### 2. 代碼註釋

```typescript
// ✅ 良好實踐
/**
 * 用戶服務
 * 負責用戶相關業務邏輯
 */
@Injectable()
export class UserService {
  /**
   * 根據 ID 獲取用戶
   * @param id 用戶 ID
   * @returns 用戶資料 DTO
   * @throws NotFoundException 用戶不存在時拋出
   */
  async findOne(id: string): Promise<UserResponseDto> {
    // 先從 Redis 讀取快取
    const cached = await this.redisService.get(`user:${id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // 從資料庫讀取
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 寫入快取（TTL 1 小時）
    await this.redisService.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);

    return this.toDto(user);
  }
}
```

**審查要點**：
- [ ] 公開 API 有 JSDoc 註釋
- [ ] 複雜邏輯有註釋說明
- [ ] 註釋說明「為什麼」而非「是什麼」
- [ ] 避免過時的註釋
- [ ] TODO/FIXME 註釋有 Issue 編號

---

### 3. README 更新

**審查要點**：
- [ ] 新功能更新到 README
- [ ] 環境變數更新到 `.env.example`
- [ ] API 端點更新到文檔
- [ ] 部署步驟更新（如有變更）
- [ ] 依賴套件更新到文檔

---

## 審查流程

### 1. PR 大小

| PR 大小 | 行數 | 審查時間 | 建議 |
|--------|------|---------|------|
| 🟢 小型 | < 200 行 | 2 小時 | 理想大小 |
| 🟡 中型 | 200-500 行 | 24 小時 | 可接受 |
| 🔴 大型 | > 500 行 | 48 小時 | 建議拆分 |

---

### 2. 審查檢查清單

在審查 PR 時，使用以下檢查清單：

```markdown
## Code Review Checklist

### 功能
- [ ] 代碼實現符合需求
- [ ] 邊界情況已處理
- [ ] 錯誤情況已處理

### 架構
- [ ] 代碼結構清晰
- [ ] 遵循 SOLID 原則
- [ ] 無不必要的複雜度

### 測試
- [ ] 有單元測試
- [ ] 有 E2E 測試（如需）
- [ ] 測試覆蓋率 > 70%

### 安全性
- [ ] 輸入驗證
- [ ] 認證和授權
- [ ] 無敏感資訊洩漏

### 效能
- [ ] 無 N+1 查詢問題
- [ ] 有適當的快取
- [ ] 有分頁處理

### 文檔
- [ ] Swagger 文檔完整
- [ ] README 更新（如需）
- [ ] 代碼註釋清晰
```

---

### 3. 審查回饋範例

**良好的回饋**：

```
💡 建議：這裡可以使用 useMemo 來避免不必要的重新計算：

const expensiveValue = useMemo(() => {
  return calculateExpensive(data);
}, [data]);

參考：https://react.dev/reference/react/useMemo
```

**不良的回饋**：

```
❌ 這段代碼寫得很爛
❌ 為什麼不用 useMemo？
```

---

### 4. 合併標準

PR 必須滿足以下條件才能合併：

- [ ] 至少 1 位 Reviewer 批准
- [ ] 所有 CI 測試通過
- [ ] 無未解決的評論
- [ ] 無 Merge 衝突
- [ ] 符合團隊編碼規範
- [ ] 測試覆蓋率達標

---

## 附錄

### A. 常見問題

**Q: 發現小問題需要立即拒絕 PR 嗎？**

A: 不需要。根據問題嚴重程度決定：
- 🔴 Blocker：必須修復才能合併
- 🟡 Major：建議修復，但不阻礙合併
- 🟢 Minor / 💡 Suggestion：作者自行決定

---

**Q: 如何處理大型 PR？**

A: 建議作者拆分 PR。如果無法拆分：
1. 先做高層次審查（架構、設計）
2. 再做細節審查（邏輯、錯誤處理）
3. 分多次審查完成

---

**Q: 發現技術債務怎麼辦？**

A: 創建 Issue 追蹤，標註為「Tech Debt」，評估優先級。不要因為技術債務而拒絕 PR，除非是新引入的重大技術債。

---

### B. 工具推薦

- **ESLint**：自動化代碼風格檢查
- **Prettier**：自動化代碼格式化
- **Husky**：Git Hooks（pre-commit、pre-push）
- **SonarQube**：代碼品質分析
- **Codecov**：測試覆蓋率追蹤

---

### C. 參考資源

- [Google Code Review Guidelines](https://google.github.io/eng-practices/review/)
- [NestJS Best Practices](https://docs.nestjs.com/)
- [React Best Practices](https://react.dev/learn)
- [TypeScript Best Practices](https://typescript-eslint.io/)

---

**文檔結束**

*Code Review 是團隊協作的重要環節，讓我們一起提升代碼品質！*
