# Database Migrations

## 執行順序

### Migration 001: Add userType and permissionRole
**日期：** 2026-02-16  
**風險：** 🔴 High - Breaking Change  
**必須在部署前執行**

```bash
# 1. 備份資料庫
pg_dump -h localhost -U postgres suggar_daddy > backup_before_migration_001.sql

# 2. 執行遷移
psql -h localhost -U postgres -d suggar_daddy -f scripts/migrations/001_add_user_type_permission_role.sql

# 3. 驗證遷移
psql -h localhost -U postgres -d suggar_daddy -c "SELECT user_type, permission_role, COUNT(*) FROM users GROUP BY user_type, permission_role;"

# 4. 檢查異常資料
psql -h localhost -U postgres -d suggar_daddy -c "SELECT * FROM users WHERE user_type IS NULL OR permission_role IS NULL LIMIT 10;"
```

### Rollback 002: 如果需要回滾

```bash
# 執行回滾腳本
psql -h localhost -U postgres -d suggar_daddy -f scripts/migrations/002_rollback_user_type_permission_role.sql

# 驗證回滾
psql -h localhost -U postgres -d suggar_daddy -c "SELECT role, COUNT(*) FROM users GROUP BY role;"
```

---

## 遷移策略

### 選項 A: Blue-Green Deployment（推薦）
1. 保持舊的 `role` 欄位
2. 部署新代碼（同時讀取 `role` 和 `userType/permissionRole`）
3. 執行遷移腳本
4. 驗證新欄位資料正確
5. 移除舊 `role` 欄位的依賴

### 選項 B: 維護窗口部署
1. 宣布維護窗口（停機時間 ~15 分鐘）
2. 停止所有服務
3. 執行遷移腳本
4. 部署新代碼
5. 啟動服務

---

## 驗證清單

執行遷移後，確認以下項目：

- [ ] 所有用戶都有 `user_type` 和 `permission_role`
- [ ] 資料分佈合理：
  - `user_type`: sugar_daddy / sugar_baby
  - `permission_role`: subscriber / creator / admin
- [ ] 索引已建立：`idx_users_user_type`, `idx_users_permission_role`
- [ ] 舊索引已刪除：`idx_users_role`（可選）
- [ ] 應用程式啟動正常
- [ ] 登入/註冊流程正常
- [ ] 權限檢查正常（Admin 功能只有 admin 可訪問）

---

## 效能影響

**預期影響：** 可忽略

- 新增 2 個欄位，每個 50 bytes → 每百萬用戶增加 ~100MB
- 新增 2 個索引，預估 ~50MB/百萬用戶
- 查詢效能預期**提升**（更精確的索引）

**建議監控指標：**
- 查詢平均響應時間：`SELECT AVG(query_time) FROM pg_stat_statements WHERE query LIKE '%users%'`
- 索引使用率：`SELECT * FROM pg_stat_user_indexes WHERE relname = 'users'`

---

## 緊急回滾程序

如果部署後發現問題：

```bash
# 1. 立即停止所有服務
kubectl scale deployment --all --replicas=0

# 2. 執行回滾腳本
psql -h localhost -U postgres -d suggar_daddy -f scripts/migrations/002_rollback_user_type_permission_role.sql

# 3. 從 Git 回滾代碼
git revert <commit-hash>
git push

# 4. 重新部署舊版本
kubectl rollout undo deployment/auth-service
kubectl rollout undo deployment/user-service
# ... 其他服務

# 5. 啟動服務
kubectl scale deployment --all --replicas=3
```

---

## 常見問題

### Q: 為什麼不直接刪除 `role` 欄位？
**A:** 為了向後相容性和漸進式遷移。如果立即刪除，任何依賴舊欄位的代碼都會崩潰。建議保留 2-3 個版本後再刪除。

### Q: 如果有用戶的 `role` 不是 sugar_daddy/sugar_baby/admin/creator？
**A:** 遷移腳本預設會將這些用戶設為 `subscriber`。請在執行前檢查：
```sql
SELECT role, COUNT(*) FROM users GROUP BY role;
```

### Q: 遷移過程中可以有新用戶註冊嗎？
**A:** 
- 選項 A：可以（舊代碼會寫入 `role`，新代碼會補充 `userType/permissionRole`）
- 選項 B：不可以（維護窗口期間停機）

---

**最後更新：** 2026-02-16  
**維護者：** Tech Lead  
**緊急聯絡：** DevOps on-call
