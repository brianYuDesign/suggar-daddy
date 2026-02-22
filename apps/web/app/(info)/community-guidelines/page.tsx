import type { Metadata } from 'next';
import { fetchPageContent } from '../fetch-page';
import { DynamicContent } from '../dynamic-content';

export const metadata: Metadata = {
  title: '社群守則 | Suggar Daddy',
  description: 'Suggar Daddy 社群守則，了解我們的行為準則與社群規範。',
};

export default async function CommunityGuidelinesPage() {
  const dynamicPage = await fetchPageContent('community-guidelines');
  if (dynamicPage) {
    return <DynamicContent content={dynamicPage.content} />;
  }
  return (
    <article className="prose prose-gray max-w-none">
      <h1 className="text-2xl font-bold text-gray-900">社群守則</h1>
      <p className="text-sm text-gray-500">最後更新日期：2026 年 2 月 1 日</p>

      <p>
        Suggar Daddy 致力於建立一個安全、尊重且包容的社群環境。
        所有用戶在使用本平台時，必須遵守以下社群守則。
        違反守則的用戶將面臨帳號暫停或永久停用的處分。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">1. 基本原則</h2>
      <div className="not-prose grid grid-cols-1 gap-3 sm:grid-cols-2 my-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-800 mb-2">我們鼓勵</p>
          <ul className="space-y-1 text-sm text-green-700">
            <li>- 真誠地展現自己</li>
            <li>- 尊重每一位用戶</li>
            <li>- 友善且有建設性的互動</li>
            <li>- 保護自己和他人的安全</li>
            <li>- 主動回報不當行為</li>
          </ul>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800 mb-2">我們禁止</p>
          <ul className="space-y-1 text-sm text-red-700">
            <li>- 虛假或冒充的個人資料</li>
            <li>- 騷擾或霸凌行為</li>
            <li>- 詐騙或金錢詐欺</li>
            <li>- 色情或不雅內容</li>
            <li>- 仇恨言論或歧視</li>
          </ul>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">2. 禁止行為</h2>

      <h3 className="text-base font-medium text-gray-800">2.1 騷擾與霸凌</h3>
      <ul>
        <li>不得傳送騷擾、威脅或令人不舒服的訊息</li>
        <li>對方表示不感興趣後，不得持續聯繫</li>
        <li>不得公開羞辱或嘲諷其他用戶</li>
        <li>不得跟蹤或追蹤其他用戶的線上或線下活動</li>
      </ul>

      <h3 className="text-base font-medium text-gray-800">2.2 詐騙與不當金錢往來</h3>
      <ul>
        <li>不得以任何虛假理由索取金錢或禮物</li>
        <li>不得假冒身份進行詐騙</li>
        <li>不得利用平台進行洗錢或其他金融犯罪</li>
        <li>不得推銷或招攬第三方服務、產品或投資</li>
      </ul>

      <h3 className="text-base font-medium text-gray-800">2.3 冒充行為</h3>
      <ul>
        <li>不得使用他人的照片或資料建立假帳號</li>
        <li>不得冒充公眾人物、名人或其他用戶</li>
        <li>個人資料中的所有資訊必須真實準確</li>
      </ul>

      <h3 className="text-base font-medium text-gray-800">2.4 不當內容</h3>
      <ul>
        <li>不得發布露骨的色情或裸露內容</li>
        <li>不得發布暴力、血腥或令人不適的內容</li>
        <li>不得發布仇恨言論或歧視性內容（基於種族、性別、性取向、宗教、國籍等）</li>
        <li>不得發布涉及未成年人的任何不當內容</li>
        <li>不得發布毒品或非法物質相關內容</li>
      </ul>

      <h3 className="text-base font-medium text-gray-800">2.5 隱私侵犯</h3>
      <ul>
        <li>不得未經同意分享他人的私人資訊（如電話號碼、地址、照片）</li>
        <li>不得截圖或錄製私人對話並外洩</li>
        <li>不得利用平台蒐集他人的個人資料</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">3. 內容規範</h2>
      <h3 className="text-base font-medium text-gray-800">3.1 個人照片</h3>
      <ul>
        <li>大頭照應清楚顯示您的面部</li>
        <li>不得使用嚴重修改或 AI 生成的照片</li>
        <li>不得使用包含裸露或性暗示的照片作為公開照片</li>
        <li>不得使用含有違法物質、武器或暴力的照片</li>
      </ul>

      <h3 className="text-base font-medium text-gray-800">3.2 個人檔案</h3>
      <ul>
        <li>顯示名稱不得包含不雅字眼或冒犯性語言</li>
        <li>自我介紹不得包含聯絡方式（如電話號碼、社群媒體帳號）</li>
        <li>不得在檔案中進行任何形式的商業推廣</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">4. 檢舉流程</h2>
      <p>如果您發現任何違反社群守則的行為，請立即進行檢舉：</p>
      <ol>
        <li>點擊該用戶個人檔案或訊息上的「檢舉」按鈕</li>
        <li>選擇檢舉原因分類</li>
        <li>提供盡可能詳細的描述和截圖</li>
        <li>提交後，我們的審核團隊將在 24 小時內處理</li>
      </ol>
      <p>
        您也可以透過 <a href="/contact" className="text-brand-600 hover:underline">聯絡我們</a> 頁面進行舉報。
        所有檢舉都是保密處理的，被檢舉方不會知道檢舉人的身份。
      </p>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">5. 處罰機制</h2>
      <p>根據違規的嚴重程度，我們可能採取以下措施：</p>
      <div className="not-prose my-4 space-y-2">
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">警告</span>
          <p className="text-sm text-gray-600">首次輕微違規，發送警告通知並要求改正</p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">暫時限制</span>
          <p className="text-sm text-gray-600">重複違規或中度違規，限制部分功能使用 7-30 天</p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">暫停帳號</span>
          <p className="text-sm text-gray-600">嚴重違規，暫停帳號 30-90 天</p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <span className="rounded bg-red-200 px-2 py-0.5 text-xs font-medium text-red-900">永久停用</span>
          <p className="text-sm text-gray-600">極嚴重違規或屢次重犯，永久停用帳號且不得重新註冊</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">6. 安全建議</h2>
      <ul>
        <li>首次見面請選擇公共場所</li>
        <li>告知親友您的約會計畫</li>
        <li>不要在初次接觸時分享過多個人資訊</li>
        <li>對於金錢請求保持警覺</li>
        <li>如遇到可疑行為，立即檢舉並停止互動</li>
        <li>信任您的直覺——如果感到不對勁，請離開</li>
      </ul>

      <h2 className="text-lg font-semibold text-gray-900 mt-8">7. 聯絡我們</h2>
      <p>
        如果您對社群守則有任何疑問或需要協助，請透過
        <a href="/contact" className="text-brand-600 hover:underline">聯絡我們</a>頁面與我們聯繫。
      </p>
    </article>
  );
}
