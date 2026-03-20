-- AlterTable: add nullable userId to lead_messages for authorship tracking
ALTER TABLE "lead_messages" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "lead_messages" ADD CONSTRAINT "lead_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
