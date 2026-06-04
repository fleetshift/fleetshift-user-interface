import src from "./assets/gcp.webp";
import { memo } from "react";

const GcpHcpIcon = memo(() => {
  return <img src={src} width={16} height={16} />;
});

GcpHcpIcon.displayName = "GcpHcpIcon";

export default GcpHcpIcon;
