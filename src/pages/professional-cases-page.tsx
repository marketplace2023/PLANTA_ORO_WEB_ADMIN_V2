import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ServiceOrderWorkspace } from '@/components/service-order-workspace';
import { STATES, date } from '@/lib/professional';
export function ProfessionalCasesPage() {
    const [id, setId] = useState('');
    const q = useQuery({ queryKey: ['professional', 'admin-cases'], queryFn: () => api<Array<{
            id: string;
            title: string;
            status: string;
            contractorName: string;
            dispute: {
                reason: string;
                resolution?: string;
            };
            updatedAt: string;
        }>>('/professional-market/admin/cases'), refetchInterval: 30000 });
    if (id)
        return <div className="pro-workspace"><button className="pro-link mb-6" onClick={() => setId('')}>← Todas las incidencias de servicios</button><ServiceOrderWorkspace id={id} back="/professional-cases" seller/></div>;
    return <div className="pro-workspace"><header className="pro-page-heading"><div><p className="pro-eyebrow">Mediación del ecosistema</p><h1>Incidencias de servicios.</h1><p>Revisa el alcance acordado, la conversación y las entregas para registrar una resolución.</p></div></header><section className="pro-panel">{q.isLoading ? <p className="pro-loading">Cargando…</p> : q.isError ? <p className="pro-error" role="alert">No se pudieron cargar las incidencias.</p> : !q.data?.length ? <div className="pro-empty"><h2>No hay incidencias registradas</h2><p>Las solicitudes de mediación de clientes y profesionales aparecerán aquí.</p></div> : q.data.map(c => <button key={c.id} className="pro-order-row w-full text-left" onClick={() => setId(c.id)}><div><h3>{c.title}</h3><p>{c.contractorName}</p><p>{c.dispute.reason}</p></div><div><span className="pro-status">{STATES[c.status]}</span><small>{date(c.updatedAt)}</small></div></button>)}</section></div>;
}
