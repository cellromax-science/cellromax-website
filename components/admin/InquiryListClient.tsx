"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { toast } from "@/components/ui/Toast";

import type { BadgeVariant } from "@/components/ui/Badge";
import type {
  ContactRecipientEmailMap,
  ContactRecipientSetting,
  Inquiry,
  InquiryReply,
  InquiryReplyTemplate,
  InquiryStatus,
  InquiryType,
  ReplyChannel,
  ReplyStatus,
} from "@/types/contact";

interface InquiryListClientProps {
  initialItems: Inquiry[];
  initialTotal: number;
  initialRecipientSettings: ContactRecipientSetting[];
  canManageRecipientSettings: boolean;
}

const PAGE_LIMIT = 20;

const INQUIRY_TYPE_BADGE: Record<
  InquiryType,
  { variant: BadgeVariant; label: string }
> = {
  consumer: { variant: "info", label: "소비자" },
  pharmacist: { variant: "success", label: "약사" },
  business: { variant: "warning", label: "비즈니스" },
};

const INQUIRY_STATUS_BADGE: Record<
  InquiryStatus,
  { variant: BadgeVariant; label: string }
> = {
  pending: { variant: "error", label: "미확인" },
  reviewing: { variant: "warning", label: "검토중" },
  replied: { variant: "success", label: "답변완료" },
  closed: { variant: "outline", label: "종료" },
};

const INQUIRY_TYPE_FILTER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "consumer", label: "소비자" },
  { value: "pharmacist", label: "약사" },
  { value: "business", label: "비즈니스" },
];

const INQUIRY_STATUS_FILTER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "pending", label: "미확인" },
  { value: "reviewing", label: "검토중" },
  { value: "replied", label: "답변완료" },
  { value: "closed", label: "종료" },
];

const INQUIRY_STATUS_OPTIONS = [
  { value: "pending", label: "미확인" },
  { value: "reviewing", label: "검토중" },
  { value: "replied", label: "답변완료" },
  { value: "closed", label: "종료" },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}.${m}.${d}`;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${y}.${m}.${d} ${h}:${min}`;
}

function recipientSettingsToMap(
  settings: ContactRecipientSetting[],
): ContactRecipientEmailMap {
  return settings.reduce<ContactRecipientEmailMap>(
    (acc, setting) => {
      acc[setting.inquiry_type] = setting.recipient_email;
      return acc;
    },
    {
      consumer: "",
      pharmacist: "",
      business: "",
    },
  );
}

function normalizeRecipientEmails(
  emails: ContactRecipientEmailMap,
): ContactRecipientEmailMap {
  return {
    consumer: emails.consumer.trim(),
    pharmacist: emails.pharmacist.trim(),
    business: emails.business.trim(),
  };
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={100} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center squircle-lg bg-gray-100">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="text-gray-400"
            >
              <path
                d="M5 5H23C23.5523 5 24 5.44772 24 6V18C24 18.5523 23.5523 19 23 19H9L4 24V6C4 5.44772 4.44772 5 5 5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="10.5" cy="12" r="1" fill="currentColor" />
              <circle cx="14" cy="12" r="1" fill="currentColor" />
              <circle cx="17.5" cy="12" r="1" fill="currentColor" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">
            접수된 문의가 없습니다
          </p>
          <p className="text-xs text-gray-400">
            고객 문의가 접수되면 여기에 표시됩니다.
          </p>
        </div>
      </td>
    </tr>
  );
}

function InfoField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-words">{value}</dd>
    </div>
  );
}

const REPLY_STATUS_BADGE: Record<
  ReplyStatus,
  { variant: BadgeVariant; label: string }
> = {
  sent: { variant: "success", label: "발송완료" },
  failed: { variant: "error", label: "발송실패" },
};

const REPLY_CHANNEL_LABEL: Record<ReplyChannel, string> = {
  email: "메일",
  sms: "문자",
};

interface DetailModalProps {
  inquiry: Inquiry | null;
  canReply: boolean;
  onClose: () => void;
  onSave: (id: string, status: InquiryStatus, adminMemo: string) => Promise<void>;
  onReplied: (id: string, repliedAt: string, channel: ReplyChannel) => void;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-sm font-semibold text-gray-700">{children}</h3>;
}

function DetailModal({
  inquiry,
  canReply,
  onClose,
  onSave,
  onReplied,
}: DetailModalProps) {
  const [status, setStatus] = useState<InquiryStatus>("pending");
  const [adminMemo, setAdminMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 답장 작성 상태
  const [useEmail, setUseEmail] = useState(false);
  const [useSms, setUseSms] = useState(false);
  const [subject, setSubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [templates, setTemplates] = useState<InquiryReplyTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 답장 이력 상태
  const [replies, setReplies] = useState<InquiryReply[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  const hasEmail = Boolean(inquiry?.email);
  const hasPhone = Boolean(inquiry?.phone);

  const loadReplies = useCallback(async () => {
    if (!inquiry) return;

    setIsLoadingReplies(true);
    try {
      const response = await fetch(`/api/inquiries/${inquiry.id}/reply`);
      if (!response.ok) {
        throw new Error("답장 이력을 불러오지 못했습니다.");
      }
      const data = await response.json();
      setReplies(data.replies ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "답장 이력 조회에 실패했습니다.",
      );
    } finally {
      setIsLoadingReplies(false);
    }
  }, [inquiry]);

  // 모달이 열릴 때 상태 초기화 + 답장 이력 로드
  useEffect(() => {
    if (!inquiry) return;

    setStatus(inquiry.status);
    setAdminMemo(inquiry.admin_memo ?? "");
    setUseEmail(Boolean(inquiry.email));
    setUseSms(false);
    setSubject("");
    setReplyBody("");
    setSelectedTemplateId("");
    setReplies([]);
    void loadReplies();
  }, [inquiry, loadReplies]);

  // 답장 권한이 있으면 템플릿 목록을 한 번 불러온다.
  useEffect(() => {
    if (!inquiry || !canReply) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/inquiry-reply-templates");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setTemplates(data.templates ?? []);
      } catch {
        // 템플릿 로드 실패는 조용히 무시 (직접 입력 가능)
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inquiry, canReply]);

  const applyTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      if (!templateId) return;

      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      if (template.subject) setSubject(template.subject);
      setReplyBody(template.body);
    },
    [templates],
  );

  const handleSave = useCallback(async () => {
    if (!inquiry) return;

    setIsSaving(true);
    try {
      await onSave(inquiry.id, status, adminMemo);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [adminMemo, inquiry, onClose, onSave, status]);

  const handleSend = useCallback(async () => {
    if (!inquiry) return;

    const channels: ReplyChannel[] = [];
    if (useEmail) channels.push("email");
    if (useSms) channels.push("sms");

    if (channels.length === 0) {
      toast.error("발송할 채널을 선택해주세요.");
      return;
    }

    if (!replyBody.trim()) {
      toast.error("답변 내용을 입력해주세요.");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/inquiries/${inquiry.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels, subject, body: replyBody }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "답장 발송에 실패했습니다.");
      }

      const results: { channel: ReplyChannel; status: string; error?: string }[] =
        data?.results ?? [];

      for (const result of results) {
        const label = REPLY_CHANNEL_LABEL[result.channel];
        if (result.status === "sent") {
          toast.success(`${label} 답장을 발송했습니다.`);
        } else {
          toast.error(`${label} 발송 실패: ${result.error ?? "알 수 없는 오류"}`);
        }
      }

      const sent = results.find((r) => r.status === "sent");
      if (sent && data?.repliedAt) {
        onReplied(inquiry.id, data.repliedAt, sent.channel);
        setStatus("replied");
      }

      // 입력 내용 초기화 후 이력 즉시 갱신
      setReplyBody("");
      setSubject("");
      setSelectedTemplateId("");
      await loadReplies();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "답장 발송에 실패했습니다.",
      );
    } finally {
      setIsSending(false);
    }
  }, [inquiry, useEmail, useSms, replyBody, subject, onReplied, loadReplies]);

  if (!inquiry) return null;

  const typeBadge = INQUIRY_TYPE_BADGE[inquiry.inquiry_type];
  const statusBadge = INQUIRY_STATUS_BADGE[inquiry.status];

  const templateOptions = [
    { value: "", label: "템플릿 선택 (직접 입력 가능)" },
    ...templates
      .filter((t) => t.channel !== "sms")
      .map((t) => ({ value: t.id, label: t.title })),
  ];

  return (
    <Modal open={Boolean(inquiry)} onClose={onClose} title="문의 상세" size="lg">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={typeBadge.variant} size="sm">
            {typeBadge.label}
          </Badge>
          <Badge variant={statusBadge.variant} size="sm">
            {statusBadge.label}
          </Badge>
        </div>

        {/* 문의자 정보 */}
        <section>
          <SectionTitle>문의자 정보</SectionTitle>
          <dl className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-4 sm:grid-cols-2">
            <InfoField label="이름" value={inquiry.name} />
            {inquiry.email ? <InfoField label="이메일" value={inquiry.email} /> : null}
            {inquiry.phone ? <InfoField label="연락처" value={inquiry.phone} /> : null}
            {inquiry.company ? <InfoField label="회사명" value={inquiry.company} /> : null}
            {inquiry.country ? <InfoField label="국가" value={inquiry.country} /> : null}
            {inquiry.department_position ? (
              <InfoField label="부서 / 직책" value={inquiry.department_position} />
            ) : null}
            {inquiry.pharmacy_name ? (
              <InfoField label="약국명" value={inquiry.pharmacy_name} />
            ) : null}
            {inquiry.pharmacy_address ? (
              <InfoField
                label="약국 주소"
                value={inquiry.pharmacy_address}
                className="sm:col-span-2"
              />
            ) : null}
            {inquiry.recipient_email ? (
              <InfoField
                label="수신 담당자 메일"
                value={inquiry.recipient_email}
                className="sm:col-span-2"
              />
            ) : null}
          </dl>
        </section>

        {/* 문의 내용 */}
        <section>
          <SectionTitle>문의 내용</SectionTitle>
          {inquiry.subject ? (
            <p className="mb-2 text-sm font-medium text-gray-900">{inquiry.subject}</p>
          ) : null}
          <div className="rounded-2xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
            {inquiry.message}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-400">
            <span>접수일: {formatDateTime(inquiry.created_at)}</span>
            {inquiry.replied_at ? (
              <span>답변일: {formatDateTime(inquiry.replied_at)}</span>
            ) : null}
            <span>메일 발송 상태: {inquiry.email_status}</span>
          </div>
        </section>

        {/* 답장하기 — 문의 내용 바로 아래 */}
        {canReply ? (
          <section className="space-y-4 border-t border-gray-100 pt-6">
            <SectionTitle>답장하기</SectionTitle>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">발송 채널</p>
              <div className="flex flex-col gap-2">
                <label
                  className={`flex items-center gap-2 text-sm ${
                    hasEmail ? "text-gray-900" : "text-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={useEmail}
                    disabled={!hasEmail}
                    onChange={(event) => setUseEmail(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  메일 {hasEmail ? `(${inquiry.email})` : "(이메일 정보 없음)"}
                </label>
                <label
                  className={`flex items-center gap-2 text-sm ${
                    hasPhone ? "text-gray-900" : "text-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={useSms}
                    disabled={!hasPhone}
                    onChange={(event) => setUseSms(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  문자 {hasPhone ? `(${inquiry.phone})` : "(전화번호 없음)"}
                </label>
              </div>
            </div>

            <Select
              label="답변 템플릿"
              value={selectedTemplateId}
              onChange={(event) => applyTemplate(event.target.value)}
              options={templateOptions}
            />

            <Input
              label="메일 제목"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="문의에 대한 답변입니다"
              maxLength={300}
            />

            <Textarea
              label="답변 내용"
              placeholder="고객에게 보낼 답변 내용을 입력하세요."
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              rows={8}
              maxLength={5000}
            />

            <div className="rounded-2xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-500">
              발송 시 본문 하단에 &ldquo;발신 전용 메일이며 회신할 수 없습니다. 추가
              문의는 홈페이지 문의하기로 새로 접수해 주세요&rdquo; 안내 문구가 자동으로
              덧붙여집니다.
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleSend}
                loading={isSending}
                disabled={isSending}
              >
                답장 발송
              </Button>
            </div>
          </section>
        ) : null}

        {/* 답장 이력 — 발송 즉시 갱신 */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <SectionTitle>답장 이력</SectionTitle>
          {isLoadingReplies ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`reply-skeleton-${index}`}
                  className="h-20 animate-pulse rounded-2xl bg-gray-100"
                />
              ))}
            </div>
          ) : replies.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              발송된 답장이 없습니다.
            </p>
          ) : (
            replies.map((reply) => {
              const replyStatusBadge = REPLY_STATUS_BADGE[reply.status];
              return (
                <div key={reply.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" size="sm">
                      {REPLY_CHANNEL_LABEL[reply.channel]}
                    </Badge>
                    <Badge variant={replyStatusBadge.variant} size="sm">
                      {replyStatusBadge.label}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(reply.created_at)}
                    </span>
                  </div>
                  {reply.subject ? (
                    <p className="mb-1 text-sm font-medium text-gray-900">
                      {reply.subject}
                    </p>
                  ) : null}
                  <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                    {reply.body}
                  </p>
                  {reply.error_message ? (
                    <p className="mt-2 text-xs text-red-500">
                      오류: {reply.error_message}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </section>

        {/* 상태 / 메모 */}
        <section className="space-y-4 border-t border-gray-100 pt-6">
          <Select
            label="상태 변경"
            value={status}
            onChange={(event) => setStatus(event.target.value as InquiryStatus)}
            options={INQUIRY_STATUS_OPTIONS}
          />

          <Textarea
            label="관리자 메모"
            placeholder="내부 메모를 입력하세요. 고객에게는 노출되지 않습니다."
            value={adminMemo}
            onChange={(event) => setAdminMemo(event.target.value)}
            rows={4}
            maxLength={1000}
          />
        </section>

        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaving}
            className="flex-1"
          >
            저장
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface RecipientSettingsModalProps {
  open: boolean;
  canManageRecipientSettings: boolean;
  emails: ContactRecipientEmailMap;
  isSaving: boolean;
  onChange: (type: InquiryType, value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}

function RecipientSettingsModal({
  open,
  canManageRecipientSettings,
  emails,
  isSaving,
  onChange,
  onClose,
  onSave,
}: RecipientSettingsModalProps) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSaving) {
          onClose();
        }
      }}
      title="담당자 메일 설정"
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="소비자 문의"
          type="email"
          value={emails.consumer}
          onChange={(event) => onChange("consumer", event.target.value)}
          placeholder="consumer@example.com"
          disabled={!canManageRecipientSettings || isSaving}
        />
        <Input
          label="약사 문의"
          type="email"
          value={emails.pharmacist}
          onChange={(event) => onChange("pharmacist", event.target.value)}
          placeholder="pharmacist@example.com"
          disabled={!canManageRecipientSettings || isSaving}
        />
        <Input
          label="비즈니스 문의"
          type="email"
          value={emails.business}
          onChange={(event) => onChange("business", event.target.value)}
          placeholder="business@example.com"
          disabled={!canManageRecipientSettings || isSaving}
        />

        <div className="rounded-2xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
          {canManageRecipientSettings
            ? "문의 담당자와 슈퍼어드민이 각 문의 유형의 담당자 메일을 수정할 수 있습니다."
            : "문의 담당자와 슈퍼어드민만 수정할 수 있습니다."}
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1"
          >
            닫기
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onSave}
            loading={isSaving}
            disabled={!canManageRecipientSettings || isSaving}
            className="flex-1"
          >
            저장
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function InquiryListClient({
  initialItems,
  initialTotal,
  initialRecipientSettings,
  canManageRecipientSettings,
}: InquiryListClientProps) {
  const [items, setItems] = useState<Inquiry[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Inquiry | null>(null);
  const [isRecipientSettingsOpen, setIsRecipientSettingsOpen] = useState(false);
  const [isSavingRecipientSettings, setIsSavingRecipientSettings] = useState(false);
  const hasInitializedFilters = useRef(false);

  const initialRecipientEmailMap = useMemo(
    () => recipientSettingsToMap(initialRecipientSettings),
    [initialRecipientSettings],
  );
  const [savedRecipientEmails, setSavedRecipientEmails] =
    useState<ContactRecipientEmailMap>(initialRecipientEmailMap);
  const [draftRecipientEmails, setDraftRecipientEmails] =
    useState<ContactRecipientEmailMap>(initialRecipientEmailMap);

  useEffect(() => {
    setSavedRecipientEmails(initialRecipientEmailMap);
    setDraftRecipientEmails(initialRecipientEmailMap);
  }, [initialRecipientEmailMap]);

  const fetchItems = useCallback(
    async (
      searchQuery: string,
      typeFilter: string,
      statusValue: string,
      pageNumber: number,
    ) => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (typeFilter) params.set("inquiry_type", typeFilter);
        if (statusValue) params.set("status", statusValue);
        params.set("page", String(pageNumber));
        params.set("limit", String(PAGE_LIMIT));

        const response = await fetch(`/api/inquiries?${params.toString()}`);
        if (!response.ok) {
          throw new Error("문의 목록을 불러오지 못했습니다.");
        }

        const data = await response.json();
        setItems(data.inquiries ?? []);
        setTotal(data.total ?? 0);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "문의 목록 조회 중 오류가 발생했습니다.";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasInitializedFilters.current) {
      hasInitializedFilters.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      setPage(1);
      void fetchItems(search, inquiryType, statusFilter, 1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [fetchItems, inquiryType, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const visiblePages = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
      .filter((pageNumber) => {
        if (pageNumber === 1 || pageNumber === totalPages) return true;
        return Math.abs(pageNumber - page) <= 1;
      })
      .reduce<(number | "ellipsis")[]>((acc, pageNumber, index, arr) => {
        if (index > 0 && pageNumber - arr[index - 1] > 1) {
          acc.push("ellipsis");
        }

        acc.push(pageNumber);
        return acc;
      }, []);
  }, [page, totalPages]);

  const goToPage = useCallback(
    (pageNumber: number) => {
      setPage(pageNumber);
      void fetchItems(search, inquiryType, statusFilter, pageNumber);
    },
    [fetchItems, inquiryType, search, statusFilter],
  );

  const handleDetailSave = useCallback(
    async (id: string, newStatus: InquiryStatus, newAdminMemo: string) => {
      const response = await fetch(`/api/inquiries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          admin_memo: newAdminMemo || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error ?? "문의 저장에 실패했습니다.");
      }

      const repliedAt =
        newStatus === "replied" ? new Date().toISOString() : detailTarget?.replied_at ?? null;

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: newStatus,
                admin_memo: newAdminMemo || null,
                replied_at: repliedAt,
              }
            : item,
        ),
      );

      setDetailTarget((prev) =>
        prev && prev.id === id
          ? {
              ...prev,
              status: newStatus,
              admin_memo: newAdminMemo || null,
              replied_at: repliedAt,
            }
          : prev,
      );

      toast.success("문의 정보가 저장되었습니다.");
    },
    [detailTarget?.replied_at],
  );

  const handleReplied = useCallback(
    (id: string, repliedAt: string, channel: ReplyChannel) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "replied",
                replied_at: repliedAt,
                last_replied_channel: channel,
              }
            : item,
        ),
      );

      setDetailTarget((prev) =>
        prev && prev.id === id
          ? {
              ...prev,
              status: "replied",
              replied_at: repliedAt,
              last_replied_channel: channel,
            }
          : prev,
      );
    },
    [],
  );

  const openRecipientSettingsModal = useCallback(() => {
    setDraftRecipientEmails(savedRecipientEmails);
    setIsRecipientSettingsOpen(true);
  }, [savedRecipientEmails]);

  const closeRecipientSettingsModal = useCallback(() => {
    setDraftRecipientEmails(savedRecipientEmails);
    setIsRecipientSettingsOpen(false);
  }, [savedRecipientEmails]);

  const handleRecipientEmailChange = useCallback(
    (type: InquiryType, value: string) => {
      setDraftRecipientEmails((prev) => ({
        ...prev,
        [type]: value,
      }));
    },
    [],
  );

  const saveRecipientSettings = useCallback(async () => {
    const normalizedEmails = normalizeRecipientEmails(draftRecipientEmails);

    setIsSavingRecipientSettings(true);

    try {
      const response = await fetch("/api/contact-recipient-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: normalizedEmails }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error ?? "담당자 메일 설정 저장에 실패했습니다.",
        );
      }

      const data = await response.json();
      const nextEmails = recipientSettingsToMap(data.settings ?? []);

      setSavedRecipientEmails(nextEmails);
      setDraftRecipientEmails(nextEmails);
      setIsRecipientSettingsOpen(false);
      toast.success("담당자 메일 설정이 저장되었습니다.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "담당자 메일 설정 저장에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsSavingRecipientSettings(false);
    }
  }, [draftRecipientEmails]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            문의 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            총 {total.toLocaleString("ko-KR")}개의 문의
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={openRecipientSettingsModal}
        >
          담당자 메일 설정
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder="이름 또는 제목으로 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            value={inquiryType}
            onChange={(event) => setInquiryType(event.target.value)}
            options={INQUIRY_TYPE_FILTER_OPTIONS}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={INQUIRY_STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  유형
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  이름
                </th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                  제목
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  상태
                </th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                  접수일
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="px-5 py-3">
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-100" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-100" />
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <EmptyState />
              ) : (
                items.map((item) => {
                  const typeBadge = INQUIRY_TYPE_BADGE[item.inquiry_type];
                  const statusBadge = INQUIRY_STATUS_BADGE[item.status];

                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50/50"
                      onClick={() => setDetailTarget(item)}
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant={typeBadge.variant} size="sm">
                          {typeBadge.label}
                        </Badge>
                      </td>
                      <td className="max-w-[120px] truncate px-5 py-3 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="hidden max-w-[250px] truncate px-5 py-3 text-gray-500 md:table-cell">
                        {item.subject ?? <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant={statusBadge.variant} size="sm">
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td className="hidden whitespace-nowrap px-5 py-3 tabular-nums text-gray-400 md:table-cell">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailTarget(item);
                          }}
                        >
                          보기
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">
              {total.toLocaleString("ko-KR")}개 중{" "}
              {((page - 1) * PAGE_LIMIT + 1).toLocaleString("ko-KR")}-
              {Math.min(page * PAGE_LIMIT, total).toLocaleString("ko-KR")}
            </p>

            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="이전 페이지"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M9 3L5 7L9 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {visiblePages.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex h-8 w-8 items-center justify-center text-xs text-gray-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToPage(item)}
                    className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors ${
                      item === page
                        ? "bg-primary text-white"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                    aria-current={item === page ? "page" : undefined}
                    aria-label={`${item}페이지`}
                  >
                    {item}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="다음 페이지"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M5 3L9 7L5 11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <DetailModal
        inquiry={detailTarget}
        canReply={canManageRecipientSettings}
        onClose={() => setDetailTarget(null)}
        onSave={handleDetailSave}
        onReplied={handleReplied}
      />

      <RecipientSettingsModal
        open={isRecipientSettingsOpen}
        canManageRecipientSettings={canManageRecipientSettings}
        emails={draftRecipientEmails}
        isSaving={isSavingRecipientSettings}
        onChange={handleRecipientEmailChange}
        onClose={closeRecipientSettingsModal}
        onSave={saveRecipientSettings}
      />
    </div>
  );
}
