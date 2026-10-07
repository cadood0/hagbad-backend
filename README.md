# Hagbad Backend

API for **Hagbad** (ayuuto): a rotating savings group. Members pay a fixed amount each period, and the pot is paid out in turn. A group admin runs the circle; members can be invited, track upcoming payouts, and vote to move an emergency payout ahead in the rotation.

The npm package name is `ayuuto-backend`.

## Stack

- [NestJS](https://nestjs.com) 11 and TypeScript
- PostgreSQL with [Prisma](https://www.prisma.io) 7 (`@prisma/adapter-pg`)
- JWT auth (PIN + phone, OTP over WhatsApp)
- Validation with `class-validator`

## How a group works

1. A verified user creates a group and becomes its admin, at rotation position 1.
2. The admin invites existing users by phone number. Accepting an invite assigns the next rotation position.
3. If `durationMonths` is set, the group must have exactly that many members before a cycle can start, and invites stop once it is full.
4. The admin opens a monthly cycle (`YYYY-MM`). Every member gets an unpaid contribution for `contributionAmount`. The member who has not yet received a payout, in rotation order, is assigned the pot.
5. The admin marks each contribution paid. The cycle can close only when every contribution is paid. Closing marks that member as having received, then opens the next month’s cycle.
6. When every member has received once, `hasReceived` resets and a new round can start.
7. A member can request an emergency payout. Other members vote `YES` or `NO`. A strict majority (`floor(members / 2) + 1`) approves or rejects it. Approval moves the active cycle’s payout to the requester.

The wallet endpoint estimates upcoming pots from each group’s active cycle: `contributionAmount × member count`, ordered by how many cycles away the user’s turn is.

## Prerequisites

- Node.js
- PostgreSQL
- A WhatsApp sender listening at `http://localhost:3001` (used for registration OTP)

OTP delivery posts to `POST /send/message` with `{ "phone", "message" }`. If that call fails, registration still succeeds and the error is logged.

## Setup

```bash
npm install
```

Create a `.env` in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/hagbad?schema=public"
JWT_SECRET="change-me"
PORT=3000
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. The app exits on startup if it is missing. |
| `JWT_SECRET` | recommended | Signs access tokens. Falls back to `dev-secret` when unset. |
| `PORT` | no | HTTP port. Defaults to `3000`. |

Apply the schema and generate the Prisma client (output goes to `generated/prisma`, which is gitignored):

```bash
npx prisma migrate dev
npx prisma generate
```

Use `npx prisma migrate deploy` when applying existing migrations to a shared database.

## Run

```bash
# development (watch)
npm run start:dev

# once
npm run start

# production (after npm run build)
npm run start:prod
```

The server listens on `0.0.0.0`. CORS allows `http://localhost:5173` and `http://localhost:5175`, with credentials and an `Authorization` header.

`GET /` returns a plain-text hello and does not require auth.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run start:dev` | Start with file watch |
| `npm run start:debug` | Start with watch and the Node inspector |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run `dist/main` |
| `npm run lint` | ESLint with autofix |
| `npm run format` | Prettier on `src` and `test` |
| `npm test` | Unit tests (`*.spec.ts`) |
| `npm run test:cov` | Unit tests with coverage |
| `npm run test:e2e` | End-to-end tests |

## Auth

Protected routes expect `Authorization: Bearer <access_token>`.

Registration stores a bcrypt-hashed PIN (minimum 4 characters). Phone numbers are stored without `+` or spaces. A 6-digit OTP is valid for 5 minutes and is sent on WhatsApp. Login is rejected until the phone is verified. Access tokens expire after 7 days and carry the user id, phone number, and role (`USER` or `ADMIN`).

```http
POST /api/v1/auth/register
{ "phoneNumber": "+2526xxxxxxx", "pin": "1234", "firstName": "Amina", "middleName": "Ali", "lastName": "Hassan" }

POST /api/v1/auth/verify-otp
{ "phoneNumber": "+2526xxxxxxx", "otpCode": "123456" }

POST /api/v1/auth/login
{ "phoneNumber": "+2526xxxxxxx", "pin": "1234" }

GET /api/v1/auth/me
```

`firstName`, `middleName`, and `lastName` are optional on register. Login returns `{ access_token, user }`.

## API

Unknown JSON fields are rejected. Integer fields such as `contributionAmount` must be numbers.

### Groups — any signed-in user

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/v1/groups` | Create a group. Body: `name`, `contributionAmount`, optional `description`, optional `durationMonths`. |
| `GET` | `/api/v1/groups/my` | Groups the caller belongs to. |
| `GET` | `/api/v1/groups/:groupId` | Dashboard for a member: members in rotation order and the latest cycle. |

### Invitations

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/api/v1/group-invitations/groups/:groupId/invitations` | Group admin. Body: `{ "phoneNumber" }`. The phone must already belong to a user. |
| `GET` | `/api/v1/group-invitations/my` | Signed-in user. |
| `POST` | `/api/v1/group-invitations/:id/accept` | Invited user. |
| `POST` | `/api/v1/group-invitations/:id/decline` | Invited user. |

### Cycles — group admin

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/v1/groups/:groupId/cycles` | Open a cycle. Optional body `{ "periodKey": "2026-10" }`. Defaults to the current `YYYY-MM`. |
| `POST` | `/api/v1/groups/:groupId/cycles/:cycleId/payout` | Confirm payout and close the cycle after every contribution is paid. |

### Contributions

| Method | Path | Who |
| --- | --- | --- |
| `GET` | `/api/v1/groups/:groupId/cycles/:cycleId/contributions` | Signed-in user. |
| `POST` | `/api/v1/groups/:groupId/cycles/:cycleId/contributions/:contributionId/pay` | Group admin. Marks that contribution `PAID`. |

### Wallet — signed-in user

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/v1/wallet` | `{ totalUpcomingPayout, payouts: [{ amount, groupName, periodKey, position }] }`. |

### Emergency payout — group members

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/v1/groups/:groupId/emergency-requests` | Body: `{ "reason" }`. One pending request per member. |
| `POST` | `/api/v1/emergency-requests/:id/vote` | Body: `{ "vote": "YES" }` or `"NO"`. The requester cannot vote. |

### Platform admin — `User.role` must be `ADMIN`

These are separate from group-admin routes. New accounts are created as `USER`; promote a row in the database to use this area.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/v1/admin/test` | Auth check. |
| `GET` | `/api/v1/admin/stats` | User, group, cycle, and paid-contribution counts. |
| `GET` | `/api/v1/admin/users` | `?page=&limit=` (defaults 1 and 10). |
| `GET` | `/api/v1/admin/groups` | Paginated. |
| `GET` | `/api/v1/admin/groups/:id` | One group. |
| `GET` | `/api/v1/admin/cycles` | Paginated. |
| `GET` | `/api/v1/admin/cycles/:id` | One cycle. |
| `POST` | `/api/v1/admin/cycles/:id/force-close` | Close a cycle from the platform admin. |

## Project layout

```text
src/
  main.ts                  # validation pipe, CORS, port
  modules/
    auth/                  # register, OTP, login, JWT
    groups/                # create, list, dashboard
    group-invitations/
    cycles/
    contributions/
    wallet/
    emergency-votes/
    admin/
    activity-log/          # GROUP_CREATED, CYCLE_CREATED, PAYOUT_CONFIRMED, …
  notifications/whatsapp/  # OTP sender
  prisma/                  # PrismaService
prisma/
  schema.prisma
  migrations/
```

Activity log is written by other modules. It has no public HTTP routes.

## License

Private (`UNLICENSED`).
