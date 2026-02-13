'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Select,
} from '@suggar-daddy/ui';
import { paymentsApi, ApiError } from '../../../../lib/api';

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
});

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function WithdrawPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      amount: undefined,
      payoutMethod: 'bank_transfer',
    },
  });

  async function onSubmit(data: WithdrawFormValues) {
    setSubmitError(null);
    try {
      await paymentsApi.requestWithdrawal(data.amount, data.payoutMethod);
      router.push('/wallet');
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : '提款申請失敗，請稍後再試'
      );
    }
  }

  return (
    <div className="space-y-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">申請提款</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                <p className="text-xs text-red-500">{errors.amount.message}</p>
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

            {/* Submit error */}
            {submitError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {submitError}
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
    </div>
  );
}
