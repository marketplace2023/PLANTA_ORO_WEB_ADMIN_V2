import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { OrderCommunication } from '@/components/order-communication';
export function CommerceCasesPage() { const [selected, setSelected] = useState(''); const q = useQuery({ queryKey: ['commerce', 'admin-cases'], queryFn: () => api<Array<{
        id: string;
        orderId: string;
        subject: string;
        status: string;
        kind: string;
    }>>('/marketplace/admin/cases'), refetchInterval: 30000 }); return <div className="space-y-6"><header><p className="text-xs text-muted-foreground">Marketplace / Mediación</p><h1 className="mt-2 text-3xl font-semibold">Incidencias y garantías</h1></header><div className="grid items-start gap-6 xl:grid-cols-[20rem_1fr]"><nav className="space-y-2">{q.isError ? <p>No se pudieron cargar las incidencias.</p> : q.isLoading ? <p>Cargando…</p> : !q.data?.length ? <p>Sin incidencias registradas.</p> : q.data.map(c => <button key={c.id} className="w-full rounded-xl border border-border bg-card p-4 text-left text-sm" onClick={() => setSelected(c.orderId)}><strong>{c.subject}</strong><p className="mt-2 text-xs">{c.kind} · {c.status}</p></button>)}</nav>{selected ? <div className="rounded-xl border border-border bg-card p-5"><OrderCommunication key={selected} id={selected} seller admin/></div> : <p className="text-muted-foreground">Selecciona una incidencia para revisar la conversación y registrar una resolución.</p>}</div></div>; }
