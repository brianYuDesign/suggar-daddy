'use client';

import { 
  Dialog, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from './dialog';
import { Button } from './button/button';
import { AlertTriangle, Info } from 'lucide-react';

export interface ConfirmDialogProps {
  /** 是否打開對話框 */
  open: boolean;
  /** 標題 */
  title: string;
  /** 描述內容 */
  description: string;
  /** 確認按鈕文字，默認為 "確認" */
  confirmText?: string;
  /** 取消按鈕文字，默認為 "取消" */
  cancelText?: string;
  /** 是否為破壞性操作（紅色按鈕），默認為 false */
  isDestructive?: boolean;
  /** 確認按鈕是否顯示 loading 狀態 */
  isLoading?: boolean;
  /** 確認回調 */
  onConfirm: () => void | Promise<void>;
  /** 取消回調 */
  onCancel: () => void;
  /** 是否禁用點擊背景關閉 */
  disableOverlayClick?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '確認',
  cancelText = '取消',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
  disableOverlayClick = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onCancel}
      closeOnOverlayClick={!disableOverlayClick && !isLoading}
      ariaLabelledBy="confirm-dialog-title"
    >
      <DialogHeader>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 rounded-full p-3 ${
            isDestructive 
              ? 'bg-red-100' 
              : 'bg-blue-100'
          }`}>
            {isDestructive ? (
              <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
            ) : (
              <Info className="h-6 w-6 text-blue-600" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 pt-1">
            <DialogTitle id="confirm-dialog-title" className="text-left">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-left">
              {description}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={isDestructive ? 'destructive' : 'default'}
          onClick={handleConfirm}
          loading={isLoading}
          loadingText={`${confirmText}中...`}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
