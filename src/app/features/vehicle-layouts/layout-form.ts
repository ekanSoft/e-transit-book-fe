import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, type ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { capacity, type SeatLayout } from '../../shared/seat-map/seat-layout';
import { SeatMap } from '../../shared/seat-map/seat-map';
import { Button } from '../../shared/ui/button';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { Icon, type IconName } from '../../shared/ui/icon';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { TripScheduleDraft, tripScheduleOrigin } from '../trips/trip-schedule-draft';
import {
  LayoutApi,
  layoutChanges,
  typeLabels,
  type LayoutInput,
  type VehicleLayout,
  type VehicleType,
} from './layout-api';
import { gridIssues, normalizeGrid } from './seat-editing';
import { SeatEditor } from './seat-editor';
import { presets, customPreset, type SeatPreset } from './seat-presets';

// The DTO trims before applying its Unicode character limit.
function layoutText(max: number): ValidatorFn {
  return (control) => {
    const value: string = control.value.trim();
    if (!value) return { required: true };
    return Array.from(value).length > max ? { maxlength: { requiredLength: max } } : null;
  };
}

const vehicleIcons: Record<VehicleType, IconName> = {
  CAR: 'car',
  SIENNA: 'car',
  BUS: 'bus',
  COASTER: 'bus',
  LUXURY_BUS: 'bus',
  BOAT: 'boat',
  OTHER: 'seat',
};

@Component({
  selector: 'app-layout-form',
  imports: [Field, Button, Errors, Icon, ManagementDialog, SeatMap, SeatEditor, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout-form.html',
  styleUrl: './layout-form.css',
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class LayoutForm implements OnInit {
  private readonly access = inject(WorkspaceAccess);
  private readonly api = inject(LayoutApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tripDraft = inject(TripScheduleDraft);
  private readonly notify = inject(Notifications);
  private readonly destroy = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly saved = input<VehicleLayout | null>(null);
  readonly name = new FormControl('', { nonNullable: true, validators: layoutText(120) });
  readonly customType = new FormControl('', { nonNullable: true, validators: layoutText(80) });
  readonly types = (Object.keys(typeLabels) as VehicleType[]).map((value) => ({
    value,
    label: typeLabels[value],
    icon: vehicleIcons[value],
  }));
  readonly type = signal<VehicleType | null>(null);
  private readonly editor = viewChild(SeatEditor);
  readonly singleDriver = computed(() => this.type() !== 'BOAT' && this.type() !== 'OTHER');
  private readonly original = computed<SeatPreset | null>(() => {
    const item = this.saved();
    return item
      ? {
          name: 'Saved arrangement',
          type: item.type,
          grid: normalizeGrid(item.seatLayout),
          capacity: capacity(item.seatLayout),
        }
      : null;
  });
  readonly options = computed(() => {
    const type = this.type();
    const choices = [...presets.filter((preset) => preset.type === type), customPreset];
    const original = this.original();
    return original ? [original, ...choices] : choices;
  });
  readonly previewFirst = computed(
    () => !!this.selected()?.type && this.selected() !== this.original(),
  );
  readonly step = signal<'details' | 'seating'>('details');
  readonly selected = signal<SeatPreset | null>(null);
  readonly pendingPreset = signal<SeatPreset | null>(null);
  readonly baseline = signal<SeatLayout | null>(null);
  readonly grid = signal<SeatLayout | null>(null);
  readonly attempted = signal(false);
  readonly checkedGrid = signal(false);
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly discard = signal(false);
  private resolveLeave?: (leave: boolean) => void;
  private savedSuccessfully = false;
  private arrangementType: VehicleType | null = null;
  private readonly scope = this.access.scope();
  readonly problems = computed(() => {
    const grid = this.grid();
    if (!grid) return ['Choose a starting arrangement.'];
    const sameSavedGrid = this.type() === this.saved()?.type && grid === this.original()?.grid;
    const issues = gridIssues(grid, this.singleDriver() && !sameSavedGrid);
    return issues.cells.size
      ? [...issues.summary, 'Check the highlighted seat numbers.']
      : issues.summary;
  });

  ngOnInit() {
    const item = this.saved();
    if (!item) return;
    this.name.setValue(item.name);
    this.type.set(item.type);
    this.customType.setValue(item.customType ?? '');
    this.start(this.original()!);
  }
  private focus(selector: string) {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
  details() {
    this.step.set('details');
    this.focus('#layout-name');
  }
  back() {
    const editor = this.editor();
    if (editor?.preview()) {
      editor.preview.set(false);
      this.focus('#seat-editor-mode');
      return;
    }
    this.details();
  }
  next() {
    this.attempted.set(true);
    this.name.markAsTouched();
    this.customType.markAsTouched();
    if (this.name.invalid) {
      this.details();
      return false;
    }
    if (!this.type()) {
      this.details();
      this.focus('input[name=vehicle-type]');
      return false;
    }
    if (this.type() === 'OTHER' && this.customType.invalid) {
      this.details();
      this.focus('#custom-type');
      return false;
    }
    const type = this.type();
    if (this.arrangementType !== type) {
      const original = this.original();
      if (original) {
        this.start(original);
      } else {
        this.arrangementType = type;
        this.selected.set(null);
        this.baseline.set(null);
        this.grid.set(null);
        this.checkedGrid.set(false);
      }
    }
    this.step.set('seating');
    this.focus('#arrangements');
    return true;
  }
  choose(preset: SeatPreset) {
    if (this.selected() === preset && this.grid() === this.baseline()) return;
    if (this.grid() && (this.saved() || this.grid() !== this.baseline()))
      this.pendingPreset.set(preset);
    else this.start(preset);
  }
  start(preset: SeatPreset) {
    this.arrangementType = this.type();
    this.selected.set(preset);
    this.baseline.set(preset.grid);
    this.grid.set(preset.grid);
    this.pendingPreset.set(null);
    this.checkedGrid.set(false);
  }
  setType(type: VehicleType) {
    this.type.set(type);
  }
  private draft(): LayoutInput {
    return {
      name: this.name.value.trim(),
      type: this.type()!,
      ...(this.type() === 'OTHER' ? { customType: this.customType.value.trim() } : {}),
      seatLayout: normalizeGrid(this.grid()!),
    };
  }
  dirty() {
    if (
      this.savedSuccessfully ||
      this.scope !== this.access.scope() ||
      !this.access.canWriteLayouts()
    )
      return false;
    const item = this.saved();
    if (!item) return !!(this.name.value || this.customType.value || this.type() || this.grid());
    return (
      Object.keys(
        layoutChanges({ ...item, seatLayout: normalizeGrid(item.seatLayout) }, this.draft()),
      ).length > 0
    );
  }
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  leave() {
    if (!this.dirty()) return true;
    if (this.busy()) return false;
    this.resolveLeave?.(false);
    this.discard.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolveLeave = resolve;
    });
  }
  answer(leave: boolean) {
    this.discard.set(false);
    this.resolveLeave?.(leave);
    this.resolveLeave = undefined;
  }
  async save() {
    if (this.busy() || !this.access.canWriteLayouts() || this.scope !== this.access.scope()) return;
    if (this.name.invalid || !this.type() || (this.type() === 'OTHER' && this.customType.invalid)) {
      this.next();
      return;
    }
    this.checkedGrid.set(true);
    if (this.problems().length) {
      this.editor()?.preview.set(false);
      this.focus('#grid-problems');
      return;
    }
    const draft = this.draft(),
      item = this.saved();
    const patch = item
      ? layoutChanges({ ...item, seatLayout: normalizeGrid(item.seatLayout) }, draft)
      : null;
    if (patch && !Object.keys(patch).length) {
      void this.router.navigate(['/app/vehicle-layouts', item!._id]);
      return;
    }
    this.errors.set([]);
    this.busy.set(true);
    try {
      const { data } =
        item && patch ? await this.api.update(item._id, patch) : await this.api.create(draft);
      if (this.destroy.destroyed || this.scope !== this.access.scope()) return;
      this.savedSuccessfully = true;
      this.notify.show(item ? 'Vehicle layout updated.' : 'Vehicle layout created.');
      const resumeTrip =
        !item &&
        this.route.snapshot.queryParamMap.get('from') === tripScheduleOrigin &&
        this.tripDraft.selectCreatedLayout(data);
      await this.router.navigate(resumeTrip ? ['/app/trips/new'] : ['/app/vehicle-layouts', data._id]);
    } catch (error) {
      if (this.destroy.destroyed || this.scope !== this.access.scope()) return;
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.name.setErrors({ server: 'A vehicle layout with this name already exists.' });
        this.name.markAsTouched();
        this.details();
      } else {
        this.errors.set(errorMessages(error));
        this.focus('#save-errors');
      }
    } finally {
      if (!this.destroy.destroyed) this.busy.set(false);
    }
  }
}
