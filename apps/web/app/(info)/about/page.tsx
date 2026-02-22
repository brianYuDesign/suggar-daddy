import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, Shield, Users, Gem } from 'lucide-react';
import { fetchPageContent } from '../fetch-page';
import { DynamicContent } from '../dynamic-content';

export const metadata: Metadata = {
  title: '關於我們 | Suggar Daddy',
  description: '認識 Suggar Daddy — 一個致力於建立真誠連結的社交平台。',
};

const features = [
  {
    icon: Heart,
    title: '智慧配對',
    description: '透過先進的演算法，根據您的偏好、興趣和互動行為，為您推薦最合適的對象。',
  },
  {
    icon: Shield,
    title: '安全至上',
    description: '真人認證系統、即時檢舉機制和 24 小時審核團隊，全方位保護您的使用安全。',
  },
  {
    icon: Users,
    title: '優質社群',
    description: '嚴格的社群守則和內容審核，確保平台上的互動品質和用戶體驗。',
  },
  {
    icon: Gem,
    title: '創作者經濟',
    description: '支持創作者透過付費內容和打賞機制獲得收入，建立可持續的創作生態。',
  },
];

const stats = [
  { label: '註冊用戶', value: '50,000+' },
  { label: '成功配對', value: '10,000+' },
  { label: '每日活躍用戶', value: '5,000+' },
  { label: '用戶滿意度', value: '95%' },
];

export default async function AboutPage() {
  const dynamicPage = await fetchPageContent('about');
  if (dynamicPage) {
    return <DynamicContent content={dynamicPage.content} />;
  }

  return (
    <div>
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          關於 Suggar Daddy
        </h1>
        <p className="mt-4 text-gray-600 leading-relaxed">
          我們相信每個人都值得擁有一段真誠且有意義的關係。
          Suggar Daddy 不只是一個交友平台，更是一個讓人們找到志同道合夥伴的社群。
        </p>
      </div>

      {/* Mission */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">我們的使命</h2>
        <p className="mt-3 text-gray-600 leading-relaxed">
          在快速變化的現代社會中，建立深度且真誠的人際連結變得越來越困難。
          Suggar Daddy 的使命是透過科技的力量，打造一個安全、透明且高品質的社交平台，
          幫助人們跨越地域和生活圈的限制，找到真正適合自己的伴侶。
        </p>
        <p className="mt-3 text-gray-600 leading-relaxed">
          我們堅信，好的關係建立在相互尊重、坦誠溝通和共同價值觀的基礎上。
          因此，我們不僅提供配對服務，更致力於營造一個鼓勵真實互動的環境。
        </p>
      </section>

      {/* Features */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">核心功能</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                  <feature.icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="font-medium text-gray-900">{feature.title}</h3>
              </div>
              <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">平台數據</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-xl font-bold text-brand-600">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Safety commitment */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">安全承諾</h2>
        <p className="mt-3 text-gray-600 leading-relaxed">
          您的安全是我們的首要考量。我們採取多項措施確保平台的安全性：
        </p>
        <ul className="mt-3 space-y-2 text-gray-600">
          <li className="flex items-start gap-2">
            <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">✓</span>
            <span>真人認證系統 — 確保每位用戶都是真實的人</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">✓</span>
            <span>端到端加密訊息 — 保護您的私人對話</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">✓</span>
            <span>24/7 內容審核 — 即時處理不當內容和行為</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">✓</span>
            <span>一鍵檢舉與封鎖 — 讓您能快速處理不愉快的互動</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">✓</span>
            <span>資料加密儲存 — 所有個人資料和付款資訊安全加密</span>
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-center text-white">
        <h2 className="text-lg font-semibold">準備好開始了嗎？</h2>
        <p className="mt-2 text-sm text-brand-100">
          加入 Suggar Daddy，探索屬於您的真誠連結。
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="inline-flex items-center rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
          >
            免費註冊
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg border border-white/30 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            聯絡我們
          </Link>
        </div>
      </section>
    </div>
  );
}
