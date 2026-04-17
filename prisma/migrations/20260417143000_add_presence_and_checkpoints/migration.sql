-- CreateTable
CREATE TABLE "RoomCheckpoint" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomPresenceSnapshot" (
    "roomId" TEXT NOT NULL,
    "onlineCount" INTEGER NOT NULL,
    "sampledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomPresenceSnapshot_pkey" PRIMARY KEY ("roomId")
);

-- CreateIndex
CREATE INDEX "RoomCheckpoint_roomId_createdAt_idx" ON "RoomCheckpoint"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "RoomCheckpoint_authorId_idx" ON "RoomCheckpoint"("authorId");

-- AddForeignKey
ALTER TABLE "RoomCheckpoint" ADD CONSTRAINT "RoomCheckpoint_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomCheckpoint" ADD CONSTRAINT "RoomCheckpoint_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomPresenceSnapshot" ADD CONSTRAINT "RoomPresenceSnapshot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
