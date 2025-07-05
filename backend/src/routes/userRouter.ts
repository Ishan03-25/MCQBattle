import { Router } from "express";
import prisma from "../prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {z} from"zod"
import dayjs from "dayjs";
import { generateOtp } from "../utils/generateOtp";
import { sendOtpEmail } from "../utils/mailer";

export const userRouter = Router();

userRouter.post("/request-otp", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
     res.status(400).json({ msg: "All fields are required." });
     return
  }

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existingUser) {
     res.status(409).json({ msg: "Username or email already exists." });
     return
  }

  const otp = generateOtp();
  const otpExpiry = dayjs().add(10, "minutes").toISOString();
  const passwordHash = await bcrypt.hash(password, 10);
  const otpHash = await bcrypt.hash(otp,10);
  await sendOtpEmail(email, otp, username);

  const tempToken = jwt.sign(
    { username, email, passwordHash, otpHash, otpExpiry },
    process.env.OTP_SECRET!,
    { expiresIn: "10m" }
  );

   res.json({ msg: "OTP sent to email.", token: tempToken });
   return
});

userRouter.post("/verify-otp", async (req, res) => {
  const { token, otp: userOtp } = req.body;
  if (!token || !userOtp) {
     res.status(400).json({ msg: "Token and OTP are required." });
     return
  }
  try {
    const data = jwt.verify(token, process.env.OTP_SECRET!) as {
      username: string;
      email: string;
      passwordHash: string;
      otpHash: string;
      otpExpiry: string;
    };

    const isMatch = await bcrypt.compare(userOtp, data.otpHash);
    if (!isMatch) {
       res.status(401).json({ msg: "Invalid Otp" });
       return
    }

    if (dayjs().isAfter(data.otpExpiry)) {
       res.status(400).json({ msg: "OTP expired." });
       return
    }

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.passwordHash
      },
    });

     res.json({ msg: "User created successfully.", username: user.username });
     return
  } catch (err) {
     res.status(400).json({ msg: "Invalid or expired token." });
     return
  }
});

const signinSchema = z.object({
  username: z.string(),
  password: z.string(),
});

userRouter.post("/signin", async (req, res) => {
  const verify = signinSchema.safeParse(req.body);

  if (!verify.success) {
     res.status(400).json({ msg: verify.error });
     return
  }

  const { username, password } = verify.data;

  try {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      res.status(401).json({ msg: "Invalid credentials or user not verified." });
      return
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
       res.status(401).json({ msg: "Invalid credentials." });
       return
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.USER_JWT_SECRET_KEY!,
      { expiresIn: "1d" }
    );

     res.json({
      msg: "Signin successful.",
      token,
      userId: user.id,
      username: user.username,
      expiresIn: "1d",
    });
    return
  } catch (err) {
     res.status(500).json({ msg: "Internal server error.", error: err });
     return
  }
});

userRouter.post("/forgot-password/request-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
     res.status(400).json({ msg: "Email is required." });
     return
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
     res.status(404).json({ msg: "No account found with this email." });
     return
  }

  const otp = generateOtp();
  const otpExpiry = dayjs().add(10, "minutes").toISOString();
  const otpHash = await bcrypt.hash(otp, 10);

  await sendOtpEmail(email, otp, user.username);

  const tempToken = jwt.sign(
    { email, otpHash, otpExpiry },
    process.env.OTP_SECRET!,
    { expiresIn: "10m" }
  );

   res.json({ msg: "OTP sent to your email.", token: tempToken });
   return
});

userRouter.post("/forgot-password/verify-otp", async (req, res) => {
  const { token, otp: userOtp } = req.body;

  if (!token || !userOtp) {
     res.status(400).json({ msg: "Token and OTP are required." });
     return
  }

  try {
    const data = jwt.verify(token, process.env.OTP_SECRET!) as {
      email: string;
      otpHash: string;
      otpExpiry: string;
    };

    const isMatch = await bcrypt.compare(userOtp, data.otpHash);

    if (!isMatch) {
       res.status(401).json({ msg: "Invalid OTP." });
       return
    }

    if (dayjs().isAfter(data.otpExpiry)) {
       res.status(400).json({ msg: "OTP expired." });
       return
    }

    // If valid, send a new token only for password reset
    const resetToken = jwt.sign(
      { email: data.email },
      process.env.OTP_SECRET!,
      { expiresIn: "15m" }
    );

     res.json({ msg: "OTP verified. Proceed to reset password.", token: resetToken });
     return
  } catch (err) {
     res.status(400).json({ msg: "Invalid or expired token." });
     return
  }
});

userRouter.post("/forgot-password/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
     res.status(400).json({ msg: "Token and new password are required." });
     return
  }

  try {
    const data = jwt.verify(token, process.env.OTP_SECRET!) as {
      email: string;
    };

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
       res.status(404).json({ msg: "User not found." });
       return
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: data.email },
      data: { password: passwordHash },
    });

     res.json({ msg: "Password has been reset successfully." });
     return
  } catch (err) {
     res.status(400).json({ msg: "Invalid or expired token." });
     return
  }
});
