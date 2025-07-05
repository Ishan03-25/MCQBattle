"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Clock, Gamepad2, LogOut, Play, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import pusherClient from "@/lib/pusherClient"
import { toastSuccess, toastError, toastInfo } from "@/utils/toast"
import axios from "axios"
import { Toaster } from "react-hot-toast"

interface User {
  id: string
  username: string
}

interface Player {
  id: string
  userId: string
  gameId: string
  score: number
  user: User
}

interface Option {
  id: string
  option: string
  isCorrect?: boolean
}

interface Question {
  id: string
  question: string
  options: Option[]
}

interface Game {
  id: string
  game: string
  status: "WAITING" | "STARTED" | "ENDED"
  userId: string
  user: User
  players: Player[]
}

// Updated interface to match your API response
interface GameStatusResponse {
  name: string
  status: "WAITING" | "STARTED" | "ENDED"
  ownerUsername: string
  players: Array<{
    id: string
    username: string
  }>
}

export default function GameLobbyPage() {
  const router = useRouter()
  const params = useParams()
  const gameId = params.gameId as string

  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; message: string } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [startingGame, setStartingGame] = useState(false)

  const [questionIndex, setQuestionIndex] = useState<number>(0)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [showingAnswerResult, setShowingAnswerResult] = useState(false)

  // Store next question data in a ref to avoid re-renders
  const nextQuestionRef = useRef<Question | null>(null)
  const answerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastAnsweredQuestionRef = useRef<string | null>(null)

  // Updated to work with your status endpoint
  const checkGameStatusAndLoad = async () => {
    try {
      // Use your status endpoint
      const statusResponse = await fetch(`https://mcqbattleapp.onrender.com/api/v1/games/${gameId}/status`)
      const statusData: GameStatusResponse = await statusResponse.json()

      const token = localStorage.getItem("Authorization")
      const userId = localStorage.getItem("userId")

      if (!token || !userId) {
        router.push("/dashboard/my-games")
        return
      }

      setCurrentUserId(userId)

      // Convert status response to game format
      const gameData: Game = {
        id: gameId,
        game: statusData.name,
        status: statusData.status,
        userId: statusData.players.find((p) => p.username === statusData.ownerUsername)?.id || "",
        user: {
          id: statusData.players.find((p) => p.username === statusData.ownerUsername)?.id || "",
          username: statusData.ownerUsername,
        },
        players: statusData.players.map((player) => ({
          id: player.id,
          userId: player.id,
          gameId: gameId,
          score: 0, // Score not available from status endpoint
          user: {
            id: player.id,
            username: player.username,
          },
        })),
      }

      setGame(gameData)
      setIsOwner(gameData.user.id === userId)

      // Handle different game states
      if (statusData.status === "WAITING") {
        console.log("Game is waiting. Players:", statusData.players)
      } else if (statusData.status === "STARTED") {
        // Game has started - check if user is a player and load first question
        const isPlayer = statusData.players.some((player) => player.id === userId)
        if (isPlayer) {
          await fetchFirstQuestion()
        }
      } else if (statusData.status === "ENDED") {
        console.log("Game has ended")
        setGameEnded(true)
      }

      return statusData.status
    } catch (error) {
      console.error("Error fetching game status:", error)
      toastError("Failed to check game status")
      return null
    }
  }

  // Lightweight status check for periodic updates
  const quickStatusCheck = async () => {
    try {
      const statusResponse = await fetch(`https://mcqbattleapp.onrender.com/api/v1/games/${gameId}/status`)

      if (!statusResponse.ok) return

      const statusData: GameStatusResponse = await statusResponse.json()

      // Update game state with new status and players
      setGame((prevGame) => {
        if (!prevGame) return prevGame

        const updatedPlayers = statusData.players.map((statusPlayer) => {
          const existingPlayer = prevGame.players.find((p) => p.user.id === statusPlayer.id)
          return {
            id: statusPlayer.id,
            userId: statusPlayer.id,
            gameId: gameId,
            score: existingPlayer ? existingPlayer.score : 0,
            user: {
              id: statusPlayer.id,
              username: statusPlayer.username,
            },
          }
        })

        return {
          ...prevGame,
          game: statusData.name,
          status: statusData.status,
          user: {
            ...prevGame.user,
            username: statusData.ownerUsername,
          },
          players: updatedPlayers,
        }
      })

      return statusData.status
    } catch (error) {
      console.error("Error in quick status check:", error)
      return null
    }
  }

  // Fetch first question separately
  const fetchFirstQuestion = async () => {
    try {
      setLoadingQuestion(true)
      const token = localStorage.getItem("Authorization")

      if (!token) {
        router.push("/auth")
        return
      }

      console.log("Fetching first question...")
      const response = await axios.post(
        `https://mcqbattleapp.onrender.com/api/v1/players/first-question?gameId=${gameId}`,
        {}, // Empty body
        {
          headers: {
            Authorization: `Bearer ${token}`, // Ensure it's prefixed with 'Bearer'
            "Content-Type": "application/json",
          },
        },
      )
      console.log("First question response:", response.data)

      const data = response.data

      if (data.id) {
        setCurrentQuestion(data)
        setQuestionIndex(1) // Start with question 1
        console.log("First question set:", data.question)
      } else {
        console.error("No question ID in response")
      }
    } catch (error) {
      console.error("Error fetching first question:", error)
      toastError("Failed to load question")
    } finally {
      setLoadingQuestion(false)
    }
  }

  // Submit answer
  const submitAnswer = async (optionId: string) => {
    if (!currentQuestion) return

    setSubmitting(true)
    setSelectedOption(optionId)
    setShowingAnswerResult(false) // Reset this flag

    // Store the current question ID to match with Pusher event
    lastAnsweredQuestionRef.current = currentQuestion.id

    try {
      const token = localStorage.getItem("Authorization")
      const userId = localStorage.getItem("userId")

      if (!token || !userId) {
        return
      }

      console.log(`Submitting answer for question ${currentQuestion.id}, option: ${optionId}`)
      const response = await fetch("https://mcqbattleapp.onrender.com/api/v1/players/player-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId,
          userId,
          questionId: currentQuestion.id,
          optionId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit answer")
      }

      const data = await response.json()
      console.log("Answer submission response:", data)

      // Store next question in ref but don't show it yet
      if (data.nextQuestion) {
        console.log("Next question received:", data.nextQuestion.question)
        nextQuestionRef.current = data.nextQuestion
      } else {
        console.log("No more questions")
        nextQuestionRef.current = null
      }

      // Set a fallback timeout in case Pusher event doesn't arrive
      answerTimeoutRef.current = setTimeout(() => {
        console.log("Fallback timeout triggered - Pusher event might have been missed")

        // If we haven't received a Pusher event, show a generic result
        if (lastAnsweredQuestionRef.current === currentQuestion.id && !showingAnswerResult) {
          setAnswerResult({
            isCorrect: false, // We don't know, so default to false
            message: "Answer submitted! Moving to next question...",
          })
          setShowingAnswerResult(true)
          toastInfo("Answer submitted! Moving to next question...")

          // Move to next question after showing result
          setTimeout(() => {
            moveToNextQuestion()
          }, 2000)
        }
      }, 5000) // 5 second fallback
    } catch (error) {
      console.error("Error submitting answer:", error)
      toastError("Failed to submit answer")
      // Reset states on error
      setAnswerResult(null)
      setSelectedOption(null)
      setSubmitting(false)
    }
  }

  // Move to next question after showing answer result
  const moveToNextQuestion = () => {
    // Clear any pending timeouts
    if (answerTimeoutRef.current) {
      clearTimeout(answerTimeoutRef.current)
      answerTimeoutRef.current = null
    }

    // Reset the last answered question
    lastAnsweredQuestionRef.current = null

    if (nextQuestionRef.current) {
      console.log("Moving to next question:", nextQuestionRef.current.question)
      setCurrentQuestion(nextQuestionRef.current)
      setQuestionIndex((prev) => prev + 1)
      nextQuestionRef.current = null
    } else {
      // No more questions
      console.log("No more questions, ending game")
      setCurrentQuestion(null)
      setGameEnded(true)
    }

    setSelectedOption(null)
    setAnswerResult(null)
    setSubmitting(false)
    setShowingAnswerResult(false)
  }

  // Start game
  const startGame = async () => {
    setStartingGame(true)

    try {
      const token = localStorage.getItem("Authorization")
      const userId = localStorage.getItem("userId")

      if (!token || !userId) {
        router.push("/auth")
        return
      }

      const response = await fetch(`https://mcqbattleapp.onrender.com/api/v1/games/${gameId}/start`, {
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start game")
      }

      // Don't show success toast here since Pusher will handle it
      console.log("Game start request sent successfully")
    } catch (error) {
      console.error("Error starting game:", error)
      toastError("Failed to start game")
    } finally {
      setStartingGame(false)
    }
  }

  // Leave game
  const leaveGame = async () => {
    try {
      const token = localStorage.getItem("Authorization")
      const userId = localStorage.getItem("userId")

      if (!token || !userId) {
        router.push("/auth")
        return
      }

      const response = await fetch("https://mcqbattleapp.onrender.com/api/players/player-leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId,
          userId,
        }),
      })

      router.push("/dashboard/my-games")
    } catch (error) {
      console.error("Error leaving game:", error)
      toastError("Failed to leave game")
    }
  }

  // Set up Pusher subscriptions
  useEffect(() => {
    if (!gameId) return

    console.log(`Subscribing to Pusher channel: game-${gameId}`)
    const channel = pusherClient.subscribe(`game-${gameId}`)

    // Player joined - use quick status check instead of full reload
    channel.bind("player-joined", async (data: { player: Player }) => {
      await quickStatusCheck()
      toastSuccess(`${data.player.user.username} joined the game!`)
    })

    // Player left - use quick status check
    channel.bind("player-left", async (data: { userId: string }) => {
      await quickStatusCheck()
    })

    // Game started - enhanced to handle your trigger data
    channel.bind("game-started", async (data: { gameId: string; status: string; startedAt: string }) => {
      console.log("Game started event received:", data)

      // Update game state immediately
      setGame((prevGame) => {
        if (!prevGame) return prevGame
        return {
          ...prevGame,
          status: "STARTED",
        }
      })

      // Fetch the current game status to get updated player list and check if current user is a player
      const token = localStorage.getItem("Authorization")
      const userId = localStorage.getItem("userId")

      if (token && userId) {
        try {
          // Get fresh game status to ensure we have the latest player data
          const statusResponse = await fetch(`https://mcqbattleapp.onrender.com/api/v1/games/${gameId}/status`)
          if (statusResponse.ok) {
            const statusData: GameStatusResponse = await statusResponse.json()
            const isPlayer = statusData.players.some((player) => player.id === userId)

            if (isPlayer) {
              console.log("Current user is a player, fetching first question...")
              await fetchFirstQuestion()
            } else {
              console.log("Current user is not a player in this game")
            }
          }
        } catch (error) {
          console.error("Error checking player status after game start:", error)
        }
      }

      toastSuccess("The game has started!")
    })

    // Player answered - enhanced to show answer result to the answering user
    channel.bind(
      "player-answered",
      (data: { userId: string; isCorrect: boolean; newScore: number; questionId: string }) => {
        console.log("Player answered event received:", data)
        console.log("Current user ID:", currentUserId)
        console.log("Event user ID:", data.userId)
        console.log("Last answered question:", lastAnsweredQuestionRef.current)
        console.log("Event question ID:", data.questionId)

        // Update player scores for all users
        setGame((prevGame) => {
          if (!prevGame) return prevGame

          return {
            ...prevGame,
            players: prevGame.players.map((player) =>
              player.userId === data.userId ? { ...player, score: data.newScore } : player,
            ),
          }
        })

        // Show answer result only to the user who answered
        if (data.userId === currentUserId) {
          console.log("This is the current user's answer")

          // Clear any pending timeouts
          if (answerTimeoutRef.current) {
            clearTimeout(answerTimeoutRef.current)
            answerTimeoutRef.current = null
          }

          // Check if this is for the question we just answered
          if (lastAnsweredQuestionRef.current === data.questionId) {
            console.log("Question IDs match, setting answer result")

            // Set the answer result based on the Pusher event
            setAnswerResult({
              isCorrect: data.isCorrect,
              message: data.isCorrect ? "✅ Correct answer! +1 point" : "❌ Wrong answer!",
            })
            setShowingAnswerResult(true)

            // Show toast notification based on answer correctness
            if (data.isCorrect) {
              toastSuccess("Correct answer! +1 point")
            } else {
              toastError("Wrong answer!")
            }

            // Wait for 2.5 seconds to show the result, then move to next question
            setTimeout(() => {
              moveToNextQuestion()
            }, 2500)
          }
        }
      },
    )

    // Game ended
    channel.bind("game-ended", () => {
      console.log("Game ended event received")
      setGame((prevGame) => {
        if (!prevGame) return prevGame
        return {
          ...prevGame,
          status: "ENDED",
        }
      })

      setGameEnded(true)
      setCurrentQuestion(null)
      toastSuccess("The game has ended!")
    })

    // Initial load
    checkGameStatusAndLoad().finally(() => {
      setLoading(false)
    })

    // Cleanup
    return () => {
      console.log(`Unsubscribing from Pusher channel: game-${gameId}`)
      if (answerTimeoutRef.current) {
        clearTimeout(answerTimeoutRef.current)
      }
      pusherClient.unsubscribe(`game-${gameId}`)
    }
  }, [gameId, router, currentUserId])

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("Authorization")
    if (!token) {
      router.push("/auth")
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-blue-400">Loading Game Lobby...</h2>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-400">Game not found</h2>
              <p className="mt-2 text-slate-300">This game may have been deleted or you don't have access.</p>
              <Button onClick={() => router.push("/dashboard/my-games")} className="mt-4 bg-blue-600 hover:bg-blue-700">
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 md:p-6">
      {/* Toast container */}
      <Toaster position="top-right" />

      <div className="container mx-auto max-w-4xl">
        {/* Game Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-lg">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-400 flex items-center">
              <Gamepad2 className="h-7 w-7 mr-2 text-blue-500" />
              {game.game}
            </h1>
            <p className="text-slate-300 mt-1">
              Hosted by <span className="font-medium">{game.user.username}</span>
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center">
            <Badge
              className={`
                px-3 py-1 text-sm font-medium rounded-full
                ${
                  game.status === "WAITING"
                    ? "bg-amber-600 text-amber-100"
                    : game.status === "STARTED"
                      ? "bg-green-600 text-green-100"
                      : "bg-red-600 text-red-100"
                }
              `}
            >
              {game.status === "WAITING" ? (
                <>
                  <Clock className="h-3.5 w-3.5 mr-1" /> Waiting for Players
                </>
              ) : game.status === "STARTED" ? (
                <>
                  <Play className="h-3.5 w-3.5 mr-1" /> Game In Progress
                </>
              ) : (
                <>
                  <Trophy className="h-3.5 w-3.5 mr-1" /> Game Ended
                </>
              )}
            </Badge>

            {!isOwner && (
              <Button
                onClick={leaveGame}
                variant="outline"
                size="sm"
                className="ml-3 border-red-800 text-red-400 hover:bg-red-900 hover:text-red-200"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Leave
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Players List */}
          <div className="md:col-span-1">
            <Card className="bg-slate-800 border-slate-700 shadow-lg">
              <CardHeader className="border-b border-slate-700">
                <CardTitle className="text-blue-400 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Players ({game.players.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {sortedPlayers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No players have joined yet</p>
                    {game.status === "WAITING" && <p className="text-sm mt-2">Share the game ID for others to join!</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedPlayers.map((player, index) => (
                      <div
                        key={player.id}
                        className={`
                          flex items-center justify-between p-3 rounded-md
                          ${player.userId === currentUserId ? "bg-blue-900/30 border border-blue-800" : "bg-slate-700/50"}
                        `}
                      >
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {player.user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <span className="font-medium">
                              {player.user.username}
                              {player.userId === currentUserId && (
                                <span className="ml-2 text-xs bg-blue-800 text-blue-200 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                              {player.userId === game.userId && (
                                <span className="ml-2 text-xs bg-amber-800 text-amber-200 px-1.5 py-0.5 rounded">
                                  Host
                                </span>
                              )}
                            </span>
                            {game.status === "STARTED" && index === 0 && (
                              <div className="text-xs text-yellow-400 flex items-center mt-1">
                                <Trophy className="h-3 w-3 mr-1" />
                                Leading
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-bold">{player.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              {isOwner && game.status === "WAITING" && (
                <CardFooter className="border-t border-slate-700 pt-4">
                  <Button
                    onClick={startGame}
                    disabled={startingGame || game.players.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {startingGame ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting Game...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" /> Start Game ({game.players.length} players)
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Game Content */}
          <div className="md:col-span-2">
            {game.status === "WAITING" ? (
              <Card className="bg-slate-800 border-slate-700 shadow-lg h-full">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-blue-400">Waiting for Game to Start</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <div className="w-24 h-24 rounded-full bg-blue-900/30 border-4 border-blue-600/50 flex items-center justify-center mx-auto mb-6">
                      <Clock className="h-12 w-12 text-blue-400 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-blue-300 mb-2">Game Lobby</h3>
                    <p className="text-slate-300 mb-6 max-w-md mx-auto">
                      {isOwner
                        ? "You can start the game when players have joined. Players will see their usernames listed on the left."
                        : "Waiting for the host to start the game. You can see all joined players on the left."}
                    </p>

                    <div className="bg-slate-700 rounded-lg p-4 mb-6">
                      <p className="text-sm text-slate-300 mb-2">Game ID:</p>
                      <code className="text-blue-400 font-mono text-lg">{gameId}</code>
                    </div>

                    {isOwner && (
                      <Button
                        onClick={startGame}
                        disabled={startingGame || game.players.length === 0}
                        size="lg"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {startingGame ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting Game...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" /> Start Game
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : game.status === "STARTED" ? (
              <Card className="bg-slate-800 border-slate-700 shadow-lg h-full">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-blue-400">
                    {loadingQuestion
                      ? "Loading Question..."
                      : currentQuestion
                        ? `Question ${questionIndex}`
                        : gameEnded
                          ? "Game Complete"
                          : "Fetching Question..."}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {loadingQuestion ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-blue-300 mb-2">Loading Question...</h3>
                      <p className="text-slate-300">Please wait while we fetch your question.</p>
                    </div>
                  ) : currentQuestion ? (
                    <div>
                      <div className="mb-6 p-4 bg-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-medium text-white">Question {questionIndex}:</h3>
                          <Badge className="bg-blue-600 text-blue-100">{questionIndex}</Badge>
                        </div>
                        <p className="text-xl text-blue-200">{currentQuestion.question}</p>
                      </div>

                      {/* Enhanced answer result display */}
                      {answerResult && showingAnswerResult && (
                        <div
                          className={`mb-6 p-6 rounded-lg flex items-center border-2 ${
                            answerResult.isCorrect ? "bg-green-900/60 border-green-500" : "bg-red-900/60 border-red-500"
                          }`}
                        >
                          {answerResult.isCorrect ? (
                            <CheckCircle2 className="h-8 w-8 text-green-400 mr-4" />
                          ) : (
                            <XCircle className="h-8 w-8 text-red-400 mr-4" />
                          )}
                          <span
                            className={`text-xl font-bold ${answerResult.isCorrect ? "text-green-200" : "text-red-200"}`}
                          >
                            {answerResult.message}
                          </span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <h3 className="text-lg font-medium text-white mb-2">Select your answer:</h3>
                        {currentQuestion.options.map((option, index) => (
                          <Button
                            key={option.id}
                            onClick={() => submitAnswer(option.id)}
                            disabled={submitting || selectedOption !== null}
                            className={`w-full justify-start text-left p-4 h-auto ${
                              selectedOption === option.id
                                ? "bg-blue-700 hover:bg-blue-700 border-2 border-blue-400"
                                : "bg-slate-700 hover:bg-slate-600"
                            }`}
                          >
                            <span className="text-lg">
                              {String.fromCharCode(65 + index)}. {option.option}
                            </span>
                          </Button>
                        ))}
                      </div>

                      {submitting && !answerResult && (
                        <div className="mt-6 text-center py-4 bg-slate-700/50 rounded-lg">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
                          <p className="text-slate-300">Checking your answer...</p>
                        </div>
                      )}
                    </div>
                  ) : gameEnded ? (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 rounded-full bg-yellow-900/30 border-4 border-yellow-600/50 flex items-center justify-center mx-auto mb-6">
                        <Trophy className="h-12 w-12 text-yellow-400" />
                      </div>
                      <h3 className="text-xl font-bold text-yellow-300 mb-4">Thank You for Playing!</h3>
                      <p className="text-slate-300 mb-6">Here are the final results:</p>

                      {/* Leaderboard */}
                      <div className="bg-slate-700 rounded-lg p-6 mb-6 max-w-md mx-auto">
                        <h4 className="text-lg font-bold text-blue-400 mb-4 flex items-center justify-center">
                          <Trophy className="h-5 w-5 mr-2" />
                          Final Leaderboard
                        </h4>
                        <div className="space-y-3">
                          {sortedPlayers.map((player, index) => (
                            <div
                              key={player.id}
                              className={`flex items-center justify-between p-3 rounded-md ${
                                index === 0
                                  ? "bg-yellow-900/30 border border-yellow-600"
                                  : index === 1
                                    ? "bg-gray-600/30 border border-gray-500"
                                    : index === 2
                                      ? "bg-amber-900/30 border border-amber-600"
                                      : "bg-slate-600/30"
                              }`}
                            >
                              <div className="flex items-center">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                                    index === 0
                                      ? "bg-yellow-600"
                                      : index === 1
                                        ? "bg-gray-500"
                                        : index === 2
                                          ? "bg-amber-600"
                                          : "bg-slate-500"
                                  }`}
                                >
                                  {index + 1}
                                </div>
                                <span className="font-medium text-white">
                                  {player.user.username}
                                  {player.userId === currentUserId && (
                                    <span className="ml-2 text-xs bg-blue-800 text-blue-200 px-1.5 py-0.5 rounded">
                                      You
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                                <span className="font-bold text-white">{player.score}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={() => router.push("/dashboard/my-games")}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Return to Dashboard
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-blue-300 mb-2">Fetching Question...</h3>
                      <p className="text-slate-300">Please wait while we prepare your first question.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-slate-700 shadow-lg h-full">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className="text-blue-400">Game Ended</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <div className="w-24 h-24 rounded-full bg-blue-900/30 border-4 border-blue-600/50 flex items-center justify-center mx-auto mb-6">
                      <Trophy className="h-12 w-12 text-yellow-400" />
                    </div>
                    <h3 className="text-xl font-bold text-blue-300 mb-2">Game Complete</h3>
                    <p className="text-slate-300 mb-6">This game has ended. Check the final scores on the left!</p>
                    <Button
                      onClick={() => router.push("/dashboard/my-games")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Return to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

