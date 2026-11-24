import { publicConfig } from './public-config.generated';

export const environment = {
  production: true,
  apiBaseUrl: publicConfig.apiBaseUrl || '/api/v1',
  publicBookingOrigin: publicConfig.publicBookingOrigin,
};
