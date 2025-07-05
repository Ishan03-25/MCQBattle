import { Router } from "express";
import prisma from "../prisma/client";
import { userMiddleware } from "../middleware/userMiddleware";

export const optionRouter = Router();

optionRouter.use(userMiddleware);

optionRouter.post("/create", userMiddleware, async (req, res) => {
  const { option, isCorrect, questionId, gameId } = req.body;
  const userId = req.body.userId;

  if (!option || isCorrect === undefined || !questionId || !gameId) {
     res.status(400).json({ error: "Missing required fields" });
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
       res.status(403).json({ error: "Only the game owner can create options" });
       return
    }

    const newOption = await prisma.option.create({
      data: {
        option,
        isCorrect,
        questionId,
      },
    });

     res.status(201).json(newOption);
     return
  } catch (err) {
    console.error(err);
     res.status(500).json({ error: "Failed to create option" });
     return
  }
});

optionRouter.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { option, isCorrect } = req.body;
  const userId = req.body.userId;

  try {
    const existingOption = await prisma.option.findUnique({
      where: { id },
      include: {
        question: {
          include: {
            game: true,
          },
        },
      },
    });

    if (!existingOption) {
       res.status(404).json({ error: "Option not found" });
       return
    }

    const game = existingOption.question.game;

    if (game.userId !== userId) {
       res.status(403).json({ error: "Only the game owner can update options" });
       return
    }

    const updatedOption = await prisma.option.update({
      where: { id },
      data: {
        option,
        isCorrect,
      },
    });

    res.json(updatedOption);
    return
  } catch (err) {
    console.error(err);
     res.status(500).json({ error: "Failed to update option" });
     return
  }
});


optionRouter.post("/delete/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.body.userId;

  try {
    const option = await prisma.option.findUnique({
      where: { id },
      include: {
        question: {
          include: {
            game: true,
          },
        },
      },
    });

    if (!option) {
      res.status(404).json({ error: "Option not found" });
      return
    }

    const game = option.question.game;

    if (game.userId !== userId) {
       res.status(403).json({ error: "Only the game owner can delete options" });
       return
    }

    await prisma.option.delete({
      where: { id },
    });

     res.json({ message: "Option deleted successfully" });
     return
  } catch (err) {
    console.error(err);
     res.status(500).json({ error: "Failed to delete option" });
     return
  }
});

