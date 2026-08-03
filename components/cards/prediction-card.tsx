import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Info } from 'lucide-react';

export function PredictionCard({ title, confidence, cancerType, scanType, cancerDetected, hasAnalysis }: {
  title: string;
  confidence: number;
  cancerType: string;
  scanType: string;
  cancerDetected?: boolean;
  hasAnalysis?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(confidence || 0)));
  const size = 120;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  // Empty state: no analysis yet
  if (!hasAnalysis) {
    return (
      <Card className="w-full max-w-none border border-white/8 bg-[#0C1324] shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Prediction Result</p>
            </div>
            <div className="text-slate-400">
              <Info size={14} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-400">No Analysis Yet</h3>
              <p className="mt-1 text-sm text-slate-500">Awaiting Scan</p>
            </div>
            <div className="flex w-1/3 items-center justify-center">
              <div className="relative flex items-center justify-center">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                  <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1e293b" strokeWidth={stroke} fill="none" />
                  <circle cx={size / 2} cy={size / 2} r={radius} stroke="#334155" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
                  <circle cx={size / 2} cy={size / 2} r={radius - stroke * 0.6} fill="#071026" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold text-slate-500">--</span>
                  <span className="mt-1 text-xs text-slate-600">Confidence</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const resultColor = cancerDetected ? '#ff3b3b' : '#22c55e';
  const statusText = cancerDetected ? '(Cancer Detected)' : '(No Cancer Detected)';
  const ringGradient = cancerDetected ? 'gradRed' : 'gradGreen';

  return (
    <Card className="w-full max-w-none border border-white/8 bg-[#0C1324] shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">Prediction Result</p>
          </div>
          <div className="text-slate-400">
            <Info size={14} />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between gap-4">
          {/* Left: prediction text */}
          <div className="flex-1">
            <h3 className="text-2xl font-semibold" style={{ color: resultColor }}>{title}</h3>
            <p className="mt-1 text-sm" style={{ color: resultColor, opacity: 0.8 }}>{statusText}</p>
          </div>

          {/* Right: circular confidence */}
          <div className="flex w-1/3 items-center justify-center">
            <div className="relative flex items-center justify-center">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                  <linearGradient id="gradRed" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#ff4d4d" />
                    <stop offset="100%" stopColor="#ff1f1f" />
                  </linearGradient>
                  <linearGradient id="gradGreen" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                </defs>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#0c1220"
                  strokeWidth={stroke}
                  fill="none"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={`url(#${ringGradient})`}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
                <circle cx={size / 2} cy={size / 2} r={radius - stroke * 0.6} fill="#071026" />
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-white">{pct}%</span>
                <span className="mt-1 text-xs text-slate-400">Confidence</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
