'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import dynamic from 'next/dynamic';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

// 動態載入 Quill 編輯器（避免 SSR 問題）
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-96 border rounded-lg bg-muted animate-pulse" />,
});

import 'react-quill/dist/quill.snow.css';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link', 'image'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'link', 'image',
];

const CATEGORY_OPTIONS = [
  { value: 'guide', label: '使用指南' },
  { value: 'safety', label: '安全須知' },
  { value: 'tips', label: '約會技巧' },
  { value: 'story', label: '用戶故事' },
  { value: 'news', label: '平台公告' },
];

export default function CreateBlogPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    category: 'guide',
    tags: '',
    status: 'draft' as 'draft' | 'published',
    metaTitle: '',
    metaDescription: '',
  });

  const handleSubmit = async (publish = false) => {
    if (!formData.title.trim()) {
      toast({
        title: '錯誤',
        description: '請輸入文章標題',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.content.trim()) {
      toast({
        title: '錯誤',
        description: '請輸入文章內容',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
          status: publish ? 'published' : formData.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create blog');
      }

      await response.json();

      toast({
        title: '成功',
        description: publish ? '文章已創建並發布' : '文章已儲存為草稿',
      });

      router.push('/content/blog');
    } catch (error: any) {
      toast({
        title: '錯誤',
        description: error.message || '創建文章失敗',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新增文章</h1>
          <p className="text-muted-foreground">創建新的部落格文章</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              文章標題 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="輸入文章標題"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={200}
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label>
              文章內容 <span className="text-red-500">*</span>
            </Label>
            <div className="border rounded-lg">
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                className="min-h-[400px]"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt">文章摘要</Label>
            <Textarea
              id="excerpt"
              placeholder="輸入文章摘要（顯示在列表頁）"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              maxLength={500}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              {formData.excerpt.length}/500 字
            </p>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label htmlFor="coverImage">封面圖片 URL</Label>
            <Input
              id="coverImage"
              placeholder="https://example.com/image.jpg"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
            />
            {formData.coverImage && (
              <div className="mt-2 relative w-full h-48 rounded-lg overflow-hidden">
                <img
                  src={formData.coverImage}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Actions */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">發布設定</h3>
            
            <div className="space-y-2">
              <Label>狀態</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'draft' | 'published') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="published">立即發布</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                儲存草稿
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                <Send className="w-4 h-4 mr-2" />
                發布
              </Button>
            </div>
          </div>

          {/* Category */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">分類設定</h3>
            
            <div className="space-y-2">
              <Label>文章分類</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">標籤</Label>
              <Input
                id="tags"
                placeholder="標籤1, 標籤2, 標籤3"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                用逗號分隔多個標籤
              </p>
            </div>
          </div>

          {/* SEO */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">SEO 設定</h3>
            
            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta 標題</Label>
              <Input
                id="metaTitle"
                placeholder="SEO 標題"
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta 描述</Label>
              <Textarea
                id="metaDescription"
                placeholder="SEO 描述"
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                maxLength={500}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
