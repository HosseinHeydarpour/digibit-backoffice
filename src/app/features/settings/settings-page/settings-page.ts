import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { ErrorState } from '@shared/components/error-state/error-state';
import { FormField } from '@shared/components/form-field/form-field';
import { PageHeader } from '@shared/components/page-header/page-header';
import { LoadingDirective } from '@shared/directives/loading.directive';
import { ApiError } from '@shared/models';
import type { SelectOption } from '@shared/models';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { switchMap, of } from 'rxjs';

import type {
  PaymentGateway,
  Settings,
  SettingsUpdate,
  SmsProvider,
} from '../models/settings.model';
import { SettingsService } from '../services/settings.service';

type SettingsTab = 'store' | 'payment' | 'sms' | 'seo';

const TABS: readonly SettingsTab[] = ['store', 'payment', 'sms', 'seo'];
const URL_PATTERN = /^https?:\/\/\S+$/;
const PHONE_PATTERN = /^09\d{9}$/;
const POSTAL_PATTERN = /^\d{10}$/;

/** The store logo shares the brand/banner limits (PNG/JPG/WebP, 2 MB). */
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX = 2 * 1024 * 1024;

function tabFromUrl(value: string | null): SettingsTab {
  return TABS.includes(value as SettingsTab) ? (value as SettingsTab) : 'store';
}

/**
 * Store settings — `/settings` (BO-M01..M07).
 *
 * Four tabs, four independent FormGroups, one save: the page is a single
 * transaction, so the bar at the bottom saves every changed group at once and
 * the dirty counter is the sum of the groups.
 *
 * Secrets are write-only. The inputs start EMPTY next to a «•••• 4321» hint;
 * leaving one empty keeps the stored key, typing replaces it, and the response
 * still carries only the mask.
 *
 * TRACE — changing the store phone and switching tabs:
 *   1. The store form becomes dirty; `dirtyCount` recomputes from its `events`.
 *   2. The tab click asks first («تغییرات ذخیره نشده») and only then writes
 *      `?tab=payment` — the forms themselves are never rebuilt.
 *   3. «ذخیرهٔ همه» sends all four groups (the key fields omitted when empty),
 *      then re-hydrates from the masked answer and clears every dirty flag.
 */
@Component({
  selector: 'app-settings-page',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    FormField,
    LoadingDirective,
    ButtonDirective,
    InputText,
    Select,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Textarea,
    ToggleSwitch,
    ErrorState,
    PersianDigitsPipe,
  ],
  templateUrl: './settings-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly settings = inject(SettingsService);

  private readonly toast = inject(ToastService);

  private readonly confirm = inject(ConfirmService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<SettingsTab>(
    tabFromUrl(this.route.snapshot.queryParamMap.get('tab')),
  );

  readonly loading = signal(true);

  readonly loadError = signal<string | null>(null);

  readonly saving = signal(false);

  readonly saveError = signal<string | null>(null);

  readonly testing = signal(false);

  readonly logoError = signal<string | null>(null);

  /** Bumped by every form event; makes `dirtyCount` recompute on changes. */
  private readonly formEvents = signal(0);

  readonly merchantKeyMasked = signal('');

  readonly apiKeyMasked = signal('');

  readonly logoUrl = signal('');

  private readonly logoFile = signal<File | null>(null);

  private readonly logoObjectUrl = signal('');

  readonly logoPreview = computed(() => this.logoObjectUrl() || this.logoUrl());

  readonly storeForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(60)],
    }),
    description: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PHONE_PATTERN)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    province: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    postalCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(POSTAL_PATTERN)],
    }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    instagram: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(URL_PATTERN)],
    }),
    telegram: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(URL_PATTERN)],
    }),
    whatsapp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(URL_PATTERN)],
    }),
  });

  readonly paymentForm = new FormGroup({
    gateway: new FormControl<PaymentGateway>('zarinpal', { nonNullable: true }),
    merchantId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    merchantKey: new FormControl('', { nonNullable: true }),
    sandbox: new FormControl(true, { nonNullable: true }),
  });

  readonly smsForm = new FormGroup({
    provider: new FormControl<SmsProvider>('kavenegar', { nonNullable: true }),
    sender: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    apiKey: new FormControl('', { nonNullable: true }),
    otpTemplate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly seoForm = new FormGroup({
    metaTitle: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(70)],
    }),
    metaDescription: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(160)],
    }),
    keywords: new FormControl('', { nonNullable: true }),
    ogImage: new FormControl('', { nonNullable: true }),
  });

  get gatewayOptions(): SelectOption<PaymentGateway>[] {
    return [
      { label: 'زرین‌پال', value: 'zarinpal' },
      { label: 'زیبال', value: 'zibal' },
      { label: 'آی‌دی‌پی', value: 'idpay' },
    ];
  }

  get providerOptions(): SelectOption<SmsProvider>[] {
    return [
      { label: 'کاوه‌نگار', value: 'kavenegar' },
      { label: 'SMS.ir', value: 'smsir' },
    ];
  }

  get tabOptions(): readonly SettingsTab[] {
    return TABS;
  }

  readonly dirtyCount = computed(() => {
    this.formEvents();

    return [this.storeForm, this.paymentForm, this.smsForm, this.seoForm].filter(
      (form) => form.dirty,
    ).length;
  });

  readonly canSave = computed(() => this.dirtyCount() > 0 && !this.saving());

  readonly tabsDirty = computed(() => this.dirtyCount() > 0);

  /** The route's `canDeactivate` guard reads this (BO-M06 tc 3). */
  hasUnsavedChanges(): boolean {
    return this.tabsDirty();
  }

  readonly seoKeywords = computed(() =>
    this.seoForm.controls.keywords.value
      .split(/[,،]/)
      .map((word) => word.trim())
      .filter((word) => word !== ''),
  );

  constructor() {
    for (const form of [this.storeForm, this.paymentForm, this.smsForm, this.seoForm]) {
      form.events
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.formEvents.update((value) => value + 1));
    }

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.activeTab.set(tabFromUrl(params.get('tab'))));

    this.load();

    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (this.tabsDirty()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    this.destroyRef.onDestroy(() => window.removeEventListener('beforeunload', onBeforeUnload));
    this.destroyRef.onDestroy(() => this.revokeLogo());
  }

  tabInvalid(tab: SettingsTab): boolean {
    return this.formFor(tab).invalid;
  }

  onTabChange(value: string | number | undefined): void {
    const next = tabFromUrl(value === undefined ? null : String(value));

    if (next === this.activeTab()) {
      return;
    }

    void this.goToTab(next);
  }

  async goToTab(next: SettingsTab): Promise<void> {
    if (this.tabsDirty()) {
      const confirmed = await this.confirm.confirm({
        message: 'تغییرات ذخیره نشده‌اند؛ تب عوض شود؟ (تغییرات می‌مانند)',
        header: 'تغییرات ذخیره‌نشده',
        acceptLabel: 'عوض کن',
      });

      if (!confirmed) {
        return;
      }
    }

    this.activeTab.set(next);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: next },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }

    for (const form of [this.storeForm, this.paymentForm, this.smsForm, this.seoForm]) {
      form.markAllAsTouched();
    }

    this.saveError.set(null);

    for (const form of [this.storeForm, this.paymentForm, this.smsForm, this.seoForm]) {
      for (const control of Object.values(form.controls)) {
        if (control.errors?.['server']) {
          control.setErrors(null);
        }
      }
    }

    const invalidTab = TABS.find((tab) => this.formFor(tab).invalid);

    if (invalidTab) {
      void this.goToTab(invalidTab);
      this.saveError.set('فیلدهای مشخص‌شده را اصلاح کن.');
      return;
    }

    if (!this.smsForm.controls.otpTemplate.value.includes('{code}')) {
      void this.goToTab('sms');
      this.saveError.set('قالب پیامک ورود باید شامل {code} باشد.');
      return;
    }

    this.saving.set(true);

    const file = this.logoFile();

    of(file)
      .pipe(
        switchMap((picked) => (picked ? this.settings.uploadLogo(picked) : of(null))),
        switchMap((uploaded) => this.settings.save(this.toUpdate(uploaded?.url ?? this.logoUrl()))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.hydrate(saved);
          this.toast.success('تنظیمات ذخیره شد.');
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.onSaveError(error);
        },
      });
  }

  private onSaveError(error: unknown): void {
    if (error instanceof ApiError && error.fields) {
      for (const [path, messages] of Object.entries(error.fields)) {
        const [group, name] = path.split('.');
        const control = this.formFor(group as SettingsTab)?.get(name ?? '');

        if (control && messages.length > 0) {
          control.setErrors({ server: messages[0] });
          control.markAsTouched();
        }
      }

      return;
    }

    this.saveError.set(
      error instanceof ApiError ? error.message : 'ذخیرهٔ تنظیمات ناموفق بود؛ تغییرات حفظ شدند.',
    );
  }

  testSms(): void {
    if (this.testing()) {
      return;
    }

    this.testing.set(true);

    this.settings.testSms().subscribe({
      next: (result) => {
        this.testing.set(false);
        this.toast.success(result.message);
      },
      error: () => this.testing.set(false),
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!LOGO_TYPES.includes(file.type)) {
      this.logoError.set('فقط تصویر PNG، JPG یا WebP مجاز است.');
      input.value = '';
      return;
    }

    if (file.size > LOGO_MAX) {
      this.logoError.set('حجم لوگو نباید بیشتر از ۲ مگابایت باشد.');
      input.value = '';
      return;
    }

    this.revokeLogo();
    this.logoFile.set(file);
    this.logoError.set(null);
    this.logoObjectUrl.set(URL.createObjectURL(file));
    this.storeForm.markAsDirty();
  }

  removeLogo(): void {
    this.revokeLogo();
    this.logoFile.set(null);
    this.logoUrl.set('');
    this.logoError.set(null);
    this.storeForm.markAsDirty();
  }

  fieldError(form: FormGroup, name: string): string | null {
    const control = form.get(name);

    if (!control?.touched) {
      return null;
    }

    const server = control.errors?.['server'];

    if (typeof server === 'string') {
      return server;
    }

    const errors = control.errors ?? {};

    if (errors['email']) return 'ایمیل معتبر نیست.';
    if (errors['pattern'] && name === 'phone') return 'شماره با ۰۹ شروع شود و ۱۱ رقم باشد.';
    if (errors['pattern'] && name === 'postalCode') return 'کد پستی باید ۱۰ رقم باشد.';
    if (errors['pattern']) return 'آدرس باید با http(s):// شروع شود.';
    if (errors['minlength']) return 'حداقل ۳ کاراکتر.';
    if (errors['maxlength'] && name === 'metaTitle') return 'حداکثر ۷۰ کاراکتر.';
    if (errors['maxlength'] && name === 'metaDescription') return 'حداکثر ۱۶۰ کاراکتر.';

    return null;
  }

  private load(): void {
    this.loading.set(true);

    this.settings.get().subscribe({
      next: (settings) => {
        this.loading.set(false);
        this.hydrate(settings);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('دریافت تنظیمات ناموفق بود');
      },
    });
  }

  private hydrate(settings: Settings): void {
    this.merchantKeyMasked.set(settings.payment.merchantKeyMasked);
    this.apiKeyMasked.set(settings.sms.apiKeyMasked);
    this.logoUrl.set(settings.store.logoUrl);
    this.revokeLogo();
    this.logoFile.set(null);

    this.storeForm.reset({
      name: settings.store.name,
      description: settings.store.description,
      phone: settings.store.phone,
      email: settings.store.email,
      province: settings.store.province,
      city: settings.store.city,
      postalCode: settings.store.postalCode,
      address: settings.store.address,
      instagram: settings.store.instagram,
      telegram: settings.store.telegram,
      whatsapp: settings.store.whatsapp,
    });
    this.paymentForm.reset({
      gateway: settings.payment.gateway,
      merchantId: settings.payment.merchantId,
      merchantKey: '',
      sandbox: settings.payment.sandbox,
    });
    this.smsForm.reset({
      provider: settings.sms.provider,
      sender: settings.sms.sender,
      apiKey: '',
      otpTemplate: settings.sms.otpTemplate,
    });
    this.seoForm.reset({
      metaTitle: settings.seo.metaTitle,
      metaDescription: settings.seo.metaDescription,
      keywords: settings.seo.keywords.join('، '),
      ogImage: settings.seo.ogImage,
    });
  }

  private formFor(tab: SettingsTab): FormGroup {
    return {
      store: this.storeForm,
      payment: this.paymentForm,
      sms: this.smsForm,
      seo: this.seoForm,
    }[tab];
  }

  private toUpdate(logoUrl: string): SettingsUpdate {
    const store = this.storeForm.getRawValue();
    const payment = this.paymentForm.getRawValue();
    const sms = this.smsForm.getRawValue();
    const seo = this.seoForm.getRawValue();

    return {
      store: { ...store, logoUrl },
      payment: {
        gateway: payment.gateway,
        merchantId: payment.merchantId.trim(),
        sandbox: payment.sandbox,
        ...(payment.merchantKey.trim() === '' ? {} : { merchantKey: payment.merchantKey.trim() }),
      },
      sms: {
        provider: sms.provider,
        sender: sms.sender.trim(),
        otpTemplate: sms.otpTemplate.trim(),
        ...(sms.apiKey.trim() === '' ? {} : { apiKey: sms.apiKey.trim() }),
      },
      seo: {
        metaTitle: seo.metaTitle.trim(),
        metaDescription: seo.metaDescription.trim(),
        keywords: this.seoKeywords(),
        ogImage: seo.ogImage.trim(),
      },
    };
  }

  private revokeLogo(): void {
    const url = this.logoObjectUrl();

    if (url !== '') {
      URL.revokeObjectURL(url);
      this.logoObjectUrl.set('');
    }
  }
}
