export type BoardNumber = {
  number: number;
  seller_name: string | null;
  sold_at: string | null;
};

export type SaleDetail = {
  number: number;
  seller_name: string;
  sold_at: string;
  buyer_name: string;
  phone: string; // E.164
};

export type SaleRow = SaleDetail;

export type ActivityEntry = {
  id: number;
  number: number | null;
  action: "sell" | "edit" | "release" | "draw_link";
  seller_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
};

export type DrawLinkSetting = {
  url: string | null;
  updated_at: string | null;
};

export type ApiError = { error: string; field?: string };
