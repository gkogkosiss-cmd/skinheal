import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { Analysis } from "@/hooks/useAnalysis";

interface ScoreHistoryChartProps {
  analyses: Analysis[];
}

export const ScoreHistoryChart = ({ analyses }: ScoreHistoryChartProps) => {
  const data = [...analyses]
    .filter((a) => a.skin_score?.overall > 0)
    .reverse()
    .map((a, i) => ({
      name: `Week ${i}`,
      score: a.skin_score.overall,
      date: new Date(a.created_at).toLocaleDateString(),
    }));

  if (data.length < 2) return null;

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
              formatter={(value: number) => [`${value}/100`, "Score"]}
              labelFormatter={(label: string, payload: any[]) =>
                payload?.[0]?.payload?.date || label
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
        {data[data.length - 1].score > data[0].score
          ? "Your skin health appears to be trending upward. Keep going!"
          : data[data.length - 1].score === data[0].score
            ? "Your score has been stable. Consistency is key."
            : "Your score has varied. Focus on the habits that work best for you."}
      </p>
    </div>
  );
};
