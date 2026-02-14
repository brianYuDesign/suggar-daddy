/**
 * 測試貼文數據 Fixtures
 */

export const testPosts = [
  {
    id: 'post-001',
    title: '測試貼文 1',
    content: '這是第一篇測試貼文的內容',
    authorId: 'user-creator-001',
    authorName: 'Test Creator',
    isPPV: false,
    price: 0,
    likes: 234,
    comments: 45,
    createdAt: '2026-02-10T10:00:00Z',
    images: [
      'https://via.placeholder.com/600x400',
    ],
  },
  {
    id: 'post-002',
    title: '測試 PPV 內容',
    content: '這是一篇付費可見的貼文',
    authorId: 'user-creator-001',
    authorName: 'Test Creator',
    isPPV: true,
    price: 299,
    likes: 89,
    comments: 12,
    createdAt: '2026-02-12T14:30:00Z',
    images: [
      'https://via.placeholder.com/600x400',
      'https://via.placeholder.com/600x400',
    ],
  },
  {
    id: 'post-003',
    title: '測試影片貼文',
    content: '這是一篇包含影片的貼文',
    authorId: 'user-creator-001',
    authorName: 'Test Creator',
    isPPV: false,
    price: 0,
    likes: 567,
    comments: 78,
    createdAt: '2026-02-13T16:00:00Z',
    video: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
  },
];

export const testComments = [
  {
    id: 'comment-001',
    postId: 'post-001',
    authorId: 'user-subscriber-001',
    authorName: 'Test Subscriber',
    content: '很棒的內容！',
    likes: 12,
    createdAt: '2026-02-10T11:00:00Z',
  },
  {
    id: 'comment-002',
    postId: 'post-001',
    authorId: 'user-creator-001',
    authorName: 'Test Creator',
    content: '謝謝支持！',
    likes: 5,
    createdAt: '2026-02-10T11:30:00Z',
  },
];

export default {
  testPosts,
  testComments,
};
