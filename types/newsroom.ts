export type PostType = 'notice' | 'news' | 'video';

/** 첨부파일 메타데이터 */
export interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface Post {
  id: string;
  post_type: PostType;
  title_ko: string;
  title_en: string | null;
  title_zh: string | null;
  title_vi: string | null;
  content_ko: string | null;
  content_en: string | null;
  content_zh: string | null;
  content_vi: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  images: string[];
  attachments: Attachment[];
  is_pinned: boolean;
  is_active: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PostInsert {
  post_type: PostType;
  title_ko: string;
  title_en?: string | null;
  title_zh?: string | null;
  title_vi?: string | null;
  content_ko?: string | null;
  content_en?: string | null;
  content_zh?: string | null;
  content_vi?: string | null;
  youtube_id?: string | null;
  thumbnail_url?: string | null;
  images?: string[];
  attachments?: Attachment[];
  is_pinned?: boolean;
  is_active?: boolean;
  published_at?: string;
}
