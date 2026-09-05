import { breakpoints, colors, gutter, radii, spacing } from "@shared/theme/tokens";
import { fontWeights, typeScale } from "@shared/theme/typography";

const px = (value: number) => `${value}px`;

export const themeVariables = {
  // Nuances relevées dans le PNG original (le logo contient plusieurs nuances).
  "--brand-primary": "#012C75",
  "--brand-ink": colors.brand.ink,
  "--brand-yellow": "#FEC40E",
  "--accent-navy": colors.accent.navy,
  "--alert-red": colors.alert.red,
  "--surface-white": colors.surface.white,
  "--surface-raised": colors.surface.raised,
  "--line": colors.line,
  "--text-muted": colors.text.muted,
  "--unlock-green": colors.unlock.green,
  "--unlock-green-soft": colors.unlock.greenSoft,
  "--font-numbers": "system-ui",
  "--font-body": "system-ui",
  "--weight-semibold": fontWeights.numbersSemiBold,
  "--weight-bold": fontWeights.numbersBold,
  "--display-size": px(typeScale.display.size),
  "--display-line": px(typeScale.display.lineHeight),
  "--heading-size": px(typeScale.heading.size),
  "--heading-line": px(typeScale.heading.lineHeight),
  "--label-size": px(typeScale.label.size),
  "--label-line": px(typeScale.label.lineHeight),
  "--caption-size": px(typeScale.caption.size),
  "--body-size": px(typeScale.body.size),
  "--body-line": px(typeScale.body.lineHeight),
  "--space-sm": px(spacing.sm),
  "--space-xs": px(spacing.xs),
  "--space-md": px(spacing.md),
  "--space-lg": px(spacing.lg),
  "--space-xl": px(spacing.xl),
  "--space-xxl": px(spacing.xxl),
  "--space-xxxl": px(spacing.xxxl),
  "--gutter-web": px(gutter.web),
  "--dashboard-max-width": px(breakpoints.dashboardMaxContentWidth),
  "--radius-block": px(radii.block),
  "--radius-pill": px(radii.pill),
};
