import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,     
    pass: process.env.GMAIL_APP_PASS,  
  },
});

export async function sendOtpEmail(email: string, otp: string, username: string) {
  try {
    await transporter.sendMail({
      from: `"MCQ Battle" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Verify Your MCQ Battle Account – OTP Inside!",
     html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #4a90e2;">Welcome to MCQ Battle, ${username}!</h2>
            <p style="font-size: 16px;">Thank you for signing up. To complete your registration, please verify your email using the OTP below:</p>
            <p style="font-size: 20px; font-weight: bold; color: #333; margin: 20px 0;">🔐 ${otp}</p>
            <p style="font-size: 14px; color: #555;">This OTP will expire in <b>10 minutes</b>. If you did not initiate this request, you can safely ignore this email.</p>
            <hr style="margin: 30px 0;">
        </div>`,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
}
