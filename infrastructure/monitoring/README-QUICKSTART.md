# 監控告警系統 - 快速開始

本指南幫助您快速啟動和配置監控告警系統。完整文檔請參考 [監控告警配置指南](../../docs/devops/MONITORING_ALERTING_SETUP.md)。

---

## 🚀 快速開始

```bash
# 啟動監控服務
cd infrastructure/monitoring
docker-compose up -d

# 訪問監控面板
# Prometheus: http://localhost:9090
# Alertmanager: http://localhost:9093
# Grafana: http://localhost:3001 (admin/admin123)
```

## 📧 配置告警通知

```bash
# 1. 複製配置範例
cp .env.alerting.example .env.alerting

# 2. 編輯配置（填入 Slack Webhook 和 Email SMTP）
vim .env.alerting

# 3. 啟用生產配置
cd alertmanager
cp alertmanager-production.yml alertmanager.yml

# 4. 重啟服務
docker-compose restart alertmanager

# 5. 測試告警
../../scripts/test-alerts.sh
```

## 🔄 災難恢復

```bash
# 回滾應用
./scripts/rollback.sh --type app --verify

# 回滾資料庫
./scripts/rollback.sh --type database --verify

# 完整回滾
./scripts/rollback.sh --type all --verify
```

## 📚 完整文檔

- [監控告警配置指南](../../docs/devops/MONITORING_ALERTING_SETUP.md) - 12,000+ 字完整指南
- [災難恢復計劃](../../docs/devops/DISASTER_RECOVERY.md) - DR 流程
- [監控告警完成報告](../../docs/devops/MONITORING_ALERTING_REPORT.md) - 完成報告

## ✅ 系統狀態

- ✅ 41 條告警規則（P0: 20, P1: 18, P2: 3）
- ✅ 12 個告警接收者（按團隊和嚴重程度）
- ✅ Email HTML 模板
- ✅ 自動化回滾腳本
- ✅ 完整災難恢復計劃

---

**版本**: 1.0.0 | **更新**: 2026-02-17
