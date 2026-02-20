import { forwardRef, useId } from "react";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, required, disabled, className, id: externalId, ...rest }, ref) => {
    const autoId = useId();
    const inputId = externalId ?? autoId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hasError = Boolean(error);

    return (
      <div className={`flex flex-col ${className ?? ""}`}>
        <label
          htmlFor={inputId}
          className={`flex items-start gap-2.5 cursor-pointer select-none ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            required={required}
            disabled={disabled}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={errorId}
            className={`mt-0.5 size-4 squircle-xs border ${
              hasError
                ? "border-error accent-error"
                : "border-gray-300 accent-primary"
            }`}
            {...rest}
          />
          {label && (
            <span className={`text-sm ${hasError ? "text-error" : "text-gray-700"}`}>
              {label}
              {required && (
                <span className="ml-0.5 text-error" aria-hidden="true">*</span>
              )}
            </span>
          )}
        </label>
        {error && (
          <p id={errorId} className="mt-1 text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
export type { CheckboxProps };
