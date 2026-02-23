'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  items: FaqItem[];
}

const faqData: FaqCategory[] = [
  {
    title: '帳號與登入',
    items: [
      {
        question: '如何註冊 Suggar Daddy 帳號？',
        answer:
          '您可以透過電子郵件註冊，或使用 Google / Apple 帳號快速登入。註冊時需年滿 18 歲，並提供基本的個人資訊來建立您的檔案。',
      },
      {
        question: '忘記密碼該怎麼辦？',
        answer:
          '請在登入頁面點擊「忘記密碼」，輸入您的註冊電子郵件，我們會寄送密碼重設連結到您的信箱。連結有效期為 24 小時。',
      },
      {
        question: '可以修改電子郵件地址嗎？',
        answer:
          '目前不支援自行修改電子郵件地址。如需變更，請透過「聯絡我們」頁面聯繫客服團隊協助處理。',
      },
      {
        question: '如何刪除我的帳號？',
        answer:
          '請前往「設定」>「帳號資訊」中進行帳號刪除。刪除後，您的個人資料將在 30 天內從資料庫中移除。請注意，此操作無法復原。',
      },
    ],
  },
  {
    title: '訂閱與付費',
    items: [
      {
        question: '有哪些訂閱方案可以選擇？',
        answer:
          '我們提供免費基本方案和多種付費方案（月付/季付/年付）。付費方案包含無限配對、進階篩選、查看誰喜歡你、優先曝光等功能。詳情請參考「訂閱方案」頁面。',
      },
      {
        question: '鑽石是什麼？如何使用？',
        answer:
          '鑽石是平台內的虛擬貨幣，可用於解鎖付費內容、打賞創作者、購買特殊功能等。您可以透過訂閱方案獲得，或在錢包頁面單獨購買。',
      },
      {
        question: '如何取消訂閱？',
        answer:
          '您可以在「設定」>「訂閱方案」中隨時取消訂閱。取消後，您仍可使用付費功能直到當前計費週期結束。取消訂閱不會自動退費。',
      },
      {
        question: '訂閱費用可以退費嗎？',
        answer:
          '根據我們的服務條款，訂閱費用一般不予退費。但如果您在購買後 48 小時內且尚未使用付費功能，可以聯繫客服申請退費。',
      },
    ],
  },
  {
    title: '隱私與安全',
    items: [
      {
        question: '如何保護我的個人資訊？',
        answer:
          '我們採用業界標準的 SSL/TLS 加密技術保護資料傳輸，密碼經過雜湊加密儲存，並定期進行安全審查。詳情請參考我們的「隱私權政策」。',
      },
      {
        question: '如何檢舉不當行為？',
        answer:
          '您可以在對方的個人檔案頁面或訊息對話中點擊「檢舉」按鈕，選擇原因並描述情況。我們的審核團隊會在 24 小時內處理。',
      },
      {
        question: '如何封鎖其他用戶？',
        answer:
          '在對方的個人檔案頁面點擊「封鎖」按鈕即可。被封鎖的用戶將無法查看您的檔案、傳送訊息或與您互動。您可以在「設定」>「封鎖名單」中管理封鎖清單。',
      },
      {
        question: '真人認證是什麼？',
        answer:
          '真人認證是我們的身份驗證系統，通過後您的檔案會顯示認證標章。認證方式包括上傳身份證明文件和即時自拍驗證，以確保帳號背後是真實的人。',
      },
    ],
  },
  {
    title: '配對功能',
    items: [
      {
        question: '配對是如何運作的？',
        answer:
          '我們的智慧演算法會根據您的偏好設定、地理位置、興趣標籤和互動行為，為您推薦最合適的對象。您可以透過滑動卡片來表達喜歡或跳過。',
      },
      {
        question: '如何提高配對成功率？',
        answer:
          '完善您的個人檔案（上傳清晰照片、填寫詳細自介）、設定精確的偏好條件、經常上線互動，都能提高您的配對成功率。付費會員還可享受優先曝光。',
      },
      {
        question: '配對後可以取消嗎？',
        answer:
          '可以。在配對列表中，您可以隨時解除與任何人的配對。解除配對後，雙方的對話記錄會被清除。',
      },
    ],
  },
  {
    title: '技術問題',
    items: [
      {
        question: '支援哪些瀏覽器？',
        answer:
          '本平台支援最新版本的 Chrome、Firefox、Safari 和 Edge 瀏覽器。建議使用最新版本以獲得最佳體驗。',
      },
      {
        question: '為什麼收不到推播通知？',
        answer:
          '請確認：1) 瀏覽器已允許推播通知權限 2) 平台設定中的通知選項已開啟 3) 裝置的「勿擾模式」未啟用。如仍有問題，請嘗試清除瀏覽器快取或重新登入。',
      },
      {
        question: '上傳照片失敗怎麼辦？',
        answer:
          '請確認照片格式為 JPG、PNG 或 WebP，檔案大小不超過 10MB。如果問題持續，請嘗試使用不同的瀏覽器或清除快取。',
      },
      {
        question: '訊息傳送失敗怎麼辦？',
        answer:
          '這通常是網路連線問題。請確認您的網路連線穩定，然後重新整理頁面再試。如果問題持續，請透過「聯絡我們」頁面回報。',
      },
    ],
  },
];

function AccordionItem({ item }: { item: FaqItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-neutral-900 transition-colors"
      >
        <span className="pr-4">{item.question}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 pr-8 text-sm text-gray-600 leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">常見問題</h1>
      <p className="mt-2 text-gray-600">
        找不到您要的答案？歡迎透過{' '}
        <a href="/contact" className="text-neutral-900 hover:underline">
          聯絡我們
        </a>{' '}
        頁面聯繫客服團隊。
      </p>

      <div className="mt-8 space-y-8">
        {faqData.map((category) => (
          <section key={category.title}>
            <h2 className="mb-2 text-base font-semibold text-gray-900">
              {category.title}
            </h2>
            <div className="rounded-lg border">
              <div className="divide-y-0 px-4">
                {category.items.map((item) => (
                  <AccordionItem key={item.question} item={item} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
