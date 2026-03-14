/*
  Warnings:

  - You are about to drop the column `errorMessage` on the `logic_toop_executions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "logic_toop_executions" DROP COLUMN "errorMessage",
ADD COLUMN     "currentStepIndex" INTEGER NOT NULL DEFAULT 0;
