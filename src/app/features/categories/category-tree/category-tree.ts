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
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Tree } from 'primeng/tree';
import { catchError, of } from 'rxjs';

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
 * CategoryNode → PrimeNG `TreeNode`.
 *
 * `expanded` is always true: tc 1 asks for two visible levels, and a user who
 * has to click every row to see what is inside is not reading a tree.
 *
 * TRACE — `{ id: 'c-1', name: 'لوازم تحریر', icon: 'pi pi-pen-to-square',
 * children: [{ …دفتر و کاغذ }] }` becomes
 * `{ key: 'c-1', label: 'لوازم تحریر', expanded: true, data: <the node>,
 *    children: [{ key: 'c-1-1', label: 'دفتر و کاغذ', … }] }`.
 *
 * `data` carries the whole node so the row template can print `slug`,
 * `productCount` and `isActive` without a second lookup, and `label` is what the
 * Tree prints for a node without a custom template — the fallback if a future
 * page forgets to pass one.
 */
function toTreeNodes(nodes: readonly CategoryNode[]): TreeNode[] {
  return nodes.map((node) => ({
    key: node.id,
    label: node.name,
    data: node,
    expanded: true,
    children: toTreeNodes(node.children),
  }));
}
