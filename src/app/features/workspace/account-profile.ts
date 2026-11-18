import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Session } from '../../core/auth/session';
import { Theme } from '../../core/layout/theme';
import { Icon } from '../../shared/ui/icon';
import { employeeRoleLabel } from '../../shared/utilities/employee-role';
@Component({
  selector: 'app-account-profile',
  imports: [TitleCasePipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-profile.html',
})
export class AccountProfile {
  readonly session = inject(Session);
  readonly roleLabel = employeeRoleLabel;
  readonly theme = inject(Theme);
}
