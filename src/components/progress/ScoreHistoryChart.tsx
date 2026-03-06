import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Analysis } from "@/hooks/useAnalysis";
import { useProgressPhotos } from "@/hooks/useProgressPhotos";

interface ScoreHistoryChartProps {
  analyses: Analysis[];
}

export const ScoreHistoryChart = ({ analyses }: ScoreHistoryChartProps) => {
  const { photos } = useProgressPhotos();

  // Merge analyses and progress photos into a unified timeline
  const analysisPoints = analyses
    .filter((a) => a.skin_score?.overall > 0)
    .map((a) => ({
      date: new Date(a.created_at),
      score: a.skin_score.overall,
      type: "Analysis" as const,
    }));

  const progressPoints = photos
    .filter((p) => p.score_estimate && p.score_estimate > 0)
    .map((p) => ({
      date: new Date(p.date_uploaded),
      score: p.score_estimate!,
      type: "Progress Check" as const,
    }));

  const allPoints = [...analysisPoints, ...progressPoints]
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (allPoints.length < 2) return null;

  const data = allPoints.map((p, i) => ({
    name: i === 0 ? "Start" : `Week ${i}`,
    score: p.score,
    date: p.date.toLocaleDateString(),
    type: p.type,
  }));

  return (
    <div className="card-elevated">
      <h3 className="font-serif text-xl mb-5">Skin Health Score Over Time</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(35 15% 88%)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(30 8% 50%)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(30 8% 50%)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(40 15% 95%)",
                border: "1px solid hsl(35 15% 88%)",
                borderRadius: "12px",
                fontSize: "13px",
              }}
              formatter={(value: number, _name: string, props: any) => [
                `${value}/100`,
                props.payload?.type || "Score",
              ]}
              labelFormatter={(_label: string, payload: any[]) =>
                payload?.[0]?.payload?.date || _label
              }
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(148 25% 38%)"
              strokeWidth={2.5}
              dot={{ fill: "hsl(148 25% 38%)", r: 4, strokeWidth: 2, stroke: "hsl(45 20% 97%)" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        {data.length > 1 && data[data.length - 1].score > data[0].score
          ? "Your skin health appears to be trending upward. Keep going!"
          : data.length > 1 && data[data.length - 1].score === data[0].score
            ? "Your score has been stable. Consistency is key."
            : "Your score has varied. Focus on the habits that work best for you."}
      </p>
    </div>
  );
};
