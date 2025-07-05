-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'STARTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "status" "GameStatus" NOT NULL DEFAULT 'WAITING';
