import type { Metadata } from 'next';
import { fetchPageContent } from '../fetch-page';
import { DynamicContent } from '../dynamic-content';

export const metadata: Metadata = {
  title: '服務條款 | Suggar Daddy',
  description: 'Suggar Daddy 服務條款，了解您使用本平台的權利與義務。',
};

export default async function TermsPage() {
  const dynamicPage = await fetchPageContent('terms');
  if (dynamicPage) {
    return <DynamicContent content={dynamicPage.content} />;
  }
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-2xl font-bold text-gray-900">服務條款</h1>
      <p className="text-sm text-gray-500">最後更新日期：2026 年 2 月 1 日</p>

      <p>
        歡迎使用 Suggar Daddy（以下簡稱「本平台」）。請仔細閱讀以下服務條款（以下簡稱「本條款」），
        使用本平台即代表您同意接受本條款的約束。如果您不同意本條款，請勿使用本平台。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">1. 接受條款</h2>
      <p>
        當您註冊帳號或使用本平台時，即代表您已閱讀、理解並同意受本條款的約束。
        我們保留隨時修改本條款的權利，修改後的條款將在公布後立即生效。
        持續使用本平台即代表您接受修改後的條款。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">2. 帳號註冊</h2>
      <ul>
        <li>您必須年滿 18 歲才能註冊使用本平台</li>
        <li>您必須提供真實、準確且完整的個人資訊</li>
        <li>每位使用者僅限擁有一個帳號</li>
        <li>您有責任維護帳號密碼的安全性，不得將帳號借予他人使用</li>
        <li>若發現帳號遭到未授權使用，應立即通知我們</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">3. 用戶義務</h2>
      <p>使用本平台時，您同意：</p>
      <ul>
        <li>遵守所有適用的法律法規</li>
        <li>遵守本平台的<a href="/community-guidelines" className="text-neutral-900 hover:underline">社群守則</a></li>
        <li>尊重其他用戶的權利與隱私</li>
        <li>不從事任何可能損害本平台或其他用戶的行為</li>
        <li>對您帳號下的所有活動負責</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">4. 禁止行為</h2>
      <p>以下行為嚴格禁止，違反者可能被暫停或永久停用帳號：</p>
      <ul>
        <li>發布虛假、誤導或冒充他人的個人資料</li>
        <li>騷擾、威脅、霸凌或跟蹤其他用戶</li>
        <li>發布色情、暴力、仇恨或非法內容</li>
        <li>從事詐騙、詐騙或任何金融犯罪行為</li>
        <li>未經授權收集其他用戶的個人資料</li>
        <li>使用自動化工具（如機器人）操作帳號</li>
        <li>繞過或嘗試繞過平台的安全措施或付費機制</li>
        <li>傳播惡意軟體、病毒或有害程式碼</li>
        <li>進行任何形式的商業招攬（未經授權）</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">5. 內容與智慧財產權</h2>
      <h3 className="text-base font-medium text-gray-800">5.1 您的內容</h3>
      <p>
        您保留您上傳至本平台的內容的所有權。但您授予我們非獨佔、全球性、免版稅的許可，
        以在提供服務所需的範圍內使用、複製、修改及展示您的內容。
      </p>
      <h3 className="text-base font-medium text-gray-800">5.2 平台內容</h3>
      <p>
        本平台的名稱、標誌、設計、文字及其他內容受智慧財產權法律保護。
        未經我們書面同意，您不得複製、修改、分發或以其他方式使用這些內容。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">6. 付費服務與訂閱</h2>
      <ul>
        <li>部分功能需要付費訂閱或購買虛擬貨幣（鑽石）</li>
        <li>訂閱方案將按週期自動續訂，除非您在到期前取消</li>
        <li>所有交易均透過 Stripe 安全處理</li>
        <li>虛擬貨幣（鑽石）一經購買，除法律另有規定外，概不退費</li>
        <li>我們保留修改定價的權利，但會提前通知現有訂閱用戶</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">7. 免責聲明</h2>
      <p>
        本平台以「現狀」及「可用」的基礎提供服務。我們不作任何明示或暗示的保證，包括但不限於：
      </p>
      <ul>
        <li>服務不會中斷或無錯誤</li>
        <li>其他用戶提供的資訊的準確性或真實性</li>
        <li>透過平台建立的任何關係的結果或品質</li>
        <li>平台上用戶的背景或身份的真實性</li>
      </ul>
      <p>
        <strong>您在與其他用戶互動時應自行判斷並採取合理的安全預防措施。</strong>
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">8. 責任限制</h2>
      <p>
        在法律允許的最大範圍內，本平台及其團隊對以下情況不承擔任何責任：
      </p>
      <ul>
        <li>因使用或無法使用本平台而導致的任何直接、間接、附帶、特殊或衍生損害</li>
        <li>其他用戶的行為或內容</li>
        <li>任何未經授權的帳號存取</li>
        <li>服務中斷或資料遺失</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">9. 帳號終止</h2>
      <ul>
        <li>您可以隨時透過設定頁面或聯絡客服刪除您的帳號</li>
        <li>我們保留在您違反本條款時暫停或終止您的帳號的權利</li>
        <li>帳號終止後，您已購買的付費服務將不予退費（除法律另有規定）</li>
        <li>帳號刪除後，您的個人資料將根據我們的隱私權政策進行處理</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">10. 爭議解決</h2>
      <p>
        本條款受中華民國法律管轄。因本條款或您使用本平台所產生的任何爭議，
        雙方同意先以誠意協商解決。若無法達成協議，雙方同意以臺灣臺北地方法院為第一審管轄法院。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">11. 其他條款</h2>
      <ul>
        <li>本條款中的任何條款若被認定為無效或不可執行，不影響其他條款的效力</li>
        <li>我們未行使本條款中的任何權利不構成放棄該權利</li>
        <li>本條款構成您與本平台之間的完整協議</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">12. 聯絡我們</h2>
      <p>
        如果您對本服務條款有任何疑問，請透過
        <a href="/contact" className="text-neutral-900 hover:underline">聯絡我們</a>頁面與我們聯繫。
      </p>
    </article>
  );
}
