"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border-4 border-red-500 p-8">
        <h2 className="text-2xl font-black text-red-800 mb-4">
          Something went wrong!
        </h2>
        <p className="text-red-700 font-bold mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
