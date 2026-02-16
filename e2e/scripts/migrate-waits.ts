#!/usr/bin/env ts-node

/**
 * E2E 測試等待優化遷移腳本
 * 
 * 此腳本掃描測試文件，識別可優化的 waitForTimeout 使用，
 * 並提供建議的替代方案。
 * 
 * 使用方式:
 *   npx ts-node e2e/scripts/migrate-waits.ts [--fix] [--file=path/to/file.spec.ts]
 */

import * as fs from 'fs';
import * as path from 'path';

interface WaitPattern {
  pattern: RegExp;
  description: string;
  suggestion: string;
  severity: 'high' | 'medium' | 'low';
  autoFix?: (match: RegExpMatchArray, context: string) => string | null;
}

// 定義常見的等待模式和建議
const WAIT_PATTERNS: WaitPattern[] = [
  {
    pattern: /await\s+page\.waitForTimeout\((\d+)\);\s*\/\/.*(?:API|api|請求)/,
    description: '等待 API 回應',
    suggestion: 'await smartWaitForAPI(page, { urlPattern: "/api/..." })',
    severity: 'high',
    autoFix: (match, context) => {
      // 嘗試從上下文中找到 API 端點
      const apiMatch = context.match(/['"`]\/api\/[^'"`]+['"`]/);
      if (apiMatch) {
        return `await smartWaitForAPI(page, { urlPattern: ${apiMatch[0]} })`;
      }
      return null;
    },
  },
  {
    pattern: /await\s+page\.waitForTimeout\((\d+)\);\s*\/\/.*(?:動畫|animation|transition)/,
    description: '等待動畫完成',
    suggestion: 'await smartWaitForAnimation(page, selector)',
    severity: 'high',
  },
  {
    pattern: /await\s+page\.waitForTimeout\((\d+)\);\s*\/\/.*(?:導航|navigation|路由|route)/,
    description: '等待路由導航',
    suggestion: 'await smartWaitForNavigation(page, urlPattern)',
    severity: 'high',
  },
  {
    pattern: /await\s+page\.waitForTimeout\((\d+)\);\s*\/\/.*(?:loading|載入|spinner)/,
    description: '等待載入完成',
    suggestion: 'await waitForElementToDisappear(page, ".spinner")',
    severity: 'high',
  },
  {
    pattern: /await\s+page\.waitForTimeout\((\d+)\);\s*\/\/.*(?:modal|彈窗|對話框|dialog)/,
    description: '等待模態框',
    suggestion: 'await smartWaitForModal(page, { state: "open" })',
    severity: 'medium',
  },
  {
    pattern: /await\s+page\.waitForTimeout\((\d+)\);\s*\/\/.*(?:表單|form|submit)/,
    description: '等待表單提交',
    suggestion: 'await smartWaitForFormSubmit(page, { apiPattern: "..." })',
    severity: 'high',
  },
  {
    pattern: /await\s+page\.waitForTimeout\(5000|4000|3000\)/,
    description: '長時間固定等待 (>= 3s)',
    suggestion: '考慮使用智能等待替代',
    severity: 'high',
  },
  {
    pattern: /await\s+page\.waitForTimeout\(2000|1500|1000\)/,
    description: '中等時間固定等待 (1-2s)',
    suggestion: '考慮使用智能等待替代',
    severity: 'medium',
  },
  {
    pattern: /await\s+page\.waitForTimeout\((?:[1-9]\d{2}|[1-4]\d{2}|[1-9]\d?)\)/,
    description: '短時間固定等待 (< 1s)',
    suggestion: '可能需要保留或使用 smartWaitForAnimation',
    severity: 'low',
  },
];

interface Finding {
  file: string;
  line: number;
  code: string;
  timeout: number;
  description: string;
  suggestion: string;
  severity: 'high' | 'medium' | 'low';
  context: string;
  autoFixable: boolean;
}

function scanFile(filePath: string): Finding[] {
  const findings: Finding[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const waitForTimeoutMatch = line.match(/await\s+\w+\.waitForTimeout\((\d+)\)/);
    
    if (waitForTimeoutMatch) {
      const timeout = parseInt(waitForTimeoutMatch[1], 10);
      const lineNumber = index + 1;
      
      // 獲取上下文（前後 3 行）
      const contextStart = Math.max(0, index - 3);
      const contextEnd = Math.min(lines.length, index + 4);
      const context = lines.slice(contextStart, contextEnd).join('\n');

      // 嘗試匹配已知模式
      let matched = false;
      for (const pattern of WAIT_PATTERNS) {
        if (pattern.pattern.test(line) || pattern.pattern.test(context)) {
          findings.push({
            file: filePath,
            line: lineNumber,
            code: line.trim(),
            timeout,
            description: pattern.description,
            suggestion: pattern.suggestion,
            severity: pattern.severity,
            context,
            autoFixable: !!pattern.autoFix,
          });
          matched = true;
          break;
        }
      }

      // 如果沒有匹配到特定模式，使用通用分類
      if (!matched) {
        let severity: 'high' | 'medium' | 'low' = 'medium';
        let description = '固定時間等待';
        let suggestion = '使用智能等待替代';

        if (timeout >= 3000) {
          severity = 'high';
          description = '長時間固定等待';
          suggestion = 'await smartWaitForNetworkIdle(page) 或其他智能等待';
        } else if (timeout < 500) {
          severity = 'low';
          description = '短時間固定等待（可能必要）';
          suggestion = '檢查是否可用 smartWaitForAnimation';
        }

        findings.push({
          file: filePath,
          line: lineNumber,
          code: line.trim(),
          timeout,
          description,
          suggestion,
          severity,
          context,
          autoFixable: false,
        });
      }
    }
  });

  return findings;
}

function scanDirectory(dirPath: string): Finding[] {
  let findings: Finding[] = [];

  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 跳過 node_modules 和隱藏目錄
      if (!item.startsWith('.') && item !== 'node_modules') {
        findings = findings.concat(scanDirectory(fullPath));
      }
    } else if (item.endsWith('.spec.ts') || item.endsWith('.page.ts')) {
      findings = findings.concat(scanFile(fullPath));
    }
  }

  return findings;
}

function generateReport(findings: Finding[]): string {
  const highPriority = findings.filter((f) => f.severity === 'high');
  const mediumPriority = findings.filter((f) => f.severity === 'medium');
  const lowPriority = findings.filter((f) => f.severity === 'low');

  const report: string[] = [];

  report.push('# E2E 測試等待優化報告\n');
  report.push(`生成時間: ${new Date().toISOString()}\n`);
  report.push('## 摘要\n');
  report.push(`- **總計**: ${findings.length} 處 waitForTimeout`);
  report.push(`- **高優先級**: ${highPriority.length} 處`);
  report.push(`- **中優先級**: ${mediumPriority.length} 處`);
  report.push(`- **低優先級**: ${lowPriority.length} 處`);
  report.push(`- **可自動修復**: ${findings.filter((f) => f.autoFixable).length} 處\n`);

  // 統計每個文件的問題數量
  const fileStats = new Map<string, number>();
  findings.forEach((f) => {
    const count = fileStats.get(f.file) || 0;
    fileStats.set(f.file, count + 1);
  });

  report.push('## 影響最大的文件\n');
  const sortedFiles = Array.from(fileStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  sortedFiles.forEach(([file, count]) => {
    const relativePath = path.relative(process.cwd(), file);
    report.push(`- ${relativePath}: ${count} 處`);
  });

  report.push('\n## 高優先級問題 (需要立即處理)\n');
  highPriority.forEach((finding) => {
    const relativePath = path.relative(process.cwd(), finding.file);
    report.push(`### ${relativePath}:${finding.line}`);
    report.push(`**問題**: ${finding.description}`);
    report.push(`**當前代碼**: \`${finding.code}\``);
    report.push(`**建議**: ${finding.suggestion}`);
    report.push('```typescript');
    report.push(finding.context);
    report.push('```\n');
  });

  report.push('\n## 中優先級問題\n');
  mediumPriority.slice(0, 20).forEach((finding) => {
    const relativePath = path.relative(process.cwd(), finding.file);
    report.push(`- ${relativePath}:${finding.line} - ${finding.description} (${finding.timeout}ms)`);
  });

  if (mediumPriority.length > 20) {
    report.push(`\n... 還有 ${mediumPriority.length - 20} 處中優先級問題\n`);
  }

  report.push('\n## 低優先級問題（可選優化）\n');
  report.push(`共 ${lowPriority.length} 處短時間等待，部分可能是必要的。\n`);

  return report.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const fileArg = args.find((arg) => arg.startsWith('--file='));
  const targetFile = fileArg ? fileArg.split('=')[1] : null;

  console.log('🔍 掃描 E2E 測試中的 waitForTimeout 使用...\n');

  let findings: Finding[];

  if (targetFile) {
    console.log(`📁 掃描文件: ${targetFile}`);
    findings = scanFile(targetFile);
  } else {
    const e2eDir = path.join(process.cwd(), 'e2e');
    console.log(`📁 掃描目錄: ${e2eDir}`);
    findings = scanDirectory(e2eDir);
  }

  console.log(`✅ 掃描完成！找到 ${findings.length} 處 waitForTimeout\n`);

  // 生成報告
  const report = generateReport(findings);

  // 寫入報告文件
  const reportPath = path.join(process.cwd(), 'e2e-wait-optimization-report.md');
  fs.writeFileSync(reportPath, report);

  console.log(`📄 報告已生成: ${reportPath}`);

  // 顯示摘要
  const highPriority = findings.filter((f) => f.severity === 'high').length;
  const mediumPriority = findings.filter((f) => f.severity === 'medium').length;
  const lowPriority = findings.filter((f) => f.severity === 'low').length;

  console.log('\n📊 優化摘要:');
  console.log(`   高優先級: ${highPriority} 處`);
  console.log(`   中優先級: ${mediumPriority} 處`);
  console.log(`   低優先級: ${lowPriority} 處`);

  if (shouldFix) {
    console.log('\n⚠️  自動修復功能尚未實作，請手動根據報告進行優化。');
  } else {
    console.log('\n💡 提示: 使用 --fix 參數可嘗試自動修復部分問題（開發中）');
  }

  console.log('\n📚 參考文檔: docs/qa/test-optimization.md');
}

main();
