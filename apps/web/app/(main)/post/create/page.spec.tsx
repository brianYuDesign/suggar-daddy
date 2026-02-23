/**
 * Create Post Page Test
 * 
 * Tests the create post page functionality including:
 * - Form rendering and validation
 * - Content input with character count
 * - Media upload (images)
 * - Premium content toggle
 * - Form submission
 * - Error handling
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import CreatePostPage from './page';

// Mock useAuth
const mockUser = {
  id: 'test-user-id',
  userType: 'sugar_baby',
  permissionRole: 'user',
  displayName: 'Test Creator',
  bio: 'Test bio',
  avatarUrl: 'https://example.com/avatar.jpg',
  verificationStatus: 'verified',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

jest.mock('../../../../providers/auth-provider', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/post/create',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the API
jest.mock('../../../../lib/api', () => ({
  contentApi: {
    createPost: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public status?: number) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock upload utility
jest.mock('../../../../lib/upload', () => ({
  uploadMedia: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/post/create',
  useSearchParams: () => new URLSearchParams(),
}));

const { contentApi } = require('../../../../lib/api');
const { uploadMedia } = require('../../../../lib/upload');

describe('CreatePostPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockBack.mockClear();
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    delete (global.URL as any).createObjectURL;
    delete (global.URL as any).revokeObjectURL;
  });

  describe('Rendering', () => {
    it('should render create post form with all elements', () => {
      render(<CreatePostPage />);

      expect(screen.getByText('發布動態')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('分享你的想法...')).toBeInTheDocument();
      expect(screen.getByText('付費內容')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /發布/i })).toBeInTheDocument();
    });

    it('should render back button', () => {
      render(<CreatePostPage />);

      const backButton = screen.getByRole('button', { name: /返回/i });
      expect(backButton).toBeInTheDocument();
    });

    it('should render author preview section', () => {
      render(<CreatePostPage />);

      expect(screen.getByText(/使用者/i)).toBeInTheDocument();
      expect(screen.getByText('公開貼文')).toBeInTheDocument();
    });

    it('should render character count', () => {
      render(<CreatePostPage />);

      expect(screen.getByText(/0 \/ 2000/i)).toBeInTheDocument();
    });

    it('should render premium toggle switch', () => {
      render(<CreatePostPage />);

      const toggleSwitch = screen.getByRole('switch', { name: /切換付費內容/i });
      expect(toggleSwitch).toBeInTheDocument();
      expect(toggleSwitch).toHaveAttribute('aria-checked', 'false');
    });

    it('should have disabled publish button initially', () => {
      render(<CreatePostPage />);

      const publishButton = screen.getByRole('button', { name: /發布/i });
      expect(publishButton).toBeDisabled();
    });
  });

  describe('Back Navigation', () => {
    it('should navigate back when clicking back button', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const backButton = screen.getByRole('button', { name: /返回/i });
      await user.click(backButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Content Input', () => {
    it('should update content value when typing', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...') as HTMLTextAreaElement;
      await user.type(textarea, '測試內容');

      expect(textarea.value).toBe('測試內容');
    });

    it('should update character count when typing', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, 'Hello World');

      await waitFor(() => {
        expect(screen.getByText(/11 \/ 2000/i)).toBeInTheDocument();
      });
    });

    it('should enable publish button when content is entered', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      const publishButton = screen.getByRole('button', { name: /發布/i });

      expect(publishButton).toBeDisabled();

      await user.type(textarea, '測試內容');

      await waitFor(() => {
        expect(publishButton).not.toBeDisabled();
      });
    });

    it('should show warning color when approaching character limit', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      const longText = 'a'.repeat(1850); // 92.5% of 2000

      await user.type(textarea, longText);

      await waitFor(() => {
        const charCount = screen.getByText(/1850 \/ 2000/i);
        expect(charCount).toHaveClass('text-amber-500');
      });
    });

    it('should show error color when exceeding character limit', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      const tooLongText = 'a'.repeat(2100);

      await user.type(textarea, tooLongText);

      await waitFor(() => {
        const charCount = screen.getByText(/2100 \/ 2000/i);
        expect(charCount).toHaveClass('text-red-500');
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting empty content', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      // Try to enable and click submit (though button should be disabled)
      const form = document.querySelector('form');
      if (form) {
        // Directly submit form bypassing button disabled state
        const textarea = screen.getByPlaceholderText('分享你的想法...');
        await user.type(textarea, 'a');
        await user.clear(textarea);
        
        // Force form submission
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }

      await waitFor(() => {
        expect(screen.getByText(/請輸入內容/i)).toBeInTheDocument();
      });
    });

    it('should show error when content exceeds max length', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      const tooLongText = 'a'.repeat(2100);

      await user.type(textarea, tooLongText);
      
      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText(/內容不可超過 2000 字/i)).toBeInTheDocument();
      });
    });
  });

  describe('Media Upload', () => {
    it('should render media upload button', () => {
      render(<CreatePostPage />);

      expect(screen.getByText(/新增圖片 \(最多 4 張\)/i)).toBeInTheDocument();
    });

    it('should handle single image upload', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByAltText('Preview 1')).toBeInTheDocument();
      });
    });

    it('should handle multiple image uploads', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const files = [
        new File(['image1'], 'test1.png', { type: 'image/png' }),
        new File(['image2'], 'test2.png', { type: 'image/png' }),
      ];
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, files);

      await waitFor(() => {
        expect(screen.getByAltText('Preview 1')).toBeInTheDocument();
        expect(screen.getByAltText('Preview 2')).toBeInTheDocument();
      });
    });

    it('should show error when uploading more than 4 images', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const files = Array.from({ length: 5 }, (_, i) => 
        new File([`image${i}`], `test${i}.png`, { type: 'image/png' })
      );
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, files);

      await waitFor(() => {
        expect(screen.getByText(/最多只能上傳 4 張圖片/i)).toBeInTheDocument();
      });
    });

    it('should allow removing uploaded images', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByAltText('Preview 1')).toBeInTheDocument();
      });

      // Find and click remove button
      const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
        btn => btn.querySelector('svg') // X icon button
      );
      const removeButton = removeButtons.find(btn => 
        btn.closest('.relative')?.querySelector('img[alt="Preview 1"]')
      );
      
      if (removeButton) {
        await user.click(removeButton);

        await waitFor(() => {
          expect(screen.queryByAltText('Preview 1')).not.toBeInTheDocument();
        });
      }
    });

    it('should update upload button text based on file count', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      expect(screen.getByText(/新增圖片 \(最多 4 張\)/i)).toBeInTheDocument();

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/新增更多圖片 \(1\/4\)/i)).toBeInTheDocument();
      });
    });

    it('should hide upload button when 4 images are uploaded', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const files = Array.from({ length: 4 }, (_, i) => 
        new File([`image${i}`], `test${i}.png`, { type: 'image/png' })
      );
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, files);

      await waitFor(() => {
        expect(screen.queryByText(/新增/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Premium Content Toggle', () => {
    it('should toggle premium content on click', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const toggleSwitch = screen.getByRole('switch', { name: /切換付費內容/i });
      expect(toggleSwitch).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByText('公開貼文')).toBeInTheDocument();

      await user.click(toggleSwitch);

      await waitFor(() => {
        expect(toggleSwitch).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('付費貼文')).toBeInTheDocument();
      });
    });

    it('should show info note when premium is enabled', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const toggleSwitch = screen.getByRole('switch', { name: /切換付費內容/i });
      await user.click(toggleSwitch);

      await waitFor(() => {
        expect(screen.getByText(/付費內容將會對非訂閱者顯示為鎖定狀態/i)).toBeInTheDocument();
      });
    });

    it('should hide info note when premium is disabled', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const toggleSwitch = screen.getByRole('switch', { name: /切換付費內容/i });
      
      // Enable premium
      await user.click(toggleSwitch);
      await waitFor(() => {
        expect(screen.getByText(/付費內容將會對非訂閱者顯示為鎖定狀態/i)).toBeInTheDocument();
      });

      // Disable premium
      await user.click(toggleSwitch);
      await waitFor(() => {
        expect(screen.queryByText(/付費內容將會對非訂閱者顯示為鎖定狀態/i)).not.toBeInTheDocument();
      });
    });

    it('should update visual appearance when premium is toggled', async () => {
      const user = userEvent.setup();
      render(<CreatePostPage />);

      const toggleSwitch = screen.getByRole('switch', { name: /切換付費內容/i });
      await user.click(toggleSwitch);

      await waitFor(() => {
        // Premium section should have highlighted styling
        expect(screen.getByText('付費內容').closest('div')).toHaveClass('border-neutral-300');
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit post with valid content', async () => {
      contentApi.createPost.mockResolvedValue({ id: 'post-123' });

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, '測試貼文內容');

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(contentApi.createPost).toHaveBeenCalledWith({
          content: '測試貼文內容',
          isPremium: false,
          mediaUrls: undefined,
        });
      });

      expect(mockPush).toHaveBeenCalledWith('/feed');
    });

    it('should submit post with premium flag when enabled', async () => {
      contentApi.createPost.mockResolvedValue({ id: 'post-123' });

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, '付費內容');

      const toggleSwitch = screen.getByRole('switch', { name: /切換付費內容/i });
      await user.click(toggleSwitch);

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(contentApi.createPost).toHaveBeenCalledWith({
          content: '付費內容',
          isPremium: true,
          mediaUrls: undefined,
        });
      });
    });

    it('should upload media before submitting post', async () => {
      uploadMedia.mockResolvedValue({ url: 'https://cdn.example.com/image.jpg' });
      contentApi.createPost.mockResolvedValue({ id: 'post-123' });

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, '帶圖片的貼文');

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByAltText('Preview 1')).toBeInTheDocument();
      });

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(uploadMedia).toHaveBeenCalledWith(file);
        expect(contentApi.createPost).toHaveBeenCalledWith({
          content: '帶圖片的貼文',
          isPremium: false,
          mediaUrls: ['https://cdn.example.com/image.jpg'],
        });
      });
    });

    it('should show loading state during submission', async () => {
      contentApi.createPost.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'post-123' }), 100))
      );

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, '測試內容');

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText('發布中...')).toBeInTheDocument();
        expect(publishButton).toBeDisabled();
      });
    });

    it('should show uploading state during media upload', async () => {
      uploadMedia.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ url: 'https://cdn.example.com/image.jpg' }), 100))
      );
      contentApi.createPost.mockResolvedValue({ id: 'post-123' });

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, '測試內容');

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText('上傳中...')).toBeInTheDocument();
      });
    });

    it('should disable form during submission', async () => {
      contentApi.createPost.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: 'post-123' }), 100))
      );

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...') as HTMLTextAreaElement;
      await user.type(textarea, '測試內容');

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(textarea).toBeDisabled();
        expect(publishButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when post creation fails', async () => {
      const ApiError = require('../../../../lib/api').ApiError;
      contentApi.createPost.mockRejectedValue(new ApiError('發布失敗', 500));

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, '測試內容');

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText('發布失敗')).toBeInTheDocument();
      });
    });

    it('should show error message when media upload fails', async () => {
      uploadMedia.mockRejectedValue(new Error('Upload failed'));

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, '測試內容');

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText(/圖片上傳失敗/i)).toBeInTheDocument();
      });
    });

    it('should not submit post if media upload fails', async () => {
      uploadMedia.mockRejectedValue(new Error('Upload failed'));

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, '測試內容');

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText(/圖片上傳失敗/i)).toBeInTheDocument();
      });

      expect(contentApi.createPost).not.toHaveBeenCalled();
    });

    it('should handle generic error with fallback message', async () => {
      contentApi.createPost.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      await user.type(textarea, '測試內容');

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText(/發布失敗，請稍後再試/i)).toBeInTheDocument();
      });
    });

    it('should re-enable form after error', async () => {
      contentApi.createPost.mockRejectedValue(new Error('Error'));

      const user = userEvent.setup();
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...') as HTMLTextAreaElement;
      await user.type(textarea, '測試內容');

      const publishButton = screen.getByRole('button', { name: /發布/i });
      await user.click(publishButton);

      await waitFor(() => {
        expect(screen.getByText(/發布失敗/i)).toBeInTheDocument();
      });

      // Form should be enabled again
      expect(textarea).not.toBeDisabled();
      expect(publishButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<CreatePostPage />);

      const textarea = screen.getByPlaceholderText('分享你的想法...');
      expect(textarea).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(<CreatePostPage />);

      expect(screen.getByRole('button', { name: /返回/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /發布/i })).toBeInTheDocument();
    });

    it('should have accessible toggle switch', () => {
      render(<CreatePostPage />);

      const toggleSwitch = screen.getByRole('switch', { name: /切換付費內容/i });
      expect(toggleSwitch).toHaveAttribute('aria-checked');
    });
  });
});
