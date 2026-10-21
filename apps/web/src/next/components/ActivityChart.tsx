import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface ChartPoint {
  day: string;
  uploads: number;
  downloads: number;
  signins: number;
}

interface ChartTooltipPayloadItem {
  dataKey?: string | number;
  color?: string;
  value?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border bg-popover/95 px-3 py-2.5 backdrop-blur">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2" style={{ background: p.color }} />
            <span className="capitalize text-muted-foreground">{p.dataKey}</span>
            <span className="ml-6 font-mono tabular-nums text-foreground">{p.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ActivityChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={252}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" strokeOpacity={0.6} vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'JetBrains Mono' }} dy={8} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontFamily: 'JetBrains Mono' }} width={48} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--foreground))', strokeOpacity: 0.18, strokeWidth: 1 }} />
        <Line type="monotone" dataKey="uploads" stroke="hsl(var(--chart-1))" strokeWidth={1.75} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="downloads" stroke="hsl(var(--chart-2))" strokeWidth={1.75} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="signins" stroke="hsl(var(--chart-3))" strokeWidth={1.75} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
