import { publicConfig } from './public-config.generated';

export const environment = {
  production: false,
  apiBaseUrl: publicConfig.apiBaseUrl || 'http://localhost:4500/api/v1',
  publicBookingOrigin: publicConfig.publicBookingOrigin,
};
