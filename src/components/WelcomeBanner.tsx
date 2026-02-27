import { useMemo } from "react";

const GREETINGS = [
  (n: string) => `Enjoy the game, ${n}! ⚾`,
  (n: string) => `Good to see you, ${n}!`,
  (n: string) => `Welcome back, ${n}! 🎉`,
  (n: string) => `Let's go Hawks, ${n}! 🦅`,
  (n: string) => `Hey ${n}, play ball! ⚾`,
  (n: string) => `Great day for baseball, ${n}!`,
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
    <div className="rounded-lg border border-border bg-card px-4 py-2.5 text-center text-sm font-medium text-foreground">
      {greeting}
    </div>
  );
};

export default WelcomeBanner;
