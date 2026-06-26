interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <p style={{ marginBottom: 4, fontWeight: 500 }}>{message}</p>
        <div className="modal-actions">
          <button className="btn btn--outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn--danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
