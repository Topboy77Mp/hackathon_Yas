import { createTheme } from "@mui/material/styles";
import { colors, radii, spacing } from "@shared/theme/tokens";

export const muiTheme = createTheme({
  palette: {
    primary: { main: colors.unlock.green, contrastText: colors.surface.white },
    secondary: { main: colors.brand.yellow, contrastText: colors.brand.ink },
    background: { default: colors.surface.raised, paper: colors.surface.white },
    text: { primary: colors.brand.ink, secondary: colors.text.muted },
    divider: colors.line,
    success: { main: colors.unlock.green },
  },
  typography: {
    fontFamily: "Roboto Flex, system-ui, sans-serif",
    h4: { fontWeight: 700, letterSpacing: "-0.035em" },
    h5: { fontWeight: 700, letterSpacing: "-0.025em" },
    button: { fontWeight: 700, textTransform: "none" },
  },
  shape: { borderRadius: radii.block },
  spacing: spacing.sm,
  components: {
    MuiPaper: { styleOverrides: { root: { boxShadow: "none" } } },
    MuiCard: { styleOverrides: { root: { borderColor: colors.line } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44 } } },
  },
});
