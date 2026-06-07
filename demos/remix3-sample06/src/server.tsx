import { renderToStream } from "@remix-run/ui/server";
import { Layout } from "./root";
import { RouterProvider } from "./provider/RouterProvider";

const handler = (url: string) => {
  const routerContext = {
    serverUrl: url,
    navigate: () => {},
  };

  return new Response(
    renderToStream(
      <RouterProvider value={routerContext}>
        <Layout />
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
