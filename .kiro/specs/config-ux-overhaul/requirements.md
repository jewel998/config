# Requirements Document

## Introduction

A comprehensive UX overhaul of the Config Portal's advanced feature management UI. The current interface is functional but not intuitive — users struggle to understand section purposes, lack templates for common patterns, encounter a raw HTML date input for scheduling, and cannot edit segments or see their usage. This feature set improves discoverability, reduces friction for common workflows, and fixes the rollout save flow.

## Glossary

- **Config_Detail_Panel**: The expanded inline panel shown when a user clicks a config row, containing collapsible sections for Value, Targeting Rules, Rollout, Overrides, Schedule, and Prerequisites.
- **Date_Picker**: A calendar popover component (shadcn Calendar using react-day-picker) with time selection, replacing the raw HTML datetime-local input.
- **Section_Help_Text**: A brief description displayed beneath each collapsible section header explaining what the feature does, with optional contextual tips and learn-more links.
- **Config_Template**: A pre-built configuration pattern that, when applied, populates targeting rules, rollout, overrides, or schedule fields with common defaults.
- **Smart_Placeholder**: Pre-filled default values and attribute suggestions shown in form inputs when adding predicates or rules.
- **Segment_Manager**: The UI component responsible for listing, creating, editing, and deleting audience segments.
- **Usage_Indicator**: A count and expandable list showing which configs reference a particular segment.
- **Rollout_Section**: The collapsible section within the Config_Detail_Panel that displays a percentage slider and persists rollout changes to the backend.
- **Visual_Hierarchy**: The use of icons, descriptions, spacing, and border styling to visually distinguish collapsible sections within the Config_Detail_Panel.
- **Predicate_Builder**: The form row within targeting rules where a user selects an attribute, operator, and value.

## Requirements

### Requirement 1: Calendar Date Picker for Schedule

**User Story:** As a config manager, I want a proper calendar date picker with time selection for scheduling config changes, so that I can select dates intuitively without typing raw datetime strings.

#### Acceptance Criteria

1. WHEN the Schedule section is expanded and no schedule exists, THE Date_Picker SHALL render a calendar popover using shadcn Calendar (react-day-picker) with a separate time input for hours and minutes.
2. WHEN a user selects a date from the calendar, THE Date_Picker SHALL update the selected date visually and store it in ISO 8601 format.
3. WHEN a user confirms a time selection, THE Date_Picker SHALL combine the selected date and time into a single ISO 8601 datetime string.
4. THE Date_Picker SHALL prevent selection of dates in the past (disable past dates in the calendar).
5. THE Date_Picker SHALL display the currently scheduled datetime in a human-readable format when a schedule already exists.
6. IF the user clears the date selection, THEN THE Date_Picker SHALL reset the schedule form to its empty state without saving.

### Requirement 2: Section Help Text and Contextual Hints

**User Story:** As a new user of the config portal, I want explanatory text for each advanced feature section, so that I can understand what each section does without external documentation.

#### Acceptance Criteria

1. THE Config_Detail_Panel SHALL display a one-line description below each collapsible section header explaining the section purpose.
2. WHEN a section has a contextual tip relevant to the user's current state, THE Config_Detail_Panel SHALL display the tip as muted text prefixed with "Tip:".
3. THE Section_Help_Text SHALL include a "Learn more" link or tooltip for each section that provides a detailed explanation of the concept.
4. THE Section_Help_Text for "Targeting Rules" SHALL read: "Route specific config values to users based on attributes like plan, country, or custom properties."
5. THE Section_Help_Text for "Rollout" SHALL read: "Gradually roll out this config value to a percentage of users."
6. THE Section_Help_Text for "Overrides" SHALL read: "Force a specific value for individual user IDs, bypassing all other rules."
7. THE Section_Help_Text for "Schedule" SHALL read: "Automatically change this config's value at a future date and time."
8. THE Section_Help_Text for "Prerequisites" SHALL read: "Require other flags to have specific values before this config takes effect."

### Requirement 3: Config Templates for Common Patterns

**User Story:** As a config manager, I want quick-start templates for common advanced feature patterns, so that I can set up targeting, rollout, or scheduling without manually filling every field.

#### Acceptance Criteria

1. WHEN the Config_Detail_Panel is expanded, THE Config_Detail_Panel SHALL display a row of template action buttons above the collapsible sections.
2. WHEN a user clicks the "Enable for beta users" template button, THE Config_Detail_Panel SHALL create a targeting rule with a predicate of attribute "plan", operator "equals", value "pro".
3. WHEN a user clicks the "Gradual rollout" template button, THE Config_Detail_Panel SHALL set the rolloutPercentage to 10 and the rolloutValue to the current config value.
4. WHEN a user clicks the "Internal only" template button, THE Config_Detail_Panel SHALL add an override entry with a placeholder user ID and the current config value.
5. WHEN a user clicks the "Scheduled launch" template button, THE Config_Detail_Panel SHALL pre-fill the schedule with an activateAt time of tomorrow at 09:00 local time and the targetValue set to the current config value.
6. IF a template would overwrite existing non-empty data in the target section, THEN THE Config_Detail_Panel SHALL display a confirmation prompt before applying the template.
7. THE Config_Detail_Panel SHALL disable template buttons when the user lacks edit permission.

### Requirement 4: Smart Placeholders and Default Values

**User Story:** As a config manager, I want pre-filled suggestions and descriptive operators when building targeting rules, so that I can set up predicates faster and understand what each operator does.

#### Acceptance Criteria

1. WHEN a new predicate row is added in the Predicate_Builder, THE Predicate_Builder SHALL display "e.g., plan, country, email, userId" as placeholder text in the attribute field.
2. THE Predicate_Builder SHALL provide an autocomplete suggestion list for the attribute field containing common attributes: plan, country, email, userId, device, browser, appVersion.
3. WHEN the operator dropdown is open, THE Predicate_Builder SHALL display a short description next to each operator (e.g., "equals — exact match", "contains — substring match", "in_list — matches any value in a comma-separated list").
4. WHEN a new targeting rule is added, THE Predicate_Builder SHALL pre-fill the first predicate with attribute "plan" and operator "equals" as sensible defaults.
5. THE Predicate_Builder SHALL display a placeholder in the value field that reflects the selected operator (e.g., "pro" for equals, "user1,user2" for in_list).

### Requirement 5: Segment Editing

**User Story:** As a config manager, I want to edit a segment's name, description, and conditions after creation, so that I can update segments without deleting and recreating them.

#### Acceptance Criteria

1. WHEN a user clicks on a segment in the Segment_Manager, THE Segment_Manager SHALL open an edit modal pre-populated with the segment's current name, description, and conditions.
2. WHEN a user modifies the segment name and saves, THE Segment_Manager SHALL persist the updated name to the backend and display it in the segment list.
3. WHEN a user modifies the segment description and saves, THE Segment_Manager SHALL persist the updated description to the backend.
4. WHEN a user modifies segment conditions and saves, THE Segment_Manager SHALL persist the updated conditions to the backend.
5. IF the segment name is empty when the user attempts to save, THEN THE Segment_Manager SHALL display a validation error and prevent saving.
6. THE Segment_Manager SHALL disable the edit action for users with viewer-only permissions.

### Requirement 6: Segment Usage Visibility

**User Story:** As a config manager, I want to see which configs reference a segment and how many, so that I can understand the impact of modifying or deleting a segment.

#### Acceptance Criteria

1. THE Segment_Manager SHALL display a usage count badge next to each segment showing how many configs reference that segment in their targeting rules.
2. WHEN a user expands the usage indicator for a segment, THE Segment_Manager SHALL display a list of config keys that reference the segment.
3. THE Usage_Indicator SHALL compute usage by scanning all configs in the current project for targeting rules containing the "in_segment" or "not_in_segment" operator with the segment's ID as the value.
4. WHEN a user attempts to delete a segment that has a non-zero usage count, THE Segment_Manager SHALL display a warning listing the affected configs before confirming deletion.

### Requirement 7: Segment Condition Visualization

**User Story:** As a config manager, I want to see the actual predicate conditions of a segment at a glance, so that I can understand what audience a segment targets without opening it.

#### Acceptance Criteria

1. THE Segment_Manager SHALL display a summary of the segment's conditions inline beneath the segment name (replacing the current "N groups" badge with a readable summary).
2. WHEN a segment has one predicate group with one predicate, THE Segment_Manager SHALL display it as "[attribute] [operator] [value]" (e.g., "plan equals pro").
3. WHEN a segment has multiple predicate groups, THE Segment_Manager SHALL display the first group summary followed by "+ N more groups" for additional groups.
4. WHEN a segment has multiple predicates within a group, THE Segment_Manager SHALL join them with "AND" in the inline display.

### Requirement 8: Rollout Percentage Save Flow

**User Story:** As a config manager, I want changes to the rollout percentage slider to actually persist to the backend, so that rollout adjustments take effect.

#### Acceptance Criteria

1. WHEN a user adjusts the rollout percentage slider, THE Rollout_Section SHALL display the updated percentage value in real-time.
2. WHEN a user finishes adjusting the slider (on pointer-up or blur), THE Rollout_Section SHALL display a "Save" button to confirm the change.
3. WHEN the user clicks "Save" in the Rollout_Section, THE Rollout_Section SHALL persist the rolloutPercentage and rolloutValue to the backend via the existing mutation hook.
4. IF the backend save fails, THEN THE Rollout_Section SHALL revert the slider to its previous value and display an error toast.
5. THE Rollout_Section SHALL disable the slider and save button when the user lacks edit permission.
6. WHEN the save is in progress, THE Rollout_Section SHALL display a loading indicator on the save button and disable the slider.

### Requirement 9: Visual Hierarchy Improvements

**User Story:** As a config manager, I want the collapsible sections in the expanded config panel to be visually distinct and easy to scan, so that I can quickly find the section I need.

#### Acceptance Criteria

1. THE Config_Detail_Panel SHALL display a unique icon for each collapsible section header (Target for Targeting Rules, Percent for Rollout, UserCheck for Overrides, Calendar for Schedule, Link2 for Prerequisites).
2. THE Config_Detail_Panel SHALL render each collapsible section with a subtle left border or background tint that distinguishes it from adjacent sections.
3. THE Config_Detail_Panel SHALL display Section_Help_Text in muted/secondary color directly below the section header label.
4. WHEN a section contains active configuration (non-empty rules, schedule set, overrides present), THE Config_Detail_Panel SHALL display the existing badge count alongside the section icon in the header.
5. THE Config_Detail_Panel SHALL maintain a minimum of 8px vertical spacing between consecutive section headers to prevent visual crowding.
