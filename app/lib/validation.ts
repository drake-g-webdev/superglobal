import { z } from 'zod';

// Common validation patterns
const nonEmptyString = z.string().min(1).max(1000);
const positiveNumber = z.number().positive().max(1000000);
const nonNegativeNumber = z.number().nonnegative().max(1000000);

// Trip validation
export const createTripSchema = z.object({
  destination: nonEmptyString,
  duration: z.number().int().min(1).max(365).default(14),
  dailyBudget: positiveNumber.optional(),
  currency: z.string().length(3).default('USD'),
  travelers: z.number().int().min(1).max(50).default(1),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export const updateTripSchema = createTripSchema.partial();

// Profile validation
export const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  countryOfOrigin: z.string().min(1).max(100).optional(),
  travelStyle: z.enum(['solo', 'couple', 'group', 'family']).optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
  comfortThreshold: z.array(z.string()).max(10).optional(),
  travelPace: z.enum(['slow', 'moderate', 'fast']).optional(),
  partyWeight: z.number().min(0).max(100).optional(),
  natureWeight: z.number().min(0).max(100).optional(),
  cultureWeight: z.number().min(0).max(100).optional(),
  adventureWeight: z.number().min(0).max(100).optional(),
  relaxationWeight: z.number().min(0).max(100).optional(),
  foodPreference: z.enum(['street_food', 'restaurants', 'cooking', 'mixed']).optional(),
  packWeight: z.enum(['minimalist', 'moderate', 'maximalist']).optional(),
  electronicsTolerance: z.enum(['low', 'medium', 'high']).optional(),
  budgetStyle: z.enum(['broke-backpacker', 'flashpacker', 'digital-nomad']).optional(),
  nightWalking: z.boolean().optional(),
  motorbikeOk: z.boolean().optional(),
  couchsurfingOk: z.boolean().optional(),
  femaleSafety: z.boolean().optional(),
  instagramSpots: z.boolean().optional(),
  hiddenGems: z.boolean().optional(),
  videoLocations: z.boolean().optional(),
  countriesVisited: z.array(z.string().max(100)).max(250).optional(),
  bucketList: z.array(z.string().max(100)).max(100).optional(),
  interests: z.array(z.string().max(100)).max(50).optional(),
  restrictions: z.array(z.string().max(100)).max(50).optional(),
});

// Chat message validation
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(50000),
});

export const saveChatSchema = z.object({
  messages: z.array(chatMessageSchema).max(1000),
});

// Map pin validation
export const mapPinSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(500),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  type: z.enum(['destination', 'accommodation', 'activity', 'restaurant', 'transport', 'other']).optional(),
  notes: z.string().max(2000).optional().nullable(),
  parentStopId: z.string().uuid().optional().nullable(),
});

// Itinerary stop validation
export const itineraryStopSchema = z.object({
  id: z.string().uuid().optional(),
  location: z.string().min(1).max(500),
  days: z.number().int().min(1).max(365),
  order: z.number().int().min(0).max(1000),
  notes: z.string().max(5000).optional().nullable(),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]).optional().nullable(),
});

// Cost item validation
export const costItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(500),
  amount: nonNegativeNumber,
  currency: z.string().length(3).default('USD'),
  category: z.enum(['accommodation', 'food', 'transport', 'activities', 'gear', 'other']).optional(),
  isOneTime: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
});

// Packing item validation
export const packingItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  packed: z.boolean().default(false),
  quantity: z.number().int().min(1).max(100).default(1),
});

// Trip sync validation (comprehensive)
export const tripSyncSchema = z.object({
  itineraryStops: z.array(itineraryStopSchema).max(100).optional(),
  costItems: z.array(costItemSchema).max(500).optional(),
  mapPins: z.array(mapPinSchema).max(500).optional(),
  packingItems: z.array(packingItemSchema).max(500).optional(),
  bucketListItems: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(500),
    completed: z.boolean().default(false),
    notes: z.string().max(1000).optional().nullable(),
  })).max(200).optional(),
  touristTraps: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(500),
    reason: z.string().max(1000).optional().nullable(),
  })).max(100).optional(),
  tripEvents: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(500),
    date: z.string(),
    type: z.string().max(100).optional(),
    notes: z.string().max(2000).optional().nullable(),
  })).max(500).optional(),
  conversationVars: z.record(z.string().max(100), z.unknown()).optional(),
});

// Beta signup validation
export const betaSignupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  travelStyle: z.string().max(100).optional(),
  message: z.string().max(2000).optional(),
});

// Utility function to validate request body
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((e) => `${String(e.path.join('.'))}: ${e.message}`)
        .join(', ');
      return { success: false, error: `Validation failed: ${errorMessage}` };
    }

    return { success: true, data: result.data };
  } catch {
    return { success: false, error: 'Invalid JSON in request body' };
  }
}

// Type exports
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type TripSyncInput = z.infer<typeof tripSyncSchema>;
export type BetaSignupInput = z.infer<typeof betaSignupSchema>;
