"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Question = {
  id: string;
  description: string;
  options: string[];
  correctAnswer: number;
};

export default function Quiz() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const updateUserScore = async (newScore: number) => {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      return;
    }

    const { data: userRow, error: rowError } = await supabase
      .from("User")
      .select("score")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (rowError || !userRow) {
      return;
    }

    const existingScore = typeof userRow.score === "number" ? userRow.score : 0;
    const totalScore = existingScore + newScore;

    await supabase
      .from("User")
      .update({ score: totalScore })
      .eq("id", userData.user.id);
  };

  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

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
    }

    loadQuiz();
  }, []);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (choiceIndex: number) => {
    if (!currentQuestion) return;
    const isCorrect = choiceIndex === currentQuestion.correctAnswer;
    const nextScore = score + (isCorrect ? 1 : 0);
    setScore(nextScore);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setFinished(true);
      return;
    }
    setCurrentIndex(nextIndex);
  };

  useEffect(() => {
    if (!finished) return;
    if (questions.length === 0) return;

    updateUserScore(score);
  }, [finished, score, questions.length]);

  const resetQuiz = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
    setLoading(true);
    setError(null);
    createClient()
      .from("Quiz")
      .select("id")
      .then(async ({ data: quizzes, error: quizError }) => {
        if (quizError || !quizzes?.length) {
          setError(quizError?.message ?? "No quiz available.");
          setLoading(false);
          return;
        }
        const randomQuiz = quizzes[Math.floor(Math.random() * quizzes.length)];
        const { data: questionRows, error: questionError } =
          await createClient()
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
      });
  };

  const questionCount = questions.length;

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <h1>Quiz</h1>
      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : finished ? (
        <div>
          <p>
            Finished! You scored {score} out of {questionCount}.
          </p>
          <button type="button" onClick={resetQuiz} style={buttonStyle}>
            Retry
          </button>
        </div>
      ) : currentQuestion ? (
        <div>
          <p>
            Question {currentIndex + 1} / {questionCount}
          </p>
          <p style={{ fontWeight: 600 }}>{currentQuestion.description}</p>
          <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleAnswer(index)}
                style={buttonStyle}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p>No questions available.</p>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #ccc",
  borderRadius: 6,
  background: "white",
  cursor: "pointer",
  textAlign: "left",
};
