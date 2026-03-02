/**
 * Identity Pool — multiple name/email/phone sets for A/B testing when applying.
 */

export interface IdentityEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityPool {
  userId: string;
  items: IdentityEntry[];
  defaultId: string | null;
  updatedAt: string;
}
