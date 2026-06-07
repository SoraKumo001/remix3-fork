import { renderToStream } from "@remix-run/ui/server";
import { Layout } from "./root";
import {
  SSRProvider,
  type SSRProps,
} from "./provider/SSRProvider";
import { RouterProvider } from "./provider/RouterProvider";

const handler = (url: string) => {
  const storage: SSRProps = { states: {} };
  const routerContext = {
    serverUrl: url,
    navigate: () => {},
  };

  return new Response(
    renderToStream(
      <RouterProvider value={routerContext}>
        <SSRProvider storage={storage}>
          <Layout />
        </SSRProvider>
      </RouterProvider>
    ),
    {
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
};

export default handler;
