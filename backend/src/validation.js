// SwiftRun v2 - zod validation schemas. ALL API inputs are validated through these.

import { z } from 'zod';

// Botswana mobile numbers: 7 or 8 digits, starting with 7 (e.g. 72123456).
const phoneSchema = z
  .string()
  .trim()
  .regex(/^7\d{6,7}$/, 'Phone must be a Botswana mobile number: 7 or 8 digits starting with 7.');

const nameSchema = z.string().trim().min(1, 'Name is required.').max(100);

export const registerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters.').max(128),
  role: z.enum(['customer', 'runner']).default('customer'),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required.'),
});

export const bookingCreateSchema = z.object({
  service_id: z.number().int().positive(),
  pickup: z.string().trim().min(1, 'Pickup location is required.').max(200),
  dropoff: z.string().trim().min(1, 'Dropoff location is required.').max(200),
  scheduled_for: z
    .string()
    .trim()
    .optional()
    .refine((v) => v === undefined || v === '' || !Number.isNaN(Date.parse(v)), {
      message: 'scheduled_for must be a valid ISO date string.',
    }),
});

export const bookingStatusSchema = z.object({
  status: z.enum(['accepted', 'en_route', 'delivered', 'cancelled']),
});

// Runner status advances: accepted -> en_route -> delivered (no skips, no cancels).
export const bookingStatusAdvanceSchema = z.object({
  status: z.enum(['en_route', 'delivered']),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(['customer', 'runner', 'admin']).optional(),
  verified: z.boolean().optional(),
  suspended: z.boolean().optional(),
});

export const reviewCreateSchema = z.object({
  booking_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).default(''),
});

// Query params (validated loosely; bad values are rejected, not coerced into errors).
export const runnerQuerySchema = z.object({
  zone: z.string().trim().max(100).optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
});

export const serviceQuerySchema = z.object({
  category: z.enum(['errands', 'food', 'groceries', 'documents', 'parcels', 'shopping']).optional(),
  zone: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const CATEGORIES = ['errands', 'food', 'groceries', 'documents', 'parcels', 'shopping'];
export const ROLES = ['customer', 'runner', 'admin'];
