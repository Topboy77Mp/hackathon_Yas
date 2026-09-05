import { useEffect, useRef, useState, type ReactNode } from 'react';
import { libelleStatut } from '../lib/format';
import { KpiTooltip } from '../components/KpiTooltip';
export function Badge({value}: {value: string}) {
  const tone = value === 'PENDING' ? 'attention'
    : ['FAILED', 'REJECTED'].includes(value) ? 'error'
    : ['SUCCESS', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'DELIVERED'].includes(value) ? 'actif'
    : 'neutre';
  return <span className={`status status-${tone}`}>{libelleStatut(value)}</span>;
}
export function Metric({label, value, note, description, icon}: {label: string; value: ReactNode; note?: string; description?: string; icon?: ReactNode}) {return <div className="metric"><div className="metric-heading">{icon && <span className="metric-icon" aria-hidden="true">{icon}</span>}<span className="metric-label">{label}</span>{description && <KpiTooltip label={label} description={description} />}</div><strong>{value}</strong>{note && <small>{note}</small>}</div>;}
export function Notice({children}: {children: ReactNode}) {return <p className="notice">{children}</p>;}
export function Panel({title, close, children}: {title: string; close: () => void; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {const prior = document.activeElement as HTMLElement; ref.current?.showModal(); return () => prior?.focus();}, []);
  return <dialog ref={ref} className="detail-panel" onCancel={close} aria-labelledby="panel-title"><div className="panel-heading"><h2 id="panel-title">{title}</h2><button type="button" onClick={close}>Fermer</button></div>{children}</dialog>;
}
export function Confirm({title, description, accept, close}: {title: string; description: string; accept: () => Promise<void>; close: () => void}) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Panel title={title} close={close}><p>{description}</p>{error && <p role="alert" className="form-error">{error}</p>}<div className="actions"><button autoFocus onClick={close} disabled={busy}>Conserver</button><button className={/^(Supprimer|Annuler|Suspendre|Désactiver|Refuser)/.test(title) ? "button-danger" : "button-primary"} disabled={busy} onClick={async () => {setBusy(true); try {await accept(); close();} catch(e) {setError((e as Error).message);} finally {setBusy(false);}}}>{busy ? 'Enregistrement…' : 'Confirmer'}</button></div></Panel>;
}
export interface Column<T> { label: string; render: (row: T) => ReactNode; secondary?: boolean; align?: "right" }
export function DataTable<T extends {id: number}>({rows, columns, title, search, filters = []}: {rows: T[]; columns: Column<T>[]; title: string; search: (row: T) => string; filters?: {label: string; value: (row: T) => string}[]}) {
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState<Record<string, string>>({}); const [page, setPage] = useState(0);
  const found = rows.filter(row => search(row).toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')) && filters.every(f => !selected[f.label] || f.value(row) === selected[f.label]));
  const pages = Math.max(1, Math.ceil(found.length / 10)); const current = Math.min(page, pages - 1);
  return <section className="table-section" aria-label={title}><div className="table-tools"><label className="search-field">Rechercher<input type="search" value={query} placeholder={`Rechercher dans ${title.toLocaleLowerCase('fr')}`} onChange={e => {setQuery(e.target.value); setPage(0);}} /></label>{filters.map(f => <label key={f.label}>{f.label}<select value={selected[f.label] ?? ''} onChange={e => {setSelected({...selected, [f.label]: e.target.value}); setPage(0);}}><option value="">Tous</option>{[...new Set(rows.map(f.value))].filter(Boolean).map(v => <option key={v} value={v}>{libelleStatut(v)}</option>)}</select></label>)}</div><div className="table-scroll" tabIndex={0} role="region" aria-label={title}><table><caption className="sr-only">{title}</caption><thead><tr>{columns.map(c => <th key={c.label} className={[c.secondary ? 'secondary-column' : '', c.align === 'right' ? 'numeric-column' : ''].filter(Boolean).join(' ')} scope="col">{c.label}</th>)}</tr></thead><tbody>{found.slice(current * 10, current * 10 + 10).map(row => <tr key={row.id}>{columns.map(c => <td key={c.label} className={[c.secondary ? 'secondary-column' : '', c.align === 'right' ? 'numeric-column' : ''].filter(Boolean).join(' ')}>{c.render(row)}</td>)}</tr>)}{found.length === 0 && <tr><td colSpan={columns.length} className="empty">Aucun résultat. Modifiez les filtres ou ajoutez un premier élément.</td></tr>}</tbody></table></div><footer className="pagination"><span>{found.length} résultat{found.length > 1 ? 's' : ''}</span>{pages > 1 && <div className="actions"><button disabled={current === 0} onClick={() => setPage(current - 1)}>Précédent</button><span>Page {current + 1} / {pages}</span><button disabled={current + 1 === pages} onClick={() => setPage(current + 1)}>Suivant</button></div>}</footer></section>;
}
