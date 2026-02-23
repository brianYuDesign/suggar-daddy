'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Mail, MessageSquare, Clock } from 'lucide-react';

const subjectOptions = [
  { value: '', label: '請選擇主題' },
  { value: 'account', label: '帳號問題' },
  { value: 'billing', label: '付款與訂閱' },
  { value: 'report', label: '檢舉與安全' },
  { value: 'bug', label: '功能異常回報' },
  { value: 'feature', label: '功能建議' },
  { value: 'partnership', label: '合作洽談' },
  { value: 'other', label: '其他' },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Frontend-only simulation: show success state
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Mail className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">感謝您的來信！</h1>
        <p className="mt-3 text-gray-600">
          我們已收到您的訊息，將在 1-2 個工作天內回覆您。
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ name: '', email: '', subject: '', message: '' });
          }}
          className="mt-6 text-sm text-neutral-900 hover:underline"
        >
          傳送另一則訊息
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">聯絡我們</h1>
      <p className="mt-2 text-gray-600">
        有任何問題、建議或回饋？我們很樂意聽取您的意見。
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {/* Contact info cards */}
        <div className="sm:col-span-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Mail className="h-5 w-5 text-neutral-700 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">電子郵件</p>
                <p className="mt-1 text-sm text-gray-500">support@sugg​ardaddy.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <MessageSquare className="h-5 w-5 text-neutral-700 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">即時客服</p>
                <p className="mt-1 text-sm text-gray-500">平台內訊息功能</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Clock className="h-5 w-5 text-neutral-700 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">回覆時間</p>
                <p className="mt-1 text-sm text-gray-500">1-2 個工作天</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              placeholder="您的姓名"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              電子郵件 <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
            主題 <span className="text-red-500">*</span>
          </label>
          <select
            id="subject"
            required
            value={form.subject}
            onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          >
            {subjectOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            訊息內容 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            required
            rows={5}
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
            placeholder="請詳細描述您的問題或建議..."
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 sm:w-auto"
        >
          送出訊息
        </button>
      </form>
    </div>
  );
}
