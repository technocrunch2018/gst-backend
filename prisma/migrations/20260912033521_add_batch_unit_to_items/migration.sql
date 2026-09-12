-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "batch_no" TEXT,
ADD COLUMN     "exp_date" TEXT,
ADD COLUMN     "mfg_date" TEXT,
ADD COLUMN     "unit_of_measure" TEXT NOT NULL DEFAULT 'Pcs';
