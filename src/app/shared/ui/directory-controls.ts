import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, of, Subject, switchMap, timer } from 'rxjs';
import { Button } from './button';
import { Icon } from './icon';

@Component({
  selector: 'app-directory-search',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      class="directory-search"
      role="search"
      [attr.aria-label]="label()"
      (submit)="$event.preventDefault(); change(draft(), true)"
    >
      <app-icon name="search" />
      <input
        type="search"
        [attr.aria-label]="label()"
        [placeholder]="placeholder()"
        [value]="draft()"
        (input)="change(term.value)"
        #term
      />
      @if (draft()) {
        <button class="icon-button" type="button" aria-label="Clear search" (click)="clear(true)">
          <app-icon name="close" />
        </button>
      }
    </form>
  `,
})
export class DirectorySearch {
  readonly label = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly value = input('');
  readonly draft = linkedSignal(this.value);
  readonly changed = output<string>();
  private readonly term = viewChild.required<ElementRef<HTMLInputElement>>('term');
  private readonly terms = new Subject<{ value: string; immediate: boolean }>();

  constructor() {
    this.terms
      .pipe(
        switchMap(({ value, immediate }) =>
          immediate ? of(value) : timer(300).pipe(map(() => value)),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((value) => this.changed.emit(value));
  }

  change(value: string, immediate = false) {
    this.draft.set(value);
    this.terms.next({ value: value.trim(), immediate: immediate || !value });
  }

  clear(focus = false) {
    this.change('', true);
    if (focus) this.term().nativeElement.focus();
  }
}

type Pagination = {
  total: number;
  currentPage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

@Component({
  selector: 'app-directory-pager',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="pager directory-pager"
      [attr.aria-label]="plural() + ' pagination'"
      [hidden]="!page() && !waiting()"
    >
      @if (page(); as current) {
        <span role="status"
          >{{ current.total }} {{ current.total === 1 ? singular() : plural() }} · Page
          {{ current.currentPage }} of {{ current.totalPages }}</span
        >
      }
      <div>
        <button
          appButton
          variant="secondary"
          type="button"
          [attr.aria-disabled]="!page()?.hasPrev"
          (click)="move(-1)"
        >
          Previous
        </button>
        <button
          appButton
          variant="secondary"
          type="button"
          [attr.aria-disabled]="!page()?.hasNext"
          (click)="move(1)"
        >
          Next
        </button>
      </div>
    </nav>
  `,
})
export class DirectoryPager {
  readonly page = input<Pagination>();
  readonly waiting = input(false);
  readonly singular = input.required<string>();
  readonly plural = input.required<string>();
  readonly pageChange = output<number>();

  move(direction: -1 | 1) {
    const page = this.page();
    if (page && (direction === -1 ? page.hasPrev : page.hasNext)) {
      this.pageChange.emit(page.currentPage + direction);
    }
  }
}
