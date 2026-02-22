import type { Metadata } from 'next';
import { fetchPageContent } from '../fetch-page';
import { DynamicContent } from '../dynamic-content';

export const metadata: Metadata = {
  title: 'Cookie 政策 | Suggar Daddy',
  description: 'Suggar Daddy Cookie 政策，了解我們如何使用 Cookie 及類似技術。',
};

export default async function CookiePolicyPage() {
  const dynamicPage = await fetchPageContent('cookie-policy');
  if (dynamicPage) {
    return <DynamicContent content={dynamicPage.content} />;
  }
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-2xl font-bold text-gray-900">Cookie 政策</h1>
      <p className="text-sm text-gray-500">最後更新日期：2026 年 2 月 1 日</p>

      <p>
        本 Cookie 政策說明 Suggar Daddy（以下簡稱「本平台」）如何使用 Cookie 和類似技術。
        使用本平台即代表您同意我們按照本政策使用 Cookie。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">1. 什麼是 Cookie？</h2>
      <p>
        Cookie 是網站存放在您的瀏覽器或裝置上的小型文字檔案。
        它們被廣泛用於使網站運作、提升效率，以及向網站擁有者提供資訊。
        Cookie 本身不包含可識別個人身份的資訊，但我們儲存的個人資訊可能會與 Cookie 中的資訊相關聯。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">2. 我們使用的 Cookie 類型</h2>

      <div className="not-prose my-4 space-y-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">必要</span>
            <h3 className="font-medium text-gray-900">必要性 Cookie</h3>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            這些 Cookie 是網站正常運作所必需的，無法在我們的系統中關閉。它們通常僅在您做出相當於服務請求的操作時設定，
            例如設定隱私偏好、登入或填寫表單。
          </p>
          <div className="mt-3 text-xs text-gray-500">
            <p><strong>範例：</strong>登入驗證 Token、CSRF 保護、語言偏好</p>
            <p><strong>有效期：</strong>工作階段或最長 30 天</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">功能</span>
            <h3 className="font-medium text-gray-900">功能性 Cookie</h3>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            這些 Cookie 使網站能夠提供增強的功能和個人化設定。它們可能由我們設定，或由我們添加到頁面的第三方提供者設定。
          </p>
          <div className="mt-3 text-xs text-gray-500">
            <p><strong>範例：</strong>介面偏好設定、最近瀏覽記錄、通知狀態</p>
            <p><strong>有效期：</strong>最長 1 年</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">分析</span>
            <h3 className="font-medium text-gray-900">分析性 Cookie</h3>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            這些 Cookie 讓我們能夠計算訪問量和流量來源，以便衡量和改善網站的效能。
            它們幫助我們了解哪些頁面最受歡迎和最不受歡迎，以及訪客在網站上的導航方式。
          </p>
          <div className="mt-3 text-xs text-gray-500">
            <p><strong>範例：</strong>Google Analytics、頁面瀏覽統計、功能使用追蹤</p>
            <p><strong>有效期：</strong>最長 2 年</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">廣告</span>
            <h3 className="font-medium text-gray-900">廣告性 Cookie</h3>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            這些 Cookie 可能由我們的廣告合作夥伴透過我們的網站設定。
            這些公司可能會使用它們來建立您的興趣檔案，並在其他網站上向您展示相關的廣告。
          </p>
          <div className="mt-3 text-xs text-gray-500">
            <p><strong>範例：</strong>Facebook Pixel、Google Ads 轉換追蹤</p>
            <p><strong>有效期：</strong>最長 2 年</p>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">3. 第三方 Cookie</h2>
      <p>
        我們的某些頁面可能會設定第三方 Cookie。我們無法控制這些 Cookie 的傳播和使用。
        以下是可能在本平台上設定 Cookie 的第三方服務：
      </p>
      <ul>
        <li><strong>Stripe</strong> — 付款處理（僅在付款相關頁面）</li>
        <li><strong>Google Analytics</strong> — 網站分析</li>
        <li><strong>Firebase</strong> — 推播通知服務</li>
      </ul>
      <p>
        建議您查閱這些第三方的隱私權政策，以了解他們如何使用 Cookie。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">4. 如何管理 Cookie</h2>
      <p>
        大多數瀏覽器允許您透過設定來控制 Cookie。您可以：
      </p>
      <ul>
        <li>查看和刪除已存在的 Cookie</li>
        <li>封鎖所有 Cookie 或僅限第三方 Cookie</li>
        <li>設定當 Cookie 被設定時通知您</li>
        <li>在關閉瀏覽器時自動清除所有 Cookie</li>
      </ul>
      <p>
        <strong>注意：</strong>停用某些 Cookie 可能影響本平台的功能。
        特別是必要性 Cookie 被停用時，某些核心功能（如登入）可能無法正常運作。
      </p>

      <h3 className="text-base font-medium text-gray-800">常見瀏覽器的 Cookie 設定</h3>
      <ul>
        <li>Chrome：設定 → 隱私權和安全性 → Cookie 和其他網站資料</li>
        <li>Firefox：設定 → 隱私權與安全性 → Cookie 和網站資料</li>
        <li>Safari：偏好設定 → 隱私權 → Cookie 和網站資料</li>
        <li>Edge：設定 → Cookie 和網站權限 → 管理和刪除 Cookie 和網站資料</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">5. 其他追蹤技術</h2>
      <p>除了 Cookie 外，我們也可能使用以下技術：</p>
      <ul>
        <li><strong>Local Storage</strong> — 在您的瀏覽器中儲存偏好設定和快取資料</li>
        <li><strong>Session Storage</strong> — 在您的瀏覽階段中暫時儲存資料</li>
      </ul>
      <p>
        這些技術的管理方式與 Cookie 類似，可透過瀏覽器設定來控制。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">6. 政策更新</h2>
      <p>
        我們可能會不定期更新本 Cookie 政策以反映技術或法規的變化。
        更新後的政策將在本頁面公布，建議您定期查閱。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">7. 聯絡我們</h2>
      <p>
        如果您對本 Cookie 政策有任何疑問，請透過
        <a href="/contact" className="text-brand-600 hover:underline">聯絡我們</a>頁面與我們聯繫。
      </p>
    </article>
  );
}
