import { profileFormData, verificationFormData } from './onboarding-api';
describe('Backend multipart contract', () => {
  it('encodes address as JSON, uses supportContact, and normalizes both phones', () => {
    const data = profileFormData(
      {
        name: ' Test Transport ',
        email: 'TEST@EXAMPLE.COM ',
        contactPhoneNumber: '08012345678',
        supportContact: '2348098765432',
        businessType: 'TRANSPORTATION',
        address: {
          street: ' 12 Allen Avenue ',
          city: 'Ikeja',
          stateCode: 'LA',
        },
      },
      null,
    );
    expect(data.get('contactPhoneNumber')).toBe('+2348012345678');
    expect(data.get('supportContact')).toBe('+2348098765432');
    expect(data.has('supportPhoneNumber')).toBe(false);
    expect(data.get('email')).toBe('test@example.com');
    expect(JSON.parse(String(data.get('address')))).toEqual({
      street: '12 Allen Avenue',
      city: 'Ikeja',
      state: 'Lagos',
      stateCode: 'LA',
    });
    expect(data.has('logo')).toBe(false);
  });
  it('preserves exact document field names and sends file objects', () => {
    const file = new File(['document'], 'certificate.pdf', { type: 'application/pdf' });
    const data = verificationFormData(' RC123 ', {
      certificateOfIncorporation: file,
      formCAC: file,
      memorandumAndArticle: file,
    });
    expect([...data.keys()]).toEqual([
      'rcNumber',
      'certificateOfIncorporation',
      'formCAC',
      'memorandumAndArticle',
    ]);
    expect(data.get('rcNumber')).toBe('RC123');
    expect(data.get('formCAC')).toBeInstanceOf(File);
  });
  it('allows document-only verification and omits blank RC numbers', () =>
    expect(
      verificationFormData(' ', { formCAC: new File(['document'], 'cac.pdf') }).has('rcNumber'),
    ).toBe(false));
});
