-- CreateTable
CREATE TABLE "RoomComment" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "elementId" TEXT,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "text" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomComment_roomId_createdAt_idx" ON "RoomComment"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "RoomComment_authorId_idx" ON "RoomComment"("authorId");

-- AddForeignKey
ALTER TABLE "RoomComment" ADD CONSTRAINT "RoomComment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomComment" ADD CONSTRAINT "RoomComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
