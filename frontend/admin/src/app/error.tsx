"use client";
export default function Error({ error, reset, }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    return (<div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">500 - Something went wrong</h1>
        <p className="text-lg mb-8">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
          Try again
        </button>
      </div>
    </div>);
}
