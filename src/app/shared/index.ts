// src/app/shared/index.ts
//
// Barrel for the shared layer. Deliberately the same explicit style as
// `core/index.ts` and `layout/index.ts`: every symbol is named instead of using
// `export *`, so adding a model inside `models/` cannot silently widen the
// public surface of `@shared`.
//
// The AGENTS.md barrel rule applies here too — `export type { … }` for
// interfaces and unions, plain `export { … }` for classes, functions and
// constants. Mixing the two is a compile error under `isolatedModules`.

export type {
  ApiErrorBody,
  ApiResponse,
  Activable,
  BadgeSeverity,
  BaseEntity,
  BreadcrumbItem,
  CommentStatus,
  EntityId,
  OrderStatus,
  Page,
  PageMeta,
  SelectOption,
  SortOrder,
  SortState,
  TicketStatus,
} from './models';

export {
  ACTIVE_LABELS,
  ApiError,
  COMMENT_STATUS_META,
  ORDER_STATUS_META,
  TICKET_STATUS_META,
  fromPrimeSort,
  toOptions,
  toPrimeSort,
} from './models';

export type { LoadingVariant } from './components/loading-block/loading-block';

export { LoadingBlock } from './components/loading-block/loading-block';
export { LoadingDirective } from './directives/loading.directive';
export { FormField } from './components/form-field/form-field';
export type { PersianDateStyle } from './pipes/persian-date.pipe';
export type { TomanOptions } from './pipes/toman.pipe';

export { PersianDatePipe } from './pipes/persian-date.pipe';
export { PersianDigitsPipe } from './pipes/persian-digits.pipe';
export { TomanPipe } from './pipes/toman.pipe';
