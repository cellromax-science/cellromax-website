export type IrCategory = 'announcement' | 'annual_report' | 'presentation' | 'other';

export interface IrFile {
  id: string;
  title: string;
  category: IrCategory;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  published_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface IrFileInsert {
  title: string;
  category: IrCategory;
  file_url: string;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  published_at: string;
  is_active?: boolean;
}
