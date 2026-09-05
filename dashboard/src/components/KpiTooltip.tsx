import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { IconButton, Tooltip, Typography } from "@mui/material";

type KpiTooltipProps = {
  label: string;
  description: string;
};

export function KpiTooltip({ label, description }: KpiTooltipProps) {
  return (
    <Tooltip
      arrow
      describeChild
      enterTouchDelay={0}
      leaveTouchDelay={5000}
      placement="top"
      title={<Typography variant="body2">{description}</Typography>}
    >
      <IconButton
        aria-label={`En savoir plus sur ${label}`}
        size="small"
        sx={{ color: "text.secondary", flex: "0 0 auto", height: 24, minHeight: "24px !important", minWidth: "24px !important", ml: 0.25, p: 0.25, width: 24 }}
      >
        <InfoOutlined sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  );
}
