import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { Field } from './field';
import { FileUpload, MAX_FILE_SIZE } from './file-upload';
import { SearchableSelect } from './searchable-select';
describe('Accessible form controls', () => {
  it('updates OnPush validation when the parent marks the control touched', async () => {
    const fixture = TestBed.createComponent(Field);
    const control = new FormControl('', { nonNullable: true, validators: Validators.required });
    fixture.componentRef.setInput('id', 'test-email');
    fixture.componentRef.setInput('label', 'email');
    fixture.componentRef.setInput('control', control);
    await fixture.whenStable();
    control.markAsTouched();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#test-email-hint')?.textContent).toContain('Enter email');
    expect(element.querySelector('label')?.htmlFor).toBe('test-email');
  });
  it.each(['', 'marina'])(
    'opens the selection dropdown without an active option (%s)',
    async (value) => {
      const fixture = TestBed.createComponent(SearchableSelect);
      const control = new FormControl(value, { nonNullable: true });
      fixture.componentRef.setInput('id', 'terminal');
      fixture.componentRef.setInput('label', 'Assigned terminal');
      fixture.componentRef.setInput('control', control);
      fixture.componentRef.setInput('options', [
        { value: 'marina', label: 'Marina' },
        { value: 'ikeja', label: 'Ikeja' },
      ]);
      fixture.componentRef.setInput('placeholder', 'Select a terminal');
      fixture.componentRef.setInput('searchLabel', 'Search terminals');
      fixture.componentRef.setInput('actionLabel', 'Add terminal');
      const action = vi.fn();
      fixture.componentInstance.action.subscribe(action);
      await fixture.whenStable();

      const field = fixture.nativeElement as HTMLElement;
      const trigger = field.querySelector<HTMLButtonElement>('button#terminal')!;
      expect(trigger.textContent?.trim()).toBe(value ? 'Marina' : 'Select a terminal');
      expect(field.querySelector('input')).toBeNull();
      expect(field.querySelectorAll('button')).toHaveLength(1);

      trigger.click();
      await fixture.whenStable();
      const dropdown = field.querySelector('#terminal-dropdown')!;
      const search = dropdown.querySelector('input')!;
      expect(search.getAttribute('aria-label')).toBe('Search terminals');
      expect(search.getAttribute('aria-activedescendant')).toBeNull();
      expect(dropdown.querySelector('[data-active="true"]')).toBeNull();
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      search.dispatchEvent(enter);
      await fixture.whenStable();
      expect(enter.defaultPrevented).toBe(true);
      expect(search.getAttribute('aria-expanded')).toBe('true');
      expect(control.value).toBe(value);
      dropdown.querySelector('button')!.click();
      await fixture.whenStable();

      expect(action).toHaveBeenCalledWith(trigger);
      expect(control.value).toBe(value);
      expect(field.querySelector('input')).toBeNull();
    },
  );
  it('rejects oversized files and allows clearing the invalid selection', () => {
    const fixture = TestBed.createComponent(FileUpload);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'document');
    fixture.componentRef.setInput('label', 'Document');
    const file = new File(['test'], 'document.pdf');
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    component.select({ target: input } as unknown as Event);
    expect(component.error()).toContain('20 MB');
    expect(component.file()).toBeNull();
    component.remove(input);
    expect(component.error()).toBe('');
  });
});
