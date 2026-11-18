import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { Field } from './field';
import { FileUpload, MAX_FILE_SIZE } from './file-upload';
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
