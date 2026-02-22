import type { Metadata } from 'next';
import { fetchPageContent } from '../fetch-page';
import { DynamicContent } from '../dynamic-content';

export const metadata: Metadata = {
  title: '隱私權政策 | Suggar Daddy',
  description: 'Suggar Daddy 隱私權政策，了解我們如何蒐集、使用和保護您的個人資料。',
};

export default async function PrivacyPage() {
  const dynamicPage = await fetchPageContent('privacy');
  if (dynamicPage) {
    return <DynamicContent content={dynamicPage.content} />;
  }
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-2xl font-bold text-gray-900">隱私權政策</h1>
      <p className="text-sm text-gray-500">最後更新日期：2026 年 2 月 1 日</p>

      <p>
        歡迎使用 Suggar Daddy（以下簡稱「本平台」）。我們非常重視您的隱私權，
        本政策旨在說明我們如何蒐集、使用、儲存及保護您的個人資料。使用本平台即代表您同意本隱私權政策的內容。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">1. 資訊蒐集範圍</h2>
      <p>我們可能蒐集以下類型的資訊：</p>
      <h3 className="text-base font-medium text-gray-800">1.1 您主動提供的資訊</h3>
      <ul>
        <li>註冊資訊：姓名、電子郵件、密碼、性別、生日</li>
        <li>個人檔案：自我介紹、照片、興趣偏好、地理位置</li>
        <li>驗證資料：身份證明文件（用於真人認證）</li>
        <li>付款資訊：信用卡或其他付款方式資料（透過第三方支付處理商 Stripe 處理）</li>
        <li>通訊內容：您透過平台傳送的訊息</li>
      </ul>

      <h3 className="text-base font-medium text-gray-800">1.2 自動蒐集的資訊</h3>
      <ul>
        <li>裝置資訊：裝置類型、作業系統、瀏覽器類型</li>
        <li>使用資料：登入時間、瀏覽頁面、功能使用頻率</li>
        <li>位置資訊：IP 位址推算之概略位置，或您授權的精確位置</li>
        <li>Cookie 與追蹤技術：詳見我們的 <a href="/cookie-policy" className="text-brand-600 hover:underline">Cookie 政策</a></li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">2. 資訊使用目的</h2>
      <p>我們蒐集的資訊將用於以下目的：</p>
      <ul>
        <li>提供、維護及改善本平台的服務</li>
        <li>建立及管理您的帳號</li>
        <li>進行身份驗證及安全防護</li>
        <li>處理付款及訂閱</li>
        <li>提供個人化的配對推薦及內容</li>
        <li>傳送系統通知、活動提醒及行銷資訊（可隨時取消訂閱）</li>
        <li>分析使用趨勢以改善用戶體驗</li>
        <li>偵測及防止詐騙、濫用或其他有害行為</li>
        <li>遵守法律義務</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">3. 資訊分享與揭露</h2>
      <p>我們不會出售您的個人資料。但在以下情況下，我們可能會分享您的資訊：</p>
      <ul>
        <li><strong>其他用戶：</strong>您的公開檔案資訊（顯示名稱、照片、自我介紹）將對其他用戶可見</li>
        <li><strong>服務提供商：</strong>我們與受信任的第三方合作（如 Stripe 付款處理、AWS 雲端服務、Firebase 推播通知），他們僅在執行服務所需範圍內處理您的資料</li>
        <li><strong>法律要求：</strong>當法律要求或為保護用戶安全時，我們可能揭露您的資訊</li>
        <li><strong>企業交易：</strong>在合併、收購或資產出售的情況下，您的資訊可能被轉移</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">4. 資料安全</h2>
      <p>
        我們採取多項安全措施保護您的個人資料，包括但不限於：
      </p>
      <ul>
        <li>所有資料傳輸均使用 SSL/TLS 加密</li>
        <li>密碼經過雜湊加密儲存</li>
        <li>定期進行安全審查與漏洞掃描</li>
        <li>嚴格的存取控制與權限管理</li>
        <li>伺服器位於受保護的資料中心</li>
      </ul>
      <p>
        儘管我們盡力保護您的資訊，但沒有任何網路傳輸或電子儲存方式是 100% 安全的。
        我們無法保證絕對的安全性。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">5. 資料保留</h2>
      <p>
        我們在您使用帳號期間及之後的合理期間內保留您的個人資料。當您刪除帳號後，
        我們將在 30 天內從主要資料庫中移除您的個人資料，但可能會因法律義務或正當利益保留部分資料最長 180 天。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">6. 您的權利</h2>
      <p>根據適用法律，您可能享有以下權利：</p>
      <ul>
        <li><strong>存取權：</strong>要求取得我們所持有的您的個人資料副本</li>
        <li><strong>更正權：</strong>要求更正不正確或不完整的資料</li>
        <li><strong>刪除權：</strong>要求刪除您的個人資料</li>
        <li><strong>限制處理權：</strong>要求限制我們處理您的資料</li>
        <li><strong>資料可攜權：</strong>以結構化、常用且機器可讀的格式取得您的資料</li>
        <li><strong>反對權：</strong>反對我們基於正當利益處理您的資料</li>
        <li><strong>撤回同意權：</strong>隨時撤回先前給予的同意</li>
      </ul>
      <p>
        如需行使上述權利，請透過{' '}
        <a href="/contact" className="text-brand-600 hover:underline">聯絡我們</a> 頁面提出申請。
        我們將在 30 天內回覆您的請求。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">7. 兒童隱私</h2>
      <p>
        本平台僅供 18 歲（含）以上的成年人使用。我們不會故意蒐集 18 歲以下兒童的個人資料。
        如果我們發現已蒐集未成年人的資料，將立即刪除相關資訊。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">8. 跨境資料傳輸</h2>
      <p>
        您的資料可能被傳輸至並儲存在您所在國家/地區以外的伺服器。
        我們將確保此類傳輸符合適用的資料保護法律，並採取適當的保護措施。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">9. 政策變更</h2>
      <p>
        我們可能會不定期更新本隱私權政策。重大變更將透過平台通知或電子郵件通知您。
        繼續使用本平台即代表您接受更新後的政策。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">10. 聯絡我們</h2>
      <p>
        如果您對本隱私權政策有任何疑問或建議，請透過以下方式聯絡我們：
      </p>
      <ul>
        <li>線上表單：<a href="/contact" className="text-brand-600 hover:underline">聯絡我們</a></li>
        <li>電子郵件：privacy@sugg​ardaddy.com</li>
      </ul>
    </article>
  );
}
