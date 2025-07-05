"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2, Save, ArrowLeft, HelpCircle, Edit } from "lucide-react"
import { toastError, toastSuccess, toastWarning, toastPromise } from "@/utils/toast"
import { getGameById, updateGame } from "@/lib/api/game"
import { createQuestion,deleteQuestion,UpdateQuestion } from "@/lib/api/question"
import { createOption, deleteOption, UpdateOption } from "@/lib/api/option"

interface Option {
  id: string
  option: string
  isCorrect: boolean
  questionId: string
}

interface Question {
  id: string
  question: string
  explanation: string
  gameId: string
  options: Option[]
  createdAt: string
}

interface Game {
  id: string
  game: string
  userId: string
  createdAt: string
  status: string
}

export default function EditGamePage() {
  const router = useRouter()
  const params = useParams()
  const gameId = params.gameId as string

  const [game, setGame] = useState<Game | null>(null)
  const [gameName, setGameName] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (gameId) {
      fetchGameData()
    }
  }, [gameId])

  const fetchGameData = async () => {
    const token = localStorage.getItem("Authorization");
    try {
      setLoading(true)
      // Fetch game details (which already includes questions and options)
      const gameResponse = await getGameById(token!, gameId)
      const gameData = gameResponse;

      // Set game data

      setGame(gameData.game.game)
      setGameName(gameData.game.game)

      // // Set questions from the game response (no separate API call needed)
      setQuestions(gameData.game.questions || [])
    } catch (error) {
      console.error("Error fetching game data:", error)
      toastError("Failed to load game data")
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp_${Date.now()}`,
      question: "",
      explanation: "",
      gameId: gameId,
      options: [
        { id: `temp_${Date.now()}_1`, option: "", isCorrect: true, questionId: `temp_${Date.now()}` },
        { id: `temp_${Date.now()}_2`, option: "", isCorrect: false, questionId: `temp_${Date.now()}` },
        { id: `temp_${Date.now()}_3`, option: "", isCorrect: false, questionId: `temp_${Date.now()}` },
        { id: `temp_${Date.now()}_4`, option: "", isCorrect: false, questionId: `temp_${Date.now()}` },
      ],
      createdAt: new Date().toISOString(),
    }
    setQuestions([...questions, newQuestion])
  }
const removeQuestion = async (questionId: string) => {
  const token =localStorage.getItem("Authorization");
  if (!token) {
    toastError("Unauthorized: Please log in again.");
    return;
  }

  if (questionId.startsWith("temp_")) {
    // Remove temporary question
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  } else {
    try {
      // Call your API
      const token = localStorage.getItem("Authorization");
      await deleteQuestion(token!, questionId);
      // If successful, update UI
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toastSuccess("Question deleted successfully");
    } catch (error: any) {
      console.error("Delete error:", error);

      const errorMessage =
        error?.response?.data?.message || error?.message || "Error deleting question";
      toastError(errorMessage);
    }
  }
};



  const updateQuestion = (questionId: string, field: string, value: string) => {
    setQuestions(questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q)))
  }

  const updateOption = (questionId: string, optionId: string, value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt) => (opt.id === optionId ? { ...opt, option: value } : opt)),
            }
          : q,
      ),
    )
  }

  const setCorrectOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt) => ({
                ...opt,
                isCorrect: opt.id === optionId,
              })),
            }
          : q,
      ),
    )
  }

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...q.options,
                {
                  id: `temp_${Date.now()}`,
                  option: "",
                  isCorrect: false,
                  questionId: questionId,
                },
              ],
            }
          : q,
      ),
    )
  }

  const removeOption = async (questionId: string, optionId: string) => {
    if (optionId.startsWith("temp_")) {
      // Remove temporary option
      setQuestions(
        questions.map((q) =>
          q.id === questionId
            ? {
                ...q,
                options: q.options.filter((opt) => opt.id !== optionId),
              }
            : q,
        ),
      )
    } else {
      const token = localStorage.getItem("Authorization");
      // Delete existing option
      try {
        await deleteOption(token!,optionId);
          setQuestions(
            questions.map((q) =>
              q.id === questionId
                ? {
                    ...q,
                    options: q.options.filter((opt) => opt.id !== optionId),
                  }
                : q,
            ),
          )
          toastSuccess("Option deleted successfully")
      } catch (error) {
        toastError("Error deleting option")
      }
    }
  }

  const validateForm = () => {
    if (!gameName.trim()) {
      toastError("Please enter a name for your game")
      return false
    }

    if (questions.length === 0) {
      toastError("Please add at least one question")
      return false
    }

    for (const [index, question] of questions.entries()) {
      if (!question.question.trim()) {
        toastError(`Question ${index + 1} is empty. Please fill in all question fields.`)
        return false
      }

      if (!question.explanation.trim()) {
        toastWarning(`Explanation for question ${index + 1} is empty. Please provide an explanation.`)
        return false
      }

      if (question.options.length < 2) {
        toastError(`Question ${index + 1} needs at least 2 options.`)
        return false
      }

      if (!question.options.some((opt) => opt.isCorrect)) {
        toastError(`Question ${index + 1} has no correct answer. Please select one.`)
        return false
      }

      for (const [optIndex, option] of question.options.entries()) {
        if (!option.option.trim()) {
          toastError(`Option ${optIndex + 1} in question ${index + 1} is empty. Please fill in all option fields.`)
          return false
        }
      }
    }

    return true
  }

  const handleSaveGame = async () => {
  if (!validateForm()) return;

  setSaving(true);
  const token = localStorage.getItem("Authorization");

  const saveGamePromise = async () => {
    try {
      if (!token) throw new Error("No authorization token found");

      // Step 1: Update game name if changed
      if (game && gameName !== game.game) {
        await updateGame(token, gameId, gameName);
      }

      // Step 2: Process questions
      for (const question of questions) {
        if (question.id.startsWith("temp_")) {
          // Create new question
          const questionResponse = await createQuestion(token, {
            question: question.question,
            explanation: question.explanation,
            gameId: gameId,
          });
          const questionData = await questionResponse;
          const newQuestionId = questionData.id;

          // Create options for new question
          for (const option of question.options) {
            await createOption(token, {
              option: option.option,
              isCorrect: option.isCorrect,
              questionId: newQuestionId,
              gameId: gameId,
            });
          }
        } else {
          // Update existing question
          await UpdateQuestion(token, question.id, {
            question: question.question,
            explanation: question.explanation,
          });

          // Process options
          for (const option of question.options) {
            if (option.id.startsWith("temp_")) {
              await createOption(token, {
                option: option.option,
                isCorrect: option.isCorrect,
                questionId: question.id,
                gameId: gameId,
              });
            } else {
              await UpdateOption(token, option.id, {
                option: option.option,
                isCorrect: option.isCorrect,
              });
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  toastPromise(saveGamePromise(), {
    loading: "Saving changes...",
    success: () => {
      setTimeout(() => {
        router.push("/dashboard/my-games");
      }, 1000);
      return "Game updated successfully!";
    },
    error: (err) => `Error: ${err.message || "Failed to save changes"}`,
  });

  setSaving(false);
};


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-6">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-6">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => router.back()} className="mr-4 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                <Edit className="h-6 w-6 text-blue-600 mr-2" />
                Edit Game
              </h1>
              <p className="text-slate-600 mt-1">Update your QuizBattle game questions and answers</p>
            </div>
          </div>
          <Button
            onClick={handleSaveGame}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Game Name */}
        <Card className="border border-slate-200 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Game Details</CardTitle>
            <CardDescription>Update the basic information for your game</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="gameName" className="text-slate-700 font-medium">
                  Game Name
                </Label>
                <Input
                  id="gameName"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Enter your game name..."
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Questions ({questions.length})</h2>
            <Button onClick={addQuestion} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Questions Yet</h3>
                <p className="text-slate-600 mb-4">Start by adding your first question to the game</p>
                <Button onClick={addQuestion} className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            questions.map((question, questionIndex) => (
              <Card key={question.id} className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-slate-900 flex items-center">
                      Question {questionIndex + 1}
                      {question.id.startsWith("temp_") && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">New</span>
                      )}
                    </CardTitle>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Question</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this question? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeQuestion(question.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Text */}
                  <div>
                    <Label className="text-slate-700 font-medium">Question</Label>
                    <Textarea
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, "question", e.target.value)}
                      placeholder="Enter your question..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-slate-700 font-medium">Answer Options</Label>
                      <Button
                        onClick={() => addOption(question.id)}
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Option
                      </Button>
                    </div>
                    <RadioGroup
                      value={question.options.find((opt) => opt.isCorrect)?.id}
                      onValueChange={(value) => setCorrectOption(question.id, value)}
                    >
                      <div className="space-y-3">
                        {question.options.map((option, optionIndex) => (
                          <div key={option.id} className="flex items-center space-x-3">
                            <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                            <Input
                              value={option.option}
                              onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}...`}
                              className="flex-1"
                            />
                            {option.id.startsWith("temp_") && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">New</span>
                            )}
                            {question.options.length > 2 && (
                              <Button
                                onClick={() => removeOption(question.id, option.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                    <p className="text-sm text-slate-500 mt-2">
                      Select the correct answer by clicking the radio button
                    </p>
                  </div>

                  {/* Explanation */}
                  <div>
                    <Label className="text-slate-700 font-medium">Explanation</Label>
                    <Textarea
                      value={question.explanation}
                      onChange={(e) => updateQuestion(question.id, "explanation", e.target.value)}
                      placeholder="Explain why this is the correct answer..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Bottom Save Button */}
        {questions.length > 0 && (
          <div className="flex justify-center py-8">
            <Button
              onClick={handleSaveGame}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}