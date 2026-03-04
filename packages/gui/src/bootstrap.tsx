import "@patternfly/react-core/dist/styles/base.css";
import "./theme.scss";
// Ensure dynamic-plugin-sdk is in the MF shared scope for plugin extensions
import "@openshift/dynamic-plugin-sdk";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
