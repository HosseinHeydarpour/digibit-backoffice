// src/app/features/categories/category-tree/category-tree.ts
//
// The categories screen — `/categories` (BO-G01).
//
// WHY THE TREE IS FILTERED IN THE BROWSER
// ---------------------------------------
// The catalogue is a handful of categories (eight roots, a few children in the
// mock). Asking the API on every keystroke would add a request, a loading state
// and a race for a list the client already holds; `filterTree` is a pure
// function with its own spec instead.
//
// WHY A MATCH KEEPS ITS PARENT
// ----------------------------
// A tree that drops a parent because the PARENT does not match leaves an orphan
// child floating at the root: the user searches «گوشی» and sees «لوازم جانبی»
// disappear while «گوشی سامسونگ» stays at depth 0, which reads like a bug. The
// filter keeps every ancestor of a match, and a matching parent keeps all of its
// children, so the shape of the tree never lies about the hierarchy.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { LoadingBlock } from '@shared/components/loading-block/loading-block';
import { PageHeader } from '@shared/components/page-header/page-header';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { PrimeTemplate } from 'primeng/api';
import type { TreeNode } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Tree } from 'primeng/tree';
import { catchError, of, take } from 'rxjs';

import { CategoryForm } from '../category-form/category-form';
import type { CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { filterTree } from './category-filter';

/**
 * How many of the fields below a node the tree renders (tc 3/4/5): the product
 * count, then the status pill. Both live in the default node template, so a
 * child looks exactly like its parent minus the indentation.
 */
@Component({
  selector: 'app-category-tree',
  imports: [
    CategoryForm,
    Dialog,
    EmptyState,
    ErrorState,
    IconField,
    InputIcon,
    InputText,
    LoadingBlock,
    PageHeader,
    PersianDigitsPipe,
    PrimeTemplate,
    Tree,
  ],
  templateUrl: './category-tree.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTree {
  private readonly categories = inject(CategoriesService);

  /**
   * The last fetch. `null` is "no answer yet" (skeleton), `[]` is "the shop has
   * no categories" — the same distinction the products list makes (BO-E07).
   */
  readonly tree = signal<readonly CategoryNode[] | null>(null);

  readonly failed = signal(false);

  readonly search = signal('');

  /** The dialog's state: closed, creating (null) or editing one node (BO-G02). */
  readonly dialogOpen = signal(false);

  readonly editing = signal<CategoryNode | null>(null);

  /**
   * The nodes at the edited node's level.
   *
   * TRACE — editing «دفتر و کاغذ» (child of «لوازم تحریر»):
   *
   *   1. `target.parentId` is `'pcat-stationery'` (not null), so the sibling list
   *      is NOT the roots.
   *   2. The root with that id is found and its children returned: the two
   *      stationery children.
   *   3. The form's duplicate check compares only against those two, so typing
   *      «لوازم تحریر» (a root) is accepted while typing «خودکار و روان‌نویس»
   *      is rejected. Creating (no target) returns the roots instead.
   */
  readonly siblings = computed<readonly CategoryNode[]>(() => {
    const target = this.editing();
    const roots = this.tree() ?? [];

    if (!target || target.parentId === null) {
      return roots;
    }

    return roots.find((node) => node.id === target.parentId)?.children ?? [];
  });

  /**
   * Where a NEW category lands: one past the last position at its level.
   *
   * This is what fixes «ترتیب گنگ»: the form used to default to 1, so every new
   * category collided with an existing one and the client-side sort had no
   * tie-breaker.
   */
  readonly nextOrder = computed(
    () => this.siblings().reduce((max, node) => Math.max(max, node.order), 0) + 1,
  );

  /** The node currently being dragged, and the row it hovers over (BO-G03). */
  readonly dragging = signal<CategoryNode | null>(null);

  readonly dropTarget = signal<string | null>(null);

  /** The nodes the `p-tree` renders: filtered, sorted, shaped for PrimeNG. */
  readonly nodes = computed<readonly TreeNode[]>(() =>
    toTreeNodes(filterTree(this.tree() ?? [], this.search())),
  );

  /** One branch condition for the template. */
  readonly state = computed<'loading' | 'error' | 'empty' | 'data'>(() => {
    if (this.failed()) {
      return 'error';
    }

    if (this.tree() === null) {
      return 'loading';
    }

    return this.tree()!.length === 0 ? 'empty' : 'data';
  });

  constructor() {
    this.load();
  }

  /** Retry after a failed fetch (tc 7). */
  retry(): void {
    this.load();
  }

  /** Open the dialog for a new ROOT category (BO-G02 tc 1). */
  openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  /** Open the dialog prefilled with an existing node (tc 2). */
  openEdit(node: CategoryNode): void {
    this.editing.set(node);
    this.dialogOpen.set(true);
  }

  /**
   * The form saved: close the dialog and refetch.
   *
   * Refetching rather than patching the array keeps one source of truth — the
   * server's tree — and is what makes the new row's ICON appear (tc 7/10).
   */
  onSaved(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
    this.load();
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  /**
   * Drag a row with the mouse (BO-G03).
   *
   * Native HTML5 drag (`draggable` + `dragstart`) does not start reliably inside
   * PrimeNG's tree — the node content already handles pointer events, and a
   * `draggable` child inside a non-draggable node never becomes the drag source
   * in Chromium. Pointer events are the primitive the browser actually fires, so
   * the row is grabbed on `pointerdown` and becomes a drag only after the cursor
   * moves 6px — a click is not a drag, and a drag is not a click.
   */
  onPointerDown(node: CategoryNode, event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    this.dragOrigin = { node, x: event.clientX, y: event.clientY };
    this.suppressClick = false;
  }

  onPointerMove(event: PointerEvent): void {
    const origin = this.dragOrigin;

    if (!origin || this.dragging()) {
      return;
    }

    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 6) {
      this.dragging.set(origin.node);
    }
  }

  /** Highlight a row the pointer is over, if a drop there would be accepted. */
  onPointerEnter(node: CategoryNode): void {
    if (this.dragging() && this.canDropOn(node)) {
      this.dropTarget.set(String(node.id));
    }
  }

  /** Release over a row → become its child. */
  onPointerUpOn(node: CategoryNode, event: PointerEvent): void {
    if (!this.dragging()) {
      this.resetDrag();
      return;
    }

    event.preventDefault();
    this.suppressClick = true;

    if (this.canDropOn(node)) {
      this.move(this.dragging()!, String(node.id));
      return;
    }

    this.resetDrag();
  }

  onPointerEnterRoot(): void {
    if (this.dragging()) {
      this.dropTarget.set('root');
    }
  }

  /** Release over the strip → become a top-level category. */
  onDropToRoot(event?: Event): void {
    event?.preventDefault();

    const dragged = this.dragging();

    if (!dragged) {
      return;
    }

    this.suppressClick = true;
    this.move(dragged, null);
  }

  /**
   * A pointerup leaves a `click` behind; after a real drag that click must not
   * reach PrimeNG's node handler, or dropping a row would also expand/collapse
   * it. One click is swallowed per drag.
   */
  onRowClick(event: MouseEvent): void {
    if (!this.suppressClick) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.suppressClick = false;
  }

  /**
   * A row accepts a drop when the target is a root, the dragged node is not that
   * root's child already, and the dragged node has no children of its own (the
   * tree is two levels, so moving a parent under another root would make three).
   */
  canDropOn(node: CategoryNode): boolean {
    const dragged = this.dragging();

    return (
      !!dragged &&
      dragged.id !== node.id &&
      node.parentId === null &&
      dragged.parentId !== node.id &&
      dragged.children.length === 0
    );
  }

  resetDrag(): void {
    this.dragOrigin = null;
    this.dragging.set(null);
    this.dropTarget.set(null);
  }

  private dragOrigin: { node: CategoryNode; x: number; y: number } | null = null;

  private suppressClick = false;

  private move(node: CategoryNode, parentId: string | null): void {
    this.categories
      .move(String(node.id), parentId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.resetDrag();
          this.load();
        },
        error: () => this.resetDrag(),
      });
  }

  /**
   * Enter / Space on a focused row toggles its branch (tc 9 keyboard).
   *
   * PrimeNG puts the only toggle button at `tabindex="-1"`, so a keyboard user
   * can never reach it: the row itself is focusable instead, and this forwards
   * the key to that button so the component's own expand/collapse logic runs —
   * including a bare `p-treenode` row that has no children, where there is
   * nothing to forward to and nothing happens.
   */
  onRowKeydown(event: KeyboardEvent, row: HTMLElement): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const toggle = row
      .closest('p-treenode')
      ?.querySelector<HTMLButtonElement>('button.p-tree-node-toggle-button');

    if (!toggle) {
      return;
    }

    event.preventDefault();
    toggle.click();
  }

  private load(): void {
    this.failed.set(false);

    this.categories
      .tree()
      .pipe(catchError(() => of(null)))
      .subscribe((tree) => {
        if (tree === null) {
          this.failed.set(true);
          return;
        }

        this.tree.set(tree);
      });
  }
}

/**
 * CategoryNode → PrimeNG `TreeNode`, sorted by `order` at every level.
 *
 * `expanded` is always true: tc 1 asks for two visible levels, and a user who
 * has to click every row to see what is inside is not reading a tree.
 *
 * SORTING IS DONE HERE, not trusted from the response: the API contract says
 * `order` decides the position, and a backend that forgets to sort (or a test
 * fixture written in another order) must not leak into the screen. A tree whose
 * roots are 4, 1, 7 reads like random data.
 *
 * TRACE — `{ id: 'c-1', name: 'لوازم تحریر', order: 1, icon: 'pi pi-pen-to-square',
 * children: [{ …دفتر و کاغذ, order: 1 }] }` becomes
 * `{ key: 'c-1', label: 'لوازم تحریر', expanded: true, data: <the node>,
 *    children: [{ key: 'c-1-1', label: 'دفتر و کاغذ', … }] }`.
 *
 * `data` carries the whole node so the row template can print `slug`,
 * `productCount` and `isActive` without a second lookup, and `label` is what the
 * Tree prints for a node without a custom template — the fallback if a future
 * page forgets to pass one.
 */
function toTreeNodes(nodes: readonly CategoryNode[]): TreeNode[] {
  return [...nodes]
    .sort((a, b) => a.order - b.order)
    .map((node) => ({
      key: node.id,
      label: node.name,
      data: node,
      expanded: true,
      children: toTreeNodes(node.children),
    }));
}
