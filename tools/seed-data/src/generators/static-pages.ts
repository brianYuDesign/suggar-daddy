import { generateUUID } from '../config';

export interface StaticPageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  pageType: string;
  status: 'published';
  metaTitle: string;
  metaDescription: string;
  lastEditedBy: string | null;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const STATIC_PAGES: Omit<StaticPageData, 'id' | 'publishedAt' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '隱私權政策',
    slug: 'privacy',
    pageType: 'privacy',
    status: 'published',
    lastEditedBy: null,
    metaTitle: '隱私權政策 | Suggar Daddy',
    metaDescription: 'Suggar Daddy 隱私權政策，了解我們如何蒐集、使用和保護您的個人資料。',
    content: `<h1>隱私權政策</h1>
<p><em>最後更新日期：2026 年 2 月 1 日</em></p>

<p>歡迎使用 Suggar Daddy（以下簡稱「本平台」）。我們非常重視您的隱私權，本政策旨在說明我們如何蒐集、使用、儲存及保護您的個人資料。使用本平台即代表您同意本隱私權政策的內容。</p>

<h2>1. 資訊蒐集範圍</h2>
<p>我們可能蒐集以下類型的資訊：</p>

<h3>1.1 您主動提供的資訊</h3>
<ul>
  <li>註冊資訊：姓名、電子郵件、密碼、性別、生日</li>
  <li>個人檔案：自我介紹、照片、興趣偏好、地理位置</li>
  <li>驗證資料：身份證明文件（用於真人認證）</li>
  <li>付款資訊：信用卡或其他付款方式資料（透過第三方支付處理商 Stripe 處理）</li>
  <li>通訊內容：您透過平台傳送的訊息</li>
</ul>

<h3>1.2 自動蒐集的資訊</h3>
<ul>
  <li>裝置資訊：裝置類型、作業系統、瀏覽器類型</li>
  <li>使用資料：登入時間、瀏覽頁面、功能使用頻率</li>
  <li>位置資訊：IP 位址推算之概略位置，或您授權的精確位置</li>
  <li>Cookie 與追蹤技術：詳見我們的 <a href="/cookie-policy">Cookie 政策</a></li>
</ul>

<h2>2. 資訊使用目的</h2>
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

<h2>3. 資訊分享與揭露</h2>
<p>我們不會出售您的個人資料。但在以下情況下，我們可能會分享您的資訊：</p>
<ul>
  <li><strong>其他用戶：</strong>您的公開檔案資訊（顯示名稱、照片、自我介紹）將對其他用戶可見</li>
  <li><strong>服務提供商：</strong>我們與受信任的第三方合作（如 Stripe 付款處理、AWS 雲端服務、Firebase 推播通知），他們僅在執行服務所需範圍內處理您的資料</li>
  <li><strong>法律要求：</strong>當法律要求或為保護用戶安全時，我們可能揭露您的資訊</li>
  <li><strong>企業交易：</strong>在合併、收購或資產出售的情況下，您的資訊可能被轉移</li>
</ul>

<h2>4. 資料安全</h2>
<p>我們採取多項安全措施保護您的個人資料，包括但不限於：</p>
<ul>
  <li>所有資料傳輸均使用 SSL/TLS 加密</li>
  <li>密碼經過雜湊加密儲存</li>
  <li>定期進行安全審查與漏洞掃描</li>
  <li>嚴格的存取控制與權限管理</li>
  <li>伺服器位於受保護的資料中心</li>
</ul>

<h2>5. 資料保留</h2>
<p>我們在您使用帳號期間及之後的合理期間內保留您的個人資料。當您刪除帳號後，我們將在 30 天內從主要資料庫中移除您的個人資料，但可能會因法律義務或正當利益保留部分資料最長 180 天。</p>

<h2>6. 您的權利</h2>
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
<p>如需行使上述權利，請透過 <a href="/contact">聯絡我們</a> 頁面提出申請。我們將在 30 天內回覆您的請求。</p>

<h2>7. 兒童隱私</h2>
<p>本平台僅供 18 歲（含）以上的成年人使用。我們不會故意蒐集 18 歲以下兒童的個人資料。如果我們發現已蒐集未成年人的資料，將立即刪除相關資訊。</p>

<h2>8. 跨境資料傳輸</h2>
<p>您的資料可能被傳輸至並儲存在您所在國家/地區以外的伺服器。我們將確保此類傳輸符合適用的資料保護法律，並採取適當的保護措施。</p>

<h2>9. 政策變更</h2>
<p>我們可能會不定期更新本隱私權政策。重大變更將透過平台通知或電子郵件通知您。繼續使用本平台即代表您接受更新後的政策。</p>

<h2>10. 聯絡我們</h2>
<p>如果您對本隱私權政策有任何疑問或建議，請透過 <a href="/contact">聯絡我們</a> 頁面與我們聯繫。</p>`,
  },
  {
    title: '服務條款',
    slug: 'terms',
    pageType: 'terms',
    status: 'published',
    lastEditedBy: null,
    metaTitle: '服務條款 | Suggar Daddy',
    metaDescription: 'Suggar Daddy 服務條款，了解您使用本平台的權利與義務。',
    content: `<h1>服務條款</h1>
<p><em>最後更新日期：2026 年 2 月 1 日</em></p>

<p>歡迎使用 Suggar Daddy（以下簡稱「本平台」）。請仔細閱讀以下服務條款，使用本平台即代表您同意接受本條款的約束。</p>

<h2>1. 接受條款</h2>
<p>當您註冊帳號或使用本平台時，即代表您已閱讀、理解並同意受本條款的約束。我們保留隨時修改本條款的權利，修改後的條款將在公布後立即生效。</p>

<h2>2. 帳號註冊</h2>
<ul>
  <li>您必須年滿 18 歲才能註冊使用本平台</li>
  <li>您必須提供真實、準確且完整的個人資訊</li>
  <li>每位使用者僅限擁有一個帳號</li>
  <li>您有責任維護帳號密碼的安全性，不得將帳號借予他人使用</li>
  <li>若發現帳號遭到未授權使用，應立即通知我們</li>
</ul>

<h2>3. 用戶義務</h2>
<p>使用本平台時，您同意：</p>
<ul>
  <li>遵守所有適用的法律法規</li>
  <li>遵守本平台的<a href="/community-guidelines">社群守則</a></li>
  <li>尊重其他用戶的權利與隱私</li>
  <li>不從事任何可能損害本平台或其他用戶的行為</li>
  <li>對您帳號下的所有活動負責</li>
</ul>

<h2>4. 禁止行為</h2>
<p>以下行為嚴格禁止，違反者可能被暫停或永久停用帳號：</p>
<ul>
  <li>發布虛假、誤導或冒充他人的個人資料</li>
  <li>騷擾、威脅、霸凌或跟蹤其他用戶</li>
  <li>發布色情、暴力、仇恨或非法內容</li>
  <li>從事詐騙或任何金融犯罪行為</li>
  <li>使用自動化工具操作帳號</li>
  <li>繞過或嘗試繞過平台的安全措施或付費機制</li>
</ul>

<h2>5. 內容與智慧財產權</h2>
<p>您保留您上傳至本平台的內容的所有權。但您授予我們非獨佔、全球性、免版稅的許可，以在提供服務所需的範圍內使用、複製、修改及展示您的內容。</p>
<p>本平台的名稱、標誌、設計、文字及其他內容受智慧財產權法律保護。未經我們書面同意，您不得複製、修改、分發或以其他方式使用這些內容。</p>

<h2>6. 付費服務與訂閱</h2>
<ul>
  <li>部分功能需要付費訂閱或購買虛擬貨幣（鑽石）</li>
  <li>訂閱方案將按週期自動續訂，除非您在到期前取消</li>
  <li>所有交易均透過 Stripe 安全處理</li>
  <li>虛擬貨幣（鑽石）一經購買，除法律另有規定外，概不退費</li>
</ul>

<h2>7. 免責聲明</h2>
<p>本平台以「現狀」及「可用」的基礎提供服務。我們不作任何明示或暗示的保證。<strong>您在與其他用戶互動時應自行判斷並採取合理的安全預防措施。</strong></p>

<h2>8. 責任限制</h2>
<p>在法律允許的最大範圍內，本平台及其團隊對因使用或無法使用本平台而導致的任何直接、間接、附帶、特殊或衍生損害不承擔責任。</p>

<h2>9. 帳號終止</h2>
<ul>
  <li>您可以隨時透過設定頁面或聯絡客服刪除您的帳號</li>
  <li>我們保留在您違反本條款時暫停或終止您的帳號的權利</li>
  <li>帳號終止後，您已購買的付費服務將不予退費（除法律另有規定）</li>
</ul>

<h2>10. 爭議解決</h2>
<p>本條款受中華民國法律管轄。因本條款或您使用本平台所產生的任何爭議，雙方同意以臺灣臺北地方法院為第一審管轄法院。</p>

<h2>11. 聯絡我們</h2>
<p>如果您對本服務條款有任何疑問，請透過 <a href="/contact">聯絡我們</a> 頁面與我們聯繫。</p>`,
  },
  {
    title: '社群守則',
    slug: 'community-guidelines',
    pageType: 'community-guidelines',
    status: 'published',
    lastEditedBy: null,
    metaTitle: '社群守則 | Suggar Daddy',
    metaDescription: 'Suggar Daddy 社群守則，了解我們的行為準則與社群規範。',
    content: `<h1>社群守則</h1>
<p><em>最後更新日期：2026 年 2 月 1 日</em></p>

<p>Suggar Daddy 致力於建立一個安全、尊重且包容的社群環境。所有用戶在使用本平台時，必須遵守以下社群守則。違反守則的用戶將面臨帳號暫停或永久停用的處分。</p>

<h2>1. 基本原則</h2>
<p><strong>我們鼓勵：</strong>真誠地展現自己、尊重每一位用戶、友善且有建設性的互動、保護自己和他人的安全、主動回報不當行為。</p>
<p><strong>我們禁止：</strong>虛假或冒充的個人資料、騷擾或霸凌行為、詐騙或金錢詐欺、色情或不雅內容、仇恨言論或歧視。</p>

<h2>2. 禁止行為</h2>
<h3>2.1 騷擾與霸凌</h3>
<ul>
  <li>不得傳送騷擾、威脅或令人不舒服的訊息</li>
  <li>對方表示不感興趣後，不得持續聯繫</li>
  <li>不得公開羞辱或嘲諷其他用戶</li>
</ul>

<h3>2.2 詐騙與不當金錢往來</h3>
<ul>
  <li>不得以任何虛假理由索取金錢或禮物</li>
  <li>不得假冒身份進行詐騙</li>
  <li>不得推銷或招攬第三方服務</li>
</ul>

<h3>2.3 不當內容</h3>
<ul>
  <li>不得發布露骨的色情或裸露內容</li>
  <li>不得發布暴力、血腥或令人不適的內容</li>
  <li>不得發布仇恨言論或歧視性內容</li>
  <li>不得發布涉及未成年人的任何不當內容</li>
</ul>

<h2>3. 檢舉流程</h2>
<ol>
  <li>點擊該用戶個人檔案或訊息上的「檢舉」按鈕</li>
  <li>選擇檢舉原因分類</li>
  <li>提供盡可能詳細的描述和截圖</li>
  <li>提交後，我們的審核團隊將在 24 小時內處理</li>
</ol>

<h2>4. 處罰機制</h2>
<ul>
  <li><strong>警告：</strong>首次輕微違規，發送警告通知並要求改正</li>
  <li><strong>暫時限制：</strong>重複違規或中度違規，限制部分功能使用 7-30 天</li>
  <li><strong>暫停帳號：</strong>嚴重違規，暫停帳號 30-90 天</li>
  <li><strong>永久停用：</strong>極嚴重違規或屢次重犯，永久停用帳號且不得重新註冊</li>
</ul>

<h2>5. 安全建議</h2>
<ul>
  <li>首次見面請選擇公共場所</li>
  <li>告知親友您的約會計畫</li>
  <li>不要在初次接觸時分享過多個人資訊</li>
  <li>對於金錢請求保持警覺</li>
  <li>信任您的直覺——如果感到不對勁，請離開</li>
</ul>

<h2>6. 聯絡我們</h2>
<p>如果您對社群守則有任何疑問，請透過 <a href="/contact">聯絡我們</a> 頁面與我們聯繫。</p>`,
  },
  {
    title: '關於我們',
    slug: 'about',
    pageType: 'about',
    status: 'published',
    lastEditedBy: null,
    metaTitle: '關於我們 | Suggar Daddy',
    metaDescription: '認識 Suggar Daddy — 一個致力於建立真誠連結的社交平台。',
    content: `<h1>關於 Suggar Daddy</h1>

<p>我們相信每個人都值得擁有一段真誠且有意義的關係。Suggar Daddy 不只是一個交友平台，更是一個讓人們找到志同道合夥伴的社群。</p>

<h2>我們的使命</h2>
<p>在快速變化的現代社會中，建立深度且真誠的人際連結變得越來越困難。Suggar Daddy 的使命是透過科技的力量，打造一個安全、透明且高品質的社交平台，幫助人們跨越地域和生活圈的限制，找到真正適合自己的伴侶。</p>

<h2>核心功能</h2>
<ul>
  <li><strong>智慧配對：</strong>透過先進的演算法，根據您的偏好、興趣和互動行為，為您推薦最合適的對象</li>
  <li><strong>安全至上：</strong>真人認證系統、即時檢舉機制和 24 小時審核團隊，全方位保護您的使用安全</li>
  <li><strong>優質社群：</strong>嚴格的社群守則和內容審核，確保平台上的互動品質和用戶體驗</li>
  <li><strong>創作者經濟：</strong>支持創作者透過付費內容和打賞機制獲得收入，建立可持續的創作生態</li>
</ul>

<h2>安全承諾</h2>
<ul>
  <li>✓ 真人認證系統 — 確保每位用戶都是真實的人</li>
  <li>✓ 端到端加密訊息 — 保護您的私人對話</li>
  <li>✓ 24/7 內容審核 — 即時處理不當內容和行為</li>
  <li>✓ 一鍵檢舉與封鎖 — 讓您能快速處理不愉快的互動</li>
  <li>✓ 資料加密儲存 — 所有個人資料和付款資訊安全加密</li>
</ul>

<h2>加入我們</h2>
<p>準備好開始了嗎？<a href="/register">免費註冊</a>，探索屬於您的真誠連結。如有任何問題，歡迎<a href="/contact">聯絡我們</a>。</p>`,
  },
  {
    title: '聯絡我們',
    slug: 'contact',
    pageType: 'contact',
    status: 'published',
    lastEditedBy: null,
    metaTitle: '聯絡我們 | Suggar Daddy',
    metaDescription: '與 Suggar Daddy 團隊聯繫，我們很樂意聽取您的問題和建議。',
    content: `<h1>聯絡我們</h1>
<p>有任何問題、建議或回饋？我們很樂意聽取您的意見。</p>

<h2>聯絡方式</h2>
<ul>
  <li><strong>電子郵件：</strong>support@sugg​ardaddy.com</li>
  <li><strong>即時客服：</strong>平台內訊息功能</li>
  <li><strong>回覆時間：</strong>1-2 個工作天</li>
</ul>

<h2>常見聯絡主題</h2>
<ul>
  <li>帳號問題</li>
  <li>付款與訂閱</li>
  <li>檢舉與安全</li>
  <li>功能異常回報</li>
  <li>功能建議</li>
  <li>合作洽談</li>
</ul>

<p>您也可以透過本頁面的表單直接傳送訊息給我們。</p>`,
  },
  {
    title: '常見問題',
    slug: 'faq',
    pageType: 'faq',
    status: 'published',
    lastEditedBy: null,
    metaTitle: '常見問題 | Suggar Daddy',
    metaDescription: 'Suggar Daddy 常見問題解答，帳號、訂閱、隱私與安全等疑問一次解答。',
    content: `<h1>常見問題</h1>

<h2>帳號與登入</h2>
<p><strong>如何註冊帳號？</strong></p>
<p>您可以透過電子郵件註冊，或使用 Google / Apple 帳號快速登入。註冊時需年滿 18 歲。</p>

<p><strong>忘記密碼該怎麼辦？</strong></p>
<p>請在登入頁面點擊「忘記密碼」，輸入您的註冊電子郵件，我們會寄送密碼重設連結到您的信箱。</p>

<p><strong>如何刪除帳號？</strong></p>
<p>請前往「設定」>「帳號資訊」中進行帳號刪除。刪除後，您的個人資料將在 30 天內從資料庫中移除。</p>

<h2>訂閱與付費</h2>
<p><strong>有哪些訂閱方案？</strong></p>
<p>我們提供免費基本方案和多種付費方案（月付/季付/年付）。詳情請參考「訂閱方案」頁面。</p>

<p><strong>鑽石是什麼？</strong></p>
<p>鑽石是平台內的虛擬貨幣，可用於解鎖付費內容、打賞創作者、購買特殊功能等。</p>

<p><strong>如何取消訂閱？</strong></p>
<p>在「設定」>「訂閱方案」中隨時取消。取消後可使用付費功能直到當前計費週期結束。</p>

<h2>隱私與安全</h2>
<p><strong>如何保護個人資訊？</strong></p>
<p>我們採用 SSL/TLS 加密保護資料傳輸，密碼經過雜湊加密儲存，並定期進行安全審查。</p>

<p><strong>如何檢舉不當行為？</strong></p>
<p>在對方的個人檔案頁面或訊息對話中點擊「檢舉」按鈕，選擇原因並描述情況。</p>

<p><strong>真人認證是什麼？</strong></p>
<p>真人認證是我們的身份驗證系統，通過後檔案會顯示認證標章，確保帳號背後是真實的人。</p>

<h2>配對功能</h2>
<p><strong>配對如何運作？</strong></p>
<p>我們的智慧演算法會根據您的偏好設定、地理位置、興趣標籤和互動行為推薦最合適的對象。</p>

<p><strong>如何提高配對成功率？</strong></p>
<p>完善個人檔案、設定精確的偏好條件、經常上線互動，都能提高配對成功率。</p>

<h2>技術問題</h2>
<p><strong>支援哪些瀏覽器？</strong></p>
<p>支援最新版本的 Chrome、Firefox、Safari 和 Edge 瀏覽器。</p>

<p><strong>上傳照片失敗怎麼辦？</strong></p>
<p>請確認照片格式為 JPG、PNG 或 WebP，檔案大小不超過 10MB。</p>

<p>找不到答案？歡迎透過 <a href="/contact">聯絡我們</a> 頁面聯繫客服團隊。</p>`,
  },
  {
    title: 'Cookie 政策',
    slug: 'cookie-policy',
    pageType: 'cookie-policy',
    status: 'published',
    lastEditedBy: null,
    metaTitle: 'Cookie 政策 | Suggar Daddy',
    metaDescription: 'Suggar Daddy Cookie 政策，了解我們如何使用 Cookie 及類似技術。',
    content: `<h1>Cookie 政策</h1>
<p><em>最後更新日期：2026 年 2 月 1 日</em></p>

<p>本 Cookie 政策說明 Suggar Daddy 如何使用 Cookie 和類似技術。使用本平台即代表您同意我們按照本政策使用 Cookie。</p>

<h2>1. 什麼是 Cookie？</h2>
<p>Cookie 是網站存放在您的瀏覽器或裝置上的小型文字檔案。它們被廣泛用於使網站運作、提升效率，以及向網站擁有者提供資訊。</p>

<h2>2. 我們使用的 Cookie 類型</h2>

<h3>必要性 Cookie</h3>
<p>這些 Cookie 是網站正常運作所必需的，無法關閉。例如：登入驗證 Token、CSRF 保護、語言偏好。有效期：工作階段或最長 30 天。</p>

<h3>功能性 Cookie</h3>
<p>使網站能提供增強的功能和個人化設定。例如：介面偏好設定、最近瀏覽記錄、通知狀態。有效期：最長 1 年。</p>

<h3>分析性 Cookie</h3>
<p>讓我們能計算訪問量和流量來源，以改善網站效能。例如：Google Analytics、頁面瀏覽統計。有效期：最長 2 年。</p>

<h3>廣告性 Cookie</h3>
<p>可能由廣告合作夥伴設定，用於建立興趣檔案和展示相關廣告。例如：Facebook Pixel、Google Ads。有效期：最長 2 年。</p>

<h2>3. 第三方 Cookie</h2>
<p>以下第三方可能在本平台設定 Cookie：</p>
<ul>
  <li><strong>Stripe</strong> — 付款處理</li>
  <li><strong>Google Analytics</strong> — 網站分析</li>
  <li><strong>Firebase</strong> — 推播通知服務</li>
</ul>

<h2>4. 如何管理 Cookie</h2>
<p>大多數瀏覽器允許您控制 Cookie：查看和刪除已存在的 Cookie、封鎖所有或第三方 Cookie、在 Cookie 被設定時通知您。</p>
<p><strong>注意：</strong>停用必要性 Cookie 可能導致核心功能（如登入）無法正常運作。</p>

<h2>5. 政策更新</h2>
<p>我們可能會不定期更新本 Cookie 政策。更新後的政策將在本頁面公布。</p>

<h2>6. 聯絡我們</h2>
<p>如果您對本 Cookie 政策有任何疑問，請透過 <a href="/contact">聯絡我們</a> 頁面與我們聯繫。</p>`,
  },
];

export class StaticPageSeeder {
  generatePages(): StaticPageData[] {
    const now = new Date();

    return STATIC_PAGES.map((page) => ({
      ...page,
      id: generateUUID(),
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    }));
  }
}
