import { z } from 'zod';

export const CategorySchema = z.enum([
  'otp',
  'bank/account',
  'bank/promotional',
  'finance/stocks',
  'invoice/orders',
  'travel',
  'work/microsoft',
  'work/amdocs',
  'jobs',
  'promotions',
  'spam-like',
  'personal',
]);

export type Category = z.infer<typeof CategorySchema>;

export const CATEGORY_INFO: Record<Category, { protected: boolean; description: string }> = {
  'otp': { protected: true, description: '2FA/verification codes' },
  'bank/account': { protected: true, description: 'Bank statements, account alerts, KYC' },
  'bank/promotional': { protected: true, description: 'Bank promotional offers (protected from cleanup)' },
  'finance/stocks': { protected: true, description: 'Broker, stocks, dividends, IPO' },
  'invoice/orders': { protected: true, description: 'Order confirmations, receipts' },
  'travel': { protected: true, description: 'Flights, hotels, trains' },
  'work/microsoft': { protected: true, description: 'Current employer (Microsoft)' },
  'work/amdocs': { protected: true, description: 'Previous employer (Amdocs)' },
  'jobs': { protected: true, description: 'Recruiters, job applications' },
  'promotions': { protected: false, description: 'Marketing, newsletters' },
  'spam-like': { protected: false, description: 'Bulk/unverified senders' },
  'personal': { protected: false, description: 'Everything else, unclassified' },
};

export const PROTECTED_CATEGORIES = new Set(
  (Object.entries(CATEGORY_INFO)
    .filter(([, info]) => info.protected)
    .map(([cat]) => cat))
);
