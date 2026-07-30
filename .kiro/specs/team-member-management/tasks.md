# Implementation Plan: Team Member Management

## Overview

Transform the existing team management page from a raw-UID-based system into an email-driven workflow with user profiles, pending invites, and Firestore security rules. Implementation uses TypeScript with React 19, Zustand, TanStack Query, and Firebase.

## Tasks

- [ ] 1. Define types and pure logic functions
  - [ ] 1.1 Create UserProfile and PendingInvite interfaces and pure logic functions
    - Create `apps/portal/src/lib/team-utils.ts`
    - Define `UserProfile` interface with fields: uid, displayName, email, photoURL
    - Define `PendingInvite` interface with fields: email, projectId, role, invitedBy, createdAt
    - Define `ProfileSyncResult` interface and implement `computeProfileSync` function
    - Define `InviteResolutionAction` interface and implement `computeInviteResolutions` function
    - Implement `getInitials` function
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.2, 6.2_

  - [ ]* 1.2 Write property tests for computeProfileSync (Property 1: creation schema)
    - **Property 1: Profile document creation produces valid schema with lowercase email**
    - **Validates: Requirements 1.1, 1.4**
    - Use fast-check with min 100 iterations
    - Assert: for any authUser with non-null email and null existingDoc, result action is "create" with payload containing uid matching authUser.uid, email equal to authUser.email.toLowerCase(), and matching displayName/photoURL

  - [ ]* 1.3 Write property tests for computeProfileSync (Property 2: diff logic)
    - **Property 2: Profile diff logic — skip when matching, selective non-email update otherwise**
    - **Validates: Requirements 1.2, 1.3**
    - Use fast-check with min 100 iterations
    - Assert: returns "skip" when displayName and photoURL match; returns "update" with only changed fields (never "email") otherwise

  - [ ]* 1.4 Write property tests for computeInviteResolutions (Property 6: resolution logic)
    - **Property 6: Invite resolution adds user and deletes invite**
    - **Validates: Requirements 4.2, 4.3**
    - Use fast-check with min 100 iterations
    - Assert: returns "add_and_delete" when user not already member; "delete_only" when already member

  - [ ]* 1.5 Write property tests for getInitials (Property 8: initials extraction)
    - **Property 8: Initials extraction**
    - **Validates: Requirements 6.2**
    - Use fast-check with min 100 iterations
    - Assert: null/empty → "?"; non-empty → 1-2 uppercase chars from first/last word

- [ ] 2. Extend auth store with profile sync and invite resolution
  - [ ] 2.1 Add syncUserProfile and resolveInvites to the auth store
    - Modify `apps/portal/src/stores/auth-store.ts`
    - Import and use `computeProfileSync` and `computeInviteResolutions` from team-utils
    - Add `syncUserProfile` that reads `users/{uid}`, computes sync action, and writes accordingly
    - Add `resolveInvites` that queries `pendingInvites` where email matches, computes resolutions, and executes add/delete operations
    - Call `syncUserProfile` then `resolveInvites` inside the `onAuthStateChanged` handler after the allowedUsers check passes
    - Wrap both in try/catch so failures don't block sign-in (Req 1.5)
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.2, 4.3_

  - [ ]* 2.2 Write unit tests for auth store profile sync error handling
    - Test that sign-in proceeds when profile sync throws
    - Test that sign-in proceeds when invite resolution throws
    - _Requirements: 1.5_

- [ ] 3. Checkpoint - Verify core logic and auth store
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Update Firestore Security Rules
  - [ ] 4.1 Add users and pendingInvites collection rules to firestore.rules
    - Modify `firebase/firestore.rules`
    - Add `match /users/{userId}` rules: read (any auth), create (uid match + email match token), update (uid match + email immutable), delete (false)
    - Add `match /pendingInvites/{inviteId}` rules: read (email matches token), create (admin of projectId), delete (admin of projectId), update (false)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4_

  - [ ]* 4.2 Write integration tests for Firestore security rules
    - Test users collection: create with matching uid+email succeeds, create with wrong uid fails, update email fails, update displayName succeeds, delete denied, read by any auth user succeeds
    - Test pendingInvites collection: admin create succeeds, non-admin create fails, admin delete succeeds, update always denied, read by matching email succeeds, read by non-matching email fails
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4_

- [ ] 5. Implement custom hooks
  - [ ] 5.1 Create useUserProfiles hook
    - Create `apps/portal/src/hooks/use-user-profiles.ts`
    - Use TanStack Query to batch-fetch user profiles from `users/{uid}` for a list of UIDs
    - Return `{ data: Record<string, UserProfile>, isLoading }`
    - _Requirements: 6.1, 6.3_

  - [ ] 5.2 Create useSearchUserByEmail hook
    - Create `apps/portal/src/hooks/use-search-user-by-email.ts`
    - Use TanStack Query to search `users` collection where email matches input (lowercased)
    - Return `{ data: UserProfile | null, isLoading }`
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 5.3 Create usePendingInvites hook
    - Create `apps/portal/src/hooks/use-pending-invites.ts`
    - Use TanStack Query to fetch pending invites for a given projectId
    - Return `{ data: PendingInvite[], isLoading }`
    - _Requirements: 4.4_

  - [ ]* 5.4 Write property test for email normalization in search hook (Property 3)
    - **Property 3: Email search normalizes input to lowercase**
    - **Validates: Requirements 2.2**
    - Use fast-check with min 100 iterations
    - Assert: any email with arbitrary casing is normalized to lowercase before query

- [ ] 6. Implement UI components
  - [ ] 6.1 Create UserAvatar component
    - Create `apps/portal/src/components/user-avatar.tsx`
    - Display avatar with photoURL when available
    - Fall back to initials using `getInitials` when no photoURL
    - Use @radix-ui/react-avatar (already in dependencies)
    - _Requirements: 6.1, 6.2_

  - [ ] 6.2 Create MemberCard component
    - Create `apps/portal/src/components/member-card.tsx`
    - Display UserAvatar, displayName, email, role badge, and remove button (for admins)
    - Fall back to raw uid when no profile exists
    - _Requirements: 5.1, 6.1, 6.3, 6.4_

  - [ ] 6.3 Create PendingInviteCard component
    - Create `apps/portal/src/components/pending-invite-card.tsx`
    - Display invited email, role, "Pending" badge, and cancel button (for admins)
    - _Requirements: 4.4, 6.5_

  - [ ] 6.4 Create AddMemberModal component
    - Create `apps/portal/src/components/add-member-modal.tsx`
    - Use ResponsiveModal with title "Add Team Member"
    - Include email input field that triggers useSearchUserByEmail
    - When user found: show profile card, role selector, confirm button
    - When not found: show invite form with email pre-filled, role selector, "Send Invite" button
    - Handle validation: already a member, duplicate invite
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.5, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 6.5 Write property test for add member state transition (Property 4)
    - **Property 4: Add member state transition**
    - **Validates: Requirements 3.1**
    - Use fast-check with min 100 iterations
    - Assert: for any project state and new member uid not in authorizedUsers, after add, authorizedUsers contains uid and roles[uid] equals selected role

  - [ ]* 6.6 Write property test for invite document creation (Property 5)
    - **Property 5: Invite document creation schema**
    - **Validates: Requirements 4.1**
    - Use fast-check with min 100 iterations
    - Assert: for any (email, projectId, role, invitedBy) tuple, created doc contains all fields with email lowercase and valid ISO createdAt

  - [ ]* 6.7 Write property test for member removal (Property 7)
    - **Property 7: Member removal state transition**
    - **Validates: Requirements 5.2**
    - Use fast-check with min 100 iterations
    - Assert: after removal, authorizedUsers does not contain removed uid and roles has no key for removed uid

- [ ] 7. Checkpoint - Verify components and hooks
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Rewrite team route page
  - [ ] 8.1 Rewrite team.tsx with new components and hooks
    - Modify `apps/portal/src/routes/team.tsx`
    - Replace RBACManager usage with MemberCard list and PendingInviteCard list
    - Use useUserProfiles to fetch profiles for all authorizedUsers
    - Use usePendingInvites to fetch pending invites for the project
    - Add "Add Member" button that opens AddMemberModal (admin only via useRBAC)
    - Add confirmation dialog for member removal (Req 5.1)
    - Implement last-admin removal prevention (Req 5.3)
    - Allow self-removal unless last admin (Req 5.4)
    - Use TanStack Query mutations with optimistic updates for add/remove operations
    - _Requirements: 2.1, 3.1, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.4, 6.5_

  - [ ]* 8.2 Write unit tests for team page UI states
    - Test empty state, member list rendering, pending invite section
    - Test confirmation dialog on remove
    - Test last-admin validation message
    - _Requirements: 5.1, 5.3, 6.1, 6.5_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vitest + fast-check for property-based testing
- All email handling must normalize to lowercase for consistent matching
- The auth store sync/resolve must never block sign-in — errors are logged but swallowed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "4.1"] },
    { "id": 2, "tasks": ["2.1", "4.2"] },
    { "id": 3, "tasks": ["2.2", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["6.5", "6.6", "6.7"] },
    { "id": 7, "tasks": ["8.1"] },
    { "id": 8, "tasks": ["8.2"] }
  ]
}
```
