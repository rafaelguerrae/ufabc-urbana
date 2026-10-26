"""INMET: station list and hourly historical data for stations in/near São Paulo city."""

import io
import zipfile

import pandas as pd

from ..common import RAW, SAMPLES, client, download, write_meta

STATIONS_URL = "https://apitempo.inmet.gov.br/estacoes/T"
YEAR_URL = "https://portal.inmet.gov.br/uploads/dadoshistoricos/{year}.zip"
STATION_CODES = ["A701", "A771", "A755"]  # Mirante de Santana, Interlagos, Barueri
YEAR = 2023


def main() -> None:
    SAMPLES.mkdir(exist_ok=True)
    stations = client().get(STATIONS_URL).json()
    sp = pd.DataFrame([s for s in stations if s["SG_ESTADO"] == "SP"])
    sp.to_csv(SAMPLES / "inmet_stations_sp.csv", index=False)

    zip_path = download(YEAR_URL.format(year=YEAR), RAW / "inmet" / f"{YEAR}.zip")
    summary = {}
    with zipfile.ZipFile(zip_path) as z:
        for code in STATION_CODES:
            name = next(n for n in z.namelist() if f"_{code}_" in n)
            raw = z.read(name).decode("latin-1")
            lines = raw.splitlines()
            header = {k: v for k, v in (l.split(";", 1) for l in lines[:8])}
            df = pd.read_csv(io.StringIO("\n".join(lines[8:])), sep=";", decimal=",", na_values=["-9999"])
            temp_col = next(c for c in df.columns if "TEMPERATURA DO AR" in c)
            df.head(48).to_csv(SAMPLES / f"inmet_{code}_{YEAR}_sample.csv", index=False)
            summary[code] = {
                "file": name,
                "header": header,
                "rows": len(df),
                "temperature_column": temp_col,
                "temperature_missing": int(df[temp_col].isna().sum()),
                "columns": list(df.columns),
            }
            print(code, header.get("ESTACAO:"), len(df), "rows; temp missing:", summary[code]["temperature_missing"])
    write_meta(
        "inmet",
        {
            "source": "INMET historical hourly data (automatic stations)",
            "stations_url": STATIONS_URL,
            "year_url": YEAR_URL.format(year=YEAR),
            "stations_total_sp": len(sp),
            "year": YEAR,
            "stations": summary,
        },
    )


if __name__ == "__main__":
    main()
