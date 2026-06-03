import { Dialog } from '@headlessui/react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonColor = "#020c4c"
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
          <Dialog.Title className="text-lg font-bold mb-2">
            {title}
          </Dialog.Title>

          <p className="text-gray-600 mb-4 whitespace-pre-line">
            {message}
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              className="px-4 py-2 text-white rounded-md hover:opacity-90 transition"
              style={{ background: confirmButtonColor }}
            >
              {confirmText}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ConfirmModal;