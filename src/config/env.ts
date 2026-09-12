const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

export const env = {
  port: parseInt(process.env['PORT'] ?? '4000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '8h',
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  // Business config defaults (to be updated by admin)
  businessState: process.env['BUSINESS_STATE'] ?? 'MH', // 2-char state code
  // Invoice / PDF business details
  businessName: process.env['BUSINESS_NAME'] ?? 'Your Business Name',
  businessAddress: process.env['BUSINESS_ADDRESS'] ?? 'Your Business Address',
  businessGstin: process.env['BUSINESS_GSTIN'] ?? '',
  businessLicense: process.env['BUSINESS_LICENSE'] ?? '',
  businessPhone: process.env['BUSINESS_PHONE'] ?? '',
  businessEmail: process.env['BUSINESS_EMAIL'] ?? '',
  bankName: process.env['BANK_NAME'] ?? '',
  bankAccount: process.env['BANK_ACCOUNT'] ?? '',
  bankIfsc: process.env['BANK_IFSC'] ?? '',
  invoiceTerms: process.env['INVOICE_TERMS'] ?? '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction only.',
};
