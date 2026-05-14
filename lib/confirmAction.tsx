import toast from "react-hot-toast";

interface ConfirmActionOptions {
  /** Label on the confirming button. Default: "Yes, Delete". */
  confirmLabel?: string;
  /** Label on the cancel button. Default: "Cancel". */
  cancelLabel?: string;
  /** Tailwind class for the confirm button. Default: red ("destructive"). */
  confirmClass?: string;
}

const DEFAULT_CONFIRM_CLASS =
  "px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors";
const CANCEL_CLASS =
  "px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors";

/**
 * Toast-based confirmation prompt. Use instead of window.confirm or alert.
 * Resolves to true if the user confirms, false otherwise (including dismiss).
 */
export function confirmAction(
  message: string,
  options: ConfirmActionOptions = {}
): Promise<boolean> {
  const {
    confirmLabel = "Yes, Delete",
    cancelLabel = "Cancel",
    confirmClass = DEFAULT_CONFIRM_CLASS,
  } = options;

  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{message}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className={confirmClass}
            >
              {confirmLabel}
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className={CANCEL_CLASS}
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      ),
      { duration: 10000 }
    );
  });
}
