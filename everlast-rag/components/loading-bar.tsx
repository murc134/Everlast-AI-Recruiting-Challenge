"use client";

type LoadingBarProps = {
  label?: string;
};

export default function LoadingBar({ label = "Upload laeuft..." }: LoadingBarProps) {
  return (
    <div className="grid gap-2">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="loading-bar">
        <div className="loading-bar__fill" />
      </div>
      <style jsx>{`
        .loading-bar {
          position: relative;
          height: 6px;
          width: 100%;
          background: #e5e7eb;
          border-radius: 9999px;
          overflow: hidden;
        }

        .loading-bar__fill {
          position: absolute;
          left: -40%;
          width: 40%;
          height: 100%;
          background: #111827;
          animation: loading-bar 1.2s ease-in-out infinite;
        }

        @keyframes loading-bar {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(250%);
          }
        }
      `}</style>
    </div>
  );
}
