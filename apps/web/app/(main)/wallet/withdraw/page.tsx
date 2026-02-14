'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Select,
  Skeleton,
  Badge,
  Separator,
  cn,
} from '@suggar-daddy/ui';
import { paymentsApi, ApiError } from '../../../../lib/api';
import { timeAgo } from '../../../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  payoutMethod: string;
  requestedAt: string;
  processedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Validation schema                                                  */
/* ------------------------------------------------------------------ */
const withdrawSchema = z.object({
  amount: z
    .number({ message: '請輸入金額' })
    .positive('金額必須大於 0')
    .min(1, '最低提款金額為 1'),
  payoutMethod: z.enum(['bank_transfer', 'paypal'], {
    message: '請選擇提款方式',
  }),
  payoutDetails: z.string().min(1, '請輸入收款帳戶資訊'),
});

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */
const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'warning' | 'success' | 'destructive';
    icon: typeof Clock;
  }
> = {
  pending: { label: '待審核', variant: 'warning', icon: Clock },
  processing: { label: '處理中', variant: 'warning', icon: Loader2 },
  completed: { label: '已完成', variant: 'success', icon: CheckCircle2 },
  rejected: { label: '已拒絕', variant: 'destructive', icon: XCircle },
};

function getStatusConfig(status: string) {
  return (
    statusConfig[status] ?? {
      label: status,
      variant: 'warning' as const,
      icon: AlertCircle,
    }
  );
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function WithdrawPage() {
  const router = useRouter();

  /* state */
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<WithdrawFormValues | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /* withdrawals list */
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);

  /* load wallet + withdrawals */
  useEffect(() => {
    let cancelled = false;

    paymentsApi
      .getWallet()
      .then((data) => {
        if (!cancelled) setBalance(data.balance ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });

    paymentsApi
      .getWithdrawals()
      .then((data) => {
        if (!cancelled) setWithdrawals(data as unknown as Withdrawal[]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setWithdrawalsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* form */
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      amount: undefined,
      payoutMethod: 'bank_transfer',
      payoutDetails: '',
    },
  });

  /* step 1: show confirmation dialog */
  function onFormSubmit(data: WithdrawFormValues) {
    setSubmitError(null);
    if (balance !== null && data.amount > balance) {
      setSubmitError(`餘額不足。目前可用餘額為 ${formatAmount(balance)}`);
      return;
    }
    setPendingData(data);
    setShowConfirm(true);
  }

  /* step 2: confirm and submit */
  const confirmWithdraw = useCallback(async () => {
    if (!pendingData) return;
    setShowConfirm(false);
    setSubmitError(null);

    try {
      await paymentsApi.requestWithdrawal(
        pendingData.amount,
        pendingData.payoutMethod,
        pendingData.payoutDetails
      );
      setSuccessMessage(
        `提款申請已送出：${formatAmount(pendingData.amount)}`
      );
      reset();
      // refresh balance & withdrawals
      paymentsApi
        .getWallet()
        .then((data) => setBalance(data.balance ?? 0))
        .catch(() => {});
      paymentsApi
        .getWithdrawals()
        .then((data) => setWithdrawals(data as unknown as Withdrawal[]))
        .catch(() => {});
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : '提款申請失敗，請稍後再試'
      );
    }
  }, [pendingData, reset]);

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/wallet')}
          className="rounded-full p-1 transition-colors hover:bg-gray-100"
          aria-label="返回錢包"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">提款</h1>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
          <button
            className="ml-auto text-green-500 hover:text-green-700"
            onClick={() => setSuccessMessage(null)}
            aria-label="關閉提示"
          >
            &times;
          </button>
        </div>
      )}

      {/* Withdraw form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">申請提款</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onFormSubmit)}
            className="space-y-5"
          >
            {/* Available balance */}
            <div className="mb-2 rounded-lg bg-brand-50 p-3">
              <p className="text-xs text-gray-500">可用餘額</p>
              {balanceLoading ? (
                <Skeleton className="mt-1 h-6 w-24" />
              ) : (
                <p className="text-lg font-bold text-brand-600">
                  {formatAmount(balance ?? 0)}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">提款金額</Label>
              <Input
                id="amount"
                type="number"
                placeholder="輸入金額"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-xs text-red-500">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Payout method */}
            <div className="space-y-2">
              <Label htmlFor="payoutMethod">提款方式</Label>
              <Select id="payoutMethod" {...register('payoutMethod')}>
                <option value="bank_transfer">銀行轉帳</option>
                <option value="paypal">PayPal</option>
              </Select>
              {errors.payoutMethod && (
                <p className="text-xs text-red-500">
                  {errors.payoutMethod.message}
                </p>
              )}
            </div>

            {/* Payout details */}
            <div className="space-y-2">
              <Label htmlFor="payoutDetails">收款帳戶資訊</Label>
              <Input
                id="payoutDetails"
                placeholder={
                  watch('payoutMethod') === 'paypal'
                    ? '輸入 PayPal 電子郵件'
                    : '輸入銀行帳號'
                }
                {...register('payoutDetails')}
              />
              {errors.payoutDetails && (
                <p className="text-xs text-red-500">
                  {errors.payoutDetails.message}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {watch('payoutMethod') === 'paypal'
                  ? '請輸入您的 PayPal 電子郵件地址'
                  : '請輸入您的銀行帳號（含分行代碼）'}
              </p>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/wallet')}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-brand-500 hover:bg-brand-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                確認提款
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      {showConfirm && pendingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">確認提款</h2>
            <Separator className="my-3" />
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>提款金額</span>
                <span className="font-semibold text-gray-900">
                  {formatAmount(pendingData.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>提款方式</span>
                <span className="font-medium text-gray-900">
                  {pendingData.payoutMethod === 'paypal'
                    ? 'PayPal'
                    : '銀行轉帳'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>收款帳戶</span>
                <span className="max-w-[160px] truncate font-medium text-gray-900">
                  {pendingData.payoutDetails}
                </span>
              </div>
            </div>
            <Separator className="my-3" />
            <p className="text-xs text-gray-400">
              提交後將由系統審核，審核通過後款項將匯入指定帳戶。
            </p>
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-brand-500 hover:bg-brand-600"
                onClick={confirmWithdraw}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                確認送出
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal history */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">提款記錄</h2>

        {withdrawalsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-14" />
                </div>
              </Card>
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 rounded-full bg-gray-100 p-3">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">尚無提款記錄</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => {
              const config = getStatusConfig(w.status);
              const StatusIcon = config.icon;

              return (
                <Card key={w.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatAmount(w.amount)}
                        </p>
                        <Badge variant={config.variant} className="text-[10px]">
                          <StatusIcon
                            className={cn(
                              'mr-1 h-3 w-3',
                              w.status === 'processing' && 'animate-spin'
                            )}
                          />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {w.payoutMethod === 'paypal'
                          ? 'PayPal'
                          : '銀行轉帳'}{' '}
                        &middot; {timeAgo(w.requestedAt)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
