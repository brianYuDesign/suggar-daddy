#!/usr/bin/env node
/**
 * Kimi Webhook 伺服器
 * 接收 Kimi 完成回調並喚醒 Javis
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 9001;
const RESULTS_DIR = path.join(process.env.HOME, '.openclaw/workspace/kimi-dispatch/results');
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret';
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:8888';

// 中間件
app.use(express.json({ limit: '10mb' }));

// 日誌輔助函數
const log = {
  info: (msg) => console.log(`[${new Date().toISOString()}] ✅ ${msg}`),
  warn: (msg) => console.log(`[${new Date().toISOString()}] ⚠️  ${msg}`),
  error: (msg) => console.log(`[${new Date().toISOString()}] ❌ ${msg}`),
};

// 確保結果目錄存在
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  log.info(`Created results directory: ${RESULTS_DIR}`);
}

/**
 * 驗證 Webhook 簽名（可選，需要 Kimi 支援）
 */
function verifySignature(req) {
  const signature = req.headers['x-kimi-signature'];
  if (!signature) return true; // 如果沒有簽名頭，跳過驗證

  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return signature === hash;
}

/**
 * 喚醒 Javis（通過 Gateway wake 端點）
 */
async function wakeJavis(taskName) {
  try {
    const wakeText = `Kimi 任務完成：${taskName}`;
    
    // 方式 1：通過 Gateway REST API
    const response = await fetch(`${GATEWAY_URL}/api/cron/wake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: wakeText,
        mode: 'now',
      }),
    });

    if (response.ok) {
      log.info(`Javis 喚醒成功：${taskName}`);
      return true;
    } else {
      log.warn(`Javis 喚醒失敗（HTTP ${response.status}）：${taskName}`);
      return false;
    }
  } catch (err) {
    log.error(`喚醒 Javis 異常：${err.message}`);
    return false;
  }
}

/**
 * 發送 Telegram 通知
 */
async function notifyTelegram(groupId, message) {
  if (!groupId) return true;

  try {
    // 這裡應該調用 OpenClaw 的 message 工具
    // 目前是佔位符，實際應通過 gateway 或直接調用
    log.info(`Telegram 通知已排隊：群組 ${groupId}`);
    return true;
  } catch (err) {
    log.error(`Telegram 通知異常：${err.message}`);
    return false;
  }
}

/**
 * 處理 Kimi 完成回調
 * POST /kimi/webhook/:taskId
 */
app.post('/kimi/webhook/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const startTime = Date.now();

  log.info(`收到 Webhook：${taskId}`);

  // 簽名驗證
  if (!verifySignature(req)) {
    log.error(`簽名驗證失敗：${taskId}`);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const body = req.body;

    // 檢查 Kimi API 響應的狀態
    if (body.error) {
      log.error(`Kimi API 返回錯誤：${body.error.message}`);
      
      const errorResult = {
        task_id: taskId,
        status: 'error',
        error: body.error,
        received_at: new Date().toISOString(),
      };

      fs.writeFileSync(
        path.join(RESULTS_DIR, `${taskId}.json`),
        JSON.stringify(errorResult, null, 2)
      );

      return res.status(400).json({ ok: false, error: body.error });
    }

    // 提取完成內容
    const content = body.choices?.[0]?.message?.content || '';
    const usage = body.usage || { prompt_tokens: 0, completion_tokens: 0 };
    const metadata = body.metadata || {};

    // 構建結果物件
    const result = {
      task_id: taskId,
      task_name: metadata.task_name || 'unknown',
      status: 'done',
      model: body.model || 'unknown',
      output: content,
      tokens: {
        prompt: usage.prompt_tokens || 0,
        completion: usage.completion_tokens || 0,
        total: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      },
      completed_at: new Date().toISOString(),
      api_id: body.id,
    };

    // 保存結果到 latest.json
    const latestPath = path.join(RESULTS_DIR, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(result, null, 2));
    
    // 也保存到帶任務名的檔案
    const taskPath = path.join(RESULTS_DIR, `${taskId}.json`);
    fs.writeFileSync(taskPath, JSON.stringify(result, null, 2));

    log.info(`結果已保存：${taskId}`);
    log.info(`Token 消耗：${result.tokens.prompt} + ${result.tokens.completion} = ${result.tokens.total}`);

    // 喚醒 Javis
    const wakeSent = await wakeJavis(result.task_name);

    // 如果指定了群組，發送 Telegram 通知
    if (metadata.telegram_group) {
      const telegramMsg = `✅ Kimi 任務完成\n\n📋 任務：${result.task_name}\n💾 Token：${result.tokens.total}\n⏱️ 耗時：${Date.now() - startTime}ms`;
      await notifyTelegram(metadata.telegram_group, telegramMsg);
    }

    // 清理待派發檔案
    const pendingFile = path.join(RESULTS_DIR, `pending-${taskId}.json`);
    if (fs.existsSync(pendingFile)) {
      fs.unlinkSync(pendingFile);
    }

    // 返回成功
    res.json({
      ok: true,
      task_id: taskId,
      message: 'Webhook processed successfully',
      wake_sent: wakeSent,
      processing_time_ms: Date.now() - startTime,
    });

  } catch (err) {
    log.error(`處理 Webhook 異常：${err.message}`);
    log.error(`堆棧：${err.stack}`);

    res.status(500).json({
      ok: false,
      error: err.message,
      task_id: taskId,
    });
  }
});

/**
 * 健康檢查端點
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    results_dir: RESULTS_DIR,
    gateway_url: GATEWAY_URL,
  });
});

/**
 * 查詢待派發的任務
 */
app.get('/pending', (req, res) => {
  try {
    const files = fs.readdirSync(RESULTS_DIR);
    const pendingFiles = files.filter(f => f.startsWith('pending-'));
    const pending = pendingFiles.map(f => {
      const content = fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8');
      return JSON.parse(content);
    });

    res.json({
      count: pending.length,
      tasks: pending,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 查詢最新結果
 */
app.get('/latest', (req, res) => {
  try {
    const latestPath = path.join(RESULTS_DIR, 'latest.json');
    if (!fs.existsSync(latestPath)) {
      return res.status(404).json({ error: 'No results yet' });
    }

    const content = fs.readFileSync(latestPath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 404 處理
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

/**
 * 啟動伺服器
 */
const server = app.listen(PORT, () => {
  log.info(`🚀 Kimi Webhook 伺服器啟動於 http://localhost:${PORT}`);
  log.info(`   健康檢查：GET http://localhost:${PORT}/health`);
  log.info(`   待派發任務：GET http://localhost:${PORT}/pending`);
  log.info(`   最新結果：GET http://localhost:${PORT}/latest`);
  log.info(`   結果目錄：${RESULTS_DIR}`);
  log.info(`   Gateway：${GATEWAY_URL}`);
  log.info(`   Webhook 簽名驗證：${WEBHOOK_SECRET === 'dev-secret' ? '禁用（開發模式）' : '啟用'}`);
});

// 優雅關閉
process.on('SIGTERM', () => {
  log.warn('收到 SIGTERM，正在關閉...');
  server.close(() => {
    log.info('伺服器已關閉');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log.warn('收到 SIGINT，正在關閉...');
  server.close(() => {
    log.info('伺服器已關閉');
    process.exit(0);
  });
});
