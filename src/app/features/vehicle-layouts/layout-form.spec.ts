import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { TripScheduleDraft, type ScheduleDraft } from '../trips/trip-schedule-draft';
import { LayoutApi, type VehicleLayout } from './layout-api';
import { LayoutForm } from './layout-form';
import { customPreset, presets } from './seat-presets';
import { labelSeat, paint } from './seat-editing';

describe('layout workspace drafts', () => {
  const api = { create: vi.fn(), update: vi.fn() };
  const saved: VehicleLayout = {
    _id: 'layout',
    type: 'OTHER',
    customType: 'Coach',
    name: 'Coach A',
    status: 'ACTIVE',
    capacity: 4,
    seatLayout: labelSeat(presets[0].grid, { row: 2, column: 0 }, '2B'),
  };
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LayoutApi, useValue: api },
        {
          provide: WorkspaceAccess,
          useValue: {
            scope: signal({ business: 'tenant' }),
            canWriteLayouts: signal(true),
            canScheduleTrip: signal(true),
          },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  function open(record?: VehicleLayout) {
    const f = TestBed.createComponent(LayoutForm);
    if (record) f.componentRef.setInput('saved', record);
    f.detectChanges();
    return f.componentInstance;
  }

  it.each([
    ['trip-schedule', true, true],
    [null, true, false],
    ['trip-schedule', false, false],
  ] as const)('scopes the creation return to Trips (%s, draft %s)', async (from, hasDraft, resumes) => {
    const tripDraft = TestBed.inject(TripScheduleDraft);
    const draft: ScheduleDraft = {
      step: 1,
      route: 'route',
      layout: 'old-layout',
      departure: '2099-01-12T23:40',
      arrival: '2099-01-13T01:10',
      fare: '18000',
      overrides: [{ seatNumber: 'missing-seat', fare: 22000 }],
      removed: [],
    };
    tripDraft.saved.set(hasDraft ? draft : null);
    vi.spyOn(TestBed.inject(ActivatedRoute).snapshot.queryParamMap, 'get').mockReturnValue(from);
    api.create.mockResolvedValue({ data: saved });

    const form = open();
    form.name.setValue('Coach');
    form.setType('BUS');
    form.start(presets[3]);
    await form.save();

    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
      resumes ? ['/app/trips/new'] : ['/app/vehicle-layouts', saved._id],
    );
    expect(tripDraft.saved()).toEqual(
      resumes
        ? { ...draft, layout: saved._id, overrides: [], removed: ['missing-seat'] }
        : hasDraft ? draft : null,
    );
  });
  it.each([
    ['creating', null],
    ['editing', saved],
  ] as const)(
    'goes Back from preview to the editor and then to details while %s',
    async (_, record) => {
      const fixture = TestBed.createComponent(LayoutForm);
      fixture.componentRef.setInput('saved', record);
      await fixture.whenStable();

      const form = fixture.componentInstance;
      const host: HTMLElement = fixture.nativeElement;
      const back = () => host.querySelector<HTMLButtonElement>('.form-footer button[type=button]');
      const advance = () =>
        host.querySelector<HTMLButtonElement>('.form-footer button[type=submit]')!.click();
      expect(back()).toBeNull();

      form.name.setValue('Coach draft');
      form.setType(record?.type ?? 'CAR');
      advance();
      await fixture.whenStable();
      if (!record) form.choose(presets[0]);
      const preset = form.selected();
      const grid = labelSeat(form.grid()!, { row: 2, column: 0 }, 'VIP');
      form.grid.set(grid);
      await fixture.whenStable();

      const mode = host.querySelector<HTMLButtonElement>('#seat-editor-mode')!;
      if (!record) {
        mode.click();
        await fixture.whenStable();
      }
      host
        .querySelector<HTMLButtonElement>('button.cell[aria-label="Row 2, position 1, Seat VIP"]')!
        .click();
      const aisle = Array.from(host.querySelectorAll<HTMLButtonElement>('.tools button')).find(
        (button) => button.textContent?.trim() === 'Aisle',
      )!;
      aisle.click();
      mode.click();
      await fixture.whenStable();
      expect(mode.getAttribute('aria-pressed')).toBe('true');
      expect(host.querySelector('#seat-number')).toBeNull();

      expect(back()?.textContent).toBe('Back');
      back()!.click();
      await fixture.whenStable();
      expect(form.step()).toBe('seating');
      expect(mode.getAttribute('aria-pressed')).toBe('false');
      expect(document.activeElement).toBe(mode);
      expect(host.querySelector<HTMLInputElement>('#seat-number')?.value).toBe('VIP');
      expect(host.querySelector('.tools button[aria-pressed=true]')?.textContent?.trim()).toBe(
        'Aisle',
      );
      expect(form.grid()).toBe(grid);

      back()!.click();
      await fixture.whenStable();
      expect(back()).toBeNull();
      expect(document.activeElement).toBe(host.querySelector('#layout-name'));
      expect(form.name.value).toBe('Coach draft');
      expect(form.customType.value).toBe(record?.customType ?? '');
      form.name.setValue('Updated coach draft');
      advance();
      await fixture.whenStable();

      expect(back()).not.toBeNull();
      expect(form.selected()).toBe(preset);
      expect(form.grid()).toBe(grid);
      expect(form.discard()).toBe(false);
      expect(api.create).not.toHaveBeenCalled();
      expect(api.update).not.toHaveBeenCalled();
    },
  );
  it('requires details, a custom type for Other and a passenger in the grid', async () => {
    const c = open();
    expect(c.next()).toBe(false);
    c.name.setValue('Coach');
    c.setType('OTHER');
    expect(c.next()).toBe(false);
    c.customType.setValue('Van');
    expect(c.next()).toBe(true);
    c.start(customPreset);
    await c.save();
    expect(api.create).not.toHaveBeenCalled();
    c.grid.set(paint(c.grid()!, { row: 2, column: 1 }, 'SEAT', false));
    api.create.mockResolvedValue({ data: saved });
    await c.save();
    expect(api.create).toHaveBeenCalledWith({
      name: 'Coach',
      type: 'OTHER',
      customType: 'Van',
      seatLayout: c.grid(),
    });
  });
  it('keeps seat edits until advancing with a different vehicle type', () => {
    const form = open();
    form.name.setValue('Test layout');
    form.setType('CAR');
    form.next();
    form.choose(presets[0]);
    const edited = labelSeat(form.grid()!, { row: 2, column: 0 }, 'VIP');
    form.grid.set(edited);
    form.details();
    form.setType('COASTER');

    expect(form.step()).toBe('details');
    expect(form.grid()).toBe(edited);
    form.name.setValue('Renamed layout');
    form.setType('CAR');
    expect(form.next()).toBe(true);
    expect(form.grid()).toBe(edited);

    form.details();
    form.setType('COASTER');
    expect(form.next()).toBe(true);

    expect(form.step()).toBe('seating');
    expect(form.options().map(({ name }) => name)).toEqual(['Coaster 30', 'Custom layout']);
    expect(form.grid()).toBeNull();
    expect(form.selected()).toBeNull();
  });

  it('keeps the saved arrangement available when changing the type of a saved layout', () => {
    const form = open(saved);
    form.setType('COASTER');
    expect(form.next()).toBe(true);
    expect(form.options().map(({ name }) => name)).toEqual([
      'Saved arrangement',
      'Coaster 30',
      'Custom layout',
    ]);
    expect(form.grid()).toEqual(saved.seatLayout);
  });
  it('keeps the draft through a duplicate name, then submits once after correction', async () => {
    const c = open();
    c.setType('BUS');
    c.name.setValue(' Coach ');
    c.next();
    c.start(presets[3]);
    api.create.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
    await c.save();
    expect(c.name.hasError('server')).toBe(true);
    expect(c.step()).toBe('details');
    expect(c.grid()).toEqual(presets[3].grid);
    c.name.setValue(' Coach 2 ');
    c.next();
    api.create.mockResolvedValueOnce({ data: saved });
    await Promise.all([c.save(), c.save()]);
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(api.create).toHaveBeenLastCalledWith({
      name: 'Coach 2',
      type: 'BUS',
      seatLayout: presets[3].grid,
    });
    expect(c.dirty()).toBe(false);
  });
  it('keeps the saved map on metadata edits and omits old custom type', async () => {
    const c = open(saved);
    expect(c.grid()).toEqual(saved.seatLayout);
    expect(c.dirty()).toBe(false);
    c.name.setValue('Changed');
    c.setType('SIENNA');
    api.update.mockResolvedValue({ data: saved });
    await c.save();
    expect(api.update).toHaveBeenCalledWith('layout', { name: 'Changed', type: 'SIENNA' });
  });
  it('sends a complete changed grid and protects unsaved labels on navigation', async () => {
    const c = open(saved);
    const edited = labelSeat(c.grid()!, { row: 2, column: 1 }, '3A');
    c.grid.set(edited);
    const decision = c.leave();
    expect(c.discard()).toBe(true);
    c.answer(false);
    expect(await decision).toBe(false);
    const discard = c.leave();
    c.answer(true);
    expect(await discard).toBe(true);
    api.update.mockResolvedValue({ data: saved });
    await c.save();
    expect(api.update).toHaveBeenCalledWith('layout', { seatLayout: edited });
  });
});
