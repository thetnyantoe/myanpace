import { useState, useEffect } from "react";
import Link from "next/link";

export default function PromotionBanner() {
  const [hasTakenQuiz, setHasTakenQuiz] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const clicked = localStorage.getItem("quiz_taken") === "true";
      setHasTakenQuiz(clicked);
    }
  }, []);

  const handleQuizClick = () => {
    setHasTakenQuiz(true);
    localStorage.setItem("quiz_taken", "true");
  };

  // If they already clicked it, don't render anything here
  if (hasTakenQuiz) return null;

  return (
    <div>
      {/* Tip: It's best practice to put the onClick handler directly on the Next.js Link element 
        or make the wrapper a <button> for accessibility.
      */}
      <Link href="/quiz" onClick={handleQuizClick}>
        <div className="bg-blue-300 w-[100px] text-center rounded-md p-2 text-stone-900 jost font-bold mt-2 cursor-pointer hover:bg-opacity-90 transition">
          Take Quiz
        </div>
      </Link>
      <p className="text-xs text-stone-500 mt-1">
        Earn scores as reward for sweet promotions!
      </p>
    </div>
  );
}
