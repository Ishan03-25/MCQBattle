"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy, Medal, Award, Users, Target, ArrowLeft, Crown, Star } from "lucide-react"
import { getGameById } from "@/lib/api/game"

interface Player {
  id: string
  userId: string
  gameId: string
  joinedAt: string
  score: number
  user: {
    id: string
    username: string
  }
}

interface Question {
  id: string
  question: string
  explanation: string
  options: {
    id: string
    option: string
    isCorrect: boolean
  }[]
}

interface Answer {
  id: string
  userId: string
  questionId: string
  optionId: string
  createdAt: string
}

interface GameData {
  id: string
  game: string
  status: string
  createdAt: string
  user: {
    id: string
    username: string
  }
  players: Player[]
  questions: Question[]
  answers: Answer[]
}

export default function LeaderboardPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string

  const [gameData, setGameData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const token = localStorage.getItem("Authorization")
        if (!token) {
          router.push("/auth")
          return
        }

        const response = await getGameById(token, gameId)
        setGameData(response.game)
      } catch (err) {
        console.error("Error fetching game data:", err)
        setError("Failed to load game results")
      } finally {
        setLoading(false)
      }
    }

    if (gameId) {
      fetchGameData()
    }
  }, [gameId, router])

  const calculatePlayerStats = (player: Player) => {
    if (!gameData) return { correctAnswers: 0, totalAnswers: 0, accuracy: 0 }

    const playerAnswers = gameData.answers.filter((answer) => answer.userId === player.userId)
    let correctAnswers = 0

    playerAnswers.forEach((answer) => {
      const question = gameData.questions.find((q) => q.id === answer.questionId)
      if (question) {
        const selectedOption = question.options.find((opt) => opt.id === answer.optionId)
        if (selectedOption?.isCorrect) {
          correctAnswers++
        }
      }
    })

    const totalAnswers = playerAnswers.length
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0

    return { correctAnswers, totalAnswers, accuracy }
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-slate-600">#{position}</span>
        )
    }
  }

  const getRankBadge = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white"
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600 text-white"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border border-slate-200">
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center p-8">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Game Not Found</h2>
            <p className="text-slate-600 mb-6">{error || "The requested game could not be found."}</p>
            <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Sort players by score (descending)
  const sortedPlayers = [...gameData.players].sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pt-6">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button onClick={() => router.back()} variant="ghost" className="mb-4 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
              {gameData.game}
            </h1>
            <p className="text-slate-600">Final Results & Leaderboard</p>
            <p className="text-sm text-slate-500 mt-1">Created by {gameData.user.username}</p>
          </div>
        </div>

        {/* Game Stats */}
        <Card className="mb-8 border-slate-200 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="flex flex-col items-center">
                <Users className="w-8 h-8 text-blue-500 mb-2" />
                <span className="text-2xl font-bold text-slate-900">{gameData.players.length}</span>
                <span className="text-sm text-slate-600">Players</span>
              </div>
              <div className="flex flex-col items-center">
                <Target className="w-8 h-8 text-green-500 mb-2" />
                <span className="text-2xl font-bold text-slate-900">{gameData.questions.length}</span>
                <span className="text-sm text-slate-600">Questions</span>
              </div>
              <div className="flex flex-col items-center">
                <Badge className="bg-green-100 text-green-800 px-3 py-1">
                  <Star className="w-4 h-4 mr-1" />
                  {gameData.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">🏆 Leaderboard</h2>

          {sortedPlayers.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="text-center p-12">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Players Found</h3>
                <p className="text-slate-600">This game doesn't have any player results yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-lg overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-slate-700">
                    <div className="col-span-1 text-center">Rank</div>
                    <div className="col-span-6">Player</div>
                    <div className="col-span-2 text-center">Accuracy</div>
                    <div className="col-span-3 text-right">Score</div>
                  </div>
                </div>

                {/* Players List */}
                <div className="divide-y divide-slate-100">
                  {sortedPlayers.map((player, index) => {
                    const position = index + 1
                    const stats = calculatePlayerStats(player)

                    return (
                      <div
                        key={player.id}
                        className={`px-6 py-4 hover:bg-slate-50 transition-colors duration-150 ${
                          position <= 3 ? "bg-gradient-to-r from-yellow-50 to-transparent" : ""
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Rank */}
                          <div className="col-span-1 flex justify-center">
                            {position === 1 ? (
                              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                                <Crown className="w-4 h-4 text-white" />
                              </div>
                            ) : position === 2 ? (
                              <div className="w-8 h-8 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full flex items-center justify-center">
                                <Medal className="w-4 h-4 text-white" />
                              </div>
                            ) : position === 3 ? (
                              <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                                <Award className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-slate-600">#{position}</span>
                              </div>
                            )}
                          </div>

                          {/* Player Name */}
                          <div className="col-span-6">
                            <div className="flex items-center">
                              <span className="font-semibold text-slate-900 text-lg">{player.user.username}</span>
                              {position === 1 && (
                                <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1">Winner</Badge>
                              )}
                            </div>
                            <div className="text-sm text-slate-500">
                              {stats.correctAnswers}/{stats.totalAnswers} correct
                            </div>
                          </div>

                          {/* Accuracy */}
                          <div className="col-span-2 text-center">
                            <div className="flex items-center justify-center">
                              <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden mr-2">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    position === 1
                                      ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                                      : position === 2
                                        ? "bg-gradient-to-r from-gray-400 to-gray-600"
                                        : position === 3
                                          ? "bg-gradient-to-r from-amber-400 to-amber-600"
                                          : "bg-gradient-to-r from-blue-400 to-blue-600"
                                  }`}
                                  style={{ width: `${stats.accuracy}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-slate-700">{stats.accuracy}%</span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="col-span-3 text-right">
                            <div className="text-2xl font-bold text-slate-900">{player.score}</div>
                            <div className="text-xs text-slate-500">points</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-12 text-center pb-8">
          <Button
            onClick={() => router.push("/dashboard/my-games")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            Back to My Games
          </Button>
        </div>
      </div>
    </div>
  )
}
