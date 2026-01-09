import { Suspense } from "react";
import ClientApp from "./ClientApp";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientApp />
    </Suspense>
  );
}
