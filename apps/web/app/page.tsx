import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <ul>
          <li>
            <code>todo</code>
          </li>
        </ul>
      </main>
      <footer className={styles.footer}>
        <a
          href="https://github.com/rafaelguerrae/ufabc-urbana"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
