# Matching & Discovery Enhancement — System Architecture Design

> Generated: 2026-02-21 | Status: Draft — Pending Approval
> Prereq: [Requirements Spec](../requirements/matching-discovery-enhancement.md)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js Web)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Discover  │ │ Profile  │ │ Likes Me │ │  Filters │ │ Map View │ │
│  │ (Card/    │ │ Detail   │ │ (Blurred │ │ (Drawer) │ │ (Mapbox) │ │
│  │ Grid/Map) │ │ (Modal)  │ │ Grid)    │ │          │ │          │ │
│  └─────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│        │  BehaviorTracker (batch events every 30s / 10 events)      │
│        └──────────────────────┬──────────────────────────────┘      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │ HTTPS
                    ┌───────────▼───────────┐
                    │    API Gateway :3000   │
                    └───────────┬───────────┘
          ┌─────────┬───────────┼───────────┬──────────────┐
          ▼         ▼           ▼           ▼              ▼
   ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐
   │ matching  │ │ user   │ │payment │ │ content  │ │subscription│
   │ :3003    │ │ :3001  │ │ :3007  │ │ :3006   │ │ :3005      │
   └────┬─────┘ └────────┘ └────────┘ └─────────┘ └────────────┘
        │
        │ HTTP (sync)          Kafka (async)
        ▼                      ▼
   ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
   │ ML Recommend │    │  db-writer   │    │   PostgreSQL     │
   │ (FastAPI)    │    │  (consumer)  │    │   + pgvector     │
   │ :5000        │    └──────┬───────┘    └──────────────────┘
   └──────┬───────┘           │                     ▲
          │                   └─────────────────────┘
          ▼
   ┌──────────────┐
   │   Redis      │
   │ (cache/geo/  │
   │  swipes/     │
   │  scores)     │
   └──────────────┘
```

### New Components
| Component | Type | Purpose |
|-----------|------|---------|
| **ML Recommend Service** | Python FastAPI :5000 | Collaborative filtering, user embeddings, recommendation API |
| **BehaviorTracker** | Frontend module | Collects swipe/view/dwell events, batch sends to API |
| **Compatibility Scorer** | matching-service module | Calculates multi-factor compatibility scores |
| **pgvector extension** | PostgreSQL extension | Stores user embedding vectors for similarity search |

---

## 2. Database Schema Changes

### 2.1 New Entity: `InterestTag`

```typescript
// libs/database/src/entities/interest-tag.entity.ts
@Entity('interest_tags')
@Unique(['category', 'name'])
export class InterestTagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['lifestyle', 'interests', 'expectations', 'personality'],
  })
  category!: string;

  @Column('varchar', { length: 50 })
  name!: string;

  @Column('varchar', { length: 50, nullable: true })
  nameZh!: string | null;  // Chinese display name

  @Column('varchar', { length: 10, nullable: true })
  icon!: string | null;

  @Column('int', { default: 0 })
  sortOrder!: number;

  @Column('boolean', { default: true })
  isActive!: boolean;
}
```

### 2.2 New Entity: `UserInterestTag`

```typescript
// libs/database/src/entities/user-interest-tag.entity.ts
@Entity('user_interest_tags')
@Unique(['userId', 'tagId'])
@Index('idx_user_interest_tags_user', ['userId'])
@Index('idx_user_interest_tags_tag', ['tagId'])
export class UserInterestTagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  tagId!: string;

  @ManyToOne(() => InterestTagEntity, { eager: true })
  @JoinColumn({ name: 'tagId' })
  tag!: InterestTagEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
```

### 2.3 New Entity: `UserBehaviorEvent`

```typescript
// libs/database/src/entities/user-behavior-event.entity.ts
@Entity('user_behavior_events')
@Index('idx_behavior_user_created', ['userId', 'createdAt'])
@Index('idx_behavior_type', ['eventType'])
export class UserBehaviorEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid', { nullable: true })
  targetUserId!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    enum: ['swipe', 'view_card', 'view_detail', 'view_photo', 'dwell_card', 'dwell_detail'],
  })
  eventType!: string;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;
  // swipe: { action, durationMs }
  // view_card: { durationMs }
  // view_detail: { durationMs, photosViewed }
  // dwell_card: { durationMs }
  // dwell_detail: { durationMs }

  @CreateDateColumn()
  createdAt!: Date;
}
```

### 2.4 New Entity: `UserEmbedding` (for pgvector)

```typescript
// libs/database/src/entities/user-embedding.entity.ts
@Entity('user_embeddings')
@Index('idx_embedding_user', ['userId'], { unique: true })
export class UserEmbeddingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { unique: true })
  userId!: string;

  @Column('vector', { length: 128 })  // pgvector type, 128 dimensions
  embedding!: number[];

  @Column('int', { default: 0 })
  swipeCount!: number;  // track maturity for cold-start blending

  @Column('float', { default: 0 })
  popularityScore!: number;  // cached: 7-day likes + super_likes*3

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 2.5 Modified Entity: `UserEntity` — New Columns

```typescript
// Add to existing UserEntity
@Column('date', { nullable: true })
birthDate!: Date | null;

@Column('int', { nullable: true })
preferredAgeMin!: number | null;     // 18-80

@Column('int', { nullable: true })
preferredAgeMax!: number | null;     // 18-80

@Column('int', { nullable: true, default: 50 })
preferredDistance!: number | null;    // km, 1-500

@Column('varchar', { length: 20, nullable: true })
preferredUserType!: string | null;   // 'sugar_daddy' | 'sugar_baby' | 'both'

@Column('timestamp', { nullable: true })
lastActiveAt!: Date | null;

@Column('varchar', { length: 20, default: 'unverified' })
verificationStatus!: string;         // 'unverified' | 'pending' | 'verified'
```

### 2.6 Redis Key Additions

```
# Compatibility scores (pre-computed, 24h TTL)
compat:{userA}:{userB}              → float score (0-100)

# Who liked me
likes_received:{userId}             → Sorted Set (score=timestamp, member=likerId)

# Undo
last_swipe:{userId}                 → JSON { targetUserId, action, timestamp, matchId? }
undo_counter:{userId}:{date}        → int (24h TTL)

# Popularity (7-day rolling)
popularity:{userId}                 → float score (7d TTL, refreshed by cron)

# User tags cache
user_tags:{userId}                  → Set of tag IDs (1h TTL)

# ML recommendation cache
ml_recs:{userId}                    → JSON [{ userId, score }] (1h TTL)
```

---

## 3. API Contract Specifications

### 3.1 Modified: `GET /api/matching/cards`

```typescript
// Query Parameters (expanded)
interface GetCardsQuery {
  limit?: number;        // default: 20, max: 50
  cursor?: string;       // pagination cursor
  radius?: number;       // km, 1-500, default: user preference or 50
  ageMin?: number;       // 18-80
  ageMax?: number;       // 18-80
  userType?: 'sugar_daddy' | 'sugar_baby';  // filter by type
  verifiedOnly?: boolean;  // default: false
  onlineRecently?: boolean; // active in last 30 min
  tags?: string;         // comma-separated tag IDs
}

// Response (enhanced)
interface CardsResponseDto {
  cards: EnhancedUserCardDto[];
  nextCursor?: string;
  totalEstimate?: number;  // approximate count matching filters
}

interface EnhancedUserCardDto extends UserCardDto {
  age?: number;              // calculated from birthDate
  compatibilityScore: number; // 0-100
  commonTagCount: number;     // number of shared interest tags
  isBoosted: boolean;         // currently boosted
  isSuperLiked?: boolean;     // this user super-liked you (for likes-me)
  tags: InterestTagDto[];     // user's interest tags
}

interface InterestTagDto {
  id: string;
  category: string;
  name: string;
  nameZh?: string;
  icon?: string;
  isCommon?: boolean;  // true if both users share this tag
}
```

### 3.2 New: `GET /api/matching/cards/:userId/detail`

```typescript
// Response
interface CardDetailResponseDto {
  id: string;
  username?: string;
  displayName: string;
  age?: number;
  bio?: string;
  avatarUrl?: string;
  userType: UserType;
  verificationStatus: string;
  city?: string;
  distance?: number;
  lastActiveAt?: Date;

  // Enhanced fields
  compatibilityScore: number;       // 0-100
  photos: string[];                  // all photo URLs
  tags: InterestTagDto[];            // with isCommon flag
  commonTagCount: number;
  recentPosts: PostPreviewDto[];     // last 3 public posts

  // Score breakdown (optional, for detail view)
  scoreBreakdown?: {
    userTypeMatch: number;     // 0-30
    distanceScore: number;     // 0-20
    ageScore: number;          // 0-15
    tagScore: number;          // 0-20
    behaviorScore: number;     // 0-15
  };
}

interface PostPreviewDto {
  id: string;
  content: string;        // truncated to 200 chars
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
}
```

### 3.3 New: `GET /api/matching/likes-me`

```typescript
// Query Parameters
interface LikesMeQuery {
  limit?: number;   // default: 20
  cursor?: string;
}

// Response
interface LikesMeResponseDto {
  count: number;                     // total pending likes
  cards: LikesMeCardDto[];
  nextCursor?: string;
}

interface LikesMeCardDto {
  id: string;                        // liker's userId
  displayName?: string;              // null for free users (blurred)
  avatarUrl?: string;                // blurred URL for free users
  isBlurred: boolean;                // true for free users
  isSuperLike: boolean;
  likedAt: Date;
  // Full data only for subscribers:
  age?: number;
  city?: string;
  compatibilityScore?: number;
  userType?: UserType;
}
```

### 3.4 New: `POST /api/matching/likes-me/reveal`

```typescript
// Request
interface RevealLikeRequestDto {
  likerId: string;   // userId to reveal
}

// Response
interface RevealLikeResponseDto {
  card: EnhancedUserCardDto;  // full card data
  diamondCost: number;        // 20
  diamondBalance: number;     // remaining balance
}
```

### 3.5 New: `POST /api/matching/undo`

```typescript
// Response
interface UndoResponseDto {
  undone: boolean;
  card?: EnhancedUserCardDto;     // the card to re-show
  matchRevoked: boolean;          // true if a match was also undone
  diamondCost: number;            // 0 if free undo used
  freeUndosRemaining: number;     // for subscribers
}
```

### 3.6 New: `POST /api/matching/behavior`

```typescript
// Request (batch)
interface BehaviorBatchDto {
  events: BehaviorEventDto[];  // max 50 per batch
}

interface BehaviorEventDto {
  eventType: 'swipe' | 'view_card' | 'view_detail' | 'view_photo' | 'dwell_card' | 'dwell_detail';
  targetUserId: string;
  metadata: {
    action?: SwipeAction;       // for swipe events
    durationMs?: number;        // for dwell/view events
    photosViewed?: number;      // for view_photo
  };
  timestamp: number;  // client-side epoch ms
}

// Response
interface BehaviorBatchResponseDto {
  accepted: number;
  rejected: number;
}
```

### 3.7 New: Interest Tag Endpoints (via user-service)

```typescript
// GET /api/users/tags — List all available tags
interface TagsListResponseDto {
  tags: InterestTagDto[];       // grouped by category
}

// PUT /api/users/me/tags — Update my tags
interface UpdateUserTagsDto {
  tagIds: string[];  // max 20 (5 per category)
}

// GET /api/users/:userId/tags — Get a user's tags
// → InterestTagDto[]
```

### 3.8 API Client Updates (`libs/api-client/src/matching.ts`)

```typescript
export class MatchingApi {
  // Existing (modified)
  getCards(params?: GetCardsQuery): Promise<CardsResponseDto>;
  swipe(dto: SwipeRequestDto): Promise<SwipeResponseDto>;
  getMatches(cursor?: string): Promise<MatchesResponseDto>;
  activateBoost(): Promise<{ expiresAt: string; cost: number }>;
  superLike(targetUserId: string): Promise<SwipeResponseDto>;

  // New
  getCardDetail(userId: string): Promise<CardDetailResponseDto>;
  getLikesMe(cursor?: string): Promise<LikesMeResponseDto>;
  revealLike(likerId: string): Promise<RevealLikeResponseDto>;
  undo(): Promise<UndoResponseDto>;
  sendBehaviorEvents(events: BehaviorEventDto[]): Promise<BehaviorBatchResponseDto>;
}
```

---

## 4. Service Communication Design

### 4.1 Matching Service Internal Architecture

```
MatchingController
├── GET  /cards         → DiscoveryService.getCards()
├── GET  /cards/:id/detail → DiscoveryService.getCardDetail()
├── POST /swipe         → SwipeService.swipe()
├── POST /undo          → SwipeService.undo()
├── GET  /matches       → MatchService.getMatches()
├── DELETE /matches/:id → MatchService.unmatch()
├── POST /boost         → BoostService.activate()
├── GET  /likes-me      → LikesMeService.getLikes()
├── POST /likes-me/reveal → LikesMeService.reveal()
└── POST /behavior      → BehaviorService.ingest()
```

**Refactored Service Modules (from monolithic MatchingService):**

| Module | Responsibility |
|--------|---------------|
| `DiscoveryService` | Card fetching, filtering, scoring, pagination |
| `SwipeService` | Swipe processing, match detection, undo |
| `MatchService` | Match CRUD, unmatch |
| `BoostService` | Boost activation and status |
| `LikesMeService` | Who liked me queries, reveal |
| `BehaviorService` | Event ingestion → Kafka |
| `CompatibilityService` | Score calculation (multi-factor) |
| `MlClientService` | HTTP client to Python ML service |

### 4.2 Sync HTTP Calls (from matching-service)

```
matching-service
  → user-service       GET /internal/cards-by-ids    (batch card data)
  → user-service       GET /internal/user-tags/:id   (user's interest tags)
  → payment-service    POST /diamonds/spend-*        (diamond deductions)
  → payment-service    GET /diamonds/balance          (balance check)
  → subscription-svc   GET /internal/user-tier/:id   (check subscription)
  → content-service    GET /internal/user-posts/:id   (recent posts for detail)
  → ml-recommend-svc   POST /recommend                (ML recommendations)
  → ml-recommend-svc   GET /health                    (health check)
```

### 4.3 Kafka Events (New)

```typescript
// libs/common/src/kafka/kafka.events.ts — additions

export const BEHAVIOR_EVENTS = {
  BEHAVIOR_BATCH: 'behavior.batch',           // → ML service consumes
} as const;

export const MATCHING_EVENTS = {
  MATCHED: 'matching.matched',                // existing
  UNMATCHED: 'matching.unmatched',            // existing
  SWIPE: 'matching.swipe',                    // NEW: all swipes for analytics
  UNDO: 'matching.undo',                      // NEW: undo events
  LIKES_ME_REVEALED: 'matching.likes-me.revealed', // NEW
} as const;
```

**Event Payloads:**

```typescript
interface SwipeEvent {
  swiperId: string;
  targetUserId: string;
  action: SwipeAction;
  durationMs: number;
  timestamp: Date;
}

interface BehaviorBatchEvent {
  userId: string;
  events: BehaviorEventDto[];
  batchTimestamp: Date;
}

interface UndoEvent {
  userId: string;
  targetUserId: string;
  originalAction: SwipeAction;
  matchRevoked: boolean;
  timestamp: Date;
}
```

---

## 5. Compatibility Scoring Algorithm Design

### 5.1 Score Calculation

```typescript
// CompatibilityService.calculateScore(viewerId, candidateId)

interface ScoreBreakdown {
  userTypeMatch: number;   // 0-30
  distanceScore: number;   // 0-20
  ageScore: number;        // 0-15
  tagScore: number;        // 0-20
  behaviorScore: number;   // 0-15
  total: number;           // 0-100
}

function calculateCompatibility(viewer: UserProfile, candidate: UserProfile): ScoreBreakdown {

  // 1. UserType Match (0-30)
  // Sugar Daddy ↔ Sugar Baby = 30
  // Same type = 5 (low but not zero)
  const userTypeMatch = isComplementary(viewer.userType, candidate.userType) ? 30 : 5;

  // 2. Distance Score (0-20)
  // 0-10km = 20, 10-50km = 15, 50-100km = 10, 100-200km = 5, >200km = 2
  const distanceScore = calculateDistanceScore(distance, viewer.preferredDistance);

  // 3. Age Score (0-15)
  // Both within each other's preferred range = 15
  // One within range = 8
  // Neither = 2
  const ageScore = calculateAgeScore(viewer, candidate);

  // 4. Tag Score (0-20)
  // commonTags / max(viewerTags, candidateTags) * 20
  // min 0 if no tags, bonus +2 if expectations category matches
  const tagScore = calculateTagScore(viewerTags, candidateTags);

  // 5. Behavior Score (0-15) — from ML service or fallback
  // ML: normalized similarity score * 15
  // Fallback: popularity-based (0-15)
  const behaviorScore = mlScore ?? calculatePopularityFallback(candidate);

  return { userTypeMatch, distanceScore, ageScore, tagScore, behaviorScore,
           total: userTypeMatch + distanceScore + ageScore + tagScore + behaviorScore };
}
```

### 5.2 Score Caching Strategy

```
1. Pre-compute: Nightly cron job calculates scores for all active user pairs
   - Only pairs within 500km (geo filter first)
   - Store in Redis: compat:{userA}:{userB} → score (TTL 24h)

2. On-demand: If cache miss, calculate in real-time (< 50ms target)
   - Cache result with 24h TTL

3. Invalidation: When user updates profile/preferences/tags
   - Delete all compat:{userId}:* keys
   - Next request triggers fresh calculation
```

### 5.3 Cold-Start Blending

```typescript
function getBlendedScore(userId: string, candidate: string, swipeCount: number): number {
  const compatScore = getCompatibilityScore(userId, candidate);
  const mlScore = getMlScore(userId, candidate);        // may be null
  const popularityScore = getPopularityScore(candidate); // 0-100

  if (swipeCount < 20) {
    // Cold start: 60% compat + 40% popularity
    return compatScore * 0.6 + popularityScore * 0.4;
  } else if (swipeCount < 50) {
    // Transition: linear blend from cold-start to personalized
    const mlWeight = (swipeCount - 20) / 30;  // 0 → 1
    const compatWeight = 1 - mlWeight;
    const personalizedScore = mlScore ?? compatScore;
    return (compatScore * 0.3 + personalizedScore * 0.3 * mlWeight
            + compatScore * 0.3 * compatWeight + popularityScore * 0.1);
  } else {
    // Fully personalized: 60% ML + 30% compat + 10% popularity
    return (mlScore ?? compatScore) * 0.6 + compatScore * 0.3 + popularityScore * 0.1;
  }
}
```

---

## 6. ML Recommendation Service Design

### 6.1 Architecture

```
┌──────────────────────────────────────────────────┐
│           recommendation-ml-service               │
│           (Python FastAPI :5000)                   │
│                                                    │
│  ┌──────────┐  ┌───────────┐  ┌────────────────┐ │
│  │ API Layer │  │ ML Engine │  │ Kafka Consumer │ │
│  │ (FastAPI) │  │ (PyTorch/ │  │ (behavior      │ │
│  │           │  │  sklearn) │  │  events)       │ │
│  └─────┬─────┘  └─────┬─────┘  └───────┬────────┘ │
│        │              │                 │          │
│        ▼              ▼                 ▼          │
│  ┌─────────────────────────────────────────────┐  │
│  │              Data Layer                      │  │
│  │  PostgreSQL (pgvector) ← embeddings          │  │
│  │  Redis ← recommendation cache                │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 6.2 API Endpoints (FastAPI)

```python
# POST /recommend
# Input:  { "user_id": "uuid", "limit": 50, "exclude_ids": ["uuid", ...] }
# Output: { "recommendations": [{ "user_id": "uuid", "score": 0.85 }, ...] }

# POST /update-embedding
# Input:  { "user_id": "uuid" }  (triggers re-computation)
# Output: { "success": true, "dimensions": 128 }

# POST /batch-update
# Input:  { "user_ids": ["uuid", ...] }  (nightly job)
# Output: { "updated": 1500, "failed": 3, "duration_ms": 45000 }

# GET /health
# Output: { "status": "ok", "model_version": "v1.0", "embedding_count": 15000 }
```

### 6.3 Embedding Model

```python
# User feature vector (128 dimensions):
# - Demographic features (8d): age_normalized, userType_onehot(2), location_cluster(5)
# - Tag features (40d): interest_tag_embeddings (learned)
# - Behavioral features (40d): swipe_pattern_embedding (learned from interaction matrix)
# - Engagement features (20d): response_rate, activity_level, popularity, etc.
# - Temporal features (20d): time_of_day_pattern, day_of_week_pattern

# Training: Matrix factorization on user-user interaction matrix
# - Positive signals: like (1.0), super_like (2.0), match (3.0), message_sent (2.5)
# - Negative signals: pass (-0.5), block (-3.0)
# - Implicit signals: dwell_time_normalized, detail_view (0.3), photo_browse (0.2)

# Similarity: cosine similarity on user embeddings
# Recommendation: k-NN search via pgvector (ivfflat index)
```

### 6.4 Data Pipeline

```
Frontend (behavior events)
  → POST /api/matching/behavior
    → matching-service.BehaviorService
      → Kafka topic: behavior.batch
        → ML service Kafka consumer
          → Append to behavior_events table
          → (Nightly) Retrain embeddings
          → Update user_embeddings table (pgvector)
```

### 6.5 Docker Compose Addition

```yaml
recommendation-ml:
  build:
    context: ./services/recommendation-ml
    dockerfile: Dockerfile
  ports:
    - "5000:5000"
  environment:
    - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/suggar_daddy
    - REDIS_URL=redis://redis:6379
    - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
    - MODEL_UPDATE_CRON=0 3 * * *  # 3 AM daily
    - EMBEDDING_DIMENSIONS=128
  depends_on:
    - postgres
    - redis
    - kafka
```

---

## 7. Frontend Component Architecture

### 7.1 Discover Page Restructure

```
apps/web/app/(main)/discover/
├── page.tsx                      # Main discover page (mode switcher)
├── components/
│   ├── CardMode.tsx              # Existing swipe card experience (refactored)
│   ├── GridMode.tsx              # Grid browsing view
│   ├── MapMode.tsx               # Map view with markers
│   ├── ProfileDetailModal.tsx    # Full profile modal/drawer
│   ├── FilterDrawer.tsx          # Filter panel
│   ├── CompatibilityBadge.tsx    # Score display (circular progress)
│   ├── InterestTags.tsx          # Tag chips with common highlight
│   ├── ModeSwitcher.tsx          # Card/Grid/Map toggle buttons
│   ├── UndoButton.tsx            # Undo last swipe
│   └── SwipeActions.tsx          # Shared like/pass/super_like buttons
├── likes-me/
│   └── page.tsx                  # Who liked me page
└── hooks/
    ├── useBehaviorTracker.ts     # Behavior event collection
    ├── useDiscoveryCards.ts      # Card fetching with filters
    ├── useFilters.ts             # Filter state management
    └── useUndoSwipe.ts           # Undo logic
```

### 7.2 Key Component Specifications

#### `BehaviorTracker` Hook

```typescript
// hooks/useBehaviorTracker.ts
interface BehaviorEvent {
  eventType: string;
  targetUserId: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

function useBehaviorTracker() {
  const bufferRef = useRef<BehaviorEvent[]>([]);

  // Auto-flush: every 30 seconds or when buffer reaches 10 events
  // Flush on page unmount
  // POST /api/matching/behavior

  return {
    trackSwipe(targetUserId, action, durationMs),
    trackCardView(targetUserId, durationMs),
    trackDetailView(targetUserId, durationMs, photosViewed),
    trackDwell(targetUserId, durationMs, context: 'card' | 'detail'),
  };
}
```

#### `FilterDrawer` Component

```typescript
// components/FilterDrawer.tsx
interface DiscoveryFilters {
  radius: number;          // slider 1-500
  ageMin: number;          // slider 18-80
  ageMax: number;          // slider 18-80
  userType?: string;       // toggle
  verifiedOnly: boolean;   // switch
  onlineRecently: boolean; // switch
  tagIds: string[];        // multi-select chips
}

// Opens as bottom sheet (mobile) or side drawer (desktop)
// "Apply" saves to user preferences via API + refetches cards
// "Reset" clears all filters
// Badge shows active filter count on trigger button
```

#### `ProfileDetailModal` Component

```typescript
// components/ProfileDetailModal.tsx
// Triggered by: tapping card avatar/name in any mode
// Layout:
//   - Photo gallery (horizontal scroll, dots indicator)
//   - Name, age, city, distance
//   - Compatibility score (circular badge with breakdown on tap)
//   - Interest tags (common ones highlighted in brand color)
//   - Bio
//   - Recent posts (3 cards, horizontal scroll)
//   - Fixed bottom bar: Pass / Super Like / Like buttons
// Behavior tracking: track detail view open + dwell time + photos viewed
```

#### `MapMode` Component

```typescript
// components/MapMode.tsx
// Uses: react-map-gl (Mapbox GL JS wrapper)
// Data: same cards API with location data
// Markers: circular avatar images (40px)
// Tap marker → mini card popup (name, age, score)
// Tap mini card → ProfileDetailModal
// Privacy: coordinates offset ±500m (server-side)
// Cluster markers when zoomed out (Mapbox clustering)
```

#### `LikesMe` Page

```typescript
// discover/likes-me/page.tsx
// Layout: 3-column grid
// Each card:
//   - Avatar (blurred for free users, CSS filter: blur(20px))
//   - Name (hidden for free: "???")
//   - Super Like badge if applicable
//   - "Reveal" button with diamond icon + cost (free users)
//   - Like/Pass buttons (subscribers only, always visible)
// Top banner: "N people liked you!" with subscribe CTA for free users
// Navigation: Tab in discover page or separate route
```

### 7.3 State Management

```typescript
// hooks/useDiscoveryCards.ts
interface DiscoveryState {
  cards: EnhancedUserCardDto[];
  currentIndex: number;
  nextCursor?: string;
  filters: DiscoveryFilters;
  viewMode: 'card' | 'grid' | 'map';
  lastSwipe?: { targetUserId: string; action: SwipeAction; matchId?: string };
  canUndo: boolean;
  loading: boolean;
  error?: string;
}

// Filter changes → reset cards + refetch
// Mode changes → keep cards, change view
// Swipe → advance index, store lastSwipe for undo
// Undo → restore lastSwipe card to top, clear lastSwipe
```

---

## 8. Undo / Rewind Service Design

### 8.1 Flow

```
POST /api/matching/undo
  → SwipeService.undo(userId)
    1. Get last_swipe:{userId} from Redis
    2. If empty → return { undone: false }
    3. Check undo eligibility:
       a. Check subscription status (via subscription-service)
       b. Get undo_counter:{userId}:{date}
       c. If subscriber && counter < 5 → free undo
       d. Else → spend 10 diamonds (via payment-service)
    4. Delete swipe record: swipe:{userId}:{targetId}
    5. Remove from user_swipes:{userId} set
    6. If original was like/super_like and matched:
       a. Delete match records
       b. Remove from user_matches for both users
       c. Publish MATCHING_EVENTS.UNMATCHED
    7. Remove from likes_received:{targetId} if was a like
    8. Delete last_swipe:{userId}  (prevent consecutive undo)
    9. Increment undo_counter
    10. Publish MATCHING_EVENTS.UNDO to Kafka
    11. Return card data for re-display
```

### 8.2 Edge Cases

| Case | Behavior |
|------|----------|
| No last swipe | Return `{ undone: false }` |
| Consecutive undo attempt | Return `{ undone: false }` (only 1 undo stored) |
| Undo a matched like | Revoke match + notify other user |
| Undo a pass | Simply restore card |
| Insufficient diamonds | Return 402 with balance info |
| Subscription expired mid-day | Remaining free undos still valid for the day |

---

## 9. Who Liked Me Service Design

### 9.1 Data Flow

```
User A likes User B
  → SwipeService.swipe()
    → (existing) Store swipe record
    → (NEW) ZADD likes_received:{B} {timestamp} {A}
    → (NEW) Publish notification "Someone liked you!"

User B opens "Likes Me" page
  → LikesMeService.getLikes(userId)
    → ZREVRANGE likes_received:{userId} (newest first)
    → Filter out: already-swiped-back, blocked users
    → Check subscription tier:
      - Subscriber → return full card data
      - Free user → return blurred data (no name, blurred avatar)

User B reveals a liker (free user)
  → LikesMeService.reveal(userId, likerId)
    → Spend 20 diamonds (via payment-service)
    → Return full card data
    → Track reveal event
```

### 9.2 Blurred Avatar Strategy

```
Option: Server-side blurring
- Generate blurred version of avatar at upload time (media-service)
- Store as separate URL: avatarUrl_blurred
- Return blurred URL for free users

Simpler Option: Client-side CSS blur
- Return original avatarUrl but flag isBlurred: true
- Frontend applies CSS: filter: blur(20px) + overflow: hidden
- Prevents right-click save (blurred in DOM)
- Reveal: remove blur class + show full card data from API
```

**Recommendation:** Client-side CSS blur (simpler, no media-service changes).

---

## 10. API Gateway Proxy Routes (New)

```typescript
// apps/api-gateway/src/app/proxy.service.ts — additions

// New matching-service routes
'/api/matching/cards/:userId/detail' → matching-service /cards/:userId/detail
'/api/matching/likes-me'            → matching-service /likes-me
'/api/matching/likes-me/reveal'     → matching-service /likes-me/reveal
'/api/matching/undo'                → matching-service /undo
'/api/matching/behavior'            → matching-service /behavior

// New user-service routes
'/api/users/tags'                   → user-service /tags
'/api/users/me/tags'                → user-service /me/tags
'/api/users/:userId/tags'           → user-service /:userId/tags
```

---

## 11. Migration Plan

### 11.1 Database Migrations

```sql
-- Migration 1: Interest Tags
CREATE TABLE interest_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(20) NOT NULL,
  name VARCHAR(50) NOT NULL,
  name_zh VARCHAR(50),
  icon VARCHAR(10),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(category, name)
);

CREATE TABLE user_interest_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES interest_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);
CREATE INDEX idx_user_interest_tags_user ON user_interest_tags(user_id);
CREATE INDEX idx_user_interest_tags_tag ON user_interest_tags(tag_id);

-- Migration 2: User preference columns
ALTER TABLE users ADD COLUMN birth_date DATE;
ALTER TABLE users ADD COLUMN preferred_age_min INT;
ALTER TABLE users ADD COLUMN preferred_age_max INT;
ALTER TABLE users ADD COLUMN preferred_distance INT DEFAULT 50;
ALTER TABLE users ADD COLUMN preferred_user_type VARCHAR(20);
ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP;
ALTER TABLE users ADD COLUMN verification_status VARCHAR(20) DEFAULT 'unverified';

-- Migration 3: Behavior events
CREATE TABLE user_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_user_id UUID,
  event_type VARCHAR(30) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_behavior_user_created ON user_behavior_events(user_id, created_at);
CREATE INDEX idx_behavior_type ON user_behavior_events(event_type);

-- Migration 4: pgvector + embeddings
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE user_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  embedding vector(128),
  swipe_count INT DEFAULT 0,
  popularity_score FLOAT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_embedding_user ON user_embeddings(user_id);
CREATE INDEX idx_embedding_vector ON user_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 11.2 Seed Data: Interest Tags

```sql
INSERT INTO interest_tags (category, name, name_zh, icon, sort_order) VALUES
-- Lifestyle
('lifestyle', 'travel', '旅行', '✈️', 1),
('lifestyle', 'food', '美食', '🍽️', 2),
('lifestyle', 'fitness', '健身', '💪', 3),
('lifestyle', 'shopping', '購物', '🛍️', 4),
('lifestyle', 'party', '派對', '🎉', 5),
('lifestyle', 'outdoor', '戶外運動', '🏔️', 6),
-- Interests
('interests', 'music', '音樂', '🎵', 1),
('interests', 'movies', '電影', '🎬', 2),
('interests', 'art', '藝術', '🎨', 3),
('interests', 'photography', '攝影', '📷', 4),
('interests', 'reading', '閱讀', '📚', 5),
('interests', 'gaming', '遊戲', '🎮', 6),
-- Expectations
('expectations', 'long_term', '長期關係', '💍', 1),
('expectations', 'casual', '短期約會', '🥂', 2),
('expectations', 'travel_companion', '旅伴', '🧳', 3),
('expectations', 'mentor', '導師', '🎓', 4),
('expectations', 'sponsor', '生活贊助', '💎', 5),
-- Personality
('personality', 'introvert', '內向', '🌙', 1),
('personality', 'extrovert', '外向', '☀️', 2),
('personality', 'adventurous', '冒險型', '🚀', 3),
('personality', 'artistic', '文藝型', '🖌️', 4),
('personality', 'business', '商務型', '💼', 5);
```

---

## 12. Implementation Phases (Aligned with Requirements)

### Phase 1: Foundation (Entities + Filters + Detail View)
```
Backend:
  1. Create InterestTag + UserInterestTag entities
  2. Add user preference columns (birthDate, preferredAge*, etc.)
  3. Tag CRUD endpoints in user-service
  4. Expand GET /cards query params (filters)
  5. New GET /cards/:userId/detail endpoint
  6. Seed interest tags data

Frontend:
  7. FilterDrawer component
  8. ProfileDetailModal component
  9. Interest tag selector in profile/edit
  10. CompatibilityBadge component
  11. InterestTags component (with common highlight)
```

### Phase 2: Smart Matching + Who Liked Me
```
Backend:
  1. CompatibilityService (scoring algorithm)
  2. Redis score caching + invalidation
  3. Integrate scoring into cards API (sort by score)
  4. likes_received Redis sorted set (on swipe)
  5. GET /likes-me + POST /likes-me/reveal endpoints
  6. POST /behavior endpoint + Kafka publishing

Frontend:
  7. Likes Me page (blurred grid)
  8. Reveal flow with diamond spending
  9. BehaviorTracker hook
  10. Compatibility score display on cards
  11. Score breakdown in detail modal
```

### Phase 3: ML Service + Collaborative Filtering
```
ML Service:
  1. FastAPI project setup + Docker
  2. Kafka consumer for behavior events
  3. Embedding model (matrix factorization)
  4. pgvector setup + migration
  5. POST /recommend API
  6. Nightly batch update cron
  7. Cold-start blending logic in matching-service

Backend:
  8. MlClientService (HTTP client)
  9. Integrate ML scores into discovery ranking
  10. Popularity score calculation (cron)
```

### Phase 4: UX Polish (Undo + Grid + Map)
```
Backend:
  1. POST /undo endpoint
  2. last_swipe tracking in swipe flow
  3. Undo eligibility (subscription check + diamond spend)

Frontend:
  4. UndoButton component
  5. GridMode component
  6. MapMode component (Mapbox GL JS)
  7. ModeSwitcher component
  8. Mini card popup for map markers
```

---

## 13. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| ML service latency spike | Discovery cards slow | Redis cache + sync fallback to compat score |
| pgvector query on large dataset | DB performance | ivfflat index, limit to active users only |
| Behavior event flood | Kafka backpressure | Client-side batching (10/30s), rate limit API |
| Map provider cost | Budget overrun | Mapbox free tier (50k loads/mo), lazy load map |
| Cold-start poor recommendations | Bad UX for new users | Popularity-based fallback, fast transition at 20 swipes |
| Score invalidation storms | Redis load | Batch invalidation, debounce profile updates |
| Undo race conditions | Data inconsistency | Redis transactions (MULTI/EXEC) for undo ops |

---

## 14. Next Steps

After design approval:
1. `/sc:workflow` — Generate sprint task breakdown
2. `/sc:implement` — Begin Phase 1 implementation
