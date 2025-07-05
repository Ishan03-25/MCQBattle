import { Router } from "express";
import prisma from "../prisma/client";
import { userMiddleware } from "../middleware/userMiddleware";
import pusher from "../utils/pusher";

export const playerRequestRouter = Router();

playerRequestRouter.use(userMiddleware);

playerRequestRouter.post("/makeRequest/:gameId", async (req, res) => {
  const userId = req.body.userId;
  const { gameId } = req.params;

  try {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game){
        res.status(404).json({ error: "Game not found" });
        return
    } 

    const existing = await prisma.playerRequest.findUnique({
      where: { gameId_userId: { gameId, userId } },
    });
    if (existing){
        res.status(400).json({ error: "Request already exists" });
        return
    }

    const request = await prisma.playerRequest.create({
      data: {
        gameId,
        userId,
      },
    });

    // Notify game creator via Pusher
    await pusher.trigger(`game-${gameId}`, "player-request", {
      userId,
      requestId: request.id,
    });

    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create request" });
  }
});

playerRequestRouter.post("/game/:gameId", async (req, res) => {
  const userId = req.body.userId;
  const { gameId } = req.params;

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.userId !== userId) {
     res.status(403).json({ error: "Unauthorized" });
     return
  }

  const requests = await prisma.playerRequest.findMany({
    where: { gameId },
    include: { user: true },
  });

  res.json(requests);
});

playerRequestRouter.patch("/:requestId/approve", async (req, res) => {
  const userId = req.body.userId;
  const { requestId } = req.params;

  const request = await prisma.playerRequest.findUnique({
    where: { id: requestId },
    include: { game: true },
  });

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return
  }
  if (request.game.userId !== userId){
    res.status(403).json({ error: "Unauthorized" });
    return
  }

  const updated = await prisma.playerRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" },
  });

  await prisma.player.create({
    data: {
      gameId: request.gameId,
      userId: request.userId,
    },
  });

  await pusher.trigger(`game-${request.gameId}`, "player-approved", {
    userId: request.userId,
  });

  res.json(updated);
});
playerRequestRouter.patch("/:requestId/reject", async (req, res) => {
  const userId = req.body.userId;
  const { requestId } = req.params;

  try {
    const request = await prisma.playerRequest.findUnique({
      where: { id: requestId },
      include: { game: true },
    });

    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return
    }

    if (request.game.userId !== userId) {
      res.status(403).json({ error: "Unauthorized" });
      return
    }

    const updated = await prisma.playerRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });

    try {
      await pusher.trigger(`game-${request.gameId}`, "player-rejected", {
        requestId: request.id,
        userId: request.userId,
        gameId: request.gameId,
        message: "Your request to join the game was rejected.",
      });
    } catch (err) {
      console.error("Pusher trigger (reject) failed:", err);
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});


playerRequestRouter.post("/delete/:requestId", async (req, res) => {
  const userId = req.body.userId;
  const { requestId } = req.params;

  const request = await prisma.playerRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.userId !== userId){
    res.status(403).json({ error: "Unauthorized or not found" });
    return
  } 

  await prisma.playerRequest.delete({
    where: { id: requestId }
  });

  await pusher.trigger(`request-${requestId}`, "request-cancelled", {
    requestId,
    userId,
    status: "CANCELLED",
  });

  res.status(204).end();
});

playerRequestRouter.post("/my", async (req, res) => {
  const userId = req.body.userId;
  const requests = await prisma.playerRequest.findMany({
    where: { userId },
    include: { game: true },
  });

  res.json(requests);
});
