# Content Streaming Service

## 职责范围

**专注：视频处理、转码、流媒体传输**

### 核心功能
- 视频上传处理
- 视频转码（多分辨率）
- 流媒体传输 (HLS/DASH)
- 上传会话管理
- 视频质量配置

### 与其他服务的关系

| 服务 | 职责区分 |
|------|----------|
| **content-service** | 内容元数据、帖子、故事、发现、审核 |
| **content-streaming-service** | 视频文件处理、转码、流媒体传输 |

### 端口
- 3014

### API 路由
- `/api/videos` - 视频管理
- `/api/uploads` - 上传处理
- `/api/streams` - 流媒体传输
- `/api/transcoding` - 转码任务

### 技术栈
- NestJS
- AWS S3 (存储)
- FFmpeg (转码)
