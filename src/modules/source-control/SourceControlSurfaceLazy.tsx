import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";
import type { SourceControlSurface as SourceControlSurfaceType } from "./SourceControlSurface";

const SourceControlSurfaceInner = lazy(() =>
  import("./SourceControlSurface").then((m) => ({
    default: m.SourceControlSurface,
  })),
);

type Props = ComponentProps<typeof SourceControlSurfaceType>;

export function SourceControlSurface(props: Props) {
  return (
    <Suspense fallback={null}>
      <SourceControlSurfaceInner {...props} />
    </Suspense>
  );
}
