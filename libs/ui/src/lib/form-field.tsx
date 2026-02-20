'use client';

import React from 'react';
import { cn } from './utils';
import { Label } from './label';
import { Input, InputProps } from './input';

export interface FormFieldProps extends InputProps {
  /** 字段唯一 ID */
  id: string;
  /** 標籤文字 */
  label: string;
  /** 錯誤訊息 */
  error?: string;
  /** 輔助提示文字 */
  hint?: string;
  /** 是否必填 */
  required?: boolean;
  /** 標籤右側額外內容（如餘額顯示） */
  labelExtra?: React.ReactNode;
  /** 輸入框容器類名 */
  containerClassName?: string;
}

/**
 * 增強的表單字段組件
 * 整合了 Label、Input、錯誤提示、輔助文字等
 */
export function FormField({
  id,
  label,
  error,
  hint,
  required,
  labelExtra,
  containerClassName,
  className,
  disabled,
  ...inputProps
}: FormFieldProps) {
  const hasError = !!error;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  
  // 構建 aria-describedby
  const ariaDescribedBy = [
    hint ? hintId : '',
    error ? errorId : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      {/* 標籤行 */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={cn(
            'text-sm font-medium',
            hasError && 'text-red-600',
            disabled && 'text-gray-400'
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-label="必填">
              *
            </span>
          )}
        </Label>
        
        {labelExtra && (
          <div className="text-xs text-gray-500">{labelExtra}</div>
        )}
      </div>

      {/* 輸入框 */}
      <Input
        id={id}
        className={cn(
          hasError && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          className
        )}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={ariaDescribedBy || undefined}
        disabled={disabled}
        {...inputProps}
      />

      {/* 錯誤訊息 */}
      {error && (
        <p
          id={errorId}
          className="text-xs text-red-600 flex items-start gap-1"
          role="alert"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </p>
      )}

      {/* 輔助提示 */}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * 選擇框字段組件
 */
export interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  labelExtra?: React.ReactNode;
  containerClassName?: string;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({
  id,
  label,
  error,
  hint,
  required,
  labelExtra,
  containerClassName,
  className,
  disabled,
  options,
  ...selectProps
}: SelectFieldProps) {
  const hasError = !!error;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  
  const ariaDescribedBy = [hint ? hintId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={cn(
            'text-sm font-medium',
            hasError && 'text-red-600',
            disabled && 'text-gray-400'
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-label="必填">
              *
            </span>
          )}
        </Label>
        
        {labelExtra && (
          <div className="text-xs text-gray-500">{labelExtra}</div>
        )}
      </div>

      <select
        id={id}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          className
        )}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={ariaDescribedBy || undefined}
        disabled={disabled}
        {...selectProps}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-start gap-1" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * 文本域字段組件
 */
export interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  labelExtra?: React.ReactNode;
  containerClassName?: string;
}

export function TextareaField({
  id,
  label,
  error,
  hint,
  required,
  labelExtra,
  containerClassName,
  className,
  disabled,
  ...textareaProps
}: TextareaFieldProps) {
  const hasError = !!error;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  
  const ariaDescribedBy = [hint ? hintId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={cn(
            'text-sm font-medium',
            hasError && 'text-red-600',
            disabled && 'text-gray-400'
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-label="必填">
              *
            </span>
          )}
        </Label>
        
        {labelExtra && (
          <div className="text-xs text-gray-500">{labelExtra}</div>
        )}
      </div>

      <textarea
        id={id}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'placeholder:text-muted-foreground',
          hasError && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          className
        )}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={ariaDescribedBy || undefined}
        disabled={disabled}
        {...textareaProps}
      />

      {error && (
        <p id={errorId} className="text-xs text-red-600 flex items-start gap-1" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{error}</span>
        </p>
      )}

      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
