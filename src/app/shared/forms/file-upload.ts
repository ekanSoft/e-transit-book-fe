import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Icon } from '../ui/icon';
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
@Component({
  selector: 'app-file-upload',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="upload-control">
    <label [for]="id()">{{ label() }}</label>
    <div class="upload-area" [class.upload-invalid]="error()">
      <app-icon name="upload" />
      <div>
        <span class="upload-title">{{
          file()?.name || (existing() ? 'File already uploaded' : 'Choose a file to upload')
        }}</span
        ><span class="muted small">{{ hint() }} · Up to 20 MB</span>
      </div>
      <input
        #picker
        [id]="id()"
        type="file"
        [accept]="accept()"
        [disabled]="disabled()"
        (change)="select($event)"
        [attr.aria-describedby]="id() + '-error'"
        [attr.aria-invalid]="!!error()"
      />
    </div>
    @if (file() || error()) {
      <button type="button" class="text-button" [disabled]="disabled()" (click)="remove(picker)">
        {{ file() ? 'Remove selected file' : 'Clear file selection' }}
      </button>
    }
    @if (existing() && !file()) {
      <p class="field-hint">Choose a new file to replace the saved document.</p>
    }
    <p class="field-error" [id]="id() + '-error'" role="status">{{ error() }}</p>
  </div>`,
})
export class FileUpload {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly accept = input('');
  readonly hint = input('Document');
  readonly existing = input(false);
  readonly disabled = input(false);
  readonly changed = output<File | null>();
  readonly validity = output<boolean>();
  readonly file = signal<File | null>(null);
  readonly error = signal('');
  select(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const invalidType = this.accept() === 'image/*' && !file.type.startsWith('image/');
    if (file.size > MAX_FILE_SIZE || file.size === 0 || invalidType) {
      this.error.set(
        invalidType
          ? 'Choose an image for your logo.'
          : file.size === 0
            ? 'This file is empty. Choose another file.'
            : 'Choose a file smaller than 20 MB.',
      );
      this.file.set(null);
      this.changed.emit(null);
      this.validity.emit(false);
      input.value = '';
      return;
    }
    this.error.set('');
    this.file.set(file);
    this.changed.emit(file);
    this.validity.emit(true);
  }
  remove(input: HTMLInputElement) {
    input.value = '';
    this.file.set(null);
    this.error.set('');
    this.changed.emit(null);
    this.validity.emit(true);
  }
}
