import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}> <a
          href="https://github.com/rafaelguerrae/ufabc-urbana"
          target="_blank"
          rel="noopener noreferrer"
        >
        <img src="/ufabc-urbana.png" alt="UFABC Urbana" className={styles.image} />
        </a>
      </main>
    </div>
  );
}
