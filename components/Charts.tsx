import { money } from "@/lib/finance";

function mesCorto(mesISO: string) {
  // mesISO = 'YYYY-MM-01'
  const [y, m] = mesISO.split("-").map(Number);
  return new Intl.DateTimeFormat("es", { month: "short" }).format(
    new Date(y, m - 1, 1),
  );
}

// ---- Gráfico de barras: ingresos vs gastos por mes ----
export function BarrasResultados({
  data,
}: {
  data: { mes: string; ingresos: number; gastos: number }[];
}) {
  const W = 360, H = 200;
  const padL = 10, padR = 10, padT = 18, padB = 26;
  const x0 = padL, x1 = W - padR, y1 = H - padB;
  const plotH = y1 - padT;
  const max = Math.max(1, ...data.map((d) => Math.max(d.ingresos, d.gastos)));
  const n = Math.max(1, data.length);
  const groupW = (x1 - x0) / n;
  const barW = Math.min(22, groupW * 0.32);
  const gap = 3;
  const h = (v: number) => (v / max) * plotH;

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-500" /> Ingresos
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" /> Gastos
        </span>
        <span className="ml-auto tabular-nums">máx {money(max)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        <line x1={x0} y1={y1} x2={x1} y2={y1} className="stroke-neutral-300 dark:stroke-neutral-700" strokeWidth="1" />
        {data.map((d, i) => {
          const cx = x0 + groupW * i + groupW / 2;
          const xi = cx - barW - gap / 2;
          const xg = cx + gap / 2;
          return (
            <g key={d.mes}>
              <rect x={xi} y={y1 - h(d.ingresos)} width={barW} height={h(d.ingresos)} rx="2" className="fill-teal-500" />
              <rect x={xg} y={y1 - h(d.gastos)} width={barW} height={h(d.gastos)} rx="2" className="fill-red-500" />
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-neutral-500 text-[10px] capitalize">
                {mesCorto(d.mes)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---- Gráfico de línea: patrimonio por mes ----
export function LineaPatrimonio({
  data,
}: {
  data: { mes: string; patrimonio: number }[];
}) {
  const W = 360, H = 190;
  const padL = 10, padR = 10, padT = 18, padB = 26;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const vals = data.map((d) => d.patrimonio);
  const min = Math.min(0, ...vals);
  const max = Math.max(1, ...vals);
  const span = max - min || 1;
  const n = Math.max(1, data.length);
  const x = (i: number) => (n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1));
  const y = (v: number) => y1 - ((v - min) / span) * (y1 - y0);
  const puntos = data.map((d, i) => `${x(i)},${y(d.patrimonio)}`).join(" ");
  const yCero = y(0);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
        <span>Patrimonio neto</span>
        <span className="tabular-nums">
          {data.length ? money(data[data.length - 1].patrimonio) : "—"}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {min < 0 && (
          <line x1={x0} y1={yCero} x2={x1} y2={yCero} className="stroke-neutral-300 dark:stroke-neutral-700" strokeDasharray="3 3" strokeWidth="1" />
        )}
        <polyline
          points={puntos}
          fill="none"
          className="stroke-teal-500"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <g key={d.mes}>
            <circle cx={x(i)} cy={y(d.patrimonio)} r="3" className="fill-teal-500" />
            <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-neutral-500 text-[10px] capitalize">
              {mesCorto(d.mes)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
