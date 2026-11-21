import { publicUrl } from './public-url';

describe('publicUrl', () => {
  it('keeps absolute http and https addresses', () => {
    expect(publicUrl('https://cdn.example/logo.png')).toBe('https://cdn.example/logo.png');
    expect(publicUrl('http://cdn.example/logo.png')).toBe('http://cdn.example/logo.png');
  });

  it('rejects missing, relative, and credentialed addresses', () => {
    expect(publicUrl()).toBeNull();
    expect(publicUrl('')).toBeNull();
    expect(publicUrl('/logo.png')).toBeNull();
    expect(publicUrl('https://user:secret@cdn.example/logo.png')).toBeNull();
    expect(publicUrl('javascript:alert(1)')).toBeNull();
  });
});
