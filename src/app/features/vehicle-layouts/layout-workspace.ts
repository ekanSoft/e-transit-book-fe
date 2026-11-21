import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { SeatMap } from '../../shared/seat-map/seat-map';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { LayoutApi, typeLabels } from './layout-api';
import { LayoutForm } from './layout-form';

@Component({
  selector: 'app-layout-workspace',
  imports: [SeatMap, LayoutForm, Button, Errors, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout-workspace.html',
  styleUrl: './layout-workspace.css',
})
export class LayoutWorkspace {
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(LayoutApi);
  private readonly route = inject(ActivatedRoute);
  private readonly form = viewChild(LayoutForm);
  readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id'),
  });
  readonly readOnly = this.route.snapshot.data['readOnly'] === true;
  readonly detail = resource({
    params: () =>
      this.id() && this.access.canViewLayouts()
        ? { id: this.id()!, scope: this.access.scope() }
        : undefined,
    loader: async ({ params }) => (await this.api.detail(params.id)).data,
  });
  readonly title = computed(() =>
    this.readOnly && this.detail.hasValue()
      ? this.detail.value().name
      : this.readOnly
        ? 'Vehicle layout'
        : this.id()
          ? 'Edit vehicle layout'
          : 'Create vehicle layout',
  );
  readonly typeLabels = typeLabels;
  readonly errors = errorMessages;
  leave() {
    return this.form()?.leave() ?? true;
  }
}
