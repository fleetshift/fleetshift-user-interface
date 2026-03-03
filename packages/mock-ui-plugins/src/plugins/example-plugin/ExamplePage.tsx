import {
  Card,
  CardTitle,
  CardBody,
  CardFooter,
  Button,
} from "@patternfly/react-core";

const ExamplePage = () => {
  return (
    <Card>
      <CardTitle>Example Plugin</CardTitle>
      <CardBody>This page is loaded as a remote Scalprum module.</CardBody>
      <CardFooter>
        <Button variant="primary">Action</Button>
      </CardFooter>
    </Card>
  );
};

export default ExamplePage;
