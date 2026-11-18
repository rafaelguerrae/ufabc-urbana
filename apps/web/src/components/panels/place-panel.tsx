"use client";

import type { DistrictProperties } from "#lib/indicators";
import type { RasterInfo } from "#lib/raster";
import { PlaceCard, type Place } from "#components/cards/place-card";
import { PlaceCharts } from "#components/charts/place-charts";
import { SheetPanel } from "./sheet-panel";

interface PlacePanelProps {
  open: boolean;
  place: Place | null;
  raster: RasterInfo | null;
  districts: DistrictProperties[] | null;
  /** Called when the mobile sheet is swiped away. Clearing the place is done from the search bar. */
  onClose: () => void;
}

/** Details of the selected point and the comparison charts, in the left slot under the search bar (a bottom sheet on phones). */
export function PlacePanel({ open, place, raster, districts, onClose }: PlacePanelProps) {
  return (
    <SheetPanel side="left" id="place-panel" label="Local selecionado" open={open} onClose={onClose}>
      {place && (
        <>
          <PlaceCard place={place} raster={raster} framed={false} />
          <PlaceCharts place={place} districts={districts} />
        </>
      )}
    </SheetPanel>
  );
}
