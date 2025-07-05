import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from 'express';
import { userRouter } from './routes/userRouter';
import { gameRouter } from "./routes/gameRouter";
import { questionRouter } from "./routes/questionRouter";
import { optionRouter } from "./routes/optionRouter";
import { playerRouter } from "./routes/playerRouter";
import { playerRequestRouter } from "./routes/playerRequest";

const app = express();
app.use(express.json());
app.use(cors({
  origin: "https://mcq-battle-app.vercel.app",
  credentials: true
}));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/games", gameRouter);
app.use("/api/v1/questions", questionRouter);
app.use("/api/v1/options", optionRouter);
app.use("/api/v1/players", playerRouter);
app.use("/api/v1/playerRequest", playerRequestRouter);

function main() {
  app.listen(3001, () => {
    console.log('Server is running on http://localhost:3001');
  });
}

main();
