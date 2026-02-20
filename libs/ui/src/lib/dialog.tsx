'use client';

import { useEffect, useRef } from 'react';
import { cn } from './utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** 是否允許點擊背景關閉，默認為 true */
  closeOnOverlayClick?: boolean;
  /** ARIA 標籤 - 用於螢幕閱讀器 */
  ariaLabelledBy?: string;
}

export function Dialog({ 
  open, 
  onClose, 
  children, 
  className,
  closeOnOverlayClick = true,
  ariaLabelledBy = 'dialog-title',
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 處理焦點陷阱和鍵盤導航
  useEffect(() => {
    if (!open || !contentRef.current) return;

    // 保存之前的焦點元素
    previousFocusRef.current = document.activeElement as HTMLElement;

    // 獲取所有可聚焦元素
    const getFocusableElements = () => {
      if (!contentRef.current) return [];
      
      const elements = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(elements).filter(
        el => !el.hasAttribute('disabled') && el.tabIndex !== -1
      );
    };

    // 延遲聚焦以確保 DOM 已渲染
    const timer = setTimeout(() => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        contentRef.current?.focus();
      }
    }, 10);

    // 鍵盤事件處理
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 關閉
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Tab 鍵焦點陷阱
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (e.shiftKey) {
          // Shift + Tab：如果在第一個元素，跳到最後一個
          if (activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab：如果在最後一個元素，跳到第一個
          if (activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // 清理：恢復焦點
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  // 鎖定背景滾動
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
    >
      <div
        ref={contentRef}
        className={cn(
          'relative w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg',
          'animate-in fade-in-0 zoom-in-95',
          'focus:outline-none',
          className,
        )}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />;
}

export function DialogTitle({ className, id = 'dialog-title', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 id={id} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4', className)} {...props} />;
}
