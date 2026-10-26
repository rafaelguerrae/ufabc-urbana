import {
  DATA_TYPE_LABEL,
  INDICATORS,
  colorAt,
  formatValue,
  type DistrictProperties,
  type Indicator,
  type IndicatorKey,
} from "../lib/indicators";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  indicator: Indicator;
  onIndicatorChange: (key: IndicatorKey) => void;
  range: { min: number; max: number };
  selected: DistrictProperties | null;
  loading: boolean;
  error: string | null;
}

export function Sidebar({ indicator, onIndicatorChange, range, selected, loading, error }: SidebarProps) {
  const gradient = `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1]
    .map((t) => `rgb(${colorAt(indicator, t).join(",")})`)
    .join(",")})`;

  return (
    <aside className={styles.sidebar} aria-label="Indicators">
      <header>
        <h1 className={styles.title}>UFABC Urbana</h1>
        <p className={styles.lead}>
          Why are some areas of São Paulo hotter than others? Compare satellite-derived surface temperature,
          vegetation and urbanization by district.
        </p>
      </header>

      <section aria-labelledby="indicator-heading">
        <h2 id="indicator-heading" className={styles.heading}>
          Map indicator
        </h2>
        <div className={styles.tabs} role="radiogroup" aria-label="Map indicator">
          {INDICATORS.map((i) => (
            <button
              key={i.key}
              type="button"
              role="radio"
              aria-checked={i.key === indicator.key}
              className={i.key === indicator.key ? styles.tabActive : styles.tab}
              onClick={() => onIndicatorChange(i.key)}
            >
              {i.label}
            </button>
          ))}
        </div>

        <div className={styles.legend}>
          <div className={styles.legendBar} style={{ background: gradient }} aria-hidden />
          <div className={styles.legendLabels}>
            <span>
              {formatValue(indicator, range.min)} {indicator.unit}
            </span>
            <span>
              {formatValue(indicator, range.max)} {indicator.unit}
            </span>
          </div>
        </div>

        <p className={styles.badgeRow}>
          <span className={indicator.dataType === "observed" ? styles.badgeObserved : styles.badgeDerived}>
            {DATA_TYPE_LABEL[indicator.dataType]}
          </span>
        </p>
        <p className={styles.text}>{indicator.description}</p>
        <dl className={styles.meta}>
          <dt>Source</dt>
          <dd>{indicator.source}</dd>
          <dt>Period</dt>
          <dd>{indicator.period}</dd>
          <dt>Unit of analysis</dt>
          <dd>IBGE 2022 district (96 in the municipality of São Paulo)</dd>
        </dl>
      </section>

      <section aria-labelledby="district-heading">
        <h2 id="district-heading" className={styles.heading}>
          District
        </h2>
        {loading && <p className={styles.text}>Loading data…</p>}
        {error && <p className={styles.error}>Could not load data: {error}</p>}
        {!loading && !error && !selected && <p className={styles.text}>Click a district on the map to see its values.</p>}
        {selected && (
          <div>
            <p className={styles.districtName}>{selected.name}</p>
            <table className={styles.table}>
              <tbody>
                {INDICATORS.map((i) => (
                  <tr key={i.key} className={i.key === indicator.key ? styles.rowActive : undefined}>
                    <th scope="row">{i.label}</th>
                    <td>
                      {formatValue(i, selected[i.key])} <span className={styles.unit}>{i.unit}</span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Population</th>
                  <td>
                    {selected.population.toLocaleString("en-US")} <span className={styles.unit}>residents</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="limits-heading">
        <h2 id="limits-heading" className={styles.heading}>
          Read with care
        </h2>
        <p className={styles.text}>
          Districts that are more urbanized and less green tend to have higher surface temperature, but this is an
          association between averaged areas. It does not show that any single factor causes the difference. Surface
          temperature is not air temperature. No scenario or forecast is shown.
        </p>
      </section>
    </aside>
  );
}
