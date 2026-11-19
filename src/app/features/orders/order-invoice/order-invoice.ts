import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';

import type { Order } from '../models/order.model';
import { orderStatusLabel } from '../order-status';

/**
 * The printable invoice (BO-H06).
 *
 * Deliberately a plain white sheet with no app chrome: `invoice-print` is the
 * one element the print stylesheet leaves visible, so Ctrl+P on the dialog (or
 * the «چاپ» button) produces the invoice and nothing else. Amounts come from
 * the order's own fields, the same ones the detail cards print.
 */
@Component({
  selector: 'app-order-invoice',
  imports: [PersianDatePipe, PersianDigitsPipe, TomanPipe],
  template: `
    <article class="invoice-print mx-auto max-w-3xl bg-white p-6 text-gray-900" dir="rtl">
      <header class="flex items-start justify-between border-b border-gray-300 pb-4">
        <div>
          <p class="text-lg font-bold">دیجی‌بیت مارکت</p>
          <p class="text-xs text-gray-500">فروشگاه آنلاین لوازم دیجیتال</p>
        </div>
        <div class="text-end text-xs text-gray-600">
          <p>فاکتور سفارش</p>
          <p class="font-mono text-sm font-bold text-gray-900" dir="ltr">{{ order().code }}</p>
          <p>{{ order().createdAt | persianDate }}</p>
        </div>
      </header>

      @if (order().status === 'cancelled' || order().status === 'returned') {
        <p
          class="mt-4 rounded border border-red-300 bg-red-50 p-2 text-center text-sm font-bold text-red-700"
        >
          {{ order().status === 'cancelled' ? 'لغو شده' : 'مرجوع شده' }}
        </p>
      }

      <section class="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
        <div class="rounded border border-gray-200 p-3">
          <p class="mb-1 font-bold">مشتری</p>
          <p>{{ order().address.fullName }}</p>
          <p dir="ltr" class="text-start">{{ order().address.phone }}</p>
          <p>{{ order().address.province }}، {{ order().address.city }}</p>
          <p>{{ order().address.address }}</p>
          <p>
            کد پستی: <span dir="ltr">{{ order().address.postalCode }}</span>
          </p>
        </div>
        <div class="rounded border border-gray-200 p-3">
          <p class="mb-1 font-bold">پرداخت و ارسال</p>
          <p>روش ارسال: {{ order().shippingMethod }}</p>
          <p>درگاه: {{ order().payment.gateway ?? 'پرداخت نشده' }}</p>
          <p>
            کد پیگیری: <span dir="ltr">{{ order().payment.trackingCode ?? '—' }}</span>
          </p>
          <p>وضعیت: {{ statusLabel(order().status) }}</p>
        </div>
      </section>

      <table class="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr class="border-b border-gray-300 bg-gray-50">
            <th class="p-2 text-start">کالا</th>
            <th class="p-2 text-start">تعداد</th>
            <th class="p-2 text-start">قیمت واحد</th>
            <th class="p-2 text-start">جمع</th>
          </tr>
        </thead>
        <tbody>
          @for (item of order().items; track item.id) {
            <tr class="border-b border-gray-200">
              <td class="p-2">
                {{ item.productName }}
                @if (item.variantName) {
                  <span class="text-gray-500">· {{ item.variantName }}</span>
                }
              </td>
              <td class="p-2">{{ item.quantity | persianDigits }}</td>
              <td class="p-2">{{ item.unitPrice | toman }}</td>
              <td class="p-2">{{ item.totalPrice | toman }}</td>
            </tr>
          }
        </tbody>
      </table>

      <section class="mt-4 ms-auto w-full max-w-xs space-y-1 text-xs">
        <p class="flex justify-between">
          <span>جمع اقلام</span><span>{{ order().subtotal | toman }}</span>
        </p>
        @if (order().discount > 0) {
          <p class="flex justify-between text-red-600">
            <span>تخفیف</span><span>{{ order().discount | toman }}</span>
          </p>
        }
        <p class="flex justify-between">
          <span>هزینهٔ ارسال</span>
          <span>{{ order().shippingCost === 0 ? 'رایگان' : (order().shippingCost | toman) }}</span>
        </p>
        <p class="flex justify-between border-t border-gray-300 pt-1 text-sm font-bold">
          <span>مبلغ نهایی</span><span>{{ order().total | toman }}</span>
        </p>
      </section>

      <footer
        class="mt-6 border-t border-dashed border-gray-300 pt-3 text-center text-[10px] text-gray-500"
      >
        این فاکتور به‌صورت خودکار از پنل مدیریت صادر شده است.
      </footer>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderInvoice {
  readonly order = input.required<Order>();

  statusLabel(status: Order['status']): string {
    return orderStatusLabel(status);
  }
}
