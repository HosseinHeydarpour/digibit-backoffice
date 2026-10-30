// src/app/features/categories/category-tree/category-tree.ts
//
// The categories screen — `/categories` (BO-G01/G02/G03).
//
// WHY THE TREE IS RENDERED AS LISTS, NOT `p-tree`
// -----------------------------------------------
// `p-tree` owns its own DOM: its toggler is a `tabindex="-1"` button, its empty
// state prints an English line, its chevron points right in RTL, and its rows
// fought the responsive layout on a phone. More importantly, drag & drop needs a
// CONTAINER per level — one drop list for the roots and one per parent — and
// `p-tree` exposes no such containers.
//
// The page therefore renders `ul cdkDropList` lists itself: @angular/cdk was
// already a dependency, and its drag & drop gives what the screen needs without
// hand-rolled pointer bookkeeping — a visible drag preview, a placeholder where
// the row will land, animated reordering, touch support, Escape to cancel, a
// keyboard mode (Space to lift, arrows to move, Escape to drop back) and,
// critically, an item that is dropped outside any list returns to where it was
// instead of leaving the page stuck in a drag state.
//
// ORDER IS A SLOT, NOT A NUMBER
// -----------------------------
// A drop sends `{ parentId, order }` and the server re-sequences the level to
// 1..N. Dropping «باتری» at the top makes it 1 and pushes the old 1 to 2, which
// is the behaviour a user expects from a list, and it keeps two rows from
// claiming the same position.

import { DragDropModule, CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { LoadingBlock } from '@shared/components/loading-block/loading-block';
import { PageHeader } from '@shared/components/page-header/page-header';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { catchError, of, take } from 'rxjs';

import { CategoryForm } from '../category-form/category-form';
import type { CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { filterTree } from './category-filter';

@Component({
  selector: 'app-category-tree',
  imports: [
    CategoryForm,
    Dialog,
    DragDropModule,
    EmptyState,
    ErrorState,
    IconField,
    InputIcon,
    InputText,
    LoadingBlock,
    NgTemplateOutlet,
    PageHeader,
    PersianDigitsPipe,
  ],
  templateUrl: './category-tree.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTree {
  private readonly categories = inject(CategoriesService);

  /** `null` = no answer yet (skeleton), `[]` = the shop has no categories. */
  readonly tree = signal<readonly CategoryNode[] | null>(null);

  readonly failed = signal(false);

  readonly search = signal('');

  /** The roots after the search filter, in `order`. */
  readonly roots = computed(() => byOrder(filterTree(this.tree() ?? [], this.search())));

  /** Collapsed branches; a freshly loaded tree starts fully open (tc 1). */
  private readonly collapsed = signal<ReadonlySet<string>>(new Set());

  readonly dialogOpen = signal(false);

  readonly editing = signal<CategoryNode | null>(null);

  /** The row currently being dragged — used to style the preview and the list. */
  readonly dragging = signal<CategoryNode | null>(null);

  readonly state = computed<'loading' | 'error' | 'empty' | 'data'>(() => {
    if (this.failed()) {
      return 'error';
    }

    if (this.tree() === null) {
      return 'loading';
    }

    return this.tree()!.length === 0 ? 'empty' : 'data';
  });

  /** Where a NEW category lands: one past the last sibling (BO-G02). */
  readonly nextOrder = computed(
    () => this.siblings().reduce((max, node) => Math.max(max, node.order), 0) + 1,
  );

  /**
   * The nodes at the edited node's level.
   *
   * TRACE — editing «دفتر و کاغذ» (child of «لوازم تحریر»):
   *
   *   1. `target.parentId` is `'pcat-stationery'` (not null), so the sibling list
   *      is NOT the roots.
   *   2. The root with that id is found and its children returned.
   *   3. Typing «لوازم تحریر» (a root) is accepted; «خودکار و روان‌نویس» is not.
   */
  readonly siblings = computed<readonly CategoryNode[]>(() => {
    const target = this.editing();
    const roots = this.tree() ?? [];

    if (!target || target.parentId === null) {
      return roots;
    }

    const parent = roots.find((node) => node.id === target.parentId);

    return parent ? parent.children : roots;
  });

  constructor() {
    this.load();
  }

  retry(): void {
    this.load();
  }

  /** Expand/collapse one branch. */
  toggle(node: CategoryNode): void {
    const next = new Set(this.collapsed());
    const key = String(node.id);

    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    this.collapsed.set(next);
  }

  isExpanded(node: CategoryNode): boolean {
    return !this.collapsed().has(String(node.id));
  }

  openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(node: CategoryNode): void {
    this.editing.set(node);
    this.dialogOpen.set(true);
  }

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
   * A child list accepts only leaves: the tree is two levels, so moving a parent
   * under another root would create a third. `cdkDropListEnterPredicate` runs
   * while hovering, so the list simply does not light up.
   */
  readonly leafOnly = (drag: CdkDrag): boolean => {
    const node = drag.data as CategoryNode | undefined;

    return !!node && node.children.length === 0;
  };

  /**
   * Every drop list that is on screen, by id — the price of nesting the tree.
   *
   * CDK shadows `CDK_DROP_LIST_GROUP` with `undefined` on a drop list element, so
   * a list nested inside another list (each parent's `ul` lives inside the roots
   * `ul`) is NOT in the group: the child list could only exchange rows with
   * itself, and a child dropped on the root zone fell back into its own list,
   * which looked like "the box does nothing". `cdkDropListConnectedTo` is the
   * supported way out and it needs the ids of the lists that exist *right now*: a
   * collapsed branch or an active search renders no child list, and an id that
   * resolves to nothing leaves `undefined` in CDK's sibling array, which throws
   * mid-drag.
   */
  readonly droppableLists = computed<string[]>(() => [
    'category-roots',
    'category-root-zone',
    ...(this.search() === ''
      ? this.roots()
          .filter((node) => node.children.length > 0 && this.isExpanded(node))
          .map((node) => this.childrenListId(node.id))
      : []),
  ]);

  /** The id of one parent's children list — see `droppableLists`. */
  childrenListId(id: string): string {
    return `category-children-${id}`;
  }

  /**
   * A click anywhere on a row opens its branch. A leaf has nothing to open, and
   * the grip, the chevron and the pencil stop the click on their own.
   */

  /**
   * One drop, two origins (BO-G03).
   *
   * TRACE — «دفتر و کاغذ» (child of «لوازم تحریر») is dragged onto the root list
   * and dropped between «کابل» and «لوازم جانبی موبایل»:
   *
   *   1. CDK reports `previousContainer` = the stationery children list and
   *      `container` = the root list, `currentIndex` = 3.
   *   2. Same-container or not, the persistence is the same call: `place(node,
   *      parentId, currentIndex + 1)` — the server renumbers both levels, so the
   *      client never has to patch a list of orders.
   *   3. `parentId` is the target list's owner: `null` for the root list, a
   *      root's id for its children list.
   *   4. The refetch replaces the optimistic order with the server's, and the
   *      row lands at position 4.
   */
  drop(event: CdkDragDrop<readonly CategoryNode[]>, parentId: string | null): void {
    const moved = event.item.data as CategoryNode | undefined;

    if (!moved) {
      return;
    }

    this.place(moved, parentId, event.currentIndex + 1);
  }

  /** `cdkDropListData` for the root zone; the list is intentionally empty. */
  readonly rootDropZone: readonly CategoryNode[] = [];

  /**
   * Release on the "make it a root" zone → append to the roots.
   *
   * The zone is an empty drop list, so `currentIndex` is always 0; appending is
   * what a user means by "move it out of this branch", not "make it first".
   */
  dropToRoot(event: CdkDragDrop<readonly CategoryNode[]>): void {
    const moved = event.item.data as CategoryNode | undefined;

    if (!moved) {
      return;
    }

    this.place(moved, null, this.roots().length + 1);
  }

  onDragStarted(node: CategoryNode): void {
    this.dragging.set(node);
  }

  onDragEnded(): void {
    this.dragging.set(null);
  }

  private place(node: CategoryNode, parentId: string | null, order: number): void {
    this.categories
      .place(String(node.id), parentId, order)
      .pipe(take(1))
      .subscribe({
        next: () => this.load(),
        // A refused move (third level, cycle) is already reported by the
        // interceptor; reloading puts the row back where the server has it.
        error: () => this.load(),
      });
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
 * Sort every level by `order` — the client does not trust the response order.
 *
 * A backend that forgets to sort (or a fixture written in another order) must not
 * leak onto the screen; positions are contiguous 1..N per level, so this is a
 * stable, deterministic sort.
 */
function byOrder(nodes: readonly CategoryNode[]): readonly CategoryNode[] {
  return [...nodes]
    .sort((a, b) => a.order - b.order)
    .map((node) => ({ ...node, children: byOrder(node.children) }));
}
