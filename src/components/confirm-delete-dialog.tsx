import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Confirmación de una eliminación. Si la API la rechaza porque algo usa el registro, el motivo se muestra aquí mismo
 * (`error`) y el diálogo sigue abierto para que no se pierda de vista qué lo bloquea.
 */
export function ConfirmDeleteDialog({
  title,
  description,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string
  description: string
  pending: boolean
  error: string | null | undefined
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-md bg-fur-red-500/10 p-3 text-sm text-fur-red-500">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {error ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!error && (
            <Button variant="destructive" disabled={pending} onClick={onConfirm}>
              {pending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
