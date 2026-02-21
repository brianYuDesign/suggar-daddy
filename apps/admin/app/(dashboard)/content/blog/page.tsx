'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Archive,
  Send,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Pagination } from '@/components/pagination';

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  authorName: string;
  viewCount: number;
  publishedAt: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  guide: '使用指南',
  safety: '安全須知',
  tips: '約會技巧',
  story: '用戶故事',
  news: '平台公告',
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  published: { label: '已發布', variant: 'default' },
  archived: { label: '已歸檔', variant: 'destructive' },
};

export default function BlogManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
      });

      const token = getToken();
      const response = await fetch(`/api/blogs/admin?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch blogs');

      const data = await response.json();
      setBlogs(data.items || []);
      setTotal(data.total || 0);
    } catch (_error) {
      toast({
        title: '錯誤',
        description: '無法載入文章列表',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [page, statusFilter, categoryFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchBlogs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這篇文章嗎？此操作無法復原。')) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/blogs/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error('Failed to delete blog');

      toast({
        title: '成功',
        description: '文章已刪除',
      });
      fetchBlogs();
    } catch (_error) {
      toast({
        title: '錯誤',
        description: '刪除失敗',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/blogs/${id}/publish`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error('Failed to publish blog');

      toast({
        title: '成功',
        description: '文章已發布',
      });
      fetchBlogs();
    } catch (_error) {
      toast({
        title: '錯誤',
        description: '發布失敗',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/blogs/${id}/archive`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error('Failed to archive blog');

      toast({
        title: '成功',
        description: '文章已歸檔',
      });
      fetchBlogs();
    } catch (_error) {
      toast({
        title: '錯誤',
        description: '歸檔失敗',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">部落格管理</h1>
          <p className="text-muted-foreground">管理文章、創建內容、查看數據</p>
        </div>
        <Button onClick={() => router.push('/content/blog/create')}>
          <Plus className="w-4 h-4 mr-2" />
          新增文章
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="搜尋文章標題..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-sm"
          />
          <Button variant="outline" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">所有狀態</option>
          <option value="draft">草稿</option>
          <option value="published">已發布</option>
          <option value="archived">已歸檔</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">所有分類</option>
          <option value="guide">使用指南</option>
          <option value="safety">安全須知</option>
          <option value="tips">約會技巧</option>
          <option value="story">用戶故事</option>
          <option value="news">平台公告</option>
        </select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文章</TableHead>
              <TableHead>分類</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>作者</TableHead>
              <TableHead>瀏覽</TableHead>
              <TableHead>發布時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  載入中...
                </TableCell>
              </TableRow>
            ) : blogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  暫無文章
                </TableCell>
              </TableRow>
            ) : (
              blogs.map((blog) => (
                <TableRow key={blog.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{blog.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {blog.excerpt}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {CATEGORY_LABELS[blog.category] || blog.category}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABELS[blog.status]?.variant || 'secondary'}>
                      {STATUS_LABELS[blog.status]?.label || blog.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{blog.authorName || '-'}</TableCell>
                  <TableCell>{blog.viewCount?.toLocaleString()}</TableCell>
                  <TableCell>
                    {blog.publishedAt
                      ? format(new Date(blog.publishedAt), 'yyyy/MM/dd', { locale: zhTW })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/blog/${blog.slug}`} target="_blank">
                            <Eye className="w-4 h-4 mr-2" />
                            預覽
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/content/blog/${blog.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            編輯
                          </Link>
                        </DropdownMenuItem>
                        {blog.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handlePublish(blog.id)}>
                            <Send className="w-4 h-4 mr-2" />
                            發布
                          </DropdownMenuItem>
                        )}
                        {blog.status !== 'archived' && (
                          <DropdownMenuItem onClick={() => handleArchive(blog.id)}>
                            <Archive className="w-4 h-4 mr-2" />
                            歸檔
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(blog.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          刪除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={Math.ceil(total / limit)}
        onPageChange={setPage}
      />
    </div>
  );
}
