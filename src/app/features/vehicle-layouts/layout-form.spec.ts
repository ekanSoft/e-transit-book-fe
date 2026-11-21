import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
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
          useValue: { scope: signal({ business: 'tenant' }), canWriteLayouts: signal(true) },
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
