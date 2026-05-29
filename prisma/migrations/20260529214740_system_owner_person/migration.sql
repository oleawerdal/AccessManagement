-- AlterTable
ALTER TABLE "System" ADD COLUMN     "ownerPersonId" TEXT;

-- CreateIndex
CREATE INDEX "System_ownerPersonId_idx" ON "System"("ownerPersonId");

-- AddForeignKey
ALTER TABLE "System" ADD CONSTRAINT "System_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
