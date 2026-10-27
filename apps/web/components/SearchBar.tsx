"use client";

import { useEffect, useId, useState } from "react";

import { searchPlaces, type SearchResult } from "../lib/geocode";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  onSelect: (result: SearchResult) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "empty">("idle");
  const [active, setActive] = useState(-1);
  const listId = useId();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus("loading");
      searchPlaces(q, controller.signal)
        .then((r) => {
          setResults(r);
          setStatus(r.length ? "idle" : "empty");
          setActive(-1);
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setStatus("error");
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(r: SearchResult) {
    setQuery(r.detail ? `${r.label}, ${r.detail}` : r.label);
    setOpen(false);
    onSelect(r);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results.length) {
      e.preventDefault();
      choose(results[active >= 0 ? active : 0]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        className={styles.input}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Buscar uma rua, endereço ou bairro em São Paulo, São Bernardo do Campo ou Santo André"
        placeholder="Busque"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id={listId} role="listbox" className={styles.list}>
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? styles.itemActive : styles.item}
                onClick={() => choose(r)}
              >
                <span className={styles.itemLabel}>{r.label}</span>
                {r.detail && <span className={styles.itemDetail}>{r.detail}</span>}
              </button>
            </li>
          ))}
          {status === "loading" && <li className={styles.note}>Buscando…</li>}
          {status === "empty" && <li className={styles.note}>Nenhum local encontrado nos municípios do mapa.</li>}
          {status === "error" && <li className={styles.note}>A busca está indisponível agora. Você ainda pode clicar no mapa.</li>}
        </ul>
      )}
    </div>
  );
}
