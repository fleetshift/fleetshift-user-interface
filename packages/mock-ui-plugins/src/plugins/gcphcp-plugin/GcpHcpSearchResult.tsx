import { Icon } from "@patternfly/react-core";
import { MenuItem } from "@patternfly/react-core";
import PluginLink from "../routing-plugin/PluginLink";
import gcpIcon from "./assets/gcp.webp";

interface Props {
  title: string;
  description: string;
}

const GcpHcpSearchResult = ({ title, description }: Props) => {
  return (
    <MenuItem
      icon={
        <Icon isInline>
          <img src={gcpIcon} alt="" width={16} height={16} />
        </Icon>
      }
      description={<span dangerouslySetInnerHTML={{ __html: description }} />}
      component={(props) => (
        <PluginLink
          {...props}
          module="DayOnePage"
          scope="day-one-plugin"
          to={{ pathname: "/create-cluster/gcphcp" }}
        />
      )}
    >
      <span dangerouslySetInnerHTML={{ __html: title }} />
    </MenuItem>
  );
};

export default GcpHcpSearchResult;
