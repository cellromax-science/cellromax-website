import { forwardRef, useId } from "react";

/* --------------------------------------------------------------------------
   Select — 드롭다운 선택 필드
   globals.css의 폼 리셋이 적용되어 있으므로,
   appearance-none + 커스텀 chevron SVG로 네이티브 화살표를 대체합니다.
   -------------------------------------------------------------------------- */

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** 필드 위에 표시할 라벨 텍스트 */
  label?: string;
  /** 에러 메시지 — 존재하면 에러 스타일이 적용됩니다 */
  error?: string;
  /** 라벨 아래에 표시할 보조 설명 텍스트 */
  helperText?: string;
  /** 기본 선택 옵션 텍스트 (value="") */
  placeholder?: string;
  /** 드롭다운 옵션 목록 */
  options: SelectOption[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      placeholder,
      options,
      required,
      disabled,
      className,
      id: externalId,
      ...rest
    },
    ref
  ) => {
    const autoId = useId();
    const selectId = externalId ?? autoId;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const hasError = Boolean(error);

    const describedBy =
      [errorId, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className={`flex flex-col ${className ?? ""}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
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

        {/* Select Wrapper — 커스텀 chevron 배치용 */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            disabled={disabled}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={describedBy}
            className={`w-full appearance-none squircle-sm bg-white pr-10 ${
              hasError
                ? "border-error ring-3 ring-error/12"
                : "border-gray-300 focus:border-primary focus:ring-3 focus:ring-primary/12"
            } ${
              disabled ? "bg-gray-50 opacity-60 cursor-not-allowed" : ""
            }`}
            {...rest}
          >
            {/* Placeholder option */}
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom Chevron Icon */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className={`h-4 w-4 ${hasError ? "text-error" : "text-gray-400"}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

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

Select.displayName = "Select";

export { Select };
export type { SelectProps, SelectOption };
