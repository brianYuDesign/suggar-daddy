'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
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
  Tooltip,
  cn,
} from '@suggar-daddy/ui';
import { paymentsApi, ApiError } from '../../../../lib/api';
import { useToast } from '../../../../providers/toast-provider';
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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const WITHDRAWAL_RULES = {
  MIN_AMOUNT: 20,           // 最低提款金額 $20
  MAX_AMOUNT: 50000,        // 最高提款金額 $50,000
  MAX_DECIMALS: 2,          // 最多兩位小數
};

/* ------------------------------------------------------------------ */
/*  Validation schema                                                  */
/* ------------------------------------------------------------------ */
/**
 * 動態創建提款驗證 schema
 * @param availableBalance - 可用餘額（已扣除待處理提款）
 */
const createWithdrawSchema = (availableBalance: number) => z.object({
  amount: z
    .number()
    .positive('金額必須大於 0')
    .min(WITHDRAWAL_RULES.MIN_AMOUNT, `最低提款金額為 $${WITHDRAWAL_RULES.MIN_AMOUNT}`)
    .max(WITHDRAWAL_RULES.MAX_AMOUNT, `單次提款不能超過 $${WITHDRAWAL_RULES.MAX_AMOUNT.toLocaleString()}`)
    .refine(
      (val) => {
        // 檢查小數位數
        const decimalPlaces = (val.toString().split('.')[1] || '').length;
        return decimalPlaces <= WITHDRAWAL_RULES.MAX_DECIMALS;
      },
      `金額最多 ${WITHDRAWAL_RULES.MAX_DECIMALS} 位小數`
    )
    .refine(
      (val) => val <= availableBalance,
      `可用餘額不足（可用：$${availableBalance.toFixed(2)}）`
    ),
  payoutMethod: z.enum(['bank_transfer', 'paypal'] as const).refine(
    (val) => val !== undefined,
    { message: '請選擇提款方式' }
  ),
  payoutDetails: z.string()
    .min(5, '帳戶資訊過短（至少 5 個字元）')
    .max(200, '帳戶資訊過長'),
});

type WithdrawFormValues = z.infer<ReturnType<typeof createWithdrawSchema>>;

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
  const toast = useToast();

  /* state */
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<WithdrawFormValues | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* withdrawals list */
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  
  /* idempotency key - 生成一次，用於防止重複提交 */
  const idempotencyKeyRef = useRef<string>(uuidv4());

  /* 計算可用餘額（扣除待處理提款） */
  const availableBalance = balance !== null 
    ? balance - withdrawals
        .filter(w => w.status === 'pending' || w.status === 'processing')
        .reduce((sum, w) => sum + w.amount, 0)
    : 0;

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

  /* form - 使用動態 schema */
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<WithdrawFormValues>({
    resolver: zodResolver(createWithdrawSchema(availableBalance)),
    defaultValues: {
      amount: undefined,
      payoutMethod: 'bank_transfer',
      payoutDetails: '',
    },
  });

  /* step 1: show confirmation dialog */
  function onFormSubmit(data: WithdrawFormValues) {
    setSubmitError(null);
    
    // 驗證收款帳戶格式
    const { payoutMethod, payoutDetails } = data;
    if (payoutMethod === 'bank_transfer') {
      const cleanedAccount = payoutDetails.replace(/[\s-]/g, '');
      if (!/^\d{10,20}$/.test(cleanedAccount)) {
        setSubmitError('請輸入有效的銀行帳號（10-20 位數字）');
        return;
      }
    } else if (payoutMethod === 'paypal') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payoutDetails)) {
        setSubmitError('請輸入有效的 PayPal 電子郵件地址');
        return;
      }
    }
    
    // 再次檢查餘額（防止競態條件）
    if (balance !== null && data.amount > availableBalance) {
      setSubmitError(
        `可用餘額不足。可用餘額為 ${formatAmount(availableBalance)}（總餘額 ${formatAmount(balance)}，待處理提款 ${formatAmount(balance - availableBalance)}）`
      );
      return;
    }
    
    setPendingData(data);
    setShowConfirm(true);
  }

  /* step 2: confirm and submit */
  const confirmWithdraw = useCallback(async () => {
    if (!pendingData || isSubmitting) return;
    
    setShowConfirm(false);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // 使用幂等性鍵防止重複提交
      const requestId = idempotencyKeyRef.current;
      
      await paymentsApi.requestWithdrawal(
        pendingData.amount,
        pendingData.payoutMethod,
        pendingData.payoutDetails
      );
      
      const successMsg = `提款申請已送出：${formatAmount(pendingData.amount)}`;
      setSuccessMessage(successMsg);
      toast.success(successMsg);
      
      // 生成新的幂等性鍵供下次使用
      idempotencyKeyRef.current = uuidv4();
      
      reset();
      
      // refresh balance & withdrawals
      const [walletData, withdrawalsData] = await Promise.allSettled([
        paymentsApi.getWallet(),
        paymentsApi.getWithdrawals(),
      ]);
      
      if (walletData.status === 'fulfilled') {
        setBalance(walletData.value.balance ?? 0);
      }
      
      if (withdrawalsData.status === 'fulfilled') {
        setWithdrawals(withdrawalsData.value as unknown as Withdrawal[]);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : '提款申請失敗，請稍後再試';
      
      setSubmitError(errorMessage);
      toast.error(errorMessage);
      
      // 如果是重複請求錯誤，生成新的幂等性鍵
      if (err instanceof ApiError && err.message.includes('重複')) {
        idempotencyKeyRef.current = uuidv4();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingData, reset, isSubmitting, toast]);

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
            <div className="mb-2 rounded-lg bg-neutral-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">總餘額</p>
                  {balanceLoading ? (
                    <Skeleton className="mt-1 h-6 w-24" />
                  ) : (
                    <p className="text-lg font-bold text-neutral-900">
                      {formatAmount(balance ?? 0)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">可用餘額</p>
                  {balanceLoading ? (
                    <Skeleton className="mt-1 h-6 w-24" />
                  ) : (
                    <p className="text-lg font-bold text-green-600">
                      {formatAmount(availableBalance)}
                    </p>
                  )}
                </div>
              </div>
              {!balanceLoading && availableBalance < (balance ?? 0) && (
                <p className="mt-2 text-xs text-amber-600">
                  <AlertCircle className="mr-1 inline h-3 w-3" />
                  有待處理的提款申請：{formatAmount((balance ?? 0) - availableBalance)}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                提款範圍：${WITHDRAWAL_RULES.MIN_AMOUNT} - ${WITHDRAWAL_RULES.MAX_AMOUNT.toLocaleString()}
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  提款金額
                  <Tooltip content="輸入您要提領的金額，須在可用餘額範圍內">
                    <span className="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 border border-gray-300 rounded-full cursor-help">
                      ?
                    </span>
                  </Tooltip>
                </span>
                {!balanceLoading && (
                  <span className="text-xs font-normal text-gray-500">
                    可用: {formatAmount(availableBalance)}
                  </span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="輸入金額"
                  min={WITHDRAWAL_RULES.MIN_AMOUNT}
                  max={availableBalance}
                  step="0.01"
                  className="pl-7"
                  aria-required="true"
                  aria-invalid={!!errors.amount}
                  aria-describedby={errors.amount ? "amount-error amount-hint" : "amount-hint"}
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              {errors.amount && (
                <p id="amount-error" className="text-xs text-red-500" role="alert">
                  {errors.amount.message}
                </p>
              )}
              <p id="amount-hint" className="text-xs text-gray-500">
                最低提款金額：${WITHDRAWAL_RULES.MIN_AMOUNT}，最高提款金額：${WITHDRAWAL_RULES.MAX_AMOUNT.toLocaleString()}
              </p>
            </div>

            {/* Payout method */}
            <div className="space-y-2">
              <Label htmlFor="payoutMethod" className="flex items-center gap-1">
                提款方式
                <Tooltip content="選擇您偏好的收款方式">
                  <span className="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 border border-gray-300 rounded-full cursor-help">
                    ?
                  </span>
                </Tooltip>
              </Label>
              <Select 
                id="payoutMethod" 
                aria-required="true"
                aria-invalid={!!errors.payoutMethod}
                aria-describedby={errors.payoutMethod ? "payoutMethod-error" : undefined}
                {...register('payoutMethod')}
              >
                <option value="bank_transfer">銀行轉帳</option>
                <option value="paypal">PayPal</option>
              </Select>
              {errors.payoutMethod && (
                <p id="payoutMethod-error" className="text-xs text-red-500" role="alert">
                  {errors.payoutMethod.message}
                </p>
              )}
            </div>

            {/* Payout details */}
            <div className="space-y-2">
              <Label htmlFor="payoutDetails" className="flex items-center gap-1">
                收款帳戶資訊
                <Tooltip content={watch('payoutMethod') === 'paypal' ? '請輸入您的 PayPal 電子郵件地址' : '請輸入您的銀行帳號'}>
                  <span className="inline-flex items-center justify-center w-4 h-4 text-xs text-gray-500 border border-gray-300 rounded-full cursor-help">
                    ?
                  </span>
                </Tooltip>
              </Label>
              <Input
                id="payoutDetails"
                placeholder={
                  watch('payoutMethod') === 'paypal'
                    ? '輸入 PayPal 電子郵件'
                    : '輸入銀行帳號'
                }
                aria-required="true"
                aria-invalid={!!errors.payoutDetails}
                aria-describedby={errors.payoutDetails ? "payoutDetails-error payoutDetails-hint" : "payoutDetails-hint"}
                {...register('payoutDetails')}
              />
              {errors.payoutDetails && (
                <p id="payoutDetails-error" className="text-xs text-red-500" role="alert">
                  {errors.payoutDetails.message}
                </p>
              )}
              <p id="payoutDetails-hint" className="text-xs text-gray-400">
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
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-neutral-900 hover:bg-neutral-800"
                loading={isSubmitting}
                loadingText="處理中..."
              >
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
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-neutral-900 hover:bg-neutral-800"
                onClick={confirmWithdraw}
                loading={isSubmitting}
                loadingText="送出中..."
              >
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
