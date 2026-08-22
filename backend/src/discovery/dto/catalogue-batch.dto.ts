export type CatalogueBatch = {
  batchId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  thumbnail: string | null;
  price: string;
  currency: string;
  language: string;
  goalKey: string | null;
  deliveryMode: string;
  startDate: Date;
  endDate: Date;
  status: string;
  categoryId: string | null;
};

export type CatalogueResponse = {
  data: CatalogueBatch[];
  page: number;
  limit: number;
  total: number;
};
