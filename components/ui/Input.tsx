import { forwardRef, useId } from "react";

/* --------------------------------------------------------------------------
   Input — 텍스트 입력 필드
   globals.css의 폼 리셋(border, padding, radius, focus ring)이 이미 적용되어 있으므로
   이 컴포넌트에서는 레이아웃, 상태별 스타일, 접근성 속성만 추가합니다.
   -------------------------------------------------------------------------- */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 필드 위에 표시할 라벨 텍스트 */
  label?: string;
  /** 에러 메시지 — 존재하면 에러 스타일이 적용됩니다 */
  error?: string;
  /** 라벨 아래에 표시할 보조 설명 텍스트 */
  helperText?: string;
  /** 입력 타입 (기본 'text') */
  type?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      placeholder,
      type = "text",
      required,
      disabled,
      className,
      id: externalId,
      ...rest
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = externalId ?? autoId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const hasError = Boolean(error);

    /* ---- 접근성: describedby 목록 조합 ---- */
    const describedBy =
      [errorId, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className={`flex flex-col ${className ?? ""}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={`mb-1.5 text-sm font-medium ${
              hasError ? "text-error" : "text-gray-700"
            }`}
          >
            {label}
            {required && (
              <span className="ml-0.5 text-error" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Helper Text */}
        {helperText && (
          <p id={helperId} className="mb-1.5 text-xs text-gray-400">
            {helperText}
          </p>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full squircle-sm bg-white ${
            hasError
              ? "border-error ring-3 ring-error/12"
              : "border-gray-300 focus:border-primary focus:ring-3 focus:ring-primary/12"
          } ${
            disabled ? "bg-gray-50 opacity-60 cursor-not-allowed" : ""
          }`}
          {...rest}
        />

        {/* Error Message */}
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
