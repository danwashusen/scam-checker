# Story 3-11: Circular Risk Gauge Implementation

## Status
Draft

## User Story

**As a** user viewing analysis results,
**I want** a visually compelling circular risk gauge that clearly shows the safety score with smooth animations and color transitions,
**so that** I can quickly understand the risk level through intuitive visual indicators that match the front-end specifications.

## Acceptance Criteria

1. **SVG Circular Gauge Component**: Create custom animated circular progress gauge
   - Circular SVG gauge with 200px diameter on desktop, 120px on mobile
   - Smooth stroke-based progress ring with rounded end caps
   - Background ring in gray (#E5E7EB) with 12px stroke width
   - Animated progress ring with dynamic color based on score

2. **Color Interpolation System**: Implement smooth color transitions based on score
   - Score 0-33: Red (#EF4444) - HSL(0, 84%, 60%)
   - Score 34-66: Orange (#F59E0B) - HSL(35, 92%, 50%)  
   - Score 67-100: Green (#10B981) - HSL(142, 71%, 45%)
   - Smooth color interpolation between ranges (not hard cutoffs)
   - Color transitions should be mathematically calculated, not CSS-stepped

3. **Count-Up Animation**: Implement smooth score reveal animation
   - Count-up from 0 to target score over 1.5 seconds
   - Easing function for natural movement (ease-out recommended)
   - Progress ring fills synchronously with number count-up
   - Animation triggers on component mount or score change

4. **Typography and Layout**: Proper text display within gauge center
   - Score number in 48px font-weight-bold (desktop), 32px (mobile)
   - Status text ("SAFE", "CAUTION", "DANGER") in 18px font-weight-medium
   - Status text uppercase with letter spacing (tracking-wider)
   - Center-aligned text with proper vertical centering

5. **Responsive Design**: Adaptive sizing across screen sizes
   - Desktop (1200px+): 200px diameter gauge
   - Tablet (768px-1199px): 160px diameter gauge  
   - Mobile (<768px): 120px diameter gauge
   - Text scaling proportional to gauge size
   - Maintain proper aspect ratios and touch targets

6. **Integration with Existing Components**: Replace current basic meter
   - Drop-in replacement for existing risk score display
   - Maintain same data props interface (score, status)
   - Compatible with Simple View and Technical View displays
   - Preserves accessibility attributes and ARIA labels

## Tasks / Subtasks

- [ ] **Create SVG Gauge Component** (AC: 1)
  - [ ] Build CircularRiskGauge React component with SVG implementation
  - [ ] Implement circle geometry calculations (circumference, dash arrays)
  - [ ] Add responsive sizing with CSS custom properties
  - [ ] Create stroke-dashoffset animation for progress ring

- [ ] **Implement Color Interpolation** (AC: 2)
  - [ ] Create color utility function for HSL interpolation
  - [ ] Calculate smooth transitions between score ranges
  - [ ] Implement real-time color updates during animation
  - [ ] Add color constants matching front-end specification values

- [ ] **Build Count-Up Animation System** (AC: 3)
  - [ ] Create useCountUpAnimation custom hook
  - [ ] Implement requestAnimationFrame-based number animation
  - [ ] Synchronize gauge fill with number count-up
  - [ ] Add easing function (ease-out cubic-bezier)
  - [ ] Handle animation cleanup on component unmount

- [ ] **Style Typography and Layout** (AC: 4)
  - [ ] Position text content in gauge center with flexbox
  - [ ] Apply responsive typography sizing
  - [ ] Add proper font weights and letter spacing
  - [ ] Ensure text remains centered during animations

- [ ] **Implement Responsive Behavior** (AC: 5)  
  - [ ] Create responsive sizing breakpoints and CSS custom properties
  - [ ] Test gauge at all target screen sizes
  - [ ] Validate touch targets meet accessibility minimums
  - [ ] Optimize performance for smaller screens

- [ ] **Integrate with Existing Views** (AC: 6)
  - [ ] Replace current meter in Simple View results display
  - [ ] Update Technical View with new gauge component
  - [ ] Maintain existing prop interfaces and data flow
  - [ ] Add proper TypeScript definitions
  - [ ] Preserve ARIA labels and accessibility features

- [ ] **Performance Optimization**
  - [ ] Optimize SVG rendering for smooth 60fps animations
  - [ ] Implement component memoization for static props
  - [ ] Add animation performance monitoring
  - [ ] Test on lower-end devices for smooth performance

## Dev Notes

### Critical Context
The design review identified that the current basic meter implementation doesn't match the front-end specifications. Users expect a professional, visually compelling gauge that clearly communicates risk through color and animation.

### Current State vs Required
- **Current**: Basic HTML meter element with limited styling
- **Required**: Custom SVG circular gauge with smooth animations and color interpolation
- **Gap**: Missing count-up animation, color transitions, and responsive sizing

### Technical Implementation Approach
- Use SVG `<circle>` elements with `stroke-dasharray` and `stroke-dashoffset` for progress animation
- Implement custom React hook for count-up animation using `requestAnimationFrame`
- Color interpolation using HSL color space for smooth transitions
- CSS custom properties for responsive sizing

### Relevant Source Tree
- **Current gauge**: `src/components/analysis/risk-gauge.tsx`
- **Simple View**: `src/components/analysis/simple-view.tsx` 
- **Technical View**: Component that displays detailed results
- **Animation utilities**: May need to create new animation utility functions
- **Color utilities**: Potentially add color interpolation utilities

### Color Specification Details
```
Red: HSL(0, 84%, 60%) = #EF4444
Orange: HSL(35, 92%, 50%) = #F59E0B  
Green: HSL(142, 71%, 45%) = #10B981
Background: #E5E7EB (Tailwind gray-200)
```

### Animation Timing
- **Duration**: 1.5 seconds total animation time
- **Easing**: ease-out for natural deceleration
- **Frame rate target**: 60fps for smooth animation
- **Trigger**: Component mount and score prop changes

### Testing Standards
- **Test file location**: `tests/unit/components/analysis/CircularRiskGauge.test.tsx`
- **Test frameworks**: Jest + React Testing Library + Jest Canvas Mock for SVG
- **Required tests**: Animation timing, color calculations, responsive sizing, accessibility
- **Visual regression**: Screenshots at different scores and screen sizes
- **Performance tests**: Animation frame rate and memory usage

### Accessibility Requirements
- Maintain ARIA labels for screen readers
- Ensure sufficient color contrast ratios
- Provide text alternatives for visual gauge information
- Support reduced motion preferences

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-09-01 | 1.0 | Initial story creation based on design review findings | Bob (Scrum Master) |

## Dev Agent Record

*This section will be populated by the development agent during implementation*

## QA Results

*This section will be populated by the QA agent after review*