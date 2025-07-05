import { Router } from "express";
import prisma from "../prisma/client";
import { userMiddleware } from "../middleware/userMiddleware";
import pusher from "../utils/pusher";

export const playerRouter = Router();
playerRouter.post("/player-answer", userMiddleware, async (req, res) => {
  const { gameId, userId, questionId, optionId } = req.body;

  if (!gameId || !userId || !questionId || !optionId) {
     res.status(400).json({ error: "Missing required fields" });
     return
  }

  try {
    const player = await prisma.player.findUnique({
      where: {
        userId_gameId: { userId, gameId },
      },
    });

    if (!player) {
       res.status(403).json({ error: "User is not a player in this game" });
       return
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        questions: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!game || game.status !== "STARTED") {
       res.status(403).json({ error: "Game is not currently active" });
       return
    }

    const question = game.questions.find(q => q.id === questionId);
    if (!question) {
       res.status(400).json({ error: "Invalid question for this game" });
       return
    }

    const selectedOption = await prisma.option.findUnique({
      where: { id: optionId },
    });

    if (!selectedOption || selectedOption.questionId !== questionId) {
       res.status(400).json({ error: "Invalid option for this question" });
       return
    }

    const existingAnswer = await prisma.userAnswer.findFirst({
      where: { userId, questionId },
    });

    if (existingAnswer) {
      res.status(400).json({ error: "Already answered this question" });
      return
    }

    await prisma.userAnswer.create({
      data: { userId, gameId, questionId, optionId },
    });

    let updatedScore = player.score;
    const isCorrect = selectedOption.isCorrect;

    if (isCorrect) {
      const updatedPlayer = await prisma.player.update({
        where: {
          userId_gameId: { userId, gameId },
        },
        data: {
          score: {
            increment: 1,
          },
        },
      });
      updatedScore = updatedPlayer.score;
    }

    await pusher.trigger(`game-${gameId}`, "player-answered", {
      userId,
      questionId,
      isCorrect,
      newScore: updatedScore,
    });

    // Get next question based on how many user already answered
    const answered = await prisma.userAnswer.findMany({
      where: { userId, gameId },
    });

    const nextQuestion = game.questions[answered.length];

    if (!nextQuestion) {
      res.status(200).json({
        message: "Answer recorded. No more questions.",
        isCorrect,
        newScore: updatedScore,
        nextQuestion: null,
      });
      return
    }

    const options = await prisma.option.findMany({
      where: { questionId: nextQuestion.id },
      select: { id: true, option: true },
    });

     res.status(200).json({
      message: "Answer recorded",
      isCorrect,
      newScore: updatedScore,
      nextQuestion: {
        id: nextQuestion.id,
        question: nextQuestion.question,
        options,
      },
    });
    return
  } catch (error) {
    console.error("Error in player-answer:", error);
     res.status(500).json({ error: "Internal server error" });
     return
  }
});
playerRouter.post("/first-question", userMiddleware, async (req, res) => {
  const { gameId } = req.query;
  const userId = req.body.userId;
  if (!gameId) {
     res.status(400).json({ error: "Missing gameId" });
     return
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: String(gameId) },
      include: {
        questions: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!game || game.status !== "STARTED") {
       res.status(400).json({ error: "Game not found or not started" });
       return
    }

    const alreadyAnswered = await prisma.userAnswer.findMany({
      where: {
        userId,
        gameId: String(gameId),
      },
    });

    const nextQuestion = game.questions[alreadyAnswered.length];

    if (!nextQuestion) {
       res.status(200).json({ message: "No more questions", nextQuestion: null });
       return
    }

    const options = await prisma.option.findMany({
      where: { questionId: nextQuestion.id },
      select: { id: true, option: true },
    });

     res.status(200).json({
      id: nextQuestion.id,
      question: nextQuestion.question,
      options,
    });
    return
  } catch (error) {
    console.error("Error in /first-question:", error);
     res.status(500).json({ error: "Internal server error" });
     return
  }
});


playerRouter.post("/player-leave", userMiddleware, async (req, res) => {
  const { gameId, userId } = req.body;

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

    if (game.userId === userId) {
       res.status(403).json({ error: "Game owner cannot leave the game" });
       return
    }

    const player = await prisma.player.findUnique({
      where: {
        userId_gameId: { userId, gameId },
      },
    });

    if (!player) {
       res.status(400).json({ error: "User is not a player in this game" });
       return
    }

    await prisma.player.delete({
      where: {
        userId_gameId: { userId, gameId },
      },
    });

    await pusher.trigger(`game-${gameId}`, "player-left", {
      userId,
      gameId,
    });

     res.status(200).json({ message: "Player left the game" });
     return
  } catch (error) {
    console.error("Leave game error:", error);
     res.status(500).json({ error: "Internal server error" });
     return
  }
});

playerRouter.get("/next-question", userMiddleware, async (req, res) => {
  const { gameId } = req.query;
  const userId = req.body.userId;

  if (!gameId) {
     res.status(400).json({ error: "Missing gameId" });
     return
  }

  try {
    const game = await prisma.game.findUnique({
      where: { id: String(gameId) },
      include: { questions: { orderBy: { createdAt: "asc" } } },
    });

    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return
    }

    if (game.status !== "STARTED") {
       res.status(400).json({ error: "Game has not started yet" });
       return
    }

    const isPlayer = await prisma.player.findFirst({
      where: {
        userId,
        gameId: String(gameId),
      },
    });

    if (!isPlayer) {
       res.status(403).json({ error: "You are not a player in this game" });
       return
    }

    const answered = await prisma.userAnswer.findMany({
      where: {
        userId,
        gameId: String(gameId),
      },
    });

    const nextQuestion = game.questions[answered.length];

    if (!nextQuestion) {
       res.status(200).json({ message: "No more questions" });
       return
    }

    const options = await prisma.option.findMany({
      where: {
        questionId: nextQuestion.id,
      },
      select: {
        id: true,
        option: true, 
      },
    });

     res.json({
      id: nextQuestion.id,
      question: nextQuestion.question,
      options,
    });
    return
  } catch (err) {
    console.error(err);
   res.status(500).json({ error: "Failed to get next question" });
   return
  }
});
