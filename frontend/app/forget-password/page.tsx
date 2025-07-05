"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Gamepad2, Mail, Lock, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toastError, toastPromise } from "@/utils/toast"
import { requestForgotPasswordOtp, verifyForgotPasswordOtp, resetPassword } from "@/lib/api/auth"


export default function ForgotPasswordPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<"email" | "otp" | "password" | "success">("email")
  const [isLoading, setIsLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [resetToken, setResetToken] = useState("")
  const [passwordsMatch, setPasswordsMatch] = useState(true)
  const [showPasswordError, setShowPasswordError] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const emailValue = emailRef.current?.value?.trim()
    if (!emailValue) {
      toastError("Please enter your email address")
      setIsLoading(false)
      return
    }

    try {
      const response = await toastPromise(requestForgotPasswordOtp(emailValue), {
        success: "OTP sent to your email",
        error: "Error sending OTP",
        loading: "Sending OTP...",
      })

      setEmail(emailValue)
      setResetToken(response.token)
      setCurrentStep("otp")
    } catch (err: any) {
      toastError(err?.response?.data?.msg || "Error sending reset email")
      console.error("Error sending reset email:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setOtpLoading(true)
    try {
      await toastPromise(requestForgotPasswordOtp(email), {
        success: "OTP resent",
        error: "Error resending OTP",
        loading: "Resending OTP...",
      })
    } catch (err) {
      console.error("Error resending OTP:", err)
    } finally {
      setOtpLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const otpString = otp.join("").trim()
    if (!otpString || otpString.length !== 6) {
      toastError("Please enter the 6-digit OTP")
      setIsLoading(false)
      return
    }

    try {
      const response = await toastPromise(verifyForgotPasswordOtp(resetToken, otpString), {
        success: "OTP verified successfully",
        error: "Invalid or expired OTP",
        loading: "Verifying OTP...",
      })

      // Update the reset token if a new one is provided
      if (response.token) {
        setResetToken(response.token)
      }

      setCurrentStep("password")
    } catch (err: any) {
      toastError(err?.response?.data?.msg || "Invalid OTP")
      console.error("Error verifying OTP:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const password = passwordRef.current?.value
    const confirmPassword = confirmPasswordRef.current?.value

    if (!password || !confirmPassword) {
      toastError("Please fill in both password fields")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      toastError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      toastError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      await toastPromise(resetPassword(resetToken, password), {
        success: "Password reset successfully",
        error: "Error resetting password",
        loading: "Resetting password...",
      })

      setCurrentStep("success")
    } catch (err: any) {
      toastError(err?.response?.data?.msg || "Error resetting password")
      console.error("Error resetting password:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp]
      newOtp[index] = value
      setOtp(newOtp)
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const checkPasswordsMatch = () => {
    const password = passwordRef.current?.value || ""
    const confirmPassword = confirmPasswordRef.current?.value || ""

    if (confirmPassword.length > 0) {
      const match = password === confirmPassword
      setPasswordsMatch(match)
      setShowPasswordError(!match && confirmPassword.length > 0)
    } else {
      setShowPasswordError(false)
    }
  }

  const handleBackStep = () => {
    if (currentStep === "otp") {
      setCurrentStep("email")
      setOtp(["", "", "", "", "", ""])
    } else if (currentStep === "password") {
      setCurrentStep("otp")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <Gamepad2 className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-2xl font-bold text-gray-900">QuizBattle</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
          <p className="text-gray-500 mt-2">We'll help you get back to battling</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            {/* Email Step */}
            {currentStep === "email" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <CardTitle className="text-xl">Forgot Password?</CardTitle>
                  <CardDescription>Enter your email address and we'll send you a verification code</CardDescription>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        required
                        ref={emailRef}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* OTP Step */}
            {currentStep === "otp" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={handleBackStep} className="p-1">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-xl">Verify Your Email</CardTitle>
                    <CardDescription>We've sent a 6-digit code to {email}</CardDescription>
                  </div>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Enter Verification Code</Label>
                    <div className="flex gap-2 justify-center">
                      {otp.map((digit, index) => (
                        <Input
                          key={index}
                          id={`otp-${index}`}
                          type="text"
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-12 h-12 text-center text-lg font-bold"
                          maxLength={1}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Didn't receive the code?</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResendOtp}
                      disabled={otpLoading}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {otpLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Resend Code"
                      )}
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading || otp.some((digit) => !digit)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Code"
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* Password Reset Step */}
            {currentStep === "password" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={handleBackStep} className="p-1">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-xl">Create New Password</CardTitle>
                    <CardDescription>Choose a strong password for your account</CardDescription>
                  </div>
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        className="pl-10"
                        required
                        ref={passwordRef}
                        minLength={6}
                        onChange={checkPasswordsMatch}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        className={`pl-10 ${!passwordsMatch && showPasswordError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                        required
                        ref={confirmPasswordRef}
                        minLength={6}
                        onChange={checkPasswordsMatch}
                      />
                    </div>
                    {showPasswordError && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <span className="text-red-500">⚠</span>
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <div className="text-center">
                    <Badge variant="secondary" className="text-xs">
                      Password must be at least 6 characters long
                    </Badge>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading || !passwordsMatch || showPasswordError}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resetting Password...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* Success Step */}
            {currentStep === "success" && (
              <div className="space-y-4 text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-xl text-green-600">Password Reset Successfully!</CardTitle>
                  <CardDescription>
                    Your password has been updated. You can now sign in with your new password.
                  </CardDescription>
                </div>

                <Button onClick={() => router.push("/auth")} className="w-full bg-blue-600 hover:bg-blue-700">
                  Back to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back to Sign In */}
        <div className="text-center mt-6">
          <Link href="/auth" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
