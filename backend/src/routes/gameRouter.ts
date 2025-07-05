import { Router } from "express";
import prisma from "../prisma/client";
import { userMiddleware } from "../middleware/userMiddleware";
import pusher from "../utils/pusher";

export const gameRouter = Router();

gameRouter.get("/", async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      include: {
        user: true
      }
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

gameRouter.post("/create", userMiddleware, async (req, res) => {
  const { game, userId } = req.body;

  if (!game || !userId) {
     res.status(400).json({ error: "Missing game name or userId" });
     return;
  }

  try {
    const newGame = await prisma.game.create({
      data: {
        game,
        userId
      },
      include: {
        user: true,
        players: true,
      },
    });

    await pusher.trigger("games", "new-game", {
      id: newGame.id,
      game: newGame.game,
      creator: newGame.user.username,
      status: newGame.status,
      createdAt: new Date(),
    });

     res.status(201).json(newGame);
     return;
  } catch (error) {
    console.error("Error creating game:", error);
     res.status(500).json({ error: "Failed to create game" });
     return
  }
});


gameRouter.post("/my-games", userMiddleware, async (req, res) => {
  try {
    const userId = req.body.userId;

    const myGames = await prisma.game.findMany({
      where: {
        userId, 
      },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        questions: {
          select: {
            id: true,
            question: true,
          },
        },
        answers: {
          select: {
            id: true,
            userId: true,
            questionId: true,
            optionId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({ games: myGames });
  } catch (error) {
    console.error("Error fetching my games:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

gameRouter.delete("/delete/:gameId", userMiddleware, async (req, res) => {
  const gameId = req.params.gameId;
  const userId = req.body.userId; 

  if (!gameId || !userId) {
     res.status(400).json({ error: "Missing gameId or userId" });
     return
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
       res.status(404).json({ error: "Game not found" });
       return
    }

    if (game.userId !== userId) {
       res.status(403).json({ error: "Only the game creator can delete this game" });
       return
    }


    await prisma.player.deleteMany({ where: { gameId } });
    await prisma.userAnswer.deleteMany({ where: { gameId } });
    await prisma.question.deleteMany({ where: { gameId } });

    await prisma.game.delete({
      where: { id: gameId },
    });

    await pusher.trigger("games", "game-deleted", { gameId });

     res.status(200).json({ message: "Game deleted successfully" });
     return
  } catch (error) {
    console.error("Error deleting game:", error);
     res.status(500).json({ error: "Internal server error" });
     return
  }
});

gameRouter.post("/:gameId", userMiddleware, async (req, res) => {
  const { gameId } = req.params;
  const userId = req.body.userId;

  if (!gameId || !userId) {
    res.status(400).json({ error: "Missing gameId or userId" });
    return
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        user: { 
          select: {
            id: true,
            username: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        questions: {
          include: {
            options: {
              select: {
                id: true,
                option: true,
                isCorrect: true,
              },
            },
          },
        },
        answers: {
          select: {
            id: true,
            userId: true,
            questionId: true,
            optionId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!game) {
       res.status(404).json({ error: "Game not found" });
       return
    }

    if (game.user.id !== userId) {
       res.status(403).json({ error: "Only the game creator can view this game" });
       return
    }

    res.status(200).json({ game });
  } catch (error) {
    console.error("Error fetching game details:", error);
    res.status(500).json({ error: "Internal server error" });
    return
  }
});
gameRouter.put("/:gameId", userMiddleware, async (req, res) => {
  const { gameId } = req.params;
  const { userId, newName } = req.body;

  if (!newName || !userId) {
    res.status(400).json({ error: "Missing newName or userId" });
    return;
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    if (game.userId !== userId) {
      res.status(403).json({ error: "Only the game creator can update the name" });
      return;
    }

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: { game: newName },
    });

    await pusher.trigger("games", "game-name-updated", {
      gameId: updatedGame.id,
      newName: updatedGame.game,
    });

    res.status(200).json({ message: "Game name updated successfully", updatedGame });
  } catch (error) {
    console.error("Error updating game name:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

gameRouter.get("/:gameId/status", async (req, res) => {
  const { gameId } = req.params;

  if (!gameId) {
    res.status(400).json({ error: "Missing gameId" });
    return;
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        user: {
          select: {
            username: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    res.status(200).json({
      name: game.game, // game name
      status: game.status,
      ownerUsername: game.user.username, // game owner's username
      players: game.players.map((player) => ({
        id: player.user.id,
        username: player.user.username,
      })),
    });
  } catch (error) {
    console.error("Error fetching game status and players:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
gameRouter.patch("/:gameId/start", userMiddleware, async (req, res) => {
  const { gameId } = req.params;
  const { userId } = req.body;

  if (!gameId || !userId) {
     res.status(400).json({ error: "Missing gameId or userId" });
     return
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
       res.status(404).json({ error: "Game not found" });
       return
    }

    if (game.userId !== userId) {
       res.status(403).json({ error: "Only the game creator can start the game" });
       return
    }

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: { status: "STARTED" },
    });

    await pusher.trigger(`game-${gameId}`, "game-started", {
      gameId: updatedGame.id,
      status: updatedGame.status,
      startedAt: new Date(),
    });

     res.status(200).json({ message: "Game started", game: updatedGame });
     return
  } catch (error) {
    console.error("Error starting game:", error);
     res.status(500).json({ error: "Internal server error" });
     return
  }
});
gameRouter.patch("/:gameId/end", userMiddleware, async (req, res) => {
  const { gameId } = req.params;
  const { userId } = req.body;

  if (!gameId || !userId) {
    res.status(400).json({ error: "Missing gameId or userId" });
    return;
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    if (game.userId !== userId) {
      res.status(403).json({ error: "Only the game creator can end the game" });
      return;
    }

    const endedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        status: "COMPLETED"
      },
    });

    await pusher.trigger(`game-${gameId}`, "game-ended", {
      gameId: endedGame.id,
      status: endedGame.status
    });

    res.status(200).json({ message: "Game ended", game: endedGame });
  } catch (error) {
    console.error("Error ending game:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
