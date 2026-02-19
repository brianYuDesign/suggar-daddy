# 🎯 QA-004 灰度部署測試 - 快速開始指南

**時間**: 2026-02-19 13:24 GMT+8  
**狀態**: ✅ 準備完成  
**下一步**: 開始執行測試  

---

## 📋 3 步快速開始

### Step 1️⃣ : 驗證前置條件 (5 分鐘)

```bash
cd /Users/brianyu/.openclaw/workspace

# 運行前置條件檢查清單
bash qa-004-checklist-verification.sh

# 預期輸出:
# ✓ 通過: XX
# ✗ 失敗: 0
# ⚠ 警告: XX
# 🟢 就緒 - 可以進行部署
```

**檢查內容**:
- ✅ Kubernetes 集群連接
- ✅ 依賴服務 (PostgreSQL, Redis)
- ✅ 監控系統 (Prometheus, Grafana)
- ✅ 部署腳本和文檔
- ✅ 回滾計劃
- ✅ 通知和安全配置

**如果失敗**: 查看 `QA-004-CHECKLIST-VERIFICATION.md` 報告並修復問題

---

### Step 2️⃣ : 執行灰度部署測試 (3 小時)

```bash
# 開始灰度部署測試套件
bash QA-004-canary-deployment-test.sh

# 或者分階段執行:
# Phase 1: 灰度流程 (1.5 小時)
# - TC-001: 5% 灰度部署
# - TC-002: 25% 灰度部署
# - TC-003: 50% 灰度部署 + 負載測試
# - TC-004: 100% 完全推出

# Phase 2: 監控告警 (1 小時)
# - TC-005: 高延遲告警
# - TC-006: 高錯誤率告警
# - TC-007: Pod 就緒性告警

# Phase 3: 自動回滾 (1 小時)
# - TC-010: 錯誤率觸發回滾
# - TC-011: 延遲觸發回滾
# - TC-012: Pod 就緒觸發回滾
```

**實時監控**:

在另一個終端窗口執行：

```bash
# 監控關鍵指標 (每 30 秒更新)
bash qa-004-chaos-testing.sh watch-metrics 300

# 或者打開 Grafana 儀表板
open http://localhost:3010/d/prod-deployment

# 或者查看實時日誌
tail -f QA-004-test-execution.log
```

---

### Step 3️⃣ : 故障注入和驗證 (2-3 小時)

```bash
# 選項 A: 執行完整的故障注入測試
bash QA-004-canary-deployment-test.sh  # 包含所有故障注入

# 選項 B: 手動執行特定的故障注入場景
bash qa-004-chaos-testing.sh scenario-high-latency      # 高延遲場景
bash qa-004-chaos-testing.sh scenario-high-error-rate   # 高錯誤率場景
bash qa-004-chaos-testing.sh scenario-pod-crash         # Pod 崩潰場景
bash qa-004-chaos-testing.sh scenario-startup-failure   # 啟動失敗場景
bash qa-004-chaos-testing.sh scenario-database-failure  # 數據庫故障場景
```

---

## 🔧 常用命令速查表

### 查詢和監控

```bash
# 查看當前部署狀態
kubectl get deployment recommendation-service -n production -o wide

# 查看 Pod 狀態
kubectl get pods -n production -l app=recommendation-service -w

# 查看部署歷史（用於回滾）
kubectl rollout history deployment/recommendation-service -n production

# 查看部署進度
kubectl rollout status deployment/recommendation-service -n production

# 查看 Pod 日誌
kubectl logs -f deployment/recommendation-service -n production --all-containers

# 查看 Pod 詳細信息
kubectl describe pod <pod-name> -n production
```

### 故障注入命令

```bash
# 注入延遲
bash qa-004-chaos-testing.sh inject-latency 500        # 500ms 延遲

# 注入錯誤
bash qa-004-chaos-testing.sh inject-errors 10          # 10% 錯誤率

# 清除注入
bash qa-004-chaos-testing.sh clear-latency
bash qa-004-chaos-testing.sh clear-errors

# 模擬 Pod 故障
bash qa-004-chaos-testing.sh simulate-crash            # Pod 崩潰
bash qa-004-chaos-testing.sh simulate-startup-failure  # 啟動失敗
bash qa-004-chaos-testing.sh simulate-oom              # 內存溢出

# 恢復
bash qa-004-chaos-testing.sh clear-startup-failure
bash qa-004-chaos-testing.sh clear-oom
```

### 監控和指標

```bash
# 檢查關鍵指標
bash qa-004-chaos-testing.sh check-metrics

# 監控指標 (5 分鐘，每 30 秒更新)
bash qa-004-chaos-testing.sh watch-metrics 300

# 生成負載
bash qa-004-chaos-testing.sh generate-load 100 60      # 100 QPS, 60 秒

# 流量分割
bash qa-004-chaos-testing.sh split-traffic 95          # 穩定版本 95%, 灰度 5%
```

### 回滾命令

```bash
# 立即回滾到上一個版本
kubectl rollout undo deployment/recommendation-service -n production

# 回滾到特定版本
kubectl rollout undo deployment/recommendation-service -n production --to-revision=5

# 查看回滾進度
kubectl rollout status deployment/recommendation-service -n production --timeout=10m
```

---

## 📊 測試進度檢查清單

### 執行前

- [ ] 讀過測試計劃文檔
- [ ] 有備份或回滾計劃
- [ ] 準備好緊急聯絡方式
- [ ] 通知相關團隊成員

### 執行中

- [ ] 前置條件檢查通過 (Step 1)
- [ ] 灰度流程全部通過 (Step 2)
- [ ] 監控告警正確工作
- [ ] 自動回滾機制可靠
- [ ] 故障場景可恢復 (Step 3)

### 執行後

- [ ] 測試報告已生成
- [ ] 所有 P0 項目通過
- [ ] P1 項目通過率 > 90%
- [ ] 結果已通知相關人員
- [ ] 改進建議已記錄

---

## 📈 預期結果

### 成功標誌 ✅

```
✅ 灰度部署 4 階段全部通過
✅ 流量分配精確 (±2%)
✅ 錯誤率保持 < 1%
✅ P99 延遲 < 500ms
✅ 監控告警 100% 準確
✅ 自動回滾 100% 成功
✅ 故障恢復 < 5 分鐘
```

### 失敗警告 ⚠️

```
❌ 任何灰度階段失敗
❌ 流量分配誤差 > 5%
❌ 錯誤率上升 > 5%
❌ 延遲超過 1 秒
❌ 監控告警誤報或漏報
❌ 自動回滾失敗
❌ Pod 無法恢復就緒
```

---

## 🎯 時間估計

| 階段 | 任務 | 時間 | 累計 |
|------|------|------|------|
| 1 | 前置條件檢查 | 15 分鐘 | 15 分鐘 |
| 2 | 5% 灰度部署 | 30 分鐘 | 45 分鐘 |
| 2 | 25% 灰度部署 | 30 分鐘 | 1 小時 15 分 |
| 2 | 50% 灰度 + 負載測試 | 45 分鐘 | 2 小時 |
| 2 | 100% 推出 | 30 分鐘 | 2 小時 30 分 |
| 3 | 監控告警測試 | 1 小時 | 3 小時 30 分 |
| 4 | 自動回滾測試 | 1 小時 | 4 小時 30 分 |
| 5 | 故障注入測試 | 1 小時 30 分 | 6 小時 |
| 6 | 最終驗證和報告 | 1 小時 | 7 小時 |

**總計**: ~7 小時 (連續執行)  
**實際用時**: 2-3 天 (考慮間隔和修復時間)

---

## 📝 輸出文檔

執行測試後會自動生成：

```
QA-004-test-execution.log
  └─ 詳細的執行日誌，包含時間戳和每個測試步驟

QA-004-TEST-REPORT.md
  └─ 最終測試報告，包含:
     ├─ 執行概要
     ├─ 測試結果統計
     ├─ 詳細測試日誌
     ├─ KPI 達成情況
     └─ 推薦和建議

QA-004-CHECKLIST-VERIFICATION.md
  └─ 前置條件驗證報告

QA-004-PROGRESS-TRACKER.md
  └─ 測試進度追蹤 (實時更新)
```

---

## 🚨 如果出現問題

### 問題: 前置條件檢查失敗

```bash
# 查看具體的失敗項
cat QA-004-CHECKLIST-VERIFICATION.md

# 修復常見問題:
# 1. Kubernetes 連接問題
kubectl cluster-info

# 2. 依賴服務不可用
kubectl get services -n production

# 3. 監控系統離線
kubectl get pods -n monitoring
```

### 問題: 灰度部署卡住

```bash
# 檢查 Pod 狀態
kubectl describe pod <pod-name> -n production

# 查看 Pod 日誌
kubectl logs <pod-name> -n production

# 強制終止故障 Pod
kubectl delete pod <pod-name> -n production

# 如需要，立即回滾
kubectl rollout undo deployment/recommendation-service -n production
```

### 問題: 監控告警不工作

```bash
# 檢查 Prometheus 狀態
curl http://prometheus:9090/-/healthy

# 檢查 AlertManager 狀態
curl http://alertmanager:9093/-/ready

# 查看告警規則
kubectl get prometheusrule -n monitoring

# 查看已觸發的告警
curl http://alertmanager:9093/api/v1/alerts | jq .
```

### 問題: 自動回滾沒有觸發

```bash
# 檢查回滾控制器日誌
kubectl logs -l app=auto-rollback-controller -n production

# 查看部署修訂歷史
kubectl rollout history deployment/recommendation-service -n production

# 手動回滾
kubectl rollout undo deployment/recommendation-service -n production
```

---

## 📞 需要幫助？

### 快速查詢

| 問題 | 命令 |
|------|------|
| 集群狀態 | `kubectl cluster-info` |
| Pod 狀態 | `kubectl get pods -n production` |
| 部署狀態 | `kubectl get deployment recommendation-service -n production` |
| 實時日誌 | `tail -f QA-004-test-execution.log` |
| 指標查詢 | `bash qa-004-chaos-testing.sh check-metrics` |

### 聯絡方式

- **測試工程師**: QA Engineer Agent (主要聯絡人)
- **DevOps 支持**: 如需集群操作幫助
- **監控工程師**: 如需監控系統調整

---

## ✨ 最後檢查清單

執行測試前，請確保:

- [ ] 已讀過 QA-004-CANARY-DEPLOYMENT-TESTING.md
- [ ] 前置條件檢查通過
- [ ] 有備份或回滾計劃
- [ ] 團隊成員已通知
- [ ] 緊急聯絡已記錄
- [ ] 監控系統已就緒

---

## 🚀 開始執行

**準備就緒？**

```bash
# 1. 驗證環境
bash qa-004-checklist-verification.sh

# 2. 開始測試
bash QA-004-canary-deployment-test.sh

# 3. 實時監控 (在另一個終端)
bash qa-004-chaos-testing.sh watch-metrics 600
```

**祝你測試順利！**

---

**文件生成時間**: 2026-02-19 13:24 GMT+8  
**版本**: v1.0  
**狀態**: ✅ 準備完成  
