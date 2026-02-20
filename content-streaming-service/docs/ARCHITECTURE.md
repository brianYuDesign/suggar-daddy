# Content-Streaming Service 架構文檔

## 📐 系統架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Applications                          │
│                   (Web, Mobile, Desktop)                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    HTTP/HTTPS (REST API)
                                │
        ┌───────────────────────▼────────────────────────┐
        │   Content-Streaming Service (NestJS)           │
        │   Port: 3001                                   │
        ├──────────────────────────────────────────────┤
        │                                              │
        │  ┌─ API Layer (Controllers) ──────────────┐ │
        │  │ • VideoController                      │ │
        │  │ • UploadController                     │ │
        │  │ • StreamingController                  │ │
        │  │ • TranscodingController                │ │
        │  │ • QualityController                    │ │
        │  └────────────────────────────────────────┘ │
        │                   │                          │
        │  ┌─ Service Layer (Business Logic) ─────┐ │
        │  │ • VideoService                       │ │
        │  │ • S3Service                          │ │
        │  │ • TranscodingService                 │ │
        │  │ • CloudflareService                  │ │
        │  │ • UploadService                      │ │
        │  └──────────────────────────────────────┘ │
        │                   │                        │
        │  ┌─ Data Layer (Repositories) ─────────┐ │
        │  │ • Video Entity                      │ │
        │  │ • VideoQuality Entity               │ │
        │  │ • TranscodingJob Entity             │ │
        │  │ • UploadSession Entity              │ │
        │  └────────────────────────────────────┘ │
        │                                          │
        └──────────────────────────────────────────┘
                    │           │           │
        ┌───────────┴───┬───────┴───┬──────┴────────┐
        │               │           │               │
    ┌───▼────┐   ┌──────▼───┐  ┌──▼──────┐  ┌────▼─────┐
    │ PostgreSQL  │  AWS S3   │  │ Cloudflare │ Redis  │
    │  Database   │  Storage  │  │   CDN      │ Cache  │
    │  (Metadata) │  (Videos) │  │  (Cache)   │ (Q)    │
    └────────┘   └───────────┘  └────────┘  └────────┘
```

## 🏛️ 分層架構 (Layered Architecture)

### 1. 演示層 (Presentation Layer)

**責任**: HTTP API 端點，請求/響應處理

**組件**:
- `VideoController` - 視頻 CRUD 操作
- `UploadController` - 分片上傳管理
- `StreamingController` - HLS/DASH 播放
- `TranscodingController` - 轉碼進度查詢
- `QualityController` - 質量配置信息

**典型流程**:
```
HTTP Request
    ↓
Controller (解析, 驗證輸入)
    ↓
Service (業務邏輯)
    ↓
HTTP Response
```

### 2. 業務層 (Business Logic Layer)

**責任**: 核心業務規則，數據轉換，第三方集成

**核心服務**:

#### VideoService
```typescript
- createVideo()          // 創建視頻記錄
- getVideo()            // 取得視頻信息
- listVideos()          // 列出創作者視頻
- updateVideo()         // 更新視頻元數據
- deleteVideo()         // 刪除視頻
- publishVideo()        // 發佈視頻
- setVideoStatus()      // 更新視頻狀態
```

#### S3Service
```typescript
- uploadFile()          // 上傳文件到 S3
- getObjectUrl()        // 生成有簽名的 S3 URL
- deleteObject()        // 刪除 S3 對象
- initiateMultipartUpload() // 開始分片上傳
```

#### TranscodingService
```typescript
- startTranscoding()    // 啟動轉碼任務
- getTranscodingStatus()// 檢查轉碼進度
- mockTranscode()       // 模擬轉碼（測試）
```

#### CloudflareService
```typescript
- generatePlaylistUrl() // 生成 CDN URL
- purgeCache()          // 清除 CDN 緩存
- configureCachingRules()// 配置緩存規則
```

#### UploadService
```typescript
- initiateUpload()      // 初始化上傳會話
- getUploadSession()    // 取得會話信息
- markChunkUploaded()   // 標記分片已上傳
- completeUpload()      // 完成上傳
- isUploadComplete()    // 檢查是否全部上傳
```

### 3. 數據層 (Data Layer)

**責任**: 數據持久化，查詢優化

**實體 (TypeORM Entities)**:

#### Video
```typescript
@Entity('videos')
├─ id: UUID (主鍵)
├─ creator_id: 創作者 ID
├─ title: 視頻標題
├─ status: 上傳/處理/就緒/失敗
├─ file_size: 檔案大小
├─ duration_seconds: 時長
├─ is_published: 發佈狀態
├─ subscription_level: 訂閱級別
└─ relations:
   ├─ qualities: VideoQuality[] (1:N)
   └─ transcoding_jobs: TranscodingJob[] (1:N)
```

#### VideoQuality
```typescript
@Entity('video_qualities')
├─ id: UUID (主鍵)
├─ video_id: FK → Video
├─ quality_name: 720p/480p/360p/240p
├─ s3_key: S3 存儲位置
├─ width/height: 分辨率
├─ bitrate/fps: 比特率/幀速
├─ cdn_url: Cloudflare CDN URL
└─ is_ready: 是否已就緒
```

#### TranscodingJob
```typescript
@Entity('transcoding_jobs')
├─ id: UUID (主鍵)
├─ video_id: FK → Video
├─ quality_name: 目標質量
├─ status: pending/in_progress/completed/failed
├─ progress_percent: 轉碼進度
└─ output_metadata: JSONB 輸出信息
```

#### UploadSession
```typescript
@Entity('upload_sessions')
├─ id: UUID (主鍵)
├─ creator_id: 創作者 ID
├─ filename: 原始檔名
├─ chunk_size: 分片大小
├─ total_chunks: 總分片數
├─ uploaded_chunks: 已上傳分片列表
└─ is_completed: 是否完成
```

## 📊 數據流

### 完整上傳到播放流程

```
1. 初始化上傳
   Client → POST /api/uploads/initiate
   → UploadService.initiateUpload()
   → 創建 UploadSession 記錄
   ← 返回 session_id, chunk_size, total_chunks

2. 分片上傳
   Client → POST /api/uploads/{sessionId}/chunk?chunkIndex=0
   → UploadController.uploadChunk()
   → UploadService.markChunkUploaded()
   ← 返回 { uploaded: true, chunkIndex: 0 }

3. 完成上傳
   Client → POST /api/uploads/{sessionId}/complete
   → UploadService.completeUpload()
   → S3Service.uploadFile() // 將分片組合上傳
   → Video(status=PROCESSING) 建立
   → TranscodingService.startTranscoding()
   ← 返回 video_id

4. 異步轉碼
   TranscodingService 內部隊列
   → FFmpeg 處理每個質量
   → S3Service.uploadFile() // 上傳轉碼版本
   → VideoQuality 記錄每個質量
   → CloudflareService.generatePlaylistUrl()
   → Video(status=READY)

5. 發佈視頻
   Creator → POST /api/videos/{videoId}/publish
   → VideoService.publishVideo()
   → Video(is_published=true)
   ← 返回完整視頻信息

6. 取得播放列表
   Client → GET /api/streaming/{videoId}/playlist
   → StreamingController.getStreamingPlaylist()
   → 組織 VideoQuality 信息
   → 生成 M3U8 播放列表
   ← 返回可用質量和 CDN URLs

7. 播放視頻
   Player → CDN (Cloudflare)
   → S3 (如果 CDN cache miss)
   ← 流媒體分片
```

## 🔄 關鍵工作流

### 轉碼流程

```
VideoService.createVideo()
    ↓
TranscodingService.startTranscoding()
    ├─ 創建 4 個 TranscodingJob (pending)
    ├─ 啟動異步隊列 (processTranscodingQueue)
    └─ 返回 jobIds
    
processTranscodingQueue() 循環:
    ├─ 取出 pending 任務 → in_progress
    ├─ 下載原始視頻 from S3
    ├─ FFmpeg 轉碼:
    │  └─ 對每個質量運行轉碼
    ├─ S3Service.uploadFile() 上傳轉碼版本
    ├─ CloudflareService.generatePlaylistUrl()
    ├─ VideoQuality(is_ready=true)
    └─ TranscodingJob(status=completed)
    
VideoService.setVideoStatus(READY)
    └─ 創作者可發佈
```

### 品質自適應

```
Client 取得播放列表:
GET /api/streaming/{videoId}/playlist

返回所有可用質量:
{
  "qualities": [
    { "name": "720p", "url": "...", "bitrate": "2500k" },
    { "name": "480p", "url": "...", "bitrate": "1500k" },
    { "name": "360p", "url": "...", "bitrate": "800k" },
    { "name": "240p", "url": "...", "bitrate": "400k" }
  ]
}

Player 邏輯:
1. 檢測網絡速度
2. 選擇合適的 bitrate
3. 從 CDN 請求該質量
4. 網絡變化時切換 → POST /quality-switch
```

## 🔐 安全設計

### 身份驗證和授權

```typescript
// 創作者隔離
@Post('/videos/:id')
async updateVideo(@Req() req, @Param('id') videoId) {
  const video = await videoService.getVideo(videoId);
  
  if (video.creator_id !== req.user.id) {
    throw new ForbiddenException();
  }
  // ...
}
```

### 存儲安全

```typescript
// S3 簽名 URL (時間限制)
const url = await s3Service.getObjectUrl(key, expiresIn=3600);
// URL 1 小時後失效

// S3 訪問控制
// - 只有應用能讀寫
// - 公開 CDN 訪問通過 CloudFlare
```

### 輸入驗證

```typescript
@Post('videos')
async createVideo(
  @Body() createVideoDto: CreateVideoDto // class-validator 驗證
) {
  // DTO 自動驗證: 
  // - @IsString(), @IsNotEmpty(), @IsNumber()
  // - @Min(0), @Max(2)
}
```

## ⚡ 性能優化

### 數據庫

```sql
-- 索引優化
CREATE INDEX idx_videos_creator_id ON videos(creator_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_qualities_video_id ON video_qualities(video_id, quality_name);
CREATE INDEX idx_jobs_video_status ON transcoding_jobs(video_id, status);
CREATE INDEX idx_sessions_creator ON upload_sessions(creator_id, created_at);
```

### 緩存策略

```typescript
// Redis 緩存 (可選)
cache.set(`video:${videoId}`, videoData, TTL=300);

// CDN 緩存 (Cloudflare)
cloudflareService.configureCachingRules(key, duration=86400);
```

### 並發控制

```typescript
// 限制並發上傳
MAX_CONCURRENT_UPLOADS = 5

// 限制並發轉碼
TRANSCODING_MAX_CONCURRENT = 2
```

## 📈 可擴展性設計

### 無狀態設計

所有服務都是無狀態的，可以橫向擴展：
- 多個 NestJS 實例
- 通過負載均衡器路由
- 共享 PostgreSQL 和 Redis

### 異步處理

```typescript
// 轉碼異步進行，不阻塞 API
TranscodingService.startTranscoding(videoId)
→ 立即返回
→ 後台隊列異步處理

// 客戶端輪詢進度
GET /api/transcoding/{jobId}/status
```

### 存儲分片設計

考慮未來的 multi-region 部署：
```
videos/{timestamp}/{uuid}/
    ├─ original.mp4
    ├─ 720p/video.mp4
    ├─ 480p/video.mp4
    └─ ...
```

## 🛠️ 開發模式

### 本地開發

```bash
# 啟動依賴
docker-compose up postgres redis

# 啟動服務
npm run dev

# 監看測試
npm run test:watch
```

### 分支策略

- `main` - 生產環境
- `develop` - 開發分支
- `feature/*` - 功能分支
- `bugfix/*` - 修復分支

### CI/CD 流程

```
Git Push
    ↓
Unit Tests (Jest)
    ↓
Lint Check (ESLint)
    ↓
Build (TypeScript compile)
    ↓
Docker Build
    ↓
Push to Registry
    ↓
Deploy (staging/production)
```

## 📚 參考資源

- [NestJS 文檔](https://docs.nestjs.com)
- [TypeORM 文檔](https://typeorm.io)
- [AWS S3 文檔](https://docs.aws.amazon.com/s3)
- [Cloudflare 文檔](https://developers.cloudflare.com)
- [FFmpeg 文檔](https://ffmpeg.org/documentation.html)

---

_最後更新: 2026-02-19_
