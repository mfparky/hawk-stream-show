import { useMemo } from "react";

const GREETINGS = [
  (n: string) => `Enjoy the game, ${n}! ⚾`,
  (n: string) => `Good to see you, ${n}!`,
  (n: string) => `Welcome back, ${n}! 🎉`,
  (n: string) => `Let's go Hawks, ${n}! 🦅`,
  (n: string) => `Hey ${n}, play ball! ⚾`,
  (n: string) => `Great day for baseball, ${n}!`,
  (n: string) => `Grab your peanuts, ${n} — first pitch incoming! 🥜`,
  (n: string) => `You made it, ${n}! Hawks are up to bat 🦅`,
  (n: string) => `Step right up, ${n}! It's game time ⚾`,
  (n: string) => `Bottom of the order welcomes you, ${n}! 😄`,
  (n: string) => `Batter up, ${n}! Let's get a W today 🏆`,
  (n: string) => `Two outs, bases loaded, and ${n} just tuned in 🔥`,
  (n: string) => `The Hawks are ready, ${n} — are you? 🦅`,
  (n: string) => `Welcome to the ballpark, ${n}! ⚾`,
  (n: string) => `Swing for the fences, ${n}! 💥`,
  (n: string) => `Glad you're here, ${n}! Let's bring it home ⚾`,
  (n: string) => `Take me out to the ball game, ${n}! 🎶`,
  (n: string) => `Keep your eye on the ball, ${n}! 👀`,
  (n: string) => `The crowd goes wild for ${n}! 📣`,
  (n: string) => `Hawks nation is stronger with you, ${n}! 🦅`,
];

interface Props {
  firstName: string;
}

const WelcomeBanner = ({ firstName }: Props) => {
  const greeting = useMemo(() => {
    const idx = Math.floor(Math.random() * GREETINGS.length);
    return GREETINGS[idx](firstName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName]);

  return (
    <div className="rounded-lg border border-border bg-card px-3 sm:px-4 py-2 sm:py-2.5 text-center text-xs sm:text-sm font-medium text-foreground">
      {greeting}
    </div>
  );
};

export default WelcomeBanner;
