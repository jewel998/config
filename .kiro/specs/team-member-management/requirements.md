# Requirements Document

## Introduction

This feature improves the team member management system in the config portal. Currently, members are added by raw user IDs, which is unintuitive and error-prone. The improved system introduces email-based member lookup, a pending invite flow for users who haven't signed in yet, user profile storage with display names and avatars, member removal, and Firestore security rules to protect user email fields from modification.

## Glossary

- **Portal**: The React-based configuration management web application
- **User_Profile_Store**: The Firestore `users` collection that stores user profile data (name, email, photo) keyed by userId
- **Invite_Store**: The Firestore `pendingInvites` collection that stores pending invitations for users who have not yet signed in
- **Team_Manager**: The UI component responsible for displaying and managing project team members
- **Add_Member_Modal**: The ResponsiveModal-based UI for searching and inviting users by email
- **Auth_Store**: The Zustand store managing Firebase Authentication state and sign-in flow
- **Project**: A Firestore document in the `projects` collection containing `authorizedUsers` and `roles`
- **Firestore_Rules**: The security rules governing read/write access to Firestore collections
- **Invite_Resolver**: The client-side logic that checks for pending invites when a user signs in and resolves them

## Requirements

### Requirement 1: User Profile Storage on Sign-In

**User Story:** As a portal user, I want my name and profile picture to be stored when I sign in, so that other team members can see who I am instead of a raw user ID.

#### Acceptance Criteria

1. WHEN a user signs in successfully and no User_Profile_Store document exists for the user's uid, THE Auth_Store SHALL create a User_Profile_Store document keyed by the user's uid containing the fields: uid, displayName, email (stored as lowercase), and photoURL as provided by Firebase Auth
2. WHEN the user's displayName, email, and photoURL in Firebase Auth all match the corresponding fields in the existing User_Profile_Store document, THE Auth_Store SHALL skip the write operation
3. WHEN the user's displayName or photoURL in Firebase Auth differs from the corresponding field in the existing User_Profile_Store document, THE Auth_Store SHALL update only the fields whose values differ; THE Auth_Store SHALL NOT attempt to update the email field even if the Firebase Auth email differs from the stored email (email is immutable after initial creation)
4. THE User_Profile_Store document SHALL contain the fields: uid (string, non-empty), displayName (string or null), email (string, non-empty), and photoURL (string or null)
5. IF the write or update to the User_Profile_Store fails, THEN THE Auth_Store SHALL proceed with sign-in without blocking the user and SHALL log the failure for diagnostics

### Requirement 2: Email-Based Member Search

**User Story:** As a project admin, I want to search for users by email address, so that I can add team members without needing to know their internal user ID.

#### Acceptance Criteria

1. WHEN the admin opens the Add_Member_Modal, THE Team_Manager SHALL display an email input field for searching users
2. WHEN the admin enters an email address, THE Add_Member_Modal SHALL query the User_Profile_Store for a document where the email field matches the entered value (case-insensitive; emails are stored as lowercase)
3. WHEN a matching user is found in the User_Profile_Store, THE Add_Member_Modal SHALL display the user's displayName, email, and photoURL as a confirmation before adding
4. WHEN no matching user is found in the User_Profile_Store, THE Add_Member_Modal SHALL offer to send a pending invite to the entered email address

### Requirement 3: Immediate Member Addition

**User Story:** As a project admin, I want to immediately add a known user to my project, so that they can access the project right away.

#### Acceptance Criteria

1. WHEN the admin confirms adding a found user, THE Team_Manager SHALL add the user's uid to the Project `authorizedUsers` array and set their role in the `roles` map
2. WHEN the admin selects a role for the new member, THE Add_Member_Modal SHALL provide the options: viewer, editor, or admin
3. IF the user's uid already exists in the Project `authorizedUsers` array, THEN THE Add_Member_Modal SHALL display a validation message indicating the user is already a member

### Requirement 4: Pending Invite Flow

**User Story:** As a project admin, I want to invite users who haven't signed in yet by email, so that they are automatically added to the project when they first sign in.

#### Acceptance Criteria

1. WHEN the admin invites an email that has no matching User_Profile_Store document, THE Team_Manager SHALL create a document in the Invite_Store containing the email, projectId, role, invitedBy, and createdAt fields
2. WHEN a user signs in and their email (case-insensitive) matches a document in the Invite_Store, THE Invite_Resolver SHALL verify the user is not already in the Project `authorizedUsers` array and then add the user's uid to the corresponding Project `authorizedUsers` array and set their role; IF the user is already a member, the invite SHALL be deleted without re-adding
3. WHEN the Invite_Resolver successfully adds the user to a project, THE Invite_Resolver SHALL delete the resolved invite document from the Invite_Store
4. WHILE a pending invite exists for an email, THE Team_Manager SHALL display the pending invite in the team list with a "Pending" status indicator
5. IF the admin invites an email that already has a pending invite for the same project, THEN THE Add_Member_Modal SHALL display a validation message indicating an invite already exists

### Requirement 5: Member Removal

**User Story:** As a project admin, I want to remove members from the project, so that I can revoke access when it is no longer needed.

#### Acceptance Criteria

1. WHEN an admin clicks the remove button for a team member, THE Team_Manager SHALL display a confirmation prompt before proceeding
2. WHEN the admin confirms removal, THE Team_Manager SHALL remove the user's uid from the Project `authorizedUsers` array and remove their entry from the `roles` map
3. IF the member being removed is the last admin of the project, THEN THE Team_Manager SHALL prevent the removal and display a validation message
4. THE Team_Manager SHALL allow any member to remove themselves from a project, unless they are the last admin
5. THE Team_Manager SHALL allow admins to cancel pending invites by removing the corresponding Invite_Store document

### Requirement 6: Team List Display with User Profiles

**User Story:** As a portal user, I want to see team members displayed with their names and profile pictures, so that I can easily identify who has access to the project.

#### Acceptance Criteria

1. THE Team_Manager SHALL display each member's displayName and photoURL from the User_Profile_Store instead of raw user IDs
2. WHEN a member's User_Profile_Store document does not contain a photoURL, THE Team_Manager SHALL display a fallback avatar with the member's initials
3. WHEN a member's User_Profile_Store document does not exist, THE Team_Manager SHALL display the raw uid as a fallback
4. THE Team_Manager SHALL display the member's role as a badge next to their name
5. THE Team_Manager SHALL display pending invites in a separate section with the invited email and "Pending" badge

### Requirement 7: Add Member Modal UI

**User Story:** As a project admin, I want the add-member flow to use a responsive modal, so that the experience is consistent with other portal interactions on both desktop and mobile.

#### Acceptance Criteria

1. THE Add_Member_Modal SHALL use the existing ResponsiveModal component (Dialog on desktop, Drawer on mobile)
2. WHEN the modal is open, THE Add_Member_Modal SHALL display a title "Add Team Member" and a description explaining the flow
3. WHEN a user is found by email search, THE Add_Member_Modal SHALL display the user profile card with a role selector and a confirm button
4. WHEN no user is found, THE Add_Member_Modal SHALL display an invite form with the email pre-filled, a role selector, and a "Send Invite" button

### Requirement 8: Email Field Protection in Firestore Rules

**User Story:** As a system administrator, I want the email field in user profiles to be immutable after creation, so that users cannot impersonate others by changing their stored email.

#### Acceptance Criteria

1. THE Firestore_Rules SHALL allow an authenticated user to create a User_Profile_Store document only if the document ID matches their uid and the email field in the document matches their Firebase Auth token email
2. THE Firestore_Rules SHALL allow a user to update their own User_Profile_Store document (where document ID matches their uid) only if the email field value remains unchanged from the existing document
3. IF an update request to a User_Profile_Store document attempts to change the email field, THEN THE Firestore_Rules SHALL deny the write operation
4. THE Firestore_Rules SHALL allow any authenticated user to read any User_Profile_Store document
5. THE Firestore_Rules SHALL deny deletion of User_Profile_Store documents by the document owner

### Requirement 9: Pending Invite Firestore Rules

**User Story:** As a system administrator, I want Firestore rules to govern pending invite access, so that only project admins can create and delete invites, and the invite resolver can process them securely.

#### Acceptance Criteria

1. THE Firestore_Rules SHALL allow project admins to create documents in the Invite_Store, verified by checking `hasRole(request.resource.data.projectId, 'admin')` against the projectId field in the document being created
2. THE Firestore_Rules SHALL allow project admins to delete documents in the Invite_Store, verified by checking `hasRole(resource.data.projectId, 'admin')` against the projectId field in the existing document
3. THE Firestore_Rules SHALL allow any authenticated user to read Invite_Store documents where the email field matches their own Firebase Auth token email (case-insensitive, for invite resolution on sign-in)
4. THE Firestore_Rules SHALL deny updates to Invite_Store documents (invites are created or deleted, not modified)
