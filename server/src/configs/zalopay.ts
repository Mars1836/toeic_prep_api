export const configZalo = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpointCreate: "https://sb-openapi.zalopay.vn/v2/create",
  endpointQuery: "https://sb-openapi.zalopay.vn/v2/query",
  callbackUrl: (origin: string): string => `${origin}/api/pub/payment/callback`,
};
