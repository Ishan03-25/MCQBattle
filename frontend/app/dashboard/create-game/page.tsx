"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slide } from "react-toastify";
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
import { Plus, Trash2, Save, ArrowLeft, HelpCircle } from "lucide-react"
import { toastError, toastWarning, toastPromise } from "@/utils/toast"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { createGame } from "@/lib/api/game"
import { createQuestion } from "@/lib/api/question"
import { createOption } from "@/lib/api/option"

interface Option {
  id: string
  option: string
  isCorrect: boolean
}

interface Question {
  id: string
  question: string
  explanation: string
  options: Option[]
}

export default function CreateGamePage() {
  const router = useRouter()
  const [gameName, setGameName] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp_${Date.now()}`,
      question: "",
      explanation: "",
      options: [
        { id: `temp_${Date.now()}_1`, option: "", isCorrect: true },
        { id: `temp_${Date.now()}_2`, option: "", isCorrect: false },
        { id: `temp_${Date.now()}_3`, option: "", isCorrect: false },
        { id: `temp_${Date.now()}_4`, option: "", isCorrect: false },
      ],
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId))
  }

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
                },
              ],
            }
          : q,
      ),
    )
  }

  const removeOption = (questionId: string, optionId: string) => {
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

  setLoading(true);

  try {
    await toastPromise(
      (async () => {
        const token = localStorage.getItem("Authorization");
        if (!token) throw new Error("No authorization token found");

        // Step 1: Create the game
        const createdGame = await createGame(token, gameName);
        const gameId = createdGame.id;

        // Step 2: Create questions and options
        for (const question of questions) {
          const createdQuestion = await createQuestion(token, {
            question: question.question,
            explanation: question.explanation,
            gameId,
          });

          const questionId = createdQuestion.id;

          // Step 3: Create options for this question
          for (const option of question.options) {
            await createOption(token, {
              option: option.option,
              isCorrect: option.isCorrect,
              questionId,
              gameId,
            });
          }
        }

        console.log("Game, questions, and options created successfully.");
      })(),
      {
        loading: "Creating your game...",
        success: "Game created successfully!",
        error: (err) => `Error: ${err.message || "Failed to create game"}`,
      }
    );

    // Redirect after a short delay
    setTimeout(() => {
      router.push("/dashboard/my-games");
    }, 1000);
  } catch (error) {
    console.error("Error creating game:", error);
    toastError(error instanceof Error ? error.message : "An unknown error occurred");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50 pt-6">
      <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick={true}
          rtl={false}
          pauseOnFocusLoss={true}
          draggable={true}
          pauseOnHover={true}
          theme="light"
          transition={Slide}
          limit={3}
          toastClassName="!bg-white !text-gray-900 !rounded-lg !shadow-lg !border !border-gray-200"
          progressClassName="!bg-blue-500"
          closeButton={true}
          style={{
            fontSize: "14px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        />
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
                <HelpCircle className="h-6 w-6 text-blue-600 mr-2" />
                Create New Game
              </h1>
              <p className="text-slate-600 mt-1">Set up your QuizBattle game with questions and answers</p>
            </div>
          </div>
          <Button
            onClick={handleSaveGame}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Game"}
          </Button>
        </div>

        {/* Game Name */}
        <Card className="border border-slate-200 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Game Details</CardTitle>
            <CardDescription>Enter the basic information for your game</CardDescription>
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
                    <CardTitle className="text-lg text-slate-900">Question {questionIndex + 1}</CardTitle>
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
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving Game..." : "Save Game"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
