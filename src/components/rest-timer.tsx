"use client";

import { useEffect, useState } from "react";

type RestTimerProps = {
  defaultSeconds: number;
  autoStartToken?: number;
};

export function RestTimer({ defaultSeconds, autoStartToken = 0 }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const notifyRestComplete = () => {
    try {
      const audioContext = new window.AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.25);
    } catch {
      // Ignore autoplay or audio-context restrictions.
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Rest timer done", { body: "Time for your next set." });
    }
  };

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const interval = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          notifyRestComplete();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    setSecondsLeft(defaultSeconds);
  }, [defaultSeconds]);

  useEffect(() => {
    if (autoStartToken <= 0) {
      return;
    }
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    setSecondsLeft(defaultSeconds);
    setIsRunning(true);
  }, [autoStartToken, defaultSeconds]);

  return (
    <div className="rounded-lg border border-[#334753] bg-[#24323a] p-4">
      <div className="text-xs uppercase text-[#9ab0bd]">Rest Timer</div>
      <div className="mt-1 text-3xl font-semibold">{secondsLeft}s</div>
      <div className="mt-3 flex gap-2">
        <button
          className="rounded bg-[#45bb7c] px-3 py-1.5 text-sm font-medium text-[#112019]"
          onClick={() => setIsRunning((previous) => !previous)}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          className="rounded border border-[#334753] bg-[#2b3a43] px-3 py-1.5 text-sm"
          onClick={() => {
            setSecondsLeft(defaultSeconds);
            setIsRunning(false);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
