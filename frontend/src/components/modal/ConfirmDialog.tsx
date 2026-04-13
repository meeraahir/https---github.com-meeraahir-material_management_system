import { Button } from "../ui/Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  confirmLabel?: string;
  description: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}

export function ConfirmDialog({
  confirmLabel = "Confirm",
  description,
  isLoading = false,
  onClose,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button isLoading={isLoading} onClick={onConfirm} type="button">
            {confirmLabel}
          </Button>
        </div>
      }
      onClose={onClose}
      open={open}
      size="md"
      title={title}
    >
      <p className="text-sm leading-7 text-[#6B7280]">
        {description}
      </p>
    </Modal>
  );
}
