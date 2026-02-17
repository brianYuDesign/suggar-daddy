# Media Service

## 📖 簡介

Media Service 負責處理所有媒體檔案的上傳、處理和管理，包括圖片、影片的上傳、壓縮、轉碼和 CDN 整合。

## 🎯 職責說明

- **檔案上傳**: 圖片、影片、音訊檔案上傳
- **圖片處理**: 壓縮、裁切、縮圖生成、浮水印
- **影片處理**: 轉碼、縮圖擷取、多解析度生成
- **CDN 整合**: Cloudinary / AWS S3 + CloudFront
- **儲存管理**: 檔案管理、刪除、清理
- **媒體元數據**: 檔案大小、格式、解析度等資訊
- **安全驗證**: 檔案類型驗證、大小限制、病毒掃描

## 🚀 端口和路由

- **端口**: `3008`
- **路由前綴**: 
  - `/api/upload` - 檔案上傳
  - `/api/media` - 媒體管理

## 🛠️ 技術棧

- **框架**: NestJS
- **語言**: TypeScript
- **檔案上傳**: Multer
- **圖片處理**: Sharp
- **影片處理**: FFmpeg
- **CDN**: Cloudinary (預設) / AWS S3
- **驗證**: class-validator, class-transformer
- **事件**: Kafka Producer

## ⚙️ 環境變數

```bash
# 服務端口
MEDIA_SERVICE_PORT=3008
PORT=3008

# 資料庫連接（記錄媒體元數據）
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=suggar_daddy

# Cloudinary 設定
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# AWS S3 設定（可選）
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# 檔案限制
MAX_FILE_SIZE_MB=100           # 單檔最大 100MB
MAX_IMAGE_SIZE_MB=10           # 圖片最大 10MB
MAX_VIDEO_SIZE_MB=500          # 影片最大 500MB
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,gif,webp
ALLOWED_VIDEO_TYPES=mp4,mov,avi,webm

# 圖片處理
IMAGE_QUALITY=80               # 壓縮品質 (0-100)
THUMBNAIL_WIDTH=300
THUMBNAIL_HEIGHT=300
MAX_IMAGE_DIMENSION=4096       # 最大尺寸 4K

# 影片處理
VIDEO_BITRATE=2000k
VIDEO_CODEC=libx264
AUDIO_CODEC=aac
THUMBNAIL_TIMESTAMP=00:00:01   # 擷取縮圖的時間點

# Kafka 設定
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=media-service

# Redis 設定（快取 CDN URLs）
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 💻 本地開發指令

```bash
# 啟動開發伺服器
nx serve media-service

# 建置
nx build media-service

# 執行測試
nx test media-service

# Lint 檢查
nx lint media-service

# 確保 FFmpeg 已安裝（影片處理需要）
ffmpeg -version
```

## 📡 API 端點列表

### 檔案上傳

#### 上傳圖片

```
POST /api/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: [image file]
- folder: "posts" | "avatars" | "covers"  // 可選，預設 "general"
- public: true | false  // 可選，預設 true

Response 201:
{
  "mediaId": "uuid",
  "url": "https://cdn.cloudinary.com/...",
  "thumbnailUrl": "https://cdn.cloudinary.com/.../thumbnail",
  "width": 1920,
  "height": 1080,
  "format": "jpg",
  "size": 245678,  // bytes
  "uploadedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 上傳影片

```
POST /api/upload/video
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: [video file]
- folder: "videos"
- generateThumbnail: true  // 可選，預設 true

Response 202:  # 接受處理中
{
  "mediaId": "uuid",
  "status": "PROCESSING",
  "message": "Video is being processed",
  "estimatedTime": 120  // 秒
}

# 輪詢處理狀態
GET /api/media/:mediaId/status

Response 200:
{
  "mediaId": "uuid",
  "status": "COMPLETED",  // PROCESSING, COMPLETED, FAILED
  "url": "https://cdn.cloudinary.com/...",
  "thumbnailUrl": "...",
  "duration": 125.5,      // 秒
  "width": 1920,
  "height": 1080,
  "format": "mp4",
  "size": 12345678,
  "completedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 批次上傳圖片

```
POST /api/upload/images/batch
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- files: [multiple image files]  // 最多 10 個
- folder: "posts"

Response 201:
{
  "uploaded": [
    {
      "mediaId": "uuid",
      "url": "...",
      "thumbnailUrl": "..."
    }
  ],
  "failed": [],
  "total": 5,
  "successful": 5
}
```

#### 上傳頭像

```
POST /api/upload/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: [image file]

Response 201:
{
  "mediaId": "uuid",
  "url": "https://cdn.cloudinary.com/...",
  "thumbnailUrl": "...",  // 自動生成多種尺寸
  "sizes": {
    "small": "https://...",   // 100x100
    "medium": "https://...",  // 300x300
    "large": "https://..."    // 600x600
  }
}
```

### 媒體管理

#### 取得媒體詳情

```
GET /api/media/:mediaId
Authorization: Bearer <token>

Response 200:
{
  "mediaId": "uuid",
  "userId": "uuid",
  "type": "IMAGE",  // IMAGE, VIDEO, AUDIO
  "url": "...",
  "thumbnailUrl": "...",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "size": 245678,
    "duration": null
  },
  "folder": "posts",
  "isPublic": true,
  "uploadedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 取得我的媒體列表

```
GET /api/media/me?type=IMAGE&folder=posts&page=1&limit=20
Authorization: Bearer <token>

Query Parameters:
- type: IMAGE | VIDEO | AUDIO | ALL
- folder: posts | avatars | covers | general
- sort: uploadedAt | size

Response 200:
{
  "media": [
    {
      "mediaId": "uuid",
      "type": "IMAGE",
      "url": "...",
      "thumbnailUrl": "...",
      "size": 245678,
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 150,
  "totalSize": 52428800  // bytes (50 MB)
}
```

#### 刪除媒體

```
DELETE /api/media/:mediaId
Authorization: Bearer <token>

Response 204: No Content
```

注意：會同時從 CDN 和資料庫中刪除。

#### 批次刪除媒體

```
POST /api/media/batch-delete
Authorization: Bearer <token>
Content-Type: application/json

{
  "mediaIds": ["uuid1", "uuid2", "uuid3"]
}

Response 200:
{
  "deleted": ["uuid1", "uuid2"],
  "failed": [
    {
      "mediaId": "uuid3",
      "reason": "Not found"
    }
  ],
  "total": 3,
  "successful": 2
}
```

### 圖片處理

#### 圖片轉換

```
POST /api/media/:mediaId/transform
Authorization: Bearer <token>
Content-Type: application/json

{
  "width": 800,
  "height": 600,
  "crop": "fill",       // fill, fit, scale
  "quality": 80,
  "format": "webp"      // jpg, png, webp
}

Response 200:
{
  "mediaId": "uuid",
  "originalUrl": "...",
  "transformedUrl": "..."
}
```

#### 生成縮圖

```
POST /api/media/:mediaId/thumbnail
Authorization: Bearer <token>
Content-Type: application/json

{
  "width": 300,
  "height": 300,
  "crop": "fill"
}

Response 200:
{
  "thumbnailUrl": "..."
}
```

### 影片處理

#### 影片轉碼

```
POST /api/media/:mediaId/transcode
Authorization: Bearer <token>
Content-Type: application/json

{
  "resolution": "720p",  // 480p, 720p, 1080p
  "format": "mp4",
  "bitrate": "2000k"
}

Response 202:
{
  "jobId": "uuid",
  "status": "QUEUED",
  "estimatedTime": 300
}
```

#### 擷取影片縮圖

```
POST /api/media/:mediaId/extract-thumbnail
Authorization: Bearer <token>
Content-Type: application/json

{
  "timestamp": "00:00:05"  // HH:MM:SS
}

Response 200:
{
  "thumbnailUrl": "..."
}
```

### 儲存統計

#### 取得儲存使用量

```
GET /api/media/storage/usage
Authorization: Bearer <token>

Response 200:
{
  "userId": "uuid",
  "totalFiles": 250,
  "totalSize": 524288000,  // bytes (500 MB)
  "breakdown": {
    "images": {
      "count": 200,
      "size": 104857600  // 100 MB
    },
    "videos": {
      "count": 50,
      "size": 419430400  // 400 MB
    }
  },
  "quota": 1073741824,  // 1 GB
  "usagePercentage": 48.8
}
```

## 📊 資料模型

### Media Entity

```typescript
{
  mediaId: string;
  userId: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO';
  url: string;
  thumbnailUrl?: string;
  cdnProvider: 'CLOUDINARY' | 'AWS_S3';
  cdnPublicId: string;
  folder: string;
  metadata: {
    width?: number;
    height?: number;
    format: string;
    size: number;      // bytes
    duration?: number; // 秒，僅影片
    bitrate?: string;
  };
  isPublic: boolean;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadedAt: Date;
  deletedAt?: Date;
}
```

## 🔄 資料流模式

### 上傳流程

1. 接收檔案上傳請求
2. 驗證檔案類型和大小
3. 上傳到 CDN (Cloudinary / S3)
4. **圖片**: 立即處理（壓縮、縮圖）
5. **影片**: 非同步處理（轉碼、縮圖）
6. **發送 Kafka 事件** `media.uploaded`
7. DB Writer Service 儲存元數據

### 刪除流程

1. 從 CDN 刪除檔案
2. **發送 Kafka 事件** `media.deleted`
3. DB Writer Service 標記為已刪除

## 📤 Kafka 事件

- `media.uploaded` - 媒體上傳完成
- `media.processed` - 影片處理完成
- `media.deleted` - 媒體刪除
- `media.failed` - 處理失敗

## 🔒 安全機制

- **檔案類型驗證**: MIME type 和副檔名雙重驗證
- **檔案大小限制**: 依據檔案類型設定上限
- **病毒掃描**: （建議在生產環境整合 ClamAV）
- **存取控制**: 僅允許上傳者和 ADMIN 刪除檔案
- **CDN 簽名**: 敏感檔案使用簽名 URL（時效性）

## 🧪 測試

```bash
# 單元測試
nx test media-service

# 覆蓋率報告
nx test media-service --coverage

# 上傳測試（需要 CDN 憑證）
curl -X POST http://localhost:3008/api/upload/image \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-image.jpg"
```

## 📚 相關文檔

- [服務總覽](../../docs/architecture/SERVICES_OVERVIEW.md)
- [Cloudinary 整合](https://cloudinary.com/documentation)
- [業務邏輯缺口](../../docs/BUSINESS_LOGIC_GAPS.md#media-service)

## 🤝 依賴服務

- **Cloudinary / AWS S3**: CDN 儲存
- **Kafka**: 事件發送
- **PostgreSQL**: 媒體元數據（透過 DB Writer）
- **Redis**: CDN URL 快取

## 🚨 已知問題

- 影片轉碼效能待優化（考慮使用專門的轉碼服務）
- 病毒掃描功能尚未整合
- 大檔案上傳需支援分段上傳（Resumable Upload）
- CDN 用量監控和成本預警待實作

請參考 [BUSINESS_LOGIC_GAPS.md](../../docs/BUSINESS_LOGIC_GAPS.md#media-service)。

## 📝 開發注意事項

1. **FFmpeg 依賴**: 影片處理需要系統安裝 FFmpeg
2. **非同步處理**: 影片上傳使用非同步處理，避免阻塞請求
3. **CDN 成本**: 注意 CDN 頻寬和儲存成本
4. **檔案清理**: 定期清理未使用或被標記刪除的檔案
5. **多解析度**: 考慮為影片生成多種解析度供不同網速使用
6. **備份策略**: 重要媒體檔案需要備份機制
