import type { AnnotationDocument } from "raavl/regions";
import { annotations } from "../../../packages/fixtures/data.js";

const stretch = 9;
export const editorAnnotations: AnnotationDocument = {
  ...annotations,
  regions: [
    ...annotations.regions.map((region) => ({
      ...region,
      start: region.start * stretch,
      end: region.end * stretch,
    })),
    { id: "overlap", start: 18, end: 40.5, label: "Overlap" },
  ],
  markers: annotations.markers.map((marker) => ({
    ...marker,
    time: marker.time * stretch,
  })),
};
