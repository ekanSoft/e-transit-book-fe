import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Session } from '../../core/auth/session';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { LayoutApi, type VehicleLayout } from './layout-api';
import { LayoutDirectory } from './layout-directory';
import { presets } from './seat-presets';

describe('layout directory', () => {
  const item: VehicleLayout = {
    _id: 'layout',
    name: 'Coach',
    type: 'BUS',
    capacity: 14,
    status: 'INACTIVE',
    seatLayout: presets[3].grid,
  };
  const result = {
    data: {
      content: [item],
      currentPage: 1,
      totalPages: 3,
      total: 25,
      hasPrev: false,
      hasNext: true,
    },
  };
  const api = { list: vi.fn(), toggle: vi.fn() };
  const allowed = signal(true);
  beforeEach(() => {
    vi.resetAllMocks();
    allowed.set(true);
    api.list.mockResolvedValue(result);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Session, useValue: {} },
        {
          provide: WorkspaceAccess,
          useValue: {
            canViewLayouts: allowed,
            canWriteLayouts: allowed,
            scope: signal({ business: 'a' }),
          },
        },
        { provide: LayoutApi, useValue: api },
      ],
    });
  });
  it('loads all statuses, pages on the server, and restarts filters on page one', async () => {
    const f = TestBed.createComponent(LayoutDirectory),
      c = f.componentInstance;
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Inactive');
    expect(api.list).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      search: '',
      type: '',
      status: '',
    });
    c.page(2);
    await f.whenStable();
    expect(api.list.mock.lastCall?.[0].page).toBe(2);
    c.typeFilter.setValue('BUS');
    c.statusFilter.setValue('INACTIVE');
    c.filter({ search: 'coach' });
    await f.whenStable();
    expect(api.list).toHaveBeenLastCalledWith({
      page: 1,
      limit: 10,
      search: 'coach',
      type: 'BUS',
      status: 'INACTIVE',
    });
  });
  it('requires confirmation and refreshes once after a pending toggle', async () => {
    const f = TestBed.createComponent(LayoutDirectory),
      c = f.componentInstance;
    await f.whenStable();
    await c.toggle();
    expect(api.toggle).not.toHaveBeenCalled();
    const menu = Object.assign(document.createElement('div'), { hidePopover: vi.fn() });
    c.confirm(item, document.createElement('button'), menu);
    api.toggle.mockResolvedValue({ data: { ...item, status: 'ACTIVE' } });
    await Promise.all([c.toggle(), c.toggle()]);
    await f.whenStable();
    expect(api.toggle).toHaveBeenCalledTimes(1);
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it('never requests an unauthorized catalog', async () => {
    allowed.set(false);
    const f = TestBed.createComponent(LayoutDirectory);
    await f.whenStable();
    expect(api.list).not.toHaveBeenCalled();
  });
  it('renders empty, failure and retry states', async () => {
    api.list
      .mockRejectedValueOnce(new Error('Unable to load layouts'))
      .mockResolvedValueOnce({ data: { ...result.data, total: 0, content: [] } });
    const f = TestBed.createComponent(LayoutDirectory);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Unable to load layouts');
    f.componentInstance.list.reload();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No vehicle layouts yet');
  });
});
