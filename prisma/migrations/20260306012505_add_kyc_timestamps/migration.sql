-- AlterTable
ALTER TABLE "users" ADD COLUMN     "kycRequiredAt" TIMESTAMP(3),
ADD COLUMN     "kycSubmittedAt" TIMESTAMP(3);
