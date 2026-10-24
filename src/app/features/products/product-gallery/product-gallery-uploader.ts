// src/app/features/products/product-gallery/product-gallery-uploader.ts
//
// The gallery uploader used by the product create form (BO-F11).
//
// THE CONTRACT WITH ProductCreate
// -------------------------------
// The page owns the FormArray; this component edits it — the same contract as
// the variant editor. `[images]` is a required input, so the uploader cannot
// accidentally build a second array that never reaches the submitted payload.
// The page keeps `images` in the central FormGroup, which is what lets BO-F13
// read `imagesPayload(this.images)` without knowing this component exists.
//
// WHY A `version` SIGNAL
// ----------------------
// A FormArray is not reactive, and OnPush does not repaint on mutation. The
// uploader subscribes once to `images.valueChanges` and bumps `version`;
// `rows`, `count` and `primaryIndex` all read it. Reorder fires two emissions
// (removeAt + insert) and the double refresh is harmless — recomputing the
// same computed twice is cheaper than bookkeeping that can go stale.
//
// WHY THE UPLOADER MUST NOT REVOKE URLS ON DESTROY
// ------------------------------------------------
// The gallery tab is `@if (activeTab() === 'gallery')`: every tab switch
// DESTROYS this component while the page keeps the array alive. Revoking the
// object URLs here would hand the next mount an array of dead previews. The
// page therefore revokes — once, from its own DestroyRef — and this component
// only revokes what it replaces or removes (`revokeImageUrl`).
//
// WHY DELETING AN IMAGE ASKS NO CONFIRMATION
// ------------------------------------------
// A variant row carries typed data that costs real effort to re-enter, so
// BO-F10 confirms before removing it. A gallery image costs one click on a
// file the user just picked; Arino's own design has a bare × button. A dialog
// per image would be friction without protecting anything.
//
// WHY FILE ERRORS ARE INLINE AND NOT TOASTS
// -----------------------------------------
// An error about «عکس دوم» is meaningless once the toast is gone. The inline
// box stays under the dropzone until the next attempt replaces it, so the
// user can read, fix, and retry at their own pace.

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { FormArray, FormGroup } from '@angular/forms';
import { ToastService } from '@core/services/toast';
import { PersianDigitsPipe, formatDigits } from '@shared/pipes/persian-digits.pipe';

import { compressImageFile } from './compress-image';
import {
  MAX_IMAGES,
  altFor,
  createImageGroup,
  imageFileErrorMessage,
  moveImage,
  removeImage,
  revokeImageUrl,
  setPrimaryImage,
  validateImageFile,
} from './gallery-form';

/** Which dropzone the files came from; it decides what «adding» means. */
type ImageTarget = 'primary' | 'gallery';

@Component({
  selector: 'app-product-gallery-uploader',
  imports: [PersianDigitsPipe, ReactiveFormsModule],
  templateUrl: './product-gallery-uploader.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGalleryUploader implements OnInit {
  /** The page-owned array. The uploader never replaces it. */
  readonly images = input.required<FormArray<FormGroup>>();

  /**
   * The product name, used to build default alt texts
   * («هدفون سونی - تصویر ۲»). Read at add time; an existing alt is never
   * rewritten, because typed text is data.
   */
  readonly productName = input<string>('');

  private readonly fb = inject(FormBuilder);

  private readonly toast = inject(ToastService);

  private readonly destroyRef = inject(DestroyRef);

  /**
   * Bumped after every array change so the computeds below have a dependency.
   * Starts at 0; the initial `refresh()` in `ngOnInit` makes it 1.
   */
  private readonly version = signal(0);

  /**
   * A getter, not a field: `MAX_IMAGES` is a runtime import shared with the
   * eager spec bundle, and a field initialiser could run before that module is
   * ready — the counter then renders with an empty number (the same hazard as
   * `TOMAN_UNIT` and `SHORT_DESCRIPTION_MAX`).
   */
  get maxImages(): number {
    return MAX_IMAGES;
  }

  /** The live row list, in form order — a FRESH array (see `Object.is`). */
  readonly rows = computed<FormGroup[]>(() => {
    this.version();
    return [...this.images().controls];
  });

  readonly count = computed(() => this.rows().length);

  /** Where the cover badge goes; `-1` means the array is empty. */
  readonly primaryIndex = computed(() => {
    this.version();
    return this.rows().findIndex((group) => group.controls['isPrimary']?.value === true);
  });

  /**
   * The Persian sentences of the last rejected files (tc 5/6). Cleared by the
   * next `addFiles`, whatever its outcome — a fresh attempt is a fresh slate.
   */
  readonly fileError = signal<string | null>(null);

  /** The card a drag is hovering over, for the drop indicator (desktop only). */
  readonly dragOverIndex = signal<number | null>(null);

  /** Where the current drag started; `null` when no drag is active. */
  private dragIndex: number | null = null;

  ngOnInit(): void {
    this.images()
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());

    // A prefilled edit form (BO-F14) can arrive with rows already pushed;
    // refreshing once puts the first paint in sync with the array.
    this.refresh();
  }

  /**
   * The single entry point for every file that enters the gallery — both
   * inputs, both dropzones.
   *
   * TRACE — the user picks two JPEGs in the gallery input (tc 1):
   *
   *   1. `onGallerySelected` hands the FileList here with target 'gallery'.
   *   2. `validateImageFile` accepts both; `compressImageFile` passes the
   *      small one through and re-encodes the 1.8 MB one at 1920px.
   *   3. Each stored file gets a `blob:` object URL and becomes one row via
   *      `createImageGroup`; the array was empty, so the FIRST row is born
   *      primary and the «تصویر شاخص» badge lands on it.
   *   4. Each push emits `valueChanges` → `refresh()` → `version++`, and both
   *      previews render with their default alts («هدفون سونی - تصویر ۱/۲»).
   *
   * A rejected file never becomes a row: its sentence joins `fileError`, the
   * accepted siblings are still added, and the next attempt clears the box.
   */
  async addFiles(fileList: FileList | readonly File[] | null, target: ImageTarget): Promise<void> {
    const files = Array.from(fileList ?? []);

    if (files.length === 0) {
      return;
    }

    const errors: string[] = [];
    const accepted: File[] = [];

    for (const file of files) {
      const error = validateImageFile(file);

      if (error === null) {
        accepted.push(file);
      } else {
        errors.push(imageFileErrorMessage(file, error));
      }
    }

    // The primary dropzone REPLACES the cover, so it always has room for one;
    // the gallery dropzone can only spend what the 5-slot ceiling allows.
    const room = target === 'primary' ? 1 : MAX_IMAGES - this.count();

    if (room <= 0) {
      this.fileError.set(
        target === 'primary'
          ? 'تصویر اصلی از قبل انتخاب شده است؛ برای تعویض، همان بخش «تصویر اصلی» را دوباره آپلود کنید.'
          : `حداکثر ${formatDigits(MAX_IMAGES)} تصویر برای هر محصول مجاز است.`,
      );
      this.toast.warning('ظرفیت گالری پر است.');
      return;
    }

    if (accepted.length > room) {
      errors.push(
        `${formatDigits(accepted.length - room)} تصویر اضافه نادیده گرفته شد؛ ظرفیت گالری پر است.`,
      );
      accepted.splice(room);
    }

    this.fileError.set(errors.length > 0 ? errors.join(' ') : null);

    if (accepted.length === 0) {
      return;
    }

    for (const file of accepted) {
      const stored = await compressImageFile(file);
      const url = URL.createObjectURL(stored);

      if (target === 'primary') {
        this.setPrimaryFile(url, stored);
      } else {
        this.appendGalleryFile(url, stored);
      }
    }
  }

  /** Files chosen in the «تصویر اصلی» input (tc 4). */
  onPrimarySelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.addFiles(input.files, 'primary');
    // Reset so picking the SAME file again fires `change` once more.
    input.value = '';
  }

  /** Files chosen in the «تصاویر گالری» input (tc 1, tc 9). */
  onGallerySelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.addFiles(input.files, 'gallery');
    input.value = '';
  }

  /** Files dropped ON a dropzone (Arino: «یا کشیدن و رها کردن»). */
  onDropzoneDrop(target: ImageTarget, event: DragEvent): void {
    event.preventDefault();
    void this.addFiles(event.dataTransfer?.files ?? null, target);
  }

  /** Without this, the browser navigates to the dropped file instead. */
  onDropzoneDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  /**
   * Remove one image (tc 2). No confirm — see the header note.
   *
   * TRACE — [A(primary), B, C], the user deletes A:
   *
   *   1. `group = at(0)` (A); `revokeImageUrl` frees A's `blob:` URL — the
   *      browser can drop the decoded pixels now.
   *   2. `removeImage` removes the row, sees `wasPrimary`, and promotes B
   *      with `setPrimaryImage(images, 0)` — the gallery never stands
   *      coverless while it has rows.
   *   3. `valueChanges` → `refresh()`; the badge moves to B and `count`
   *      drops to ۲ in the same tick.
   */
  remove(index: number): void {
    const group = this.images().at(index);

    if (!group) {
      return;
    }

    revokeImageUrl(group);
    removeImage(this.images(), index);
  }

  /** «تصویر شاخص» on a card (tc 4). Exactly-one is `setPrimaryImage`'s job. */
  makePrimary(index: number): void {
    setPrimaryImage(this.images(), index);
  }

  /** The up/down buttons — the keyboard/mobile path of tc 3. */
  moveUp(index: number): void {
    moveImage(this.images(), index, index - 1);
  }

  moveDown(index: number): void {
    moveImage(this.images(), index, index + 1);
  }

  // --- Drag & drop reorder (desktop; the buttons cover touch) ---

  onCardDragStart(index: number, event: DragEvent): void {
    // A drag that starts on the alt input is TEXT selection, not a card move;
    // letting it bubble would pick up the card the moment the user tries to
    // select or edit the alt text.
    if (event.target instanceof HTMLElement && event.target.closest('input, button, label')) {
      event.preventDefault();
      return;
    }

    this.dragIndex = index;
    // Firefox drops nothing without a data payload; 'text/plain' is the
    // lowest-common-denominator type.
    event.dataTransfer?.setData('text/plain', String(index));

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onCardDragEnter(index: number): void {
    if (this.dragIndex !== null && this.dragIndex !== index) {
      this.dragOverIndex.set(index);
    }
  }

  /**
   * TRACE — dragging card 2 onto card 0:
   *
   *   1. `dragstart` stored `dragIndex = 2`; `dragover`'s `preventDefault`
   *      (on the card) makes the card a legal drop target.
   *   2. `drop` reads 2 from `dragIndex` (the dataTransfer payload is the
   *      Firefox fallback) and calls `moveImage(images, 2, 0)`.
   *   3. The group object moves — its `isPrimary` flag travels with it — and
   *      `valueChanges` fires twice (removeAt + insert); the double refresh
   *      is the version signal doing its job.
   */
  onCardDrop(index: number, event: DragEvent): void {
    event.preventDefault();

    const raw = event.dataTransfer?.getData('text/plain');
    const from =
      this.dragIndex ??
      (raw !== undefined && raw !== '' && Number.isInteger(Number(raw)) ? Number(raw) : null);

    this.dragIndex = null;
    this.dragOverIndex.set(null);

    if (from === null) {
      return;
    }

    moveImage(this.images(), from, index);
  }

  /** dragleave/dragend can both miss; this is the one guaranteed cleanup. */
  onCardDragEnd(): void {
    this.dragIndex = null;
    this.dragOverIndex.set(null);
  }

  onCardDragOver(event: DragEvent): void {
    if (this.dragIndex !== null) {
      event.preventDefault();
    }
  }

  /** The alt a card shows until the user typed one (tc 11). */
  defaultAlt(index: number): string {
    return altFor(this.productName(), index + 1);
  }

  /** The alt attribute the <img> renders — typed text, else the default. */
  altAttribute(index: number, group: FormGroup): string {
    const typed = group.controls['alt']?.value;

    return typeof typed === 'string' && typed.trim() !== '' ? typed : this.defaultAlt(index);
  }

  private setPrimaryFile(url: string, file: File): void {
    const existing = this.rows().find((group) => group.controls['isPrimary']?.value === true);

    if (existing) {
      // Replacing the cover frees the OLD preview before pointing the row at
      // the new file — revoke-then-point, never point-then-revoke.
      revokeImageUrl(existing);
      existing.controls['url'].setValue(url);
      existing.controls['alt'].setValue(altFor(this.productName(), 1));
      existing.controls['file'].setValue(file);
      return;
    }

    this.appendFile(url, file, true);
  }

  private appendGalleryFile(url: string, file: File): void {
    // An empty gallery needs a cover, and the user just gave it one.
    this.appendFile(url, file, this.count() === 0);
  }

  private appendFile(url: string, file: File, primary: boolean): void {
    const position = this.count() + 1;

    this.images().push(
      createImageGroup(this.fb, {
        url,
        alt: altFor(this.productName(), position),
        isPrimary: primary,
        file,
      }),
    );
  }

  /**
   * Recompute after any array mutation. `setValue` on the isPrimary controls
   * emits `valueChanges`, so this subscription — not the callers — is what
   * keeps `rows`/`count`/`primaryIndex` in sync.
   */
  private refresh(): void {
    this.version.update((value) => value + 1);
  }
}
