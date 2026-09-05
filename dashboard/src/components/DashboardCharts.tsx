import type { Snapshot } from "../lib/management";
import { entier, fcfa } from "../lib/format";

const WIDTH = 720;
const HEIGHT = 230;
const PAD = { top: 22, right: 18, bottom: 38, left: 48 };

function shortMoney(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} k`;
  return entier(value);
}

function ActivityChart({ data }: { data: Snapshot }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const orders = data.orders.filter((order) => {
      const created = new Date(order.created_at);
      return created >= date && created < next && order.order_status !== "CANCELLED";
    });
    return { date, orders: orders.length, value: orders.reduce((sum, order) => sum + order.total_amount, 0) };
  });
  const maxValue = Math.max(...days.map((day) => day.value), 1);
  const x = (index: number) => PAD.left + index * ((WIDTH - PAD.left - PAD.right) / (days.length - 1));
  const y = (value: number) => HEIGHT - PAD.bottom - (value / maxValue) * (HEIGHT - PAD.top - PAD.bottom);
  const line = days.map((day, index) => `${x(index)},${y(day.value)}`).join(" ");
  const area = `${PAD.left},${HEIGHT - PAD.bottom} ${line} ${WIDTH - PAD.right},${HEIGHT - PAD.bottom}`;
  const total = days.reduce((sum, day) => sum + day.value, 0);

  return <section className="chart-panel chart-activity" aria-labelledby="activity-chart-title">
    <div className="chart-heading"><div><h2 id="activity-chart-title">Activité des 7 derniers jours</h2><p>La valeur des commandes enregistrées au fil de la semaine.</p></div><strong>{fcfa(total)}</strong></div>
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Valeur totale des commandes sur sept jours : ${fcfa(total)}`}>
      {[0, .5, 1].map((ratio) => <g key={ratio}><line className="chart-grid-line" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(maxValue * ratio)} y2={y(maxValue * ratio)} /><text className="chart-axis-label" x={PAD.left - 8} y={y(maxValue * ratio) + 4} textAnchor="end">{shortMoney(maxValue * ratio)}</text></g>)}
      <polygon className="chart-area" points={area} />
      <polyline className="chart-line" points={line} />
      {days.map((day, index) => <g key={day.date.toISOString()}><circle className="chart-point" cx={x(index)} cy={y(day.value)} r="4"><title>{day.date.toLocaleDateString("fr-FR", { weekday: "long" })} : {fcfa(day.value)} · {entier(day.orders)} commande(s)</title></circle><text className="chart-axis-label" x={x(index)} y={HEIGHT - 12} textAnchor="middle">{day.date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</text></g>)}
    </svg>
  </section>;
}

function GroupJourney({ data }: { data: Snapshot }) {
  const created = data.impact?.groups_created ?? data.groups.length;
  const successful = data.impact?.groups_successful ?? data.groups.filter((group) => ["LOCKED", "COMPLETED"].includes(group.status)).length;
  const active = data.impact?.groups_active ?? data.groups.filter((group) => group.status === "OPEN").length;
  const max = Math.max(created, active, successful, 1);
  return <section className="chart-panel" aria-labelledby="groups-chart-title">
    <div className="chart-heading"><div><h2 id="groups-chart-title">Parcours des groupes</h2><p>De la création à la réussite.</p></div></div>
    <div className="journey-bars">
      {[['Créés', created], ['Actifs', active], ['Réussis', successful]].map(([label, value]) => <div className="journey-row" key={label}><div><span>{label}</span><strong>{entier(Number(value))}</strong></div><div className="journey-track" role="progressbar" aria-label={`${label} : ${value}`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Number(value)}><span style={{ width: `${Number(value) / max * 100}%` }} /></div></div>)}
    </div>
    <p className="chart-takeaway">{created > 0 ? `${Math.round(successful / created * 100)} % des groupes créés ont atteint leur objectif.` : "Les premiers groupes permettront de mesurer la réussite."}</p>
  </section>;
}

function OrderJourney({ data }: { data: Snapshot }) {
  const statuses = [
    ["En attente", data.orders.filter((order) => ["PENDING", "NEW"].includes(order.order_status)).length],
    ["Confirmées", data.orders.filter((order) => order.order_status === "CONFIRMED").length],
    ["Livrées", data.orders.filter((order) => order.delivery_status === "DELIVERED").length],
  ] as const;
  const total = statuses.reduce((sum, [, value]) => sum + value, 0);
  return <section className="chart-panel chart-orders" aria-labelledby="orders-chart-title">
    <div className="chart-heading"><div><h2 id="orders-chart-title">Suivi des commandes</h2><p>La charge opérationnelle, en un regard.</p></div><strong>{entier(data.orders.length)}</strong></div>
    {total > 0 ? <><div className="order-stack" role="img" aria-label={statuses.map(([label, value]) => `${label} : ${value}`).join(", ")}>{statuses.map(([label, value], index) => value > 0 && <span className={`order-segment order-segment-${index + 1}`} key={label} style={{ width: `${value / total * 100}%` }}><span className="sr-only">{label} : {value}</span></span>)}</div><div className="order-legend">{statuses.map(([label, value], index) => <div key={label}><i className={`order-dot order-dot-${index + 1}`} /><span>{label}</span><strong>{entier(value)}</strong></div>)}</div></> : <p className="chart-empty">Les états apparaîtront dès que les commandes seront disponibles.</p>}
  </section>;
}

export function DashboardCharts({ data }: { data: Snapshot }) {
  return <div className="dashboard-charts"><ActivityChart data={data} /><GroupJourney data={data} /><OrderJourney data={data} /></div>;
}
