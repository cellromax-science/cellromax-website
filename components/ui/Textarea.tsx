"use client";

import { forwardRef, useId, useState, useCallback } from "react";

/* --------------------------------------------------------------------------
   Textarea — 멀티라인 텍스트 입력 필드
   'use client' 선언 — maxLength 카운터 표시를 위한 상태 관리 필요
   globals.css의 폼 리셋이 적용되어 있으므로 추가 스타일만 선언합니다.
   -------------------------------------------------------------------------- */

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 필드 위에 표시할 라벨 텍스트 */
  label?: string;
  /** 에러 메시지 — 존재하면 에러 스타일이 적용됩니다 */
  error?: string;
  /** 라벨 아래에 표시할 보조 설명 텍스트 */
  helperText?: string;
  /** 표시 행 수 (기본 4) */
  rows?: number;
  /** 최대 글자 수 — 설정 시 우측 하단에 카운터 표시 */
  maxLength?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      placeholder,
      rows = 4,
      maxLength,
      required,
      disabled,
      className,
      id: externalId,
      onChange,
      defaultValue,
      value: controlledValue,
      ...rest
    },
    ref
  ) => {
    const autoId = useId();
    const textareaId = externalId ?? autoId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;
    const counterId = maxLength ? `${textareaId}-counter` : undefined;
    const hasError = Boolean(error);

    /* ---- 글자 수 카운터 상태 ---- */
    const [charCount, setCharCount] = useState<number>(() => {
      if (controlledValue != null) return String(controlledValue).length;
      if (defaultValue != null) return String(defaultValue).length;
      return 0;
    });

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCharCount(e.target.value.length);
        onChange?.(e);
      },
      [onChange]
    );

    /* ---- 접근성: describedby 목록 조합 ---- */
    const describedBy =
      [errorId, helperId, counterId].filter(Boolean).join(" ") || undefined;

    return (
      <div className={`flex flex-col ${className ?? ""}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
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

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
          defaultValue={controlledValue == null ? defaultValue : undefined}
          value={controlledValue}
          className={`w-full resize-y squircle-md bg-white ${
            hasError
              ? "border-error ring-3 ring-error/12"
              : "border-gray-300 focus:border-primary focus:ring-3 focus:ring-primary/12"
          } ${
            disabled ? "bg-gray-50 opacity-60 cursor-not-allowed" : ""
          }`}
          {...rest}
        />

        {/* Bottom Row: Error Message + Character Counter */}
        <div className="mt-1.5 flex items-start justify-between gap-2">
          {/* Error Message */}
          {error ? (
            <p id={errorId} className="text-xs text-error" role="alert">
              {error}
            </p>
          ) : (
            /* 카운터가 있을 때 에러가 없어도 왼쪽 공간 확보 */
            maxLength && <span />
          )}

          {/* Character Counter */}
          {maxLength && (
            <p
              id={counterId}
              className={`ml-auto text-xs ${
                charCount >= maxLength ? "text-error" : "text-gray-400"
              }`}
              aria-live="polite"
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
