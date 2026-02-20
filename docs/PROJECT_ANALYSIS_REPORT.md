# 🔍 项目重复与未使用功能检测报告

## 🚨 关键问题

### 1. 端口冲突
| 端口 | 服务1 | 服务2 |
|------|-------|-------|
| 3000 | api-gateway | recommendation-service |
| 3010 | db-writer-service | skill-service |

### 2. 实体重复定义
| 实体 | 位置1 | 位置2 |
|------|-------|-------|
| user.entity.ts | user-service | recommendation-service |
| content.entity.ts | content-service | recommendation-service |

## 📋 发现的问题

### 🔄 重复/重叠功能

1. **content-service vs content-streaming-service**
   - content-service: 处理帖子、故事、视频、动态发现、审核
   - content-streaming-service: 处理视频上传、转码、流媒体
   - 两个服务都涉及视频/内容处理，功能有重叠

2. **实体重复**
   - user.entity.ts 在 user-service 和 recommendation-service
   - content.entity.ts 在 content-streaming-service 和 recommendation-service
   - 违反微服务数据隔离原则

### 🚫 未使用的服务/功能

1. **不在 docker-compose 中的服务** (18个apps中只有15个在docker-compose中)
   - ❌ content-streaming-service
   - ❌ recommendation-service
   - ❌ skill-service (虽然在api-gateway有路由)

2. **未使用的库**
   - ❌ libs/ui - 未被任何服务使用

3. **独立的 package.json** (应该统一使用根目录依赖)
   - apps/content-streaming-service/package.json
   - apps/recommendation-service/package.json

### ⚠️ 建议检查的依赖

根据代码搜索，以下依赖可能未被使用：
- firebase-admin
- cloudinary (如果 content-streaming-service 使用 AWS S3 替代)

## 💡 优化建议

### 立即处理 (High Priority)

1. **修复端口冲突**
   ```
   recommendation-service: 3000 -> 3012
   skill-service 或 db-writer-service: 3010 -> 3013
   ```

2. **合并 content 服务**
   考虑将 content-streaming-service 合并到 content-service，或明确分工：
   - content-service: 内容元数据、发现、审核
   - content-streaming-service: 视频处理、转码、流媒体

3. **删除未使用的 libs/ui**

### 中期处理 (Medium Priority)

4. **统一依赖管理**
   - 删除 apps/content-streaming-service/package.json
   - 删除 apps/recommendation-service/package.json
   - 统一使用根目录 package.json

5. **移除重复实体**
   - 使用共享 libs/dto 和 entities
   - 或通过 API 调用获取数据，不直接访问数据库

6. **整合或删除未使用的服务**
   - 如果 recommendation-service 不需要独立部署，考虑合并
   - 或将 content-streaming-service 加入 docker-compose

### 长期优化 (Low Priority)

7. **审查依赖**
   - 移除未使用的 firebase-admin
   - 检查 cloudinary 是否被实际使用

8. **服务合并考虑**
   - skill-service 功能是否可合并到 user-service?
   - db-writer-service 是否可合并到各服务?
