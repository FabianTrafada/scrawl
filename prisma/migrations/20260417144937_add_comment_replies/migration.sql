-- AlterTable
ALTER TABLE "RoomComment" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "RoomComment_roomId_parentId_createdAt_idx" ON "RoomComment"("roomId", "parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoomComment" ADD CONSTRAINT "RoomComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RoomComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
