// components/TypingHeadlineLoop.tsx
"use client";

import React, { useEffect, useState } from "react";

type TypingLoopProps = {
  phrases?: string[]; // phrases to cycle
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseAtFull?: number;
  pauseAtEmpty?: number;
  className?: string;
};

export default function TypingHeadlineLoop({
  phrases = [
  "💰 Track prices. .",
  "🔥 Hot deals  Save money. 😃",
  "🛒 Shop confidently",
  "🎁 save happily ✨",
  "📉 Buy smarter ",
  ],
  typingSpeed = 60,
  deletingSpeed = 30,
  pauseAtFull = 1200,
  pauseAtEmpty = 350,
  className = "text-3xl sm:text-4xl font-extrabold leading-tight",
}: TypingLoopProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const text = phrases[phraseIndex];
  const [display, setDisplay] = useState("");
  const [pos, setPos] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFullyVisible, setIsFullyVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && pos < text.length) {
      // typing forward
      setIsFullyVisible(false);
      timer = setTimeout(() => {
        setDisplay(text.slice(0, pos + 1));
        setPos((p) => p + 1);
      }, typingSpeed);
    } else if (!isDeleting && pos === text.length) {
      // reached full text — set fully visible state and pause before deleting
      setIsFullyVisible(true);
      timer = setTimeout(() => setIsDeleting(true), pauseAtFull);
    } else if (isDeleting && pos > 0) {
      // deleting
      setIsFullyVisible(false);
      timer = setTimeout(() => {
        setDisplay(text.slice(0, pos - 1));
        setPos((p) => p - 1);
      }, deletingSpeed);
    } else if (isDeleting && pos === 0) {
      // emptied — move to next phrase after pause
      timer = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((i) => (i + 1) % phrases.length);
      }, pauseAtEmpty);
    }

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, isDeleting, text, typingSpeed, deletingSpeed, pauseAtFull, pauseAtEmpty]);

  // When phraseIndex changes, reset positions for the new text
  useEffect(() => {
    setDisplay("");
    setPos(0);
    setIsDeleting(false);
    setIsFullyVisible(false);
  }, [phraseIndex]);

  return (
    <h2
      className={`${className} relative inline-block`}
      // add a small positive-y bounce/scale when fully visible
      style={{
        transform: isFullyVisible ? "translateY(-2px) scale(1.01)" : "none",
        transition: "transform 300ms ease",
        WebkitBackgroundClip: isFullyVisible ? "text" : undefined,
        WebkitTextFillColor: isFullyVisible ? "transparent" : undefined,
      }}
    >
      {/* Displayed text */}
      <span
        className={isFullyVisible ? "rainbow-text" : ""}
        // ensure partial text doesn't inherit transparent fill until fully visible
        style={
          isFullyVisible
            ? {}
            : {
                WebkitTextFillColor: "initial",
                background: "none",
                WebkitBackgroundClip: "unset",
              }
        }
      >
        {display}
      </span>

      {/* blinking cursor */}
      <span
        className="ml-1 inline-block blinking-cursor"
        aria-hidden="true"
        style={{ opacity: isFullyVisible ? 0.9 : 1 }}
      >
        |
      </span>

     
    </h2>
  );
}
