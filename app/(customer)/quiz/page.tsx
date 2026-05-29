"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Trophy, Star, Utensils, CircleCheck, CircleX } from "lucide-react";
import { redirect } from "next/navigation";

type Question = {
  id: string;
  description: string;
  options: string[];
  correctAnswer: number;
};

export default function QuizPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    setError(null);

    const { data: quizzes, error: quizError } = await supabase
      .from("Quiz")
      .select("id");

    if (quizError || !quizzes?.length) {
      setError(quizError?.message ?? "No quiz available.");
      setLoading(false);
      return;
    }

    const randomQuiz = quizzes[Math.floor(Math.random() * quizzes.length)];

    const { data: questionRows, error: questionError } = await supabase
      .from("Question")
      .select("id, description, options, correctAnswer")
      .eq("quizId", randomQuiz.id);

    if (questionError || !questionRows?.length) {
      setError(questionError?.message ?? "No questions found.");
      setLoading(false);
      return;
    }

    setQuestions(questionRows);
    setLoading(false);
  };

  const updateUserScore = async (newScore: number) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) return;

    const { data: userRow, error: rowError } = await supabase
      .from("User")
      .select("score")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (rowError || !userRow) return;

    const existingScore = typeof userRow.score === "number" ? userRow.score : 0;

    await supabase
      .from("User")
      .update({
        score: existingScore + newScore,
      })
      .eq("id", userData.user.id);
  };

  useEffect(() => {
    if (!finished || questions.length === 0) return;
    updateUserScore(score);
  }, [finished]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = async (index: number) => {
    if (!currentQuestion || selectedAnswer !== null) return;

    setSelectedAnswer(index);

    const correct = index === currentQuestion.correctAnswer;

    setIsCorrect(correct);

    if (correct) {
      setScore((prev) => prev + 1);
    }

    setShowFeedback(true);

    setTimeout(() => {
      const nextIndex = currentIndex + 1;

      if (nextIndex >= questions.length) {
        setFinished(true);
      } else {
        setCurrentIndex(nextIndex);
      }

      setSelectedAnswer(null);
      setShowFeedback(false);
    }, 400);
  };

  const endQuiz = async () => {
    redirect("/");
  };

  const getOptionStyle = (index: number) => {
    if (selectedAnswer === null) {
      return "bg-bgMain border-bgSurface hover:border-brandPrimary hover:bg-white";
    }

    if (index === currentQuestion.correctAnswer) {
      return "bg-green-500 border-green-600 text-white";
    }

    if (index === selectedAnswer && index !== currentQuestion.correctAnswer) {
      return "bg-red-50 border-red-500 text-red-600";
    }

    return "bg-bgMain border-bgSurface opacity-60";
  };

  return (
    <div className="min-h-screen bg-[#f3f4f5] flex items-center justify-center p-4 font-[Jost]">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-[#d6d6d5] overflow-hidden min-h-[500px] flex flex-col">
        <div className="h-2 w-full bg-[#f3f4f5] overflow-hidden">
          <div
            className="h-full bg-[#1d2846] transition-all duration-300"
            style={{
              width: `${
                finished ? 100 : (currentIndex / questions.length) * 100
              }%`,
            }}
          />
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#949492] font-medium">Loading quiz...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        ) : !started ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <div className="w-20 h-20 bg-[#f3f4f5] rounded-full flex items-center justify-center text-[#1d2846] border border-[#d6d6d5] mb-6">
              <Utensils size={32} />
            </div>

            <h1 className="text-3xl font-bold text-[#1d2846] mb-3">
              Foodie Challenge
            </h1>

            <p className="text-[#949492] font-medium leading-relaxed mb-8">
              Test your food knowledge with random quizzes from the database.
            </p>

            <button
              onClick={() => setStarted(true)}
              className="w-full bg-[#1d2846] text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition"
            >
              Start Quiz
            </button>
          </div>
        ) : finished ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-white mb-6 ${
                score === questions.length
                  ? "bg-yellow-500"
                  : score > 0
                    ? "bg-green-500"
                    : "bg-red-500"
              }`}
            >
              {score === questions.length ? (
                <Trophy size={42} />
              ) : score > 0 ? (
                <Star size={42} />
              ) : (
                <Utensils size={42} />
              )}
            </div>

            <h2 className="text-3xl font-bold text-[#1d2846] mb-3">
              {score === questions.length
                ? "Perfect Score!"
                : score > 0
                  ? "Great Job!"
                  : "Keep Exploring!"}
            </h2>

            <p className="text-[#949492] mb-8 leading-relaxed">
              You scored {score} out of {questions.length}.
            </p>

            <div className="bg-[#f3f4f5] border border-[#d6d6d5] rounded-2xl w-full p-5 mb-8">
              <p className="text-xs text-[#949492] uppercase tracking-widest mb-2">
                Final Score
              </p>

              <p className="text-4xl font-bold text-[#1d2846]">
                {score}/{questions.length}
              </p>
            </div>

            <button
              onClick={endQuiz}
              className="w-full bg-[#1d2846] text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition"
            >
              Finish
            </button>
          </div>
        ) : currentQuestion ? (
          <div className="flex flex-col flex-1 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-[#949492]">
                Question {currentIndex + 1} of {questions.length}
              </span>

              <span className="text-xs font-bold text-[#1d2846] bg-[#f3f4f5] px-3 py-1 rounded-full border border-[#d6d6d5]">
                Food Trivia
              </span>
            </div>

            <h2 className="text-2xl font-bold text-[#1d2846] leading-snug mb-6">
              {currentQuestion.description}
            </h2>

            <div className="flex flex-col gap-3 flex-1">
              {currentQuestion.options.map((option, index) => {
                const correct = index === currentQuestion.correctAnswer;

                const wrong =
                  selectedAnswer === index &&
                  index !== currentQuestion.correctAnswer;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={selectedAnswer !== null}
                    className={`w-full text-left px-5 py-4 rounded-xl border font-bold transition-all flex items-center justify-between ${getOptionStyle(
                      index,
                    )}`}
                  >
                    <span>{option}</span>

                    {correct && selectedAnswer !== null ? (
                      <CircleCheck size={20} />
                    ) : wrong ? (
                      <CircleX size={20} />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div
              className={`h-10 mt-6 flex items-center justify-center transition-all duration-300 ${
                showFeedback ? "opacity-100" : "opacity-0"
              }`}
            >
              {isCorrect ? (
                <div className="flex items-center gap-2 text-green-600 font-bold">
                  <CircleCheck size={18} />
                  Correct!
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 font-bold">
                  <CircleX size={18} />
                  Incorrect Answer
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
