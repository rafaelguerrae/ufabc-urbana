"""GeoSampa WFS layers: census-sector population density and vegetation cover."""

import json

from ..common import SAMPLES, client, write_meta

WFS = "http://wfs.geosampa.prefeitura.sp.gov.br/geoserver/ows"
LAYERS = {
    "densidade_demografica": "Population density 2022 (census sectors)",
    "cobertura_vegetal": "Vegetation cover mapping, titled 2020 in the catalog",
}
SAMPLE_SIZE = 500


def wfs(params: dict):
    base = {"service": "WFS", "version": "2.0.0"}
    return client().get(WFS, params={**base, **params})


def hits(layer: str) -> int:
    text = wfs({"request": "GetFeature", "typeNames": f"geoportal:{layer}", "resultType": "hits"}).text
    return int(text.split('numberMatched="')[1].split('"')[0])


def main() -> None:
    SAMPLES.mkdir(exist_ok=True)
    for layer, description in LAYERS.items():
        r = wfs(
            {
                "request": "GetFeature",
                "typeNames": f"geoportal:{layer}",
                "count": SAMPLE_SIZE,
                "outputFormat": "application/json",
            }
        )
        r.raise_for_status()
        data = r.json()
        (SAMPLES / f"geosampa_{layer}_sample.geojson").write_text(json.dumps(data), encoding="utf-8")
        props = data["features"][0]["properties"]
        write_meta(
            f"geosampa_{layer}",
            {
                "source": "GeoSampa WFS",
                "endpoint": WFS,
                "layer": f"geoportal:{layer}",
                "description": description,
                "crs": data.get("crs", {}).get("properties", {}).get("name"),
                "total_features": hits(layer),
                "sample_size": len(data["features"]),
                "properties": list(props),
                "example_properties": props,
            },
        )
        print(layer, hits(layer), "features; sample properties:", list(props))


if __name__ == "__main__":
    main()
