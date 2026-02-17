# 📊 數據查詢範例集

**版本**: 1.0.0  
**更新日期**: 2025-01-XX  
**用途**: 提供常用的 SQL 和 PromQL 查詢範例

---

## 目錄

1. [PostgreSQL 查詢範例](#postgresql-查詢範例)
2. [PromQL 查詢範例](#promql-查詢範例)
3. [Grafana 整合查詢](#grafana-整合查詢)
4. [效能優化技巧](#效能優化技巧)

---

## PostgreSQL 查詢範例

### 📊 用戶指標

#### 1. 每日註冊用戶數

```sql
-- 基本查詢：最近 30 天
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 進階：包含用戶類型分組
SELECT 
  DATE(created_at) as date,
  role,
  COUNT(*) as count
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), role
ORDER BY date DESC, role;

-- 週度聚合
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as new_users,
  COUNT(*) FILTER (WHERE role = 'creator') as new_creators,
  COUNT(*) FILTER (WHERE role = 'subscriber') as new_subscribers
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY week
ORDER BY week DESC;
```

#### 2. 活躍用戶數 (DAU/MAU)

```sql
-- DAU (Daily Active Users) - 基於登入記錄
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as dau
FROM audit_logs
WHERE 
  created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND action IN ('login', 'api_request', 'view_content')
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- MAU (Monthly Active Users)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(DISTINCT user_id) as mau
FROM audit_logs
WHERE 
  created_at >= CURRENT_DATE - INTERVAL '12 months'
  AND action IN ('login', 'api_request', 'view_content')
GROUP BY month
ORDER BY month DESC;

-- DAU/MAU Ratio (Stickiness)
WITH daily AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as dau
  FROM audit_logs
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
),
monthly AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(DISTINCT user_id) as mau
  FROM audit_logs
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY month
)
SELECT 
  d.date,
  d.dau,
  m.mau,
  ROUND((d.dau::float / NULLIF(m.mau, 0)) * 100, 2) as stickiness_ratio
FROM daily d
CROSS JOIN monthly m
WHERE DATE_TRUNC('month', d.date) = m.month
ORDER BY d.date DESC;
```

#### 3. 用戶留存分析

```sql
-- Cohort 留存分析（Day 1, 7, 30）
WITH cohorts AS (
  SELECT 
    id as user_id,
    DATE(created_at) as cohort_date
  FROM users
  WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
),
activities AS (
  SELECT 
    user_id,
    DATE(created_at) as activity_date
  FROM audit_logs
  WHERE 
    created_at >= CURRENT_DATE - INTERVAL '60 days'
    AND action IN ('login', 'view_content', 'post_like', 'send_message')
  GROUP BY user_id, DATE(created_at)
)
SELECT 
  c.cohort_date,
  COUNT(DISTINCT c.user_id) as cohort_size,
  
  -- Day 1 留存
  COUNT(DISTINCT CASE 
    WHEN a.activity_date = c.cohort_date + 1 
    THEN c.user_id 
  END) as day_1_retained,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN a.activity_date = c.cohort_date + 1 
      THEN c.user_id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT c.user_id), 0), 
    2
  ) as day_1_retention_rate,
  
  -- Day 7 留存
  COUNT(DISTINCT CASE 
    WHEN a.activity_date = c.cohort_date + 7 
    THEN c.user_id 
  END) as day_7_retained,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN a.activity_date = c.cohort_date + 7 
      THEN c.user_id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT c.user_id), 0), 
    2
  ) as day_7_retention_rate,
  
  -- Day 30 留存
  COUNT(DISTINCT CASE 
    WHEN a.activity_date = c.cohort_date + 30 
    THEN c.user_id 
  END) as day_30_retained,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN a.activity_date = c.cohort_date + 30 
      THEN c.user_id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT c.user_id), 0), 
    2
  ) as day_30_retention_rate

FROM cohorts c
LEFT JOIN activities a ON c.user_id = a.user_id
GROUP BY c.cohort_date
HAVING c.cohort_date <= CURRENT_DATE - 30  -- 只顯示至少 30 天前的 cohort
ORDER BY c.cohort_date DESC;

-- 簡化版：整體留存率（最近 30 天 cohorts）
WITH cohort_users AS (
  SELECT 
    id,
    DATE(created_at) as join_date
  FROM users
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
  'Day 1' as period,
  COUNT(DISTINCT cu.id) as cohort_size,
  COUNT(DISTINCT CASE 
    WHEN EXISTS (
      SELECT 1 FROM audit_logs al
      WHERE al.user_id = cu.id
        AND DATE(al.created_at) = cu.join_date + 1
    )
    THEN cu.id 
  END) as retained,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN EXISTS (
        SELECT 1 FROM audit_logs al
        WHERE al.user_id = cu.id
          AND DATE(al.created_at) = cu.join_date + 1
      )
      THEN cu.id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT cu.id), 0),
    2
  ) as retention_rate
FROM cohort_users cu
WHERE cu.join_date <= CURRENT_DATE - 1

UNION ALL

SELECT 
  'Day 7' as period,
  COUNT(DISTINCT cu.id) as cohort_size,
  COUNT(DISTINCT CASE 
    WHEN EXISTS (
      SELECT 1 FROM audit_logs al
      WHERE al.user_id = cu.id
        AND DATE(al.created_at) = cu.join_date + 7
    )
    THEN cu.id 
  END) as retained,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN EXISTS (
        SELECT 1 FROM audit_logs al
        WHERE al.user_id = cu.id
          AND DATE(al.created_at) = cu.join_date + 7
      )
      THEN cu.id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT cu.id), 0),
    2
  ) as retention_rate
FROM cohort_users cu
WHERE cu.join_date <= CURRENT_DATE - 7

UNION ALL

SELECT 
  'Day 30' as period,
  COUNT(DISTINCT cu.id) as cohort_size,
  COUNT(DISTINCT CASE 
    WHEN EXISTS (
      SELECT 1 FROM audit_logs al
      WHERE al.user_id = cu.id
        AND DATE(al.created_at) = cu.join_date + 30
    )
    THEN cu.id 
  END) as retained,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN EXISTS (
        SELECT 1 FROM audit_logs al
        WHERE al.user_id = cu.id
          AND DATE(al.created_at) = cu.join_date + 30
      )
      THEN cu.id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT cu.id), 0),
    2
  ) as retention_rate
FROM cohort_users cu
WHERE cu.join_date <= CURRENT_DATE - 30;
```

---

### 💰 營收指標

#### 4. ARPU / ARPPU

```sql
-- 月度 ARPU 和 ARPPU
WITH monthly_revenue AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(DISTINCT user_id) as paying_users,
    SUM(amount) as total_revenue
  FROM transactions
  WHERE 
    status = 'succeeded'
    AND type IN ('subscription', 'tip', 'ppv_purchase')
    AND created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY month
),
monthly_users AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(DISTINCT id) as total_users
  FROM users
  WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY month
)
SELECT 
  mr.month,
  mr.total_revenue,
  mr.paying_users,
  mu.total_users,
  
  -- ARPU (所有用戶平均營收)
  ROUND(mr.total_revenue / NULLIF(mu.total_users, 0), 2) as arpu,
  
  -- ARPPU (付費用戶平均營收)
  ROUND(mr.total_revenue / NULLIF(mr.paying_users, 0), 2) as arppu,
  
  -- 付費率
  ROUND(mr.paying_users * 100.0 / NULLIF(mu.total_users, 0), 2) as paying_rate

FROM monthly_revenue mr
LEFT JOIN monthly_users mu ON mr.month = mu.month
ORDER BY mr.month DESC;

-- 累積 ARPU（從用戶註冊開始計算）
SELECT 
  u.id,
  u.email,
  u.created_at as joined_at,
  COALESCE(SUM(t.amount), 0) as lifetime_value,
  EXTRACT(DAY FROM NOW() - u.created_at) as days_since_joined,
  ROUND(
    COALESCE(SUM(t.amount), 0) / NULLIF(EXTRACT(DAY FROM NOW() - u.created_at), 0),
    2
  ) as daily_arpu
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'succeeded'
WHERE u.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY u.id, u.email, u.created_at
ORDER BY lifetime_value DESC
LIMIT 100;
```

#### 5. MRR (Monthly Recurring Revenue)

```sql
-- 當前 MRR（活躍訂閱）
WITH active_subscriptions AS (
  SELECT 
    s.id,
    s.subscriber_id,
    s.creator_id,
    st.monthly_price,
    st.name as tier_name
  FROM subscriptions s
  JOIN subscription_tiers st ON s.tier_id = st.id
  WHERE s.status = 'active'
)
SELECT 
  COUNT(*) as active_subscriptions,
  SUM(monthly_price) as current_mrr,
  AVG(monthly_price) as avg_subscription_price,
  
  -- 按 Tier 分組
  COUNT(*) FILTER (WHERE tier_name = 'Basic') as basic_subs,
  COUNT(*) FILTER (WHERE tier_name = 'Premium') as premium_subs,
  COUNT(*) FILTER (WHERE tier_name = 'VIP') as vip_subs,
  
  SUM(monthly_price) FILTER (WHERE tier_name = 'Basic') as basic_mrr,
  SUM(monthly_price) FILTER (WHERE tier_name = 'Premium') as premium_mrr,
  SUM(monthly_price) FILTER (WHERE tier_name = 'VIP') as vip_mrr

FROM active_subscriptions;

-- MRR 趨勢（每月快照）
SELECT 
  DATE_TRUNC('month', s.created_at) as month,
  COUNT(*) as new_subscriptions,
  COUNT(*) FILTER (WHERE s.cancelled_at IS NOT NULL) as cancelled_subscriptions,
  SUM(st.monthly_price) as new_mrr,
  
  -- 累積 MRR（需要歷史數據）
  (
    SELECT SUM(st2.monthly_price)
    FROM subscriptions s2
    JOIN subscription_tiers st2 ON s2.tier_id = st2.id
    WHERE s2.status = 'active'
      AND s2.created_at <= DATE_TRUNC('month', s.created_at) + INTERVAL '1 month'
  ) as total_mrr_end_of_month

FROM subscriptions s
JOIN subscription_tiers st ON s.tier_id = st.id
WHERE s.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY month
ORDER BY month DESC;
```

#### 6. 訂閱轉化率

```sql
-- 註冊到訂閱的轉化（7 天視窗）
WITH user_cohorts AS (
  SELECT 
    id as user_id,
    email,
    role,
    DATE(created_at) as registration_date
  FROM users
  WHERE 
    created_at >= CURRENT_DATE - INTERVAL '60 days'
    AND role = 'subscriber'  -- 只看訂閱者角色
),
first_subscriptions AS (
  SELECT 
    subscriber_id,
    MIN(created_at) as first_subscription_date
  FROM subscriptions
  WHERE status IN ('active', 'cancelled')
  GROUP BY subscriber_id
)
SELECT 
  uc.registration_date,
  COUNT(DISTINCT uc.user_id) as registered_users,
  COUNT(DISTINCT fs.subscriber_id) as subscribed_users,
  
  -- 轉化率（7 天內訂閱）
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN fs.first_subscription_date <= uc.registration_date + INTERVAL '7 days'
      THEN fs.subscriber_id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT uc.user_id), 0),
    2
  ) as conversion_rate_7d,
  
  -- 轉化率（14 天內訂閱）
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN fs.first_subscription_date <= uc.registration_date + INTERVAL '14 days'
      THEN fs.subscriber_id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT uc.user_id), 0),
    2
  ) as conversion_rate_14d,
  
  -- 轉化率（30 天內訂閱）
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN fs.first_subscription_date <= uc.registration_date + INTERVAL '30 days'
      THEN fs.subscriber_id 
    END) * 100.0 / NULLIF(COUNT(DISTINCT uc.user_id), 0),
    2
  ) as conversion_rate_30d

FROM user_cohorts uc
LEFT JOIN first_subscriptions fs ON uc.user_id = fs.subscriber_id
GROUP BY uc.registration_date
HAVING uc.registration_date <= CURRENT_DATE - 7  -- 至少 7 天前的 cohort
ORDER BY uc.registration_date DESC;

-- 整體訂閱轉化率（最近 30 天註冊用戶）
SELECT 
  COUNT(DISTINCT u.id) as total_registered,
  COUNT(DISTINCT s.subscriber_id) as total_subscribed,
  ROUND(
    COUNT(DISTINCT s.subscriber_id) * 100.0 / NULLIF(COUNT(DISTINCT u.id), 0),
    2
  ) as overall_conversion_rate
FROM users u
LEFT JOIN subscriptions s 
  ON u.id = s.subscriber_id 
  AND s.created_at <= u.created_at + INTERVAL '7 days'
WHERE 
  u.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND u.role = 'subscriber';
```

#### 7. Churn Rate (流失率)

```sql
-- 月度 Churn Rate
WITH monthly_active AS (
  SELECT 
    DATE_TRUNC('month', current_period_start) as month,
    COUNT(DISTINCT subscriber_id) as active_subs_start
  FROM subscriptions
  WHERE 
    status = 'active'
    AND current_period_start >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY month
),
monthly_cancelled AS (
  SELECT 
    DATE_TRUNC('month', cancelled_at) as month,
    COUNT(DISTINCT subscriber_id) as cancelled_subs
  FROM subscriptions
  WHERE 
    cancelled_at IS NOT NULL
    AND cancelled_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY month
)
SELECT 
  ma.month,
  ma.active_subs_start,
  COALESCE(mc.cancelled_subs, 0) as cancelled_subs,
  ROUND(
    COALESCE(mc.cancelled_subs, 0) * 100.0 / NULLIF(ma.active_subs_start, 0),
    2
  ) as churn_rate
FROM monthly_active ma
LEFT JOIN monthly_cancelled mc ON ma.month = mc.month
ORDER BY ma.month DESC;

-- 用戶級別 Churn 風險評分
WITH user_engagement AS (
  SELECT 
    u.id,
    u.email,
    s.status as subscription_status,
    s.current_period_end,
    COUNT(al.id) as activity_count_7d,
    MAX(al.created_at) as last_activity_date
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.subscriber_id AND s.status = 'active'
  LEFT JOIN audit_logs al 
    ON u.id = al.user_id 
    AND al.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY u.id, u.email, s.status, s.current_period_end
)
SELECT 
  id,
  email,
  subscription_status,
  current_period_end,
  activity_count_7d,
  last_activity_date,
  EXTRACT(DAY FROM NOW() - last_activity_date) as days_since_last_activity,
  
  -- Churn 風險評分（0-100）
  CASE 
    WHEN activity_count_7d = 0 THEN 90
    WHEN activity_count_7d < 3 THEN 70
    WHEN activity_count_7d < 10 THEN 40
    ELSE 10
  END as churn_risk_score,
  
  -- 風險等級
  CASE 
    WHEN activity_count_7d = 0 THEN '高風險'
    WHEN activity_count_7d < 3 THEN '中風險'
    WHEN activity_count_7d < 10 THEN '低風險'
    ELSE '健康'
  END as risk_level

FROM user_engagement
WHERE subscription_status = 'active'
ORDER BY churn_risk_score DESC, current_period_end ASC
LIMIT 100;
```

---

### 📝 內容指標

#### 8. 內容發布統計

```sql
-- 每日內容發布量
SELECT 
  DATE(created_at) as date,
  content_type,
  COUNT(*) as post_count,
  COUNT(DISTINCT creator_id) as active_creators
FROM posts
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), content_type
ORDER BY date DESC, content_type;

-- 內容互動統計
SELECT 
  p.id,
  p.caption,
  p.content_type,
  p.created_at,
  u.display_name as creator_name,
  p.like_count,
  p.comment_count,
  COUNT(DISTINCT pp.user_id) as purchase_count,
  COALESCE(SUM(pp.amount), 0) as total_revenue
FROM posts p
JOIN users u ON p.creator_id = u.id
LEFT JOIN post_purchases pp ON p.id = pp.post_id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.id, p.caption, p.content_type, p.created_at, u.display_name, p.like_count, p.comment_count
ORDER BY (p.like_count + p.comment_count * 2) DESC
LIMIT 50;

-- 創作者排行榜（按互動量）
SELECT 
  u.id,
  u.display_name,
  COUNT(p.id) as total_posts,
  SUM(p.like_count) as total_likes,
  SUM(p.comment_count) as total_comments,
  SUM(p.like_count + p.comment_count) as engagement_score
FROM users u
JOIN posts p ON u.id = p.creator_id
WHERE 
  p.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND u.role = 'creator'
GROUP BY u.id, u.display_name
ORDER BY engagement_score DESC
LIMIT 20;
```

---

### 💳 交易與支付

#### 9. 交易統計

```sql
-- 今日交易概覽
SELECT 
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE status = 'succeeded') as successful_transactions,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
  
  SUM(amount) as total_amount,
  SUM(amount) FILTER (WHERE status = 'succeeded') as successful_amount,
  
  ROUND(
    COUNT(*) FILTER (WHERE status = 'succeeded') * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as success_rate,
  
  AVG(amount) as avg_transaction_amount,
  MAX(amount) as max_transaction_amount

FROM transactions
WHERE created_at >= CURRENT_DATE;

-- 按類型分組的交易
SELECT 
  type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'succeeded') * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as success_rate
FROM transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY type
ORDER BY total_amount DESC;

-- 每小時交易趨勢（最近 24 小時）
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as transaction_count,
  SUM(amount) as hourly_revenue,
  ROUND(AVG(amount), 2) as avg_amount
FROM transactions
WHERE 
  created_at >= NOW() - INTERVAL '24 hours'
  AND status = 'succeeded'
GROUP BY hour
ORDER BY hour DESC;
```

#### 10. 支付失敗分析

```sql
-- 失敗交易分析
SELECT 
  DATE(created_at) as date,
  status,
  COUNT(*) as count,
  SUM(amount) as lost_revenue,
  
  -- 失敗原因（如果有 metadata）
  metadata->>'error_code' as error_code,
  metadata->>'error_message' as error_message

FROM transactions
WHERE 
  status = 'failed'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date, status, metadata->>'error_code', metadata->>'error_message'
ORDER BY date DESC, count DESC;

-- 高風險用戶（多次支付失敗）
SELECT 
  user_id,
  COUNT(*) as failed_attempts,
  SUM(amount) as attempted_amount,
  MAX(created_at) as last_failed_attempt,
  
  -- 最後一次失敗原因
  (
    SELECT metadata->>'error_code'
    FROM transactions t2
    WHERE t2.user_id = t.user_id AND t2.status = 'failed'
    ORDER BY t2.created_at DESC
    LIMIT 1
  ) as last_error_code

FROM transactions t
WHERE 
  status = 'failed'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id
HAVING COUNT(*) >= 3
ORDER BY failed_attempts DESC
LIMIT 50;
```

---

### 🔍 配對與互動

#### 11. 配對統計

```sql
-- 每日配對活動
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_swipes,
  COUNT(*) FILTER (WHERE direction = 'right') as right_swipes,
  COUNT(*) FILTER (WHERE direction = 'left') as left_swipes,
  
  ROUND(
    COUNT(*) FILTER (WHERE direction = 'right') * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as right_swipe_rate

FROM swipes
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 配對成功率
WITH mutual_swipes AS (
  SELECT 
    s1.user_id as user_1,
    s1.target_user_id as user_2,
    s1.created_at as swipe_1_time,
    s2.created_at as swipe_2_time
  FROM swipes s1
  JOIN swipes s2 
    ON s1.user_id = s2.target_user_id 
    AND s1.target_user_id = s2.user_id
  WHERE 
    s1.direction = 'right' 
    AND s2.direction = 'right'
    AND s1.created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
  DATE(swipe_1_time) as date,
  COUNT(*) as matches,
  (
    SELECT COUNT(*)
    FROM swipes
    WHERE 
      DATE(created_at) = DATE(ms.swipe_1_time)
      AND direction = 'right'
  ) as total_right_swipes,
  
  ROUND(
    COUNT(*) * 100.0 / NULLIF(
      (SELECT COUNT(*) FROM swipes WHERE DATE(created_at) = DATE(ms.swipe_1_time) AND direction = 'right'),
      0
    ),
    2
  ) as match_rate

FROM mutual_swipes ms
GROUP BY DATE(swipe_1_time)
ORDER BY date DESC;
```

#### 12. 訊息統計

```sql
-- 訊息活動概覽（需要 messages 表）
-- 注意：根據實際 schema 調整

-- 假設有 messages 表
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_messages,
  COUNT(DISTINCT sender_id) as active_senders,
  COUNT(DISTINCT receiver_id) as active_receivers,
  AVG(LENGTH(content)) as avg_message_length
FROM messages
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 對話活躍度（每個對話的訊息數）
SELECT 
  conversation_id,
  COUNT(*) as message_count,
  COUNT(DISTINCT sender_id) as participants,
  MIN(created_at) as first_message_time,
  MAX(created_at) as last_message_time,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as conversation_duration_minutes
FROM messages
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY conversation_id
ORDER BY message_count DESC
LIMIT 100;
```

---

## PromQL 查詢範例

### 🚀 系統性能指標

#### 13. CPU 使用率

```promql
# 各服務 CPU 使用率
rate(process_cpu_seconds_total[5m]) * 100

# 按服務分組
sum by (service) (rate(process_cpu_seconds_total[5m])) * 100

# 容器 CPU 使用率
rate(container_cpu_usage_seconds_total{name=~"suggar-daddy-.*"}[5m]) * 100
```

#### 14. 記憶體使用率

```promql
# 進程記憶體使用（MB）
process_resident_memory_bytes / 1024 / 1024

# 記憶體使用率（%）
(process_resident_memory_bytes / node_memory_MemTotal_bytes) * 100

# 容器記憶體使用率
(container_memory_usage_bytes / container_spec_memory_limit_bytes) * 100
```

#### 15. HTTP 請求指標

```promql
# 每秒請求數（RPS）
sum(rate(http_requests_total[1m]))

# 按服務分組的 RPS
sum by (service) (rate(http_requests_total[1m]))

# 按 HTTP 狀態碼分組
sum by (status) (rate(http_requests_total[1m]))

# 2xx 成功請求
sum(rate(http_requests_total{status=~"2.."}[1m]))

# 4xx 客戶端錯誤
sum(rate(http_requests_total{status=~"4.."}[1m]))

# 5xx 伺服器錯誤
sum(rate(http_requests_total{status=~"5.."}[1m]))
```

#### 16. 錯誤率

```promql
# 整體錯誤率（%）
(
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100

# 按服務分組的錯誤率
(
  sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum by (service) (rate(http_requests_total[5m]))
) * 100

# 4xx + 5xx 錯誤率
(
  sum(rate(http_requests_total{status=~"[45].."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100
```

#### 17. 回應時間（Latency）

```promql
# P50 延遲（中位數）
histogram_quantile(0.50, 
  rate(http_request_duration_seconds_bucket[5m])
)

# P95 延遲
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m])
)

# P99 延遲
histogram_quantile(0.99, 
  rate(http_request_duration_seconds_bucket[5m])
)

# 平均延遲
rate(http_request_duration_seconds_sum[5m])
/
rate(http_request_duration_seconds_count[5m])

# 按服務分組的 P95 延遲
histogram_quantile(0.95,
  sum by (service, le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

---

### 📊 可用性指標

#### 18. 服務可用性

```promql
# 服務是否 UP（1 = UP, 0 = DOWN）
up{job=~".*-service"}

# 可用服務數量
count(up{job=~".*-service"} == 1)

# 可用性百分比（最近 24h）
(
  1 - (
    sum(rate(http_requests_total{status=~"5.."}[24h]))
    /
    sum(rate(http_requests_total[24h]))
  )
) * 100

# SLO 合規率（P95 < 500ms）
(
  count(
    histogram_quantile(0.95, 
      rate(http_request_duration_seconds_bucket[5m])
    ) < 0.5
  )
  /
  count(
    histogram_quantile(0.95, 
      rate(http_request_duration_seconds_bucket[5m])
    )
  )
) * 100
```

---

### 🗄️ 資料庫指標

#### 19. PostgreSQL

```promql
# 連線數
pg_stat_database_numbackends

# 連線使用率（%）
(pg_stat_database_numbackends / pg_settings_max_connections) * 100

# 每秒查詢數
rate(pg_stat_database_xact_commit[1m]) + rate(pg_stat_database_xact_rollback[1m])

# 資料庫大小（MB）
pg_database_size_bytes / 1024 / 1024

# 慢查詢數
rate(pg_stat_statements_calls{query_time > 1}[5m])
```

#### 20. Redis

```promql
# 記憶體使用（MB）
redis_memory_used_bytes / 1024 / 1024

# 記憶體使用率（%）
(redis_memory_used_bytes / redis_memory_max_bytes) * 100

# Key 數量
redis_db_keys

# 快取命中率（%）
(
  rate(redis_keyspace_hits_total[5m])
  /
  (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
) * 100

# 每秒操作數
rate(redis_commands_processed_total[1m])

# 連線數
redis_connected_clients
```

---

### 💼 業務指標（如有 metrics）

#### 21. 用戶活動

```promql
# 當前活躍用戶
active_users_current

# 今日新註冊用戶
increase(user_registrations_total[1d])

# 每小時註冊趨勢
rate(user_registrations_total[1h]) * 3600
```

#### 22. 交易指標

```promql
# 每分鐘交易數
rate(payment_transactions_total[1m]) * 60

# 交易成功率（%）
(
  rate(payment_transactions_total{status="succeeded"}[5m])
  /
  rate(payment_transactions_total[5m])
) * 100

# 每分鐘交易金額（USD）
rate(payment_amount_total[1m]) * 60

# 今日總營收
increase(payment_amount_total{status="succeeded"}[1d])
```

---

## Grafana 整合查詢

### 使用 PostgreSQL 數據源

在 Grafana 中，選擇 PostgreSQL 數據源，使用以下查詢：

#### 範例 1: 時序圖 - 每日註冊用戶

```sql
SELECT 
  created_at AS time,
  COUNT(*) AS value
FROM users
WHERE 
  $__timeFilter(created_at)
GROUP BY time
ORDER BY time
```

**Grafana 變數**:
- `$__timeFilter(column)`: 自動使用 Dashboard 時間範圍過濾

#### 範例 2: 表格 - Top 創作者

```sql
SELECT 
  u.display_name AS "創作者",
  COUNT(p.id) AS "發布數",
  SUM(p.like_count) AS "總讚數",
  SUM(p.comment_count) AS "總評論"
FROM users u
JOIN posts p ON u.id = p.creator_id
WHERE 
  u.role = 'creator'
  AND $__timeFilter(p.created_at)
GROUP BY u.display_name
ORDER BY SUM(p.like_count) DESC
LIMIT 10
```

#### 範例 3: 單一數值 - 今日營收

```sql
SELECT 
  COALESCE(SUM(amount), 0) AS "今日營收"
FROM transactions
WHERE 
  status = 'succeeded'
  AND created_at >= CURRENT_DATE
```

---

### 使用 Prometheus 數據源

#### 範例 4: 變數定義

在 Dashboard Settings → Variables 中定義：

**服務變數**:
```promql
label_values(up, service)
```

**環境變數**:
```promql
label_values(up, environment)
```

#### 範例 5: 使用變數的查詢

```promql
# 使用 $service 變數
rate(http_requests_total{service="$service"}[5m])

# 多選變數
rate(http_requests_total{service=~"$service"}[5m])
```

---

## 效能優化技巧

### SQL 查詢優化

1. **使用索引**
```sql
-- 確保常用查詢字段有索引
CREATE INDEX idx_transactions_user_date ON transactions(user_id, created_at);
CREATE INDEX idx_posts_creator_date ON posts(creator_id, created_at);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action, created_at);
```

2. **避免 SELECT ***
```sql
-- ❌ 不好
SELECT * FROM users;

-- ✅ 好
SELECT id, email, display_name FROM users;
```

3. **使用 LIMIT**
```sql
-- 總是限制結果數量
SELECT * FROM transactions
ORDER BY created_at DESC
LIMIT 1000;
```

4. **使用 CTE 提高可讀性**
```sql
WITH monthly_data AS (
  SELECT ...
),
aggregated AS (
  SELECT ...
)
SELECT * FROM aggregated;
```

5. **避免 N+1 查詢**
```sql
-- ❌ 不好（會產生多次查詢）
-- 在應用層面迴圈查詢

-- ✅ 好（使用 JOIN）
SELECT u.*, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.creator_id
GROUP BY u.id;
```

---

### PromQL 查詢優化

1. **使用適當的時間範圍**
```promql
# ❌ 過長的範圍
rate(http_requests_total[1h])

# ✅ 適當的範圍
rate(http_requests_total[5m])
```

2. **使用 Recording Rules**
```yaml
# prometheus.yml
groups:
  - name: api_performance
    interval: 30s
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))
      
      - record: job:http_errors:rate5m
        expr: sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
```

3. **避免高基數標籤**
```promql
# ❌ 不好（user_id 是高基數）
sum by (user_id) (rate(http_requests_total[5m]))

# ✅ 好（使用較低基數標籤）
sum by (service, method) (rate(http_requests_total[5m]))
```

4. **使用聚合減少數據點**
```promql
# ❌ 不好（太多序列）
http_request_duration_seconds_bucket

# ✅ 好（聚合後再計算）
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m]))
)
```

---

## 相關資源

- **Prometheus Query Examples**: https://prometheus.io/docs/prometheus/latest/querying/examples/
- **PromQL Cheat Sheet**: https://promlabs.com/promql-cheat-sheet/
- **PostgreSQL Performance Tips**: https://www.postgresql.org/docs/current/performance-tips.html
- **Grafana Query Examples**: https://grafana.com/docs/grafana/latest/datasources/

---

**維護者**: Data Analyst Team  
**最後更新**: 2025-01-XX  
**版本**: 1.0.0
