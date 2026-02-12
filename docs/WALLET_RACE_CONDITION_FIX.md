# Wallet Race Condition Fix

## 問題描述

WalletService 中存在多個 Race Condition 問題，可能導致：
1. **錢包負數**：並發提現請求可能繞過餘額檢查
2. **資金損失**：平台可能因並發問題損失資金
3. **數據不一致**：totalEarnings、totalWithdrawn 等統計數據可能不準確

## 影響範圍

### Critical Race Conditions 修復

#### 1. `requestWithdrawal` - 提現餘額扣減
**問題**：
```typescript
// 原實現（非原子性）
const wallet = await this.getWallet(userId);
if (wallet.balance < amount) {
  throw new BadRequestException('Insufficient balance');
}
wallet.balance -= amount;  // Race condition here!
await this.redis.set(WALLET_KEY(userId), JSON.stringify(wallet));
```

**場景**：
- 用戶餘額 $100
- 請求 A 和 B 同時提現 $80
- 兩個請求都通過餘額檢查
- 最終餘額變成 $-60（應該只允許一個請求）

**修復**：使用 Redis Lua 腳本保證原子性
```typescript
const result = await this.redis.getClient().eval(
  this.deductWithdrawalScript,  // Atomic check-and-deduct
  1,
  WALLET_KEY(userId),
  amount.toString(),
  now,
);
```

#### 2. `creditWallet` - 錢包充值
**問題**：並發充值可能導致部分金額丟失

**修復**：使用 Lua 腳本原子性增加餘額和 totalEarnings

#### 3. `processWithdrawal` - 提現審核
**問題**：
- Reject 時的餘額退回非原子
- Approve 時的 totalWithdrawn 更新非原子

**修復**：分別使用 `refundBalanceScript` 和 `updateWithdrawnScript`

## 技術實現

### Lua 腳本優勢
1. **原子性**：整個腳本在 Redis 中作為單一操作執行
2. **無 Race Condition**：不會有其他操作插入執行
3. **性能**：減少網絡往返（1 次 vs 3+ 次）

### 腳本列表

#### 1. `creditWalletScript`
- 原子性增加餘額和 totalEarnings
- 自動初始化新錢包

#### 2. `deductWithdrawalScript`
- 原子性檢查餘額並扣減
- 返回具體錯誤（餘額不足 vs 錢包不存在）

#### 3. `refundBalanceScript`
- 提現拒絕時原子性退回餘額

#### 4. `updateWithdrawnScript`
- 提現完成時原子性更新 totalWithdrawn

## 額外優化

### 1. Kafka 異步化
**變更**：所有 Kafka 事件發送改為 fire-and-forget

**Before**:
```typescript
await this.kafkaProducer.sendEvent(PAYMENT_EVENTS.WALLET_CREDITED, payload);
// 阻塞 10-50ms
```

**After**:
```typescript
this.kafkaProducer.sendEvent(PAYMENT_EVENTS.WALLET_CREDITED, payload)
  .catch(err => this.logger.error('Failed to send event', err));
// 非阻塞，立即返回
```

**性能提升**：響應時間降低 10-50ms (約 20-40%)

## 測試建議

### 並發測試
```bash
# 使用 k6 進行並發提現測試
k6 run --vus 100 --duration 30s wallet-concurrent-test.js
```

### 測試場景
1. **並發提現**：100 個並發請求同時提現
2. **並發充值**：高頻充值測試
3. **混合操作**：同時充值、提現、審核

### 預期結果
- ✅ 餘額永不為負數
- ✅ totalEarnings = sum(所有充值)
- ✅ totalWithdrawn = sum(已完成提現)
- ✅ balance + totalWithdrawn = totalEarnings（資金守恆）

## 部署注意事項

### 1. Redis 版本
- 最低版本：Redis 2.6+（支援 Lua 腳本）
- 建議版本：Redis 6.0+

### 2. 監控指標
建議添加以下監控：
```typescript
// Prometheus metrics
wallet_insufficient_balance_total
wallet_race_condition_prevented_total
wallet_balance_consistency_check_failures_total
```

### 3. 回滾計劃
若發現問題，可快速回滾到舊版本（非原子實現），但需注意：
- 回滾後仍可能出現 Race Condition
- 建議在低流量時段回滾
- 回滾後立即修復並重新部署

## 驗證清單

部署後驗證：
- [ ] 並發提現測試通過
- [ ] 餘額守恆公式驗證
- [ ] Kafka 事件正常發送
- [ ] 響應時間監控（應降低 10-50ms）
- [ ] 錯誤日誌無異常

## 相關文件
- Performance Analysis Report: `.claude/analysis-report.md`
- Wallet Service: `apps/payment-service/src/app/wallet.service.ts`
- Wallet Controller: `apps/payment-service/src/app/wallet.controller.ts`

## 變更摘要
- **修復時間**: 2026-02-12
- **影響服務**: payment-service
- **嚴重程度**: Critical
- **預期影響**: 消除資金損失風險，提升 20-40% 響應速度
