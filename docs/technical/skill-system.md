# Skill 系統設計

## 概述
Skill 系統支援用戶個人技能標籤、配對篩選、Creator 服務類型等多種用途。

## 資料結構

### 1. Skill Entity（技能）
```typescript
// libs/database/src/entities/skill.entity.ts
{
  id: uuid,
  category: SkillCategory,  // 技能分類
  name: string,              // 技能名稱（支援多語系）
  nameEn: string,           // 英文名稱
  nameZhTw: string,         // 繁中名稱
  icon?: string,            // 圖示 URL
  isActive: boolean,        // 是否啟用
  sortOrder: number,        // 排序
  createdAt: Date,
  updatedAt: Date
}
```

### 2. UserSkill Entity（用戶技能）
```typescript
// libs/database/src/entities/user-skill.entity.ts
{
  id: uuid,
  userId: uuid,             // 用戶 ID
  skillId: uuid,            // 技能 ID
  proficiencyLevel?: number, // 熟練度 1-5（選填）
  isHighlight: boolean,     // 是否在個人資料中突顯
  createdAt: Date
}
```

## Skill 分類（SkillCategory）

### 個人特質與興趣
- `APPEARANCE` - 外貌特徵（身材、風格等）
- `PERSONALITY` - 性格特質（活潑、溫柔、幽默等）
- `HOBBY` - 興趣愛好（運動、音樂、旅遊、美食等）
- `LIFESTYLE` - 生活方式（健身、夜生活、寵物愛好者等）

### 才藝與專長
- `TALENT` - 才藝（舞蹈、歌唱、樂器、繪畫等）
- `LANGUAGE` - 語言能力（英文、日文、韓文等）
- `EDUCATION` - 教育背景（學位、專業領域）
- `PROFESSION` - 職業技能（行銷、設計、攝影等）

### Creator 服務類型
- `CONTENT_TYPE` - 內容類型（寫真、舞蹈、歌唱、ASMR 等）
- `SERVICE_TYPE` - 服務類型（聊天、語音通話、視訊通話、直播互動）
- `INTERACTION_STYLE` - 互動風格（傾聽、建議、陪伴、娛樂）

### 配對偏好
- `SEEKING` - 尋找對象類型（長期關係、短期約會、純聊天等）
- `DATE_ACTIVITY` - 約會活動偏好（看電影、吃飯、運動、旅遊等）

## API 端點

### 系統管理（Admin）
- `GET /api/admin/skills` - 取得所有技能列表
- `POST /api/admin/skills` - 建立新技能
- `PATCH /api/admin/skills/:id` - 更新技能
- `DELETE /api/admin/skills/:id` - 刪除技能

### 用戶端
- `GET /api/skills` - 取得所有啟用的技能（可依分類篩選）
- `GET /api/users/:userId/skills` - 取得用戶的技能
- `POST /api/users/me/skills` - 新增自己的技能
- `DELETE /api/users/me/skills/:skillId` - 移除自己的技能
- `PATCH /api/users/me/skills/:skillId` - 更新技能（熟練度、突顯狀態）

### 配對篩選
- `GET /api/matching/candidates?skills=id1,id2` - 依技能篩選配對對象
- `POST /api/matching/preferences` - 設定配對偏好（包含期望的技能）

## 預設技能資料範例

### 個人特質
- 活潑開朗、溫柔體貼、幽默風趣、成熟穩重、神秘性感

### 興趣愛好
- 健身運動、瑜珈、游泳、登山、跑步
- 音樂、唱歌、跳舞、樂器
- 攝影、繪畫、設計
- 旅遊、美食、咖啡
- 閱讀、電影、動漫、遊戲

### 才藝
- 鋼琴、吉他、小提琴
- 芭蕾舞、街舞、拉丁舞
- 素描、水彩、數位繪圖
- 攝影、剪輯

### 語言
- 中文、英文、日文、韓文、西班牙文、法文

### Creator 內容類型
- 寫真照片、藝術照、時尚穿搭
- 舞蹈表演、歌唱表演
- ASMR、聲音劇場
- 生活日常、旅遊 Vlog
- 美妝教學、健身教學

### Creator 服務
- 文字聊天、語音通話、視訊通話
- 直播互動、一對一視訊
- 客製化內容、專屬訊息
- 傾聽陪伴、情感支持

### 約會活動
- 看電影、吃飯、喝咖啡
- 運動健身、戶外活動
- 逛街購物、展覽活動
- 夜生活、酒吧、夜店
- 旅遊、短途旅行

## 實作考量

1. **多語系支援**：技能名稱支援多語系，前端根據用戶語言設定顯示
2. **快取策略**：技能列表使用 Redis 快取，減少資料庫查詢
3. **搜尋優化**：使用者配對篩選時，技能搜尋需要建立適當索引
4. **彈性擴充**：未來可新增自訂技能功能（用戶自行新增，需審核）
5. **隱私控制**：用戶可選擇哪些技能公開顯示在個人資料
6. **配對權重**：不同技能在配對演算法中有不同權重

## Migration 順序

1. 建立 `skills` 表
2. 建立 `user_skills` 表
3. 匯入預設技能資料
4. 建立必要的索引

## 相關文件
- [配對系統設計](./matching-system.md)
- [用戶個人資料](./user-profile.md)
- [Creator 服務](./creator-services.md)
