import { Leaf } from 'lucide-react'

export function PanelFooter() {
  return (
    <footer className="panel-footer">
      <span><img src="/brand/fur-mark.svg" alt="" /><strong>FUR</strong> Ecosistema Digital</span>
      <p>Minería digital, más oro, mayor eficiencia</p>
      <span className="panel-footer-motto"><Leaf aria-hidden /> Operación sostenible</span>
    </footer>
  )
}
