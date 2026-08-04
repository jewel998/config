# Implementation Plan: Config UX Overhaul

## Overview

Implement a comprehensive UX overhaul of the Config Portal's advanced feature management UI. This plan covers: replacing the raw datetime-local input with a shadcn Calendar date picker, adding section help text, providing config templates, adding smart placeholders to the rule builder, enabling segment editing with usage indicators, fixing the rollout save flow, and improving visual hierarchy. All work targets the existing React 19 + TypeScript stack at `apps/portal/src/`.

## Tasks

- [x] 1. Set up foundational utilities, types, and new hooks
  - [x] 1.1 Add shadcn Calendar component and testing dependencies
    - Run `npx shadcn@latest add calendar` in the portal app directory
    - Add `fast-check`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` to devDependencies
    - Ensure vitest config exists with jsdom environment
    - _Requirements: 1.1_
  - [x] 1.2 Create shared constants and utility functions
    - Create `apps/portal/src/lib/config-templates.ts` containing `SECTION_HELP`, `OPERATOR_DESCRIPTIONS`, `OPERATOR_VALUE_PLACEHOLDERS`, `COMMON_ATTRIBUTES`, and `CONFIG_TEMPLATES` definitions as specified in the design
    - Create `apps/portal/src/lib/config-utils.ts` with helper functions: `combineDateAndTime(date: Date, hours: number, minutes: number): string`, `isPastDate(date: Date): boolean`, `shouldConfirmOverwrite(templateType: TemplateType, state): boolean`, `validateSegmentName(name: string): boolean`, `computeSegmentUsage(configs, segmentId): SegmentUsageResult`, `formatConditionSummary(conditions: PredicateGroup[], maxGroups?: number): string`
    - Add `TemplateType`, `TemplateResult`, `ConfigTemplate`, `SegmentUsageResult`, `SectionHelpConfig` interfaces to `apps/portal/src/lib/types.ts`
    - _Requirements: 1.2, 1.3, 1.4, 3.2, 3.3, 3.4, 3.5, 3.6, 4.3, 4.5, 5.5, 6.3, 7.2, 7.3, 7.4_
  - [ ]* 1.3 Write property tests for date utility functions
    - **Property 1: Date and time combination produces valid ISO 8601**
    - **Property 2: Past date detection correctness**
    - **Validates: Requirements 1.2, 1.3, 1.4**
  - [ ]* 1.4 Write property tests for template utilities
    - **Property 3: Template application produces structurally valid results**
    - **Property 4: Template overwrite detection**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**
  - [ ]* 1.5 Write property tests for operator metadata and segment utilities
    - **Property 5: Operator metadata completeness**
    - **Property 6: Segment name validation**
    - **Property 7: Segment usage computation**
    - **Validates: Requirements 4.3, 4.5, 5.5, 6.3**
  - [ ]* 1.6 Write property tests for condition summary formatting
    - **Property 8: Condition summary formatting for single groups**
    - **Property 9: Condition summary multi-group truncation**
    - **Validates: Requirements 7.2, 7.3, 7.4**
  - [x] 1.7 Create `useSetRollout` hook
    - Create `apps/portal/src/hooks/use-set-rollout.ts` following the same pattern as `useSetOverrides`/`useSetSchedule`
    - Mutation updates `rolloutPercentage`, `rolloutValue`, `updatedAt`, `updatedBy` fields on the config document
    - Write audit entry before update
    - Invalidate configs query on success
    - _Requirements: 8.3_
  - [x] 1.8 Create `useSegmentUsage` hook
    - Create `apps/portal/src/hooks/use-segment-usage.ts`
    - Query all configs for the current project/environment
    - Filter configs whose targeting rules contain predicates with operator `in_segment` or `not_in_segment` and value matching the segment ID
    - Return `{ count: number, configKeys: string[] }`
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement DatePickerSchedule component
  - [x] 3.1 Create `DatePickerSchedule` component
    - Create `apps/portal/src/components/date-picker-schedule.tsx`
    - Render a `Popover` with shadcn `Calendar` (react-day-picker) and time selection via two `Select` dropdowns (hours 0–23, minutes 0–59)
    - Disable past dates using `disabled: { before: new Date() }` on the Calendar
    - Combine selected date + time into ISO 8601 string on confirm using `combineDateAndTime` utility
    - Show human-readable formatted date when schedule exists
    - Preserve existing countdown display and pending/applied badge logic
    - Clear form resets to empty state without saving
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ]* 3.2 Write unit tests for DatePickerSchedule
    - Test that calendar trigger renders
    - Test past dates are disabled
    - Test clearing form resets state
    - Test human-readable display of existing schedule
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

- [x] 4. Implement SectionHelpText and visual hierarchy improvements
  - [x] 4.1 Create `SectionHelpText` component
    - Create `apps/portal/src/components/section-help-text.tsx`
    - Render muted description text from `SECTION_HELP` constant based on `sectionId`
    - Conditionally show "Tip:" text when available
    - Include "Learn more" link/tooltip for each section
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  - [x] 4.2 Update `ConfigDetailPanel` with visual hierarchy
    - Add `SectionHelpText` below each section header
    - Add left border accent (`border-l-2 border-l-primary/10`) to each section wrapper
    - Increase section spacing from `space-y-1` to `space-y-2` for minimum 8px gap
    - Ensure icons remain per section (Target, Percent, UserCheck, Calendar/Timer, Link2)
    - Ensure badge counts display alongside section icons
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [ ]* 4.3 Write unit tests for SectionHelpText and visual hierarchy
    - Test correct description text per section
    - Test tip rendering
    - Test learn-more link presence
    - Test spacing and border classes
    - _Requirements: 2.1, 2.2, 2.3, 9.2, 9.5_

- [x] 5. Implement TemplateBar component
  - [x] 5.1 Create `TemplateBar` component
    - Create `apps/portal/src/components/template-bar.tsx`
    - Render horizontal row of 4 template buttons: "Enable for beta users", "Gradual rollout", "Internal only", "Scheduled launch"
    - Each button applies the corresponding template from `CONFIG_TEMPLATES`
    - Show confirmation `Dialog` when template would overwrite existing non-empty data (using `shouldConfirmOverwrite`)
    - Disable buttons when `canEdit === false`
    - i18n labels via lingui `t` macro
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  - [x] 5.2 Wire `TemplateBar` into `ConfigDetailPanel`
    - Add `<TemplateBar>` above the collapsible sections in `ConfigDetailPanel`
    - Connect `onApplyTemplate` handler to dispatch mutations for targeting rules, rollout, overrides, or schedule as appropriate
    - _Requirements: 3.1_
  - [ ]* 5.3 Write unit tests for TemplateBar
    - Test all 4 buttons render
    - Test buttons disabled for viewers
    - Test confirmation dialog on overwrite
    - Test template applies correct data structure
    - _Requirements: 3.1, 3.6, 3.7_

- [x] 6. Implement RuleBuilder smart placeholders
  - [x] 6.1 Update `RuleBuilder` with smart placeholders and autocomplete
    - Add placeholder `"e.g., plan, country, email, userId"` to attribute input
    - Add datalist element with `COMMON_ATTRIBUTES` for autocomplete suggestions
    - Update operator `SelectItem` to show description alongside operator name (e.g., "equals — exact match") using `OPERATOR_DESCRIPTIONS`
    - Default new rule's first predicate to `{ attribute: "plan", operator: "equals", value: "" }`
    - Change value input placeholder dynamically based on selected operator using `OPERATOR_VALUE_PLACEHOLDERS`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 6.2 Write unit tests for RuleBuilder smart placeholders
    - Test attribute placeholder text
    - Test autocomplete datalist presence
    - Test operator descriptions shown
    - Test default predicate values for new rules
    - Test value placeholder changes with operator
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement RolloutSection with proper save flow
  - [x] 8.1 Create `RolloutSection` component
    - Create `apps/portal/src/components/rollout-section.tsx`
    - Render range slider with real-time percentage display
    - Track `pendingPercentage` in local state during drag
    - Show "Save" button on pointer-up / blur when value differs from persisted
    - On Save: call `useSetRollout` mutation with percentage and rollout value
    - On success: dismiss Save button, show success toast
    - On error: revert slider to previous value, show error toast
    - Loading state: disable slider, show spinner on Save button
    - Disable slider and save when `canEdit === false`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 8.2 Replace inline rollout JSX in `ConfigDetailPanel` with `RolloutSection`
    - Remove existing inline rollout markup from `ConfigDetailPanel`
    - Wire `RolloutSection` with `projectId`, `environmentId`, `configKey`, `rolloutPercentage`, `rolloutValue`, `configValue`, and `canEdit`
    - _Requirements: 8.1, 8.3_
  - [ ]* 8.3 Write unit tests for RolloutSection
    - Test Save button appears on value change
    - Test loading state during save
    - Test revert on error
    - Test disabled state for viewers
    - _Requirements: 8.2, 8.4, 8.5, 8.6_

- [x] 9. Implement SegmentEditModal and condition summary
  - [x] 9.1 Create `ConditionSummary` component
    - Create `apps/portal/src/components/condition-summary.tsx`
    - Use `formatConditionSummary` utility to render inline predicate summary
    - Single group: display `attribute operator value` joined by " AND "
    - Multiple groups: show first group + "+ N more groups"
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 9.2 Create `UsageIndicator` component
    - Create `apps/portal/src/components/usage-indicator.tsx`
    - Use `useSegmentUsage` hook to fetch usage count
    - Render badge with count, expandable to show list of config keys
    - _Requirements: 6.1, 6.2_
  - [x] 9.3 Create `SegmentEditModal` component
    - Create `apps/portal/src/components/segment-edit-modal.tsx`
    - Use `ResponsiveModal` wrapper (existing pattern)
    - Pre-populate with segment's current name, description, and conditions
    - Embed simplified `RuleBuilder` for conditions editing
    - Validate non-empty name (using `validateSegmentName`) — show error and disable save if empty
    - Disable save for viewer-only permissions
    - On save, call `useUpdateSegment` with updated data
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [ ]* 9.4 Write unit tests for SegmentEditModal
    - Test modal opens pre-populated
    - Test empty name validation error
    - Test disabled for viewers
    - Test save triggers update
    - _Requirements: 5.1, 5.5, 5.6_

- [x] 10. Update SegmentManager with editing, usage, and condition preview
  - [x] 10.1 Enhance `SegmentManager` component
    - Make segment list items clickable to open `SegmentEditModal`
    - Replace "N groups" badge with `<ConditionSummary>` for inline condition preview
    - Add `<UsageIndicator>` badge per segment
    - On delete: show warning dialog with affected config list when usage count > 0
    - Disable edit action for viewer-only permissions
    - _Requirements: 5.1, 5.6, 6.1, 6.4, 7.1_
  - [ ]* 10.2 Write unit tests for enhanced SegmentManager
    - Test click opens edit modal
    - Test condition summary displays
    - Test usage badge displays count
    - Test delete warning for used segments
    - _Requirements: 5.1, 6.1, 6.4, 7.1_

- [x] 11. Final integration and wiring
  - [x] 11.1 Replace `ScheduleUI` usage in `ConfigDetailPanel` with `DatePickerSchedule`
    - Swap `<ScheduleUI>` for `<DatePickerSchedule>` with the same props interface
    - Ensure schedule save/cancel/clear flows work end-to-end
    - _Requirements: 1.1, 1.5, 1.6_
  - [ ]* 11.2 Write integration tests for end-to-end flows
    - Test template application → mutation → query invalidation
    - Test rollout save → success/failure paths
    - Test segment edit → update mutation
    - _Requirements: 3.2, 8.3, 5.2_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific UI behaviors and edge cases
- The shadcn Calendar component must be installed before building DatePickerSchedule
- All new components follow existing patterns: lingui i18n, sonner toasts, Radix primitives, RBAC via `canEdit` prop
- `useSetRollout` follows the same mutation pattern as `useSetOverrides` and `useSetSchedule`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "1.6", "1.7", "1.8"] },
    { "id": 2, "tasks": ["3.1", "4.1", "5.1", "6.1", "8.1", "9.1", "9.2"] },
    {
      "id": 3,
      "tasks": ["3.2", "4.2", "4.3", "5.2", "5.3", "6.2", "8.2", "8.3", "9.3"]
    },
    { "id": 4, "tasks": ["9.4", "10.1", "11.1"] },
    { "id": 5, "tasks": ["10.2", "11.2"] }
  ]
}
```
