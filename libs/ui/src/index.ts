// Utility
export { cn } from './lib/utils';
export {
  getFriendlyErrorMessage,
  getErrorAction,
  createApiError,
  ErrorCode,
  ERROR_MESSAGES,
} from './lib/utils/error-messages';
export type { ApiError } from './lib/utils/error-messages';

// Components
export { Button, buttonVariants } from './lib/button/button';
export type { ButtonProps } from './lib/button/button';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './lib/card';
export { Badge } from './lib/badge';
export type { BadgeProps } from './lib/badge';
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './lib/table';
export { Input } from './lib/input';
export type { InputProps } from './lib/input';
export { Label } from './lib/label';
export type { LabelProps } from './lib/label';
export { Select } from './lib/select';
export type { SelectProps } from './lib/select';
export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './lib/dialog';
export { ConfirmDialog } from './lib/confirm-dialog';
export type { ConfirmDialogProps } from './lib/confirm-dialog';
export { Tooltip, SimpleTooltip } from './lib/tooltip';
export type { TooltipProps } from './lib/tooltip';
export { Skeleton } from './lib/skeleton';
export { Avatar } from './lib/avatar';
export { Separator } from './lib/separator';
export { Tabs, TabsList, TabsTrigger } from './lib/tabs';

// New UI/UX Components
export { ToastProvider, useToast } from './lib/toast';
export type { Toast, ToastType } from './lib/toast';
export { EmptyState } from './lib/empty-state';
export type { EmptyStateProps } from './lib/empty-state';
export { ErrorBoundary, ErrorBoundaryWrapper } from './lib/error-boundary';
export { FormField, SelectField, TextareaField } from './lib/form-field';
export type { FormFieldProps, SelectFieldProps, TextareaFieldProps } from './lib/form-field';
export { ResponsiveTable, ResponsiveTableSkeleton } from './lib/responsive-table';
export type { ResponsiveTableProps, Column } from './lib/responsive-table';

// Hooks
export { useAutoRetry, useFetch } from './lib/hooks/use-auto-retry';
export type { UseAutoRetryOptions, UseAutoRetryReturn } from './lib/hooks/use-auto-retry';
