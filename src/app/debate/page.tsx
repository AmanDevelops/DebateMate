"use client";
import { Clock, Settings, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Define the type for conversation messages
type Message = {
  type: "user" | "ai";
  content: string;
  stance?: string;
  isError?: boolean;
};

// Define timer settings type
type TimerSettings = {
  minutes: number;
  seconds: number;
  active: boolean;
};

// Define round structure type
type RoundStructure = {
  name: string;
  duration: number; // in seconds
};

export default function DebatePage() {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stance, setStance] = useState("pro");
  const [conversations, setConversations] = useState<Message[]>([]);

  // Timer states
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [timerSettings, setTimerSettings] = useState<TimerSettings>({
    minutes: 2,
    seconds: 0,
    active: false,
  });
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);

  // Round structure - can be customized
  const [rounds, setRounds] = useState<RoundStructure[]>([
    { name: "Opening Statement", duration: 120 }, // 2 minutes
    { name: "Rebuttal", duration: 180 }, // 3 minutes
    { name: "Closing Statement", duration: 60 }, // 1 minute
  ]);

  // Audio refs
  const thirtySecAudioRef = useRef<HTMLAudioElement | null>(null);
  const fifteenSecAudioRef = useRef<HTMLAudioElement | null>(null);
  const fiveSecAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpAudioRef = useRef<HTMLAudioElement | null>(null);

  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio elements
  useEffect(() => {
    if (typeof window !== "undefined") {
      thirtySecAudioRef.current = new Audio("/sounds/30sec.mp3");
      fifteenSecAudioRef.current = new Audio("/sounds/15sec.mp3");
      fiveSecAudioRef.current = new Audio("/sounds/5sec.mp3");
      timeUpAudioRef.current = new Audio("/sounds/timeup.mp3");
    }

    return () => {
      // Clear timer on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerSettings.active && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;

          // Play alert sounds at specific times
          if (soundEnabled) {
            if (newTime === 30) thirtySecAudioRef.current?.play();
            if (newTime === 15) fifteenSecAudioRef.current?.play();
            if (newTime === 5) fiveSecAudioRef.current?.play();
            if (newTime === 0) timeUpAudioRef.current?.play();
          }

          // Auto-submit when time expires
          if (newTime === 0 && userInput.trim()) {
            startDebate();
          }

          return newTime;
        });
      }, 1000);
    } else if (timeRemaining <= 0 || !timerSettings.active) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerSettings.active, timeRemaining]);

  const startTimer = () => {
    // Calculate total seconds from minutes and seconds
    const totalSeconds = timerSettings.minutes * 60 + timerSettings.seconds;
    setTimeRemaining(totalSeconds);
    setTimerSettings({ ...timerSettings, active: true });
    setShowTimerSettings(false);
  };

  const pauseTimer = () => {
    setTimerSettings({ ...timerSettings, active: false });
  };

  const resetTimer = () => {
    pauseTimer();
    setTimeRemaining(timerSettings.minutes * 60 + timerSettings.seconds);
  };

  const nextRound = () => {
    if (currentRound < rounds.length - 1) {
      const nextRoundIndex = currentRound + 1;
      setCurrentRound(nextRoundIndex);

      // Update timer with next round's duration
      const nextDuration = rounds[nextRoundIndex].duration;
      setTimerSettings({
        minutes: Math.floor(nextDuration / 60),
        seconds: nextDuration % 60,
        active: false,
      });
      setTimeRemaining(nextDuration);
    }
  };

  const startDebate = async () => {
    if (!userInput.trim()) return;

    // Add user message to conversation
    const newUserMessage: Message = {
      type: "user",
      content: userInput,
      stance: stance,
    };

    setConversations([...conversations, newUserMessage]);
    setLoading(true);
    setUserInput(""); // Clear input after sending

    // Pause timer when user submits
    pauseTimer();

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput, stance }),
      });

      const data = await res.json();

      // Add Virtual Debater to conversation
      const newAIMessage: Message = {
        type: "ai",
        content: data.aiResponse,
      };

      setConversations((prev) => [...prev, newAIMessage]);
    } catch (err) {
      // Add error message to conversation
      const errorMessage: Message = {
        type: "ai",
        content: "Unable to generate response. Please try again.",
        isError: true,
      };

      setConversations((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      startDebate();
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Get appropriate color for timer based on time remaining
  const getTimerColor = () => {
    if (timeRemaining <= 5) return "text-red-600";
    if (timeRemaining <= 15) return "text-orange-500";
    if (timeRemaining <= 30) return "text-yellow-500";
    return "text-green-600";
  };

  return (
    <div className="flex p-16 flex-col h-screen bg-gray-50">
      {/* Header with timer */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Debate Practice</h1>

        <div className="flex items-center space-x-4">
          {/* Current Round */}
          {rounds.length > 0 && (
            <div className="text-gray-700">
              <span className="font-medium">{rounds[currentRound].name}</span>
            </div>
          )}

          {/* Timer Display */}
          <div className="flex items-center space-x-2">
            <div className={`text-xl font-mono font-bold ${getTimerColor()}`}>
              {formatTime(timeRemaining)}
            </div>

            <div className="flex items-center">
              {/* Timer controls */}
              {!timerSettings.active ? (
                <button
                  onClick={startTimer}
                  className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200"
                >
                  <Clock className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="p-2 bg-yellow-100 text-yellow-600 rounded-md hover:bg-yellow-200"
                >
                  <Clock className="h-5 w-5" />
                </button>
              )}

              {/* Reset timer */}
              <button
                onClick={resetTimer}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Timer settings */}
              <button
                onClick={() => setShowTimerSettings(!showTimerSettings)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <Settings className="h-5 w-5" />
              </button>

              {/* Sound toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </button>

              {/* Next round button */}
              {currentRound < rounds.length - 1 && (
                <button
                  onClick={nextRound}
                  className="ml-2 px-3 py-1 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 text-sm"
                >
                  Next Round
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timer Settings Modal */}
      {showTimerSettings && (
        <div className="absolute top-24 right-16 bg-white shadow-lg rounded-lg p-4 z-10 border border-gray-200 w-80">
          <h3 className="font-bold text-gray-800 mb-3">Timer Settings</h3>

          <div className="space-y-4">
            {/* Duration settings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={timerSettings.minutes}
                  onChange={(e) =>
                    setTimerSettings({
                      ...timerSettings,
                      minutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-16 border border-gray-300 rounded px-2 py-1"
                />
                <span>min</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timerSettings.seconds}
                  onChange={(e) =>
                    setTimerSettings({
                      ...timerSettings,
                      seconds: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-16 border border-gray-300 rounded px-2 py-1"
                />
                <span>sec</span>
              </div>
            </div>

            {/* Round structure settings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rounds
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {rounds.map((round, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={round.name}
                      onChange={(e) => {
                        const newRounds = [...rounds];
                        newRounds[index].name = e.target.value;
                        setRounds(newRounds);
                      }}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      min="5"
                      value={round.duration}
                      onChange={(e) => {
                        const newRounds = [...rounds];
                        newRounds[index].duration =
                          parseInt(e.target.value) || 60;
                        setRounds(newRounds);
                      }}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-xs">sec</span>

                    {/* Remove round button */}
                    {rounds.length > 1 && (
                      <button
                        onClick={() => {
                          const newRounds = rounds.filter(
                            (_, i) => i !== index
                          );
                          setRounds(newRounds);
                          if (currentRound >= newRounds.length) {
                            setCurrentRound(newRounds.length - 1);
                          }
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add round button */}
              <button
                onClick={() =>
                  setRounds([
                    ...rounds,
                    { name: `Round ${rounds.length + 1}`, duration: 120 },
                  ])
                }
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
              >
                + Add Round
              </button>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowTimerSettings(false)}
                className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={startTimer}
                className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Start Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content area with flexible height */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Messages container with scrolling */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-gray-700 mb-2">
                  Start Your Timed Debate
                </h2>
                <p className="text-gray-500 max-w-md">
                  Set your timer for realistic debate practice. Choose your
                  stance, start the clock, and practice crafting arguments under
                  time pressure.
                </p>
                {/* Quick timer start buttons */}
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setTimerSettings({
                        minutes: 1,
                        seconds: 0,
                        active: false,
                      });
                      setTimeRemaining(60);
                      startTimer();
                    }}
                    className="px-3 py-1 border border-indigo-200 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                  >
                    1 Min
                  </button>
                  <button
                    onClick={() => {
                      setTimerSettings({
                        minutes: 2,
                        seconds: 0,
                        active: false,
                      });
                      setTimeRemaining(120);
                      startTimer();
                    }}
                    className="px-3 py-1 border border-indigo-200 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                  >
                    2 Min
                  </button>
                  <button
                    onClick={() => {
                      setTimerSettings({
                        minutes: 3,
                        seconds: 0,
                        active: false,
                      });
                      setTimeRemaining(180);
                      startTimer();
                    }}
                    className="px-3 py-1 border border-indigo-200 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                  >
                    3 Min
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {conversations.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-lg px-4 py-3 rounded-lg ${
                        message.type === "user"
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : message.isError
                          ? "bg-red-50 text-red-600 border border-red-100 rounded-bl-none"
                          : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-none"
                      }`}
                    >
                      {message.type === "user" && (
                        <div className="mb-1 text-xs text-indigo-200 font-medium">
                          Your argument (
                          {message.stance === "pro" ? "Pro" : "Con"})
                        </div>
                      )}
                      {message.type === "ai" && !message.isError && (
                        <div className="mb-1 text-xs text-gray-500 font-medium">
                          Virtual Debater:
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-100 rounded-bl-none max-w-lg">
                      <div className="mb-1 text-xs text-gray-500 font-medium">
                        Virtual Debater
                      </div>
                      <div className="flex space-x-2">
                        <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"></div>
                        <div
                          className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input area - Fixed at the bottom */}
        <div className="border-t rounded-2xl border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col space-y-3">
              {/* Stance selector */}
              <div className="flex space-x-2">
                <h3 className="font-bold text-black/35 text-center mt-2">
                  Pick a side: Pros or Cons
                </h3>
                <button
                  onClick={() => setStance("pro")}
                  className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                    stance === "pro"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pro
                </button>
                <button
                  onClick={() => setStance("con")}
                  className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                    stance === "con"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Con
                </button>
              </div>

              {/* Input field and send button */}
              <div className="flex items-end space-x-3 ">
                <div className="flex-1">
                  <textarea
                    placeholder="Type your argument here..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white"
                    rows={1}
                    style={{
                      minHeight: "56px",
                      maxHeight: "120px",
                      height: "auto",
                    }}
                  />
                </div>
                <button
                  onClick={startDebate}
                  disabled={loading || !userInput.trim()}
                  className={`rounded-lg p-3 mb-3 ${
                    loading || !userInput.trim()
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                  } transition-all`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
